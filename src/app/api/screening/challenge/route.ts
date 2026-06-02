/**
 * POST /api/screening/challenge
 *
 * Permite al recruiter cuestionar la clasificación del agente de screening.
 * El agente responde con evidencia concreta del CV y puede reconsiderar
 * la clasificación si el recruiter aporta información nueva.
 */

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const CHALLENGE_SYSTEM_PROMPT = `Eres el agente de screening de TruHire. Un recruiter está cuestionando tu clasificación de un candidato.

Tu rol en esta conversación:
1. Defender tu clasificación con evidencia CONCRETA del CV — cita partes específicas.
2. Si el recruiter aporta información nueva o contexto que no tenías, reconócelo y reconsidera.
3. Si cambias de clasificación, explica exactamente qué cambió y por qué.
4. Sé directo. No te disculpes por tu análisis, pero sí actualiza tu postura si hay razón suficiente.
5. Mantén el foco en evidencia verificable, no en suposiciones.

Si en tu respuesta decides cambiar la clasificación, termina con este JSON exacto en una línea nueva:
CLASSIFICATION_UPDATE: {"classification": "green"|"talent_pool"|"yellow"|"red", "reason": "una oración explicando el cambio"}

Si mantienes tu clasificación, no incluyas ese JSON.

Responde en español. Máximo 4 oraciones por respuesta — sé conciso y específico.`

export async function POST(request: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { processCandidateId, message, conversationHistory } = await request.json()

    if (!processCandidateId || !message) {
      return NextResponse.json({ error: 'processCandidateId y message son requeridos' }, { status: 400 })
    }

    // Obtener datos del candidato y screening actual
    const { data: pc } = await supabase
      .from('process_candidates')
      .select(`
        id,
        candidate:candidates(full_name, cv_text),
        process:processes(title, capa_intencional),
        screening:screenings(
          classification, bucket_reason, ai_summary,
          truora_fit_level, role_fit_level, suggested_capa,
          strengths, gaps, truora_signals, anti_signals
        )
      `)
      .eq('id', processCandidateId)
      .single()

    if (!pc) return NextResponse.json({ error: 'Candidato no encontrado' }, { status: 404 })

    const candidate = pc.candidate as any
    const proc = pc.process as any
    const screening = Array.isArray(pc.screening) ? pc.screening[0] : pc.screening as any

    if (!screening) {
      return NextResponse.json({ error: 'Este candidato aún no tiene screening. Corre el análisis primero.' }, { status: 400 })
    }

    // Contexto del screening original para el agente
    const screeningContext = `
CANDIDATO: ${candidate?.full_name}
PROCESO: ${proc?.title} (${proc?.capa_intencional})

MI CLASIFICACIÓN ACTUAL: ${screening.classification}
RAZÓN: ${screening.bucket_reason ?? 'No especificada'}
Truora fit: ${screening.truora_fit_level} | Role fit: ${screening.role_fit_level} | Capa sugerida: ${screening.suggested_capa}

FORTALEZAS QUE IDENTIFIQUÉ:
${(screening.strengths ?? []).map((s: string) => `• ${s}`).join('\n')}

GAPS QUE IDENTIFIQUÉ:
${(screening.gaps ?? []).map((g: string) => `• ${g}`).join('\n')}

SEÑALES TRUORA:
${(screening.truora_signals ?? []).map((s: string) => `• ${s}`).join('\n')}

ANTI-SEÑALES:
${(screening.anti_signals ?? []).map((s: string) => `• ${s}`).join('\n')}

CV DEL CANDIDATO (Markdown):
---
${candidate?.cv_text ?? 'CV no disponible'}
---`

    // Construir historial de conversación
    const messages: any[] = [
      { role: 'system', content: CHALLENGE_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Contexto de mi análisis:\n${screeningContext}\n\nEl recruiter ahora me cuestiona. Respondo basándome en la evidencia del CV.`,
      },
      { role: 'assistant', content: `Entendido. Tengo el contexto completo del análisis de ${candidate?.full_name}. Estoy listo para defender mi clasificación de ${screening.classification} o reconsiderar si me aportas información nueva.` },
      // Historial previo de la conversación
      ...(conversationHistory ?? []),
      // Mensaje actual del recruiter
      { role: 'user', content: message },
    ]

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      max_tokens: 512,
      temperature: 0.3,
    })

    const rawResponse = completion.choices[0].message.content ?? ''

    // Detectar si el agente cambió la clasificación
    let classificationUpdate: { classification: string; reason: string } | null = null
    const updateMatch = rawResponse.match(/CLASSIFICATION_UPDATE:\s*(\{[^}]+\})/)
    if (updateMatch) {
      try {
        classificationUpdate = JSON.parse(updateMatch[1])
        // Si hay cambio, actualizar en DB
        if (classificationUpdate) {
          await supabase
            .from('screenings')
            .update({
              classification: classificationUpdate.classification,
              bucket_reason: classificationUpdate.reason,
              recruiter_notes: `Reclasificado tras challenge del recruiter. Razón: ${classificationUpdate.reason}`,
            })
            .eq('process_candidate_id', processCandidateId)

          await supabase
            .from('process_candidates')
            .update({ status: 'screening' })
            .eq('id', processCandidateId)
        }
      } catch {
        classificationUpdate = null
      }
    }

    // Limpiar el JSON de la respuesta visible
    const cleanResponse = rawResponse.replace(/CLASSIFICATION_UPDATE:\s*\{[^}]+\}/, '').trim()

    return NextResponse.json({
      response: cleanResponse,
      classificationUpdate,
    })
  } catch (error: any) {
    console.error('[Challenge API] Error:', error)
    return NextResponse.json({ error: error.message ?? 'Error interno' }, { status: 500 })
  }
}
