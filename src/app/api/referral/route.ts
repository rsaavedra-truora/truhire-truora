/**
 * POST /api/referral
 *
 * Endpoint interno — para que cualquier empleado de Truora pueda
 * referir un candidato a un proceso subiendo su PDF.
 *
 * Requiere autenticación (cookie de sesión @truora.com).
 */

export const runtime = 'nodejs'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processPDFToMarkdown } from '@/lib/pdf-utils'
import { SCREENING_SYSTEM_PROMPT, buildScreeningUserPrompt } from '@/lib/screening-prompt'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const formData = await request.formData()
    const processId  = formData.get('process_id') as string
    const fullName   = (formData.get('full_name') as string)?.trim()
    const email      = (formData.get('email') as string)?.trim().toLowerCase()
    const linkedinUrl = (formData.get('linkedin_url') as string)?.trim() || null
    const cvFile     = formData.get('cv') as File | null

    if (!processId || !fullName || !email) {
      return NextResponse.json({ error: 'Nombre, email y proceso son obligatorios.' }, { status: 400 })
    }
    if (!cvFile || cvFile.size === 0) {
      return NextResponse.json({ error: 'El CV en PDF es obligatorio.' }, { status: 400 })
    }
    if (cvFile.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Solo se aceptan archivos PDF.' }, { status: 400 })
    }

    // Obtener datos del proceso
    const { data: process } = await supabase
      .from('processes')
      .select('id, title, role_description, entry_mode, capa_intencional')
      .eq('id', processId)
      .single()

    if (!process) return NextResponse.json({ error: 'Proceso no encontrado.' }, { status: 404 })

    // PDF → Markdown
    const cvBuffer = Buffer.from(await cvFile.arrayBuffer())
    const cvMarkdown = await processPDFToMarkdown(cvBuffer)

    // Subir PDF a Storage
    const fileName = `${processId}/${Date.now()}-${email.replace('@', '-at-')}.pdf`
    const { error: uploadError } = await supabase.storage
      .from('cvs')
      .upload(fileName, cvBuffer, { contentType: 'application/pdf', upsert: false })
    const cvUrl = uploadError ? null : supabase.storage.from('cvs').getPublicUrl(fileName).data.publicUrl

    // Crear o actualizar candidato
    let candidateId: string
    const { data: existing } = await supabase
      .from('candidates').select('id').eq('email', email).single()

    if (existing) {
      candidateId = existing.id
      await supabase.from('candidates')
        .update({ full_name: fullName, linkedin_url: linkedinUrl, cv_text: cvMarkdown, cv_url: cvUrl })
        .eq('id', candidateId)
    } else {
      const { data: newC, error } = await supabase.from('candidates')
        .insert({ full_name: fullName, email, linkedin_url: linkedinUrl, cv_text: cvMarkdown, cv_url: cvUrl })
        .select('id').single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      candidateId = newC.id
    }

    // Verificar duplicado en proceso
    const { data: existingPC } = await supabase.from('process_candidates')
      .select('id').eq('process_id', processId).eq('candidate_id', candidateId).single()
    if (existingPC) return NextResponse.json({ error: 'Este candidato ya está en el proceso.' }, { status: 409 })

    // Crear process_candidate
    const { data: pc, error: pcError } = await supabase.from('process_candidates')
      .insert({ process_id: processId, candidate_id: candidateId, status: 'applied' })
      .select('id').single()
    if (pcError) return NextResponse.json({ error: pcError.message }, { status: 500 })

    // Registrar referral en process_participants
    await supabase.from('process_participants').upsert({
      process_id: processId,
      user_id: user.id,
      role_in_process: 'referrer',
    })

    // Screening automático
    const userPrompt = buildScreeningUserPrompt({
      candidateName: fullName,
      cvText: cvMarkdown,
      roleTitle: process.title,
      roleDescription: process.role_description,
      entryMode: process.entry_mode as any,
      capa: process.capa_intencional as any,
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

    const screeningResult = JSON.parse(completion.choices[0].message.content ?? '{}')

    await supabase.from('screenings').insert({
      process_candidate_id: pc.id,
      classification: screeningResult.classification,
      strengths: screeningResult.strengths ?? [],
      gaps: screeningResult.gaps ?? [],
      truora_signals: screeningResult.truora_signals ?? [],
      anti_signals: screeningResult.anti_signals ?? [],
      ai_summary: screeningResult.ai_summary ?? '',
      raw_ai_response: { model: 'gpt-4o', source: 'referral', referred_by: user.id },
    })

    await supabase.from('process_candidates')
      .update({ status: 'screening' }).eq('id', pc.id)

    await supabase.from('processes')
      .update({ status: 'screening' }).eq('id', processId).eq('status', 'open')

    return NextResponse.json({
      success: true,
      classification: screeningResult.classification,
      pcId: pc.id,
    })
  } catch (error: any) {
    console.error('[Referral API] Error:', error)
    return NextResponse.json({ error: error.message ?? 'Error interno' }, { status: 500 })
  }
}
