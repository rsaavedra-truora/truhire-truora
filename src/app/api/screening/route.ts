import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { SCREENING_SYSTEM_PROMPT, buildScreeningUserPrompt, buildCalibrationBlock } from '@/lib/screening-prompt'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { processCandidateId } = await request.json()
    if (!processCandidateId) {
      return NextResponse.json({ error: 'processCandidateId requerido' }, { status: 400 })
    }

    const { data: pc, error: pcError } = await supabase
      .from('process_candidates')
      .select(`
        id, process_id, candidate_id,
        candidate:candidates(id, full_name, cv_text),
        process:processes(id, title, role_description, entry_mode, capa_intencional)
      `)
      .eq('id', processCandidateId)
      .single()

    if (pcError || !pc) {
      return NextResponse.json({ error: 'Candidato no encontrado' }, { status: 404 })
    }

    const candidate = pc.candidate as any
    const proc = pc.process as any

    if (!candidate.cv_text || candidate.cv_text.trim().length < 50) {
      return NextResponse.json(
        { error: 'El candidato no tiene CV cargado o el texto es muy corto para evaluar.' },
        { status: 400 }
      )
    }

    // Obtener ejemplos de calibración recientes (últimas 10 correcciones del equipo)
    const { data: feedbackExamples } = await supabase
      .from('screening_feedback')
      .select(`
        ai_classification, recruiter_classification, recruiter_reasoning,
        screening:screenings(process_candidate_id,
          process_candidate:process_candidates(
            candidate:candidates(cv_text)
          )
        )
      `)
      .eq('agreed', false)
      .order('created_at', { ascending: false })
      .limit(10)

    const calibrationExamples = (feedbackExamples ?? [])
      .filter((f: any) => f.recruiter_reasoning)
      .slice(0, 3)
      .map((f: any) => ({
        ai_classification: f.ai_classification,
        recruiter_classification: f.recruiter_classification,
        recruiter_reasoning: f.recruiter_reasoning,
        cv_snippet: ((f.screening as any)?.process_candidate?.candidate?.cv_text ?? '').slice(0, 200),
      }))

    const calibrationBlock = buildCalibrationBlock(calibrationExamples)

    // Cargar benchmarks activos (unicornios del equipo como anclaje positivo)
    const { data: benchmarks } = await supabase
      .from('talent_benchmarks')
      .select('full_name, role_at_truora, layer, cv_text, notes')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(4)

    const userPrompt = buildScreeningUserPrompt({
      candidateName: candidate.full_name,
      cvText: candidate.cv_text,
      roleTitle: proc.title,
      roleDescription: proc.role_description,
      entryMode: proc.entry_mode,
      capa: proc.capa_intencional,
      benchmarks: benchmarks ?? [],
    }) + calibrationBlock

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SCREENING_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1500,
      temperature: 0.2,
    })

    const rawText = completion.choices[0].message.content ?? ''

    let r: any
    try {
      r = JSON.parse(rawText)
    } catch {
      return NextResponse.json(
        { error: 'El modelo devolvió una respuesta no parseable', raw: rawText },
        { status: 500 }
      )
    }

    const inTalentPool = r.classification === 'talent_pool'

    // Upsert con onConflict explícito para evitar duplicate key en re-análisis
    const { data: screening, error: saveError } = await supabase
      .from('screenings')
      .upsert(
        {
          process_candidate_id: processCandidateId,
          classification: r.classification,
          bucket_reason: r.bucket_reason ?? null,
          identity_match: r.identity_match ?? null,
          identity_notes: r.identity_notes ?? null,
          truora_fit_level: r.truora_fit_level ?? null,
          role_fit_level: (r.role_fit_level === 'n/a' || r.role_fit_level === 'na') ? null : (r.role_fit_level ?? null),
          suggested_capa: r.suggested_capa ?? null,
          strengths: r.strengths ?? [],
          gaps: r.gaps ?? [],
          truora_signals: r.truora_signals ?? [],
          anti_signals: r.anti_signals ?? [],
          ai_summary: r.ai_summary ?? '',
          raw_ai_response: { model: 'gpt-4o', raw: rawText },
          in_talent_pool: inTalentPool,
        },
        { onConflict: 'process_candidate_id' }
      )
      .select()
      .single()

    if (saveError) return NextResponse.json({ error: saveError.message }, { status: 500 })

    await supabase
      .from('process_candidates')
      .update({ status: 'screening' })
      .eq('id', processCandidateId)

    await supabase
      .from('processes')
      .update({ status: 'screening' })
      .eq('id', pc.process_id)
      .eq('status', 'open')

    return NextResponse.json({ screening })
  } catch (error: any) {
    console.error('[Screening API] Error:', error)
    return NextResponse.json(
      { error: error.message ?? 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
