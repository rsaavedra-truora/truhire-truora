import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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

Sé directo y específico. Cita partes concretas del CV. Responde SOLO con el JSON.`

export async function POST(request: NextRequest) {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { candidateId } = await request.json()
    if (!candidateId) return NextResponse.json({ error: 'candidateId requerido' }, { status: 400 })

    const { data: candidate } = await supabase
      .from('candidates')
      .select('id, full_name, cv_text')
      .eq('id', candidateId)
      .single()

    if (!candidate) return NextResponse.json({ error: 'Candidato no encontrado' }, { status: 404 })
    if (!candidate.cv_text || candidate.cv_text.length < 100) {
      return NextResponse.json({ error: 'Este candidato no tiene CV cargado. Edítalo y sube su CV primero.' }, { status: 400 })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: TRUORA_DNA_PROMPT },
        { role: 'user', content: `Analiza este CV de ${candidate.full_name}:\n\n${candidate.cv_text}` },
      ],
      max_tokens: 1024,
      temperature: 0.2,
    })

    const screening = JSON.parse(completion.choices[0].message.content ?? '{}')

    await supabase.from('talent_pool_screenings').delete().eq('candidate_id', candidateId)
    const { data: newScreening } = await supabase.from('talent_pool_screenings').insert({
      candidate_id: candidateId,
      truora_fit_level: screening.truora_fit_level ?? 'medium',
      signals: screening.signals ?? [],
      gaps: screening.gaps ?? [],
      suggested_roles: screening.suggested_roles ?? [],
      ai_summary: screening.ai_summary ?? '',
      raw_ai_response: { model: 'gpt-4o', source: 'rescreen', rescreened_by: user.id },
    }).select().single()

    return NextResponse.json({ success: true, screening: newScreening })
  } catch (error: any) {
    console.error('[talent-pool/rescreen]', error)
    return NextResponse.json({ error: error.message ?? 'Error interno' }, { status: 500 })
  }
}
