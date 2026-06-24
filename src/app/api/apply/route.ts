/**
 * POST /api/apply
 *
 * Endpoint público — recibe aplicaciones de candidatos desde careers.truora.com
 * No requiere autenticación (es la puerta de entrada pública).
 *
 * Flow:
 * 1. Recibe multipart form con datos del candidato + PDF del CV
 * 2. Extrae texto del PDF y convierte a Markdown
 * 3. Sube el PDF a Supabase Storage
 * 4. Crea/actualiza el candidato en la DB
 * 5. Crea el process_candidate
 * 6. Dispara el screening AI automáticamente
 * 7. Retorna el resultado
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { processPDFToMarkdown } from '@/lib/pdf-utils'
import { SCREENING_SYSTEM_PROMPT, buildScreeningUserPrompt } from '@/lib/screening-prompt'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
    const formData = await request.formData()

    const processSlug = formData.get('process_slug') as string
    const fullName   = (formData.get('full_name') as string)?.trim()
    const email      = (formData.get('email') as string)?.trim().toLowerCase()
    const linkedinUrl = (formData.get('linkedin_url') as string)?.trim() || null
    const cvFile     = formData.get('cv') as File | null

    if (!processSlug || !fullName || !email) {
      return NextResponse.json({ error: 'Nombre, email y proceso son obligatorios.' }, { status: 400 })
    }
    if (!cvFile || cvFile.size === 0) {
      return NextResponse.json({ error: 'El CV en PDF es obligatorio.' }, { status: 400 })
    }
    if (cvFile.type !== 'application/pdf') {
      return NextResponse.json({ error: 'El CV debe ser un archivo PDF.' }, { status: 400 })
    }
    if (cvFile.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'El PDF no puede superar 5MB.' }, { status: 400 })
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // I11: Rate limiting por email — máx 5 aplicaciones en 24h
    const { data: existingCandidateForRateLimit } = await supabase
      .from('candidates').select('id').eq('email', email).maybeSingle()
    if (existingCandidateForRateLimit) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { count: recentApps } = await supabase
        .from('process_candidates')
        .select('id', { count: 'exact', head: true })
        .eq('candidate_id', existingCandidateForRateLimit.id)
        .gte('applied_at', oneDayAgo)
      if ((recentApps ?? 0) >= 5) {
        return NextResponse.json(
          { error: 'Has enviado demasiadas aplicaciones. Intenta de nuevo más tarde.' },
          { status: 429 }
        )
      }
    }

    // Buscar el proceso por slug — sin filtro por entry_mode.
    // El modo de entrada es una clasificación interna; no condiciona
    // quién puede aplicar ni por qué canal llega el candidato.
    const { data: proc, error: processError } = await supabase
      .from('processes')
      .select('id, title, role_description, entry_mode, capa_intencional, status')
      .eq('role_slug', processSlug)
      .in('status', ['open', 'screening', 'challenge', 'loop', 'decision'])
      .single()

    if (processError || !proc) {
      return NextResponse.json({ error: 'Proceso no encontrado o no está activo.' }, { status: 404 })
    }

    // Procesar PDF → Markdown
    const cvBuffer = Buffer.from(await cvFile.arrayBuffer())
    let cvMarkdown: string
    try {
      cvMarkdown = await processPDFToMarkdown(cvBuffer)
    } catch (err: any) {
      return NextResponse.json({ error: `Error procesando el PDF: ${err.message}` }, { status: 400 })
    }

    // Subir PDF a Supabase Storage
    const fileName = `${proc.id}/${Date.now()}-${email.replace('@', '-at-')}.pdf`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('cvs')
      .upload(fileName, cvBuffer, { contentType: 'application/pdf', upsert: false })

    const cvUrl = uploadError ? null : supabase.storage.from('cvs').getPublicUrl(fileName).data.publicUrl

    // Crear o actualizar candidato
    let candidateId: string
    const { data: existing } = await supabase
      .from('candidates')
      .select('id')
      .eq('email', email)
      .single()

    if (existing) {
      candidateId = existing.id
      await supabase
        .from('candidates')
        .update({ full_name: fullName, linkedin_url: linkedinUrl, cv_text: cvMarkdown, cv_url: cvUrl })
        .eq('id', candidateId)
    } else {
      const { data: newCandidate, error } = await supabase
        .from('candidates')
        .insert({ full_name: fullName, email, linkedin_url: linkedinUrl, cv_text: cvMarkdown, cv_url: cvUrl })
        .select('id')
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      candidateId = newCandidate.id
    }

    // Verificar que no esté ya en el proceso
    const { data: existingPC } = await supabase
      .from('process_candidates')
      .select('id')
      .eq('process_id', proc.id)
      .eq('candidate_id', candidateId)
      .single()

    if (existingPC) {
      return NextResponse.json({ error: 'Ya has aplicado a esta posición anteriormente.' }, { status: 409 })
    }

    // Crear process_candidate
    const { data: pc, error: pcError } = await supabase
      .from('process_candidates')
      .insert({ process_id: proc.id, candidate_id: candidateId, status: 'applied' })
      .select('id')
      .single()
    if (pcError) return NextResponse.json({ error: pcError.message }, { status: 500 })

    // Screening AI automático
    const screeningResult = await runScreening({
      openai,
      candidateName: fullName,
      cvText: cvMarkdown,
      processTitle: proc.title,
      roleDescription: proc.role_description,
      entryMode: proc.entry_mode,
      capa: proc.capa_intencional,
    })

    const inTalentPool = screeningResult.classification === 'talent_pool'

    await supabase.from('screenings').insert({
      process_candidate_id: pc.id,
      classification: screeningResult.classification,
      bucket_reason: screeningResult.bucket_reason ?? null,
      identity_match: screeningResult.identity_match ?? null,
      identity_notes: screeningResult.identity_notes ?? null,
      truora_fit_level: screeningResult.truora_fit_level ?? null,
      role_fit_level: (screeningResult.role_fit_level === 'n/a' || screeningResult.role_fit_level === 'na')
        ? null : (screeningResult.role_fit_level ?? null),
      suggested_capa: screeningResult.suggested_capa ?? null,
      strengths: screeningResult.strengths ?? [],
      gaps: screeningResult.gaps ?? [],
      truora_signals: screeningResult.truora_signals ?? [],
      anti_signals: screeningResult.anti_signals ?? [],
      ai_summary: screeningResult.ai_summary ?? '',
      raw_ai_response: { model: 'gpt-4o', source: 'public_apply' },
      in_talent_pool: inTalentPool,
    })

    await supabase
      .from('process_candidates')
      .update({ status: 'screening' })
      .eq('id', pc.id)

    // I7: Registrar fecha de entrada al pool para candidatos talent_pool
    if (inTalentPool) {
      await supabase
        .from('process_candidates')
        .update({ added_to_pool_at: new Date().toISOString() })
        .eq('id', pc.id)
    }

    await supabase
      .from('processes')
      .update({ status: 'screening' })
      .eq('id', proc.id)
      .eq('status', 'open')

    return NextResponse.json({
      success: true,
      message: 'Tu aplicación fue recibida. Te contactaremos pronto.',
    })
  } catch (error: any) {
    console.error('[Apply API] Error:', error)
    return NextResponse.json({ error: error.message ?? 'Error interno' }, { status: 500 })
  }
}

async function runScreening({
  openai, candidateName, cvText, processTitle, roleDescription, entryMode, capa,
}: {
  openai: OpenAI
  candidateName: string
  cvText: string
  processTitle: string
  roleDescription: string | null
  entryMode: string
  capa: string
}) {
  const userPrompt = buildScreeningUserPrompt({
    candidateName,
    cvText,
    roleTitle: processTitle,
    roleDescription,
    entryMode: entryMode as any,
    capa: capa as any,
  })

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SCREENING_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 1024,
    temperature: 0.2,
  })

  return JSON.parse(completion.choices[0].message.content ?? '{}')
}
