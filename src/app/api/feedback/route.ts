/**
 * POST /api/feedback
 * Genera un borrador de email de feedback para el candidato rechazado.
 * El recruiter revisa, edita y envía — nunca se envía automáticamente.
 *
 * Niveles:
 * 1 — Rechazado en screening (antes de phone screen)
 * 2 — Rechazado en phone screen
 * 3 — Rechazado tras el loop completo
 *
 * Información que NUNCA incluye el borrador:
 * - Identidad del Bar Raiser
 * - Conteo de votos o scores numéricos
 * - Clasificación interna (🟢🟡🔴)
 * - Principios específicos evaluados
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { processCandidateId } = await request.json()

    // Obtener todo el contexto disponible
    const { data: pc } = await supabase
      .from('process_candidates')
      .select(`
        id, status,
        candidate:candidates(full_name, email),
        process:processes(title, entry_mode, capa_intencional, role_description),
        screening:screenings(classification, ai_summary, strengths, gaps),
        phone_screen:phone_screens(decision, overall_summary, completed_at),
        loop:loops(id),
        decision:decisions(outcome, justification)
      `)
      .eq('id', processCandidateId)
      .single()

    if (!pc) return NextResponse.json({ error: 'Candidato no encontrado' }, { status: 404 })

    const candidate = pc.candidate as any
    const proc = pc.process as any
    const screening = Array.isArray(pc.screening) ? pc.screening[0] : pc.screening as any
    const phoneScreen = Array.isArray(pc.phone_screen) ? pc.phone_screen[0] : pc.phone_screen as any
    const loop = Array.isArray(pc.loop) ? pc.loop[0] : pc.loop as any
    const finalDecision = Array.isArray(pc.decision) ? pc.decision[0] : pc.decision as any

    // Determinar el nivel del feedback
    let level: 1 | 2 | 3
    if (!phoneScreen?.completed_at) {
      level = 1 // Rechazado en screening
    } else if (phoneScreen?.decision === 'no_pass') {
      level = 2 // Rechazado en phone screen
    } else {
      level = 3 // Rechazado tras loop completo
    }

    // Contexto para el AI (información interna, NO se incluye en el email)
    const internalContext = `
Candidato: ${candidate?.full_name}
Rol: ${proc?.title}
Nivel del proceso alcanzado: ${level === 1 ? 'Solo screening' : level === 2 ? 'Phone screen completado' : 'Loop de entrevistas completado'}
${level >= 1 && screening?.ai_summary ? `Resumen de la evaluación: ${screening.ai_summary}` : ''}
${level >= 2 && phoneScreen?.overall_summary ? `Evaluación del hiring manager: ${phoneScreen.overall_summary}` : ''}
${level === 3 && finalDecision?.justification ? `Justificación de la decisión final: ${finalDecision.justification}` : ''}
`

    const prompt = `Eres el equipo de People de Truora, una empresa de identidad digital y antifraude en LATAM.

Escribe un email de feedback profesional y empático para un candidato que no avanzó en el proceso de selección para el rol de "${proc?.title}".

NIVEL ${level} — ${level === 1 ? 'El candidato no avanzó en el filtro inicial' : level === 2 ? 'El candidato completó una primera entrevista pero no avanzó' : 'El candidato completó el proceso de entrevistas pero no avanzó'}.

Contexto interno (úsalo para personalizar pero NO lo incluyas en el email):
${internalContext}

REGLAS DEL EMAIL:
1. Tono: empático, directo, respetuoso. No usar frases genéricas o corporativas vacías.
2. Agradece el tiempo e interés genuinamente.
3. Si tienes contexto de fortalezas reales, menciona 1-2 de forma concreta pero positiva.
4. NO menciones: scores, principios evaluados, votos, identidad del Bar Raiser, clasificaciones internas.
5. NO des razones específicas de rechazo más allá de "encontramos un fit más cercano con otro perfil" o similar.
6. Si es nivel 3 (completó el loop), reconoce el esfuerzo del candidato más explícitamente.
7. Deja la puerta abierta para futuras oportunidades si el candidato mostró señales positivas.
8. Máximo 180 palabras. Sin asunto — solo el cuerpo del email.
9. Escribe en español. Firma como "El equipo de Truora" — NUNCA menciones quién tomó la decisión.

Responde SOLO con el cuerpo del email, listo para pegar.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
      temperature: 0.4,
    })

    const draft = completion.choices[0].message.content?.trim() ?? ''

    // Guardar borrador en DB
    const { data: feedbackEmail } = await supabase
      .from('feedback_emails')
      .upsert(
        {
          process_candidate_id: processCandidateId,
          level,
          ai_draft: draft,
        },
        { onConflict: 'process_candidate_id' }
      )
      .select()
      .single()

    return NextResponse.json({ draft, level, feedbackEmailId: feedbackEmail?.id })
  } catch (error: any) {
    console.error('[Feedback API]', error?.message)
    return NextResponse.json({ error: error?.message ?? 'Error interno' }, { status: 500 })
  }
}
