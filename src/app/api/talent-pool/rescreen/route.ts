import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SCREENING_SYSTEM_PROMPT, buildCalibrationBlock } from '@/lib/screening-prompt'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const maxDuration = 60

const TALENT_POOL_USER_PROMPT = (name: string, cvText: string, benchmarkBlock: string, calibrationBlock: string) =>
  `Nombre del candidato: ${name}
Contexto: Este candidato está en el Talent Pool de Truora — no hay un rol específico activo para él/ella.
Evalúa SOLO en la dimensión Truora fit (DNA). Usa role_fit_level: "na".${benchmarkBlock}${calibrationBlock}

CV del candidato (en Markdown):
---
${cvText}
---

Evalúa al candidato siguiendo los pasos del sistema. Responde con el JSON estructurado.`

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

    // Traer benchmarks activos (misma lógica que buildScreeningUserPrompt)
    const { data: benchmarks } = await supabase
      .from('talent_benchmarks')
      .select('full_name, role_at_truora, cv_text, notes')
      .eq('is_active', true)
      .limit(4)

    let benchmarkBlock = ''
    if (benchmarks && benchmarks.length > 0) {
      benchmarkBlock = `\n\n## Perfiles de referencia — High performers actuales de Truora\n\nEstos son CVs de personas que ya están en Truora y han demostrado ser high performers. Úsalos para calibrar tu criterio:\n\n${
        benchmarks.filter(b => b.cv_text).map(b =>
          `--- ${b.full_name} ---\n${b.cv_text!.slice(0, 800)}${b.cv_text!.length > 800 ? '\n[...]' : ''}`
        ).join('\n\n')
      }`
    }

    // Traer correcciones recientes del recruiter (buildCalibrationBlock)
    const { data: feedbackRows } = await supabase
      .from('screening_feedback')
      .select(`
        ai_classification, recruiter_classification, recruiter_reasoning,
        screening:screenings(process_candidate:process_candidates(candidate:candidates(cv_text)))
      `)
      .eq('agreed', false)
      .order('created_at', { ascending: false })
      .limit(3)

    const feedbackExamples = (feedbackRows ?? []).map((f: any) => ({
      ai_classification: f.ai_classification,
      recruiter_classification: f.recruiter_classification,
      recruiter_reasoning: f.recruiter_reasoning,
      cv_snippet: f.screening?.process_candidate?.candidate?.cv_text?.slice(0, 200) ?? '',
    })).filter(f => f.cv_snippet)

    const calibrationBlock = buildCalibrationBlock(feedbackExamples)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SCREENING_SYSTEM_PROMPT },
        { role: 'user', content: TALENT_POOL_USER_PROMPT(candidate.full_name, candidate.cv_text, benchmarkBlock, calibrationBlock) },
      ],
      max_tokens: 1024,
      temperature: 0.2,
    })

    const screening = JSON.parse(completion.choices[0].message.content ?? '{}')

    await supabase.from('talent_pool_screenings').delete().eq('candidate_id', candidateId)
    const { data: newScreening } = await supabase.from('talent_pool_screenings').insert({
      candidate_id: candidateId,
      truora_fit_level: screening.truora_fit_level ?? 'medium',
      signals: screening.truora_signals ?? screening.signals ?? [],
      gaps: screening.anti_signals ?? screening.gaps ?? [],
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
