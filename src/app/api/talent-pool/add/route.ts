import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractTextFromPDF } from '@/lib/pdf-utils'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const maxDuration = 60

const TRUORA_DNA_PROMPT = `Eres el agente de talent scouting de TruHire, la plataforma interna de reclutamiento de Truora.

Tu tarea: evaluar si esta persona tiene el DNA de los constructores que han hecho crecer Truora de 0 a unicornio en LATAM.

Truora busca personas que:
- Construyen desde cero, sin miedo a la ambigüedad
- Tienen ownership radical — los problemas son suyos hasta resolverse
- Aprenden rápido y se adaptan constantemente
- Tienen evidencia de impacto real, no solo responsabilidades
- Son directos, honestos y van al grano
- Piensan en sistemas, no en tareas
- Tienen hambre — quieren crecer y crecer rápido

Analiza el CV y devuelve un JSON con exactamente esta estructura:
{
  "truora_fit_level": "high" | "medium" | "low",
  "signals": ["señal 1 con evidencia del CV", "señal 2", "señal 3"],
  "gaps": ["gap 1", "gap 2"],
  "suggested_roles": ["Rol sugerido 1", "Rol sugerido 2", "Rol sugerido 3"],
  "ai_summary": "2-3 oraciones en español explicando por qué esta persona es o no es fit para Truora, con evidencia concreta del CV."
}

Señales positivas a buscar: métricas de impacto, crecimiento acelerado en responsabilidades, experiencia en startups/scaleups, evidencia de construcción desde cero, multiples roles o hats, velocidad de ejecución.

Señales negativas: solo grandes corporaciones sin contexto de startup, responsabilidades vagas sin resultados, demasiado especializado en un solo dominio sin adaptabilidad.

Sé directo y específico. Cita partes concretas del CV. Responde SOLO con el JSON.`

export async function POST(request: NextRequest) {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const formData = await request.formData()
    const fullName = (formData.get('full_name') as string)?.trim()
    const email = (formData.get('email') as string)?.trim().toLowerCase()
    const linkedinUrl = (formData.get('linkedin_url') as string)?.trim() || null
    const source = (formData.get('source') as string) || 'other'
    const referredBy = (formData.get('referred_by') as string)?.trim() || null
    const recommendedBy = (formData.get('recommended_by') as string)?.trim() || null
    const notes = (formData.get('notes') as string)?.trim() || null
    const cvFile = formData.get('cv') as File | null

    if (!fullName || !email) {
      return NextResponse.json({ error: 'Nombre y email son obligatorios.' }, { status: 400 })
    }

    // Extraer texto del CV si se subió
    let cvText: string | null = null
    let cvUrl: string | null = null

    if (cvFile && cvFile.size > 0) {
      const cvBuffer = Buffer.from(await cvFile.arrayBuffer())
      cvText = await extractTextFromPDF(cvBuffer)

      const fileName = `talent-pool/${Date.now()}-${email.replace('@', '-at-')}.pdf`
      const { error: uploadError } = await supabase.storage
        .from('cvs')
        .upload(fileName, cvBuffer, { contentType: 'application/pdf', upsert: false })
      if (!uploadError) {
        cvUrl = supabase.storage.from('cvs').getPublicUrl(fileName).data.publicUrl
      }
    }

    // Crear o actualizar candidato
    let candidateId: string
    const { data: existing } = await supabase
      .from('candidates').select('id').eq('email', email).maybeSingle()

    if (existing) {
      candidateId = existing.id
      await supabase.from('candidates').update({
        full_name: fullName,
        linkedin_url: linkedinUrl,
        ...(cvText && { cv_text: cvText }),
        ...(cvUrl && { cv_url: cvUrl }),
        in_talent_pool: true,
        talent_pool_source: source,
        talent_pool_notes: notes,
        talent_pool_recommended_by: recommendedBy,
        added_to_pool_by: user.id,
        added_to_pool_at: new Date().toISOString(),
      }).eq('id', candidateId)
    } else {
      const { data: newC, error } = await supabase.from('candidates').insert({
        full_name: fullName,
        email,
        linkedin_url: linkedinUrl,
        cv_text: cvText,
        cv_url: cvUrl,
        in_talent_pool: true,
        talent_pool_source: source,
        talent_pool_notes: notes,
        talent_pool_recommended_by: recommendedBy,
        added_to_pool_by: user.id,
        added_to_pool_at: new Date().toISOString(),
      }).select('id').single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      candidateId = newC.id
    }

    // Guardar referido por si aplica
    if (referredBy) {
      await supabase.from('candidates').update({
        talent_pool_notes: notes ? `${notes}\n\nReferido por: ${referredBy}` : `Referido por: ${referredBy}`,
      }).eq('id', candidateId)
    }

    // Correr Truora DNA screening si hay CV
    let screening = null
    if (cvText && cvText.length > 100) {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: TRUORA_DNA_PROMPT },
          { role: 'user', content: `Analiza este CV:\n\n${cvText}` },
        ],
        max_tokens: 1024,
        temperature: 0.2,
      })

      screening = JSON.parse(completion.choices[0].message.content ?? '{}')

      // Eliminar screening anterior si existe
      await supabase.from('talent_pool_screenings').delete().eq('candidate_id', candidateId)

      await supabase.from('talent_pool_screenings').insert({
        candidate_id: candidateId,
        truora_fit_level: screening.truora_fit_level ?? 'medium',
        signals: screening.signals ?? [],
        gaps: screening.gaps ?? [],
        suggested_roles: screening.suggested_roles ?? [],
        ai_summary: screening.ai_summary ?? '',
        raw_ai_response: { model: 'gpt-4o', source: 'talent_pool' },
      })
    }

    return NextResponse.json({ success: true, candidateId, screening })

  } catch (error: any) {
    console.error('[talent-pool/add]', error)
    return NextResponse.json({ error: error.message ?? 'Error interno' }, { status: 500 })
  }
}
