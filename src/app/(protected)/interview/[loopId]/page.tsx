'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PrincipleRatingSelector, type PrincipleRating } from '@/components/principle-rating'
import { QuestionBankSelector } from '@/components/question-bank-selector'
import { SessionAnalysisUploader } from '@/components/session-analysis'
import { getPrincipleBySlug } from '@/lib/principles-data'

export default function InterviewPage() {
  const params = useParams()
  const loopId = params.loopId as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loop, setLoop] = useState<any>(null)
  const [assignment, setAssignment] = useState<any>(null)
  const [candidate, setCandidate] = useState<any>(null)
  const [screening, setScreening] = useState<any>(null)
  const [phoneScreen, setPhoneScreen] = useState<any>(null)
  const [evaluation, setEvaluation] = useState<any>(null)
  const [expandedPrinciple, setExpandedPrinciple] = useState<string | null>(null)
  const [expandedQuestions, setExpandedQuestions] = useState<string | null>(null)

  // Form state
  const [principleNotes, setPrincipleNotes] = useState<Record<string, string>>({})
  const [principleRatings, setPrincipleRatings] = useState<Record<string, PrincipleRating>>({})
  const [principleQuestions, setPrincipleQuestions] = useState<Record<string, string | null>>({})
  const [summary, setSummary] = useState('')
  const [conclusion, setConclusion] = useState('')
  const [recommendation, setRecommendation] = useState<boolean | null>(null)
  const [isSigned, setIsSigned] = useState(false)

  useEffect(() => { loadData() }, [loopId])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)

    const { data: loopData } = await supabase
      .from('loops')
      .select(`
        id, status,
        process_candidate:process_candidates(
          id, status,
          candidate:candidates(full_name, email, linkedin_url, cv_text),
          process:processes(title, capa_intencional, entry_mode, role_description),
          screening:screenings(classification, bucket_reason, ai_summary, truora_signals, strengths, gaps, suggested_capa),
          phone_screen:phone_screens(overall_summary, decision, principle_notes, competency_notes)
        ),
        assignments:loop_assignments(
          id, interviewer_id, principles
        )
      `)
      .eq('id', loopId)
      .single()

    if (loopData) {
      setLoop(loopData)
      const pc = loopData.process_candidate as any
      setCandidate(pc?.candidate)
      setScreening(Array.isArray(pc?.screening) ? pc.screening[0] : pc?.screening)
      setPhoneScreen(Array.isArray(pc?.phone_screen) ? pc.phone_screen[0] : pc?.phone_screen)

      // Encontrar el assignment del usuario actual
      const myAssignment = (loopData.assignments as any[])?.find(a => a.interviewer_id === user?.id)
      setAssignment(myAssignment)

      // Cargar evaluación existente
      if (user && myAssignment) {
        const { data: eval_ } = await supabase
          .from('evaluations')
          .select('*')
          .eq('loop_id', loopId)
          .eq('interviewer_id', user.id)
          .single()

        if (eval_) {
          setEvaluation(eval_)
          const notes = eval_.principle_notes ?? {}
          setPrincipleNotes(
            Object.fromEntries(Object.entries(notes).map(([k, v]: any) => [k, v?.notes ?? v ?? '']))
          )
          const ratings: Record<string, PrincipleRating> = {}
          const questions: Record<string, string | null> = {}
          Object.entries(notes).forEach(([k, v]: any) => {
            if (v?.rating) ratings[k] = v.rating
            if (v?.question) questions[k] = v.question
          })
          setPrincipleRatings(ratings)
          setPrincipleQuestions(questions)
          setSummary(eval_.summary ?? '')
          setConclusion(eval_.conclusion ?? '')
          setRecommendation(eval_.recommendation)
          setIsSigned(!!eval_.signed_at)
        }
      }
    }
    setLoading(false)
  }

  async function saveEvaluation(sign = false) {
    if (!currentUser || !assignment) return
    // Evaluación firmada — inmutable. No se permiten modificaciones.
    if (isSigned) return
    setSaving(true)

    // Combinar notas + rating + pregunta en el JSONB por principio
    const allSlugs = new Set([...Object.keys(principleNotes), ...Object.keys(principleRatings), ...Object.keys(principleQuestions)])
    const combinedNotes: Record<string, { notes: string; rating: PrincipleRating | null; question: string | null }> = {}
    allSlugs.forEach(slug => {
      combinedNotes[slug] = {
        notes: principleNotes[slug] ?? '',
        rating: principleRatings[slug] ?? null,
        question: principleQuestions[slug] ?? null,
      }
    })

    const payload = {
      loop_id: loopId,
      interviewer_id: currentUser.id,
      principle_notes: combinedNotes,
      summary,
      conclusion,
      recommendation,
      signed_at: sign ? new Date().toISOString() : evaluation?.signed_at ?? null,
    }

    const { error } = await supabase
      .from('evaluations')
      .upsert(payload, { onConflict: 'loop_id,interviewer_id' })

    if (!error) {
      setSaved(true)
      if (sign) setIsSigned(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Cargando...</div>

  if (!assignment) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <p className="text-gray-500">No tienes una entrevista asignada en este loop.</p>
      </div>
    )
  }

  const myPrinciples = (assignment.principles as string[]).map(slug => getPrincipleBySlug(slug)).filter(Boolean)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-1">Interview Loop — Tu evaluación</p>
            <h1 className="text-xl font-semibold text-gray-900">{(candidate as any)?.full_name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{(candidate as any)?.email}</p>
            {(candidate as any)?.linkedin_url && (
              <a href={(candidate as any).linkedin_url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-[#0800FF] hover:underline">LinkedIn →</a>
            )}
          </div>
          <div className="text-right">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              (loop?.process_candidate as any)?.process?.capa_intencional === 'liderazgo'
                ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {(loop?.process_candidate as any)?.process?.capa_intencional === 'liderazgo' ? 'Liderazgo' : 'Funcional'}
            </span>
            {isSigned && (
              <p className="text-xs text-green-600 font-medium mt-1">✓ Evaluación firmada</p>
            )}
          </div>
        </div>
      </div>

      {/* Banner: grabar sesión */}
      {!isSigned && (
        <div className="bg-[#0800FF] rounded-xl p-4 text-white">
          <p className="text-sm font-semibold mb-1">📹 Recuerda grabar esta sesión en Google Meet</p>
          <p className="text-xs opacity-80 leading-relaxed">
            Después de la entrevista, el agente de AI analiza la grabación de forma independiente
            y su veredicto aparece junto al tuyo en el debrief del Bar Raiser.
          </p>
          <ol className="text-xs opacity-80 mt-2 space-y-0.5 list-none">
            <li>1. Inicia la grabación al comenzar Google Meet → <strong>Actividades → Grabar</strong></li>
            <li>2. Al terminar, la grabación queda en tu Google Drive automáticamente</li>
            <li>3. Firma tu evaluación aquí y luego sube la grabación — vía link de Drive o archivo directo</li>
          </ol>
        </div>
      )}

      {/* Bloque 1: Contexto del candidato — evaluación CIEGA
           El entrevistador NO ve screening AI ni phone screen para evitar anchoring bias.
           Solo ve CV y datos del candidato. */}
      <details className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <summary className="px-5 py-4 cursor-pointer flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">Perfil del candidato</span>
          <span className="text-xs text-gray-400">Ver / ocultar</span>
        </summary>
        <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
            <p className="text-xs text-blue-700 font-medium">Evaluación ciega</p>
            <p className="text-xs text-blue-600 mt-0.5">No ves el resultado del screening AI ni la evaluación del Hiring Manager. Esto es intencional — cada evaluador debe formar su opinión de forma independiente.</p>
          </div>

          {/* CV */}
          {(candidate as any)?.cv_text && (
            <details>
              <summary className="text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700">
                CV completo ▼
              </summary>
              <div className="bg-gray-50 rounded-lg p-3 mt-2 max-h-64 overflow-y-auto">
                <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">
                  {(candidate as any).cv_text}
                </pre>
              </div>
            </details>
          )}
        </div>
      </details>

      {/* Bloque 2: Principios asignados con notas */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Tus principios asignados</h2>
        {myPrinciples.map(p => {
          if (!p) return null
          const isExpanded = expandedPrinciple === p.slug
          const showQuestions = expandedQuestions === p.slug
          return (
            <div key={p.slug} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Header del principio */}
              <div
                className="px-5 py-4 cursor-pointer flex items-start justify-between gap-3"
                onClick={() => setExpandedPrinciple(isExpanded ? null : p.slug)}
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{p.definition}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{isExpanded ? '▲' : '▼'}</span>
              </div>

              {isExpanded && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                  {/* Tabla señales/anti-señales */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-green-700 mb-2">✓ Señales Hire</p>
                      {p.signals.map((s, i) => (
                        <p key={i} className="text-xs text-green-800 leading-snug mb-1.5 flex gap-1.5">
                          <span className="flex-shrink-0">•</span>{s}
                        </p>
                      ))}
                    </div>
                    <div className="bg-red-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-red-700 mb-2">✗ Anti-señales</p>
                      {p.antiSignals.map((s, i) => (
                        <p key={i} className="text-xs text-red-800 leading-snug mb-1.5 flex gap-1.5">
                          <span className="flex-shrink-0">•</span>{s}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Preguntas de referencia — colapsables */}
                  <details>
                    <summary
                      className="text-xs font-medium text-[#0800FF] cursor-pointer hover:underline"
                      onClick={e => { e.preventDefault(); setExpandedQuestions(showQuestions ? null : p.slug) }}
                    >
                      {showQuestions ? '▲ Ocultar preguntas de referencia' : '▼ Ver preguntas de referencia'}
                    </summary>
                    {showQuestions && (
                      <div className="mt-3 space-y-3">
                        {p.questions.map((q, i) => (
                          <div key={i} className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs font-medium text-gray-900 mb-1">{q.question}</p>
                            <div className="space-y-0.5">
                              {q.followups.map((f, j) => (
                                <p key={j} className="text-xs text-gray-500 flex gap-1.5">
                                  <span className="text-[#0800FF] flex-shrink-0">↳</span>{f}
                                </p>
                              ))}
                            </div>
                            <span className="inline-block mt-1.5 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                              {q.evaluates}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </details>

                  {/* Banco de preguntas */}
                  {!isSigned && (
                    <QuestionBankSelector
                      principle={p}
                      selectedQuestion={principleQuestions[p.slug] ?? null}
                      onSelect={q => setPrincipleQuestions(prev => ({ ...prev, [p.slug]: q }))}
                    />
                  )}
                  {isSigned && principleQuestions[p.slug] && (
                    <div className="bg-[#E8E7FF] rounded-lg px-3 py-2 mb-3">
                      <p className="text-xs font-semibold text-[#0800FF] mb-0.5">Pregunta utilizada:</p>
                      <p className="text-xs text-gray-700">{principleQuestions[p.slug]}</p>
                    </div>
                  )}

                  {/* Rating del principio */}
                  <PrincipleRatingSelector
                    slug={p.slug}
                    value={principleRatings[p.slug] ?? null}
                    onChange={(slug, rating) => setPrincipleRatings(prev => ({ ...prev, [slug]: rating }))}
                    disabled={isSigned}
                  />

                  {/* Notas */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Evidencia concreta — ¿qué te hizo llegar a esa calificación?
                    </label>
                    <textarea
                      rows={4}
                      value={principleNotes[p.slug] ?? ''}
                      onChange={e => setPrincipleNotes(prev => ({ ...prev, [p.slug]: e.target.value }))}
                      placeholder="Cita ejemplos específicos que dio el candidato. Cuanto más concreto, más útil para el Bar Raiser."
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF] resize-none"
                      disabled={isSigned}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Bloque 3: Cierre de la evaluación */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Cierre de evaluación</h2>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Resumen de la reunión</label>
          <textarea
            rows={3}
            value={summary}
            onChange={e => setSummary(e.target.value)}
            placeholder="¿Cómo fue la entrevista en general? Tono, fluidez, nivel de profundidad de las respuestas..."
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF] resize-none"
            disabled={isSigned}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Conclusión</label>
          <textarea
            rows={3}
            value={conclusion}
            onChange={e => setConclusion(e.target.value)}
            placeholder="Tu análisis final: ¿ves a esta persona en Truora? ¿En qué capa? ¿Qué te generó dudas?"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF] resize-none"
            disabled={isSigned}
          />
        </div>

        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">¿Recomiendas avanzar al debrief?</p>
          <div className="flex gap-3">
            {[
              { value: true, label: '👍 Hire', color: recommendation === true ? 'border-green-500 bg-green-50 text-green-800' : 'border-gray-200' },
              { value: false, label: '👎 No Hire', color: recommendation === false ? 'border-red-500 bg-red-50 text-red-800' : 'border-gray-200' },
            ].map(opt => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => !isSigned && setRecommendation(opt.value)}
                disabled={isSigned}
                className={`flex-1 py-3 rounded-xl border-2 font-medium text-sm transition-all ${opt.color} disabled:cursor-not-allowed`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Acciones */}
        {!isSigned && (
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => saveEvaluation(false)}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar borrador'}
            </button>
            <button
              type="button"
              onClick={() => saveEvaluation(true)}
              disabled={saving || recommendation === null || !conclusion.trim()}
              className="btn-truora disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Firmar y enviar evaluación
            </button>
          </div>
        )}

        {isSigned && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <p className="text-sm text-green-700 font-medium">✓ Evaluación firmada — el Bar Raiser puede verla en el debrief.</p>
          </div>
        )}
      </div>

      {/* Análisis de sesión — bloqueado hasta firma para no sesgar la evaluación humana */}
      {!isSigned ? (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-5 text-center">
          <p className="text-sm text-gray-500 font-medium">Análisis de sesión con Gemini</p>
          <p className="text-xs text-gray-400 mt-1">
            Disponible después de firmar tu evaluación — así tu criterio no es influenciado por el AI.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Análisis de sesión — Gemini</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Sube la grabación de Google Meet. Gemini analiza la sesión de forma independiente
              y emite su propio veredicto para el Bar Raiser.
            </p>
          </div>
          <SessionAnalysisUploader
            loopId={loopId}
            processCandidateId={(loop?.process_candidate as any)?.id}
            type="loop"
            existingAnalysis={evaluation?.session_analysis ?? null}
          />
        </div>
      )}

    </div>
  )
}
