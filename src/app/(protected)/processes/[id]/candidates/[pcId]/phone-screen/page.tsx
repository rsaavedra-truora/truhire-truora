'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TRUORA_PRINCIPLES, DIMENSION_COLORS, getPrincipleBySlug } from '@/lib/principles-data'
import { setupPhoneScreen, submitPhoneScreenEvaluation } from '@/app/actions/phone-screen'
import { PrincipleRatingSelector, type PrincipleRating } from '@/components/principle-rating'
import { QuestionBankSelector } from '@/components/question-bank-selector'
import { SessionAnalysisUploader } from '@/components/session-analysis'
import { PersonSearch } from '@/components/person-search'

export default function PhoneScreenPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const pcId = params.pcId as string
  const processId = params.id as string
  const isDone = searchParams.get('done') === 'true'
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [phoneScreen, setPhoneScreen] = useState<any>(null)
  const [candidate, setCandidate] = useState<any>(null)
  const [screening, setScreening] = useState<any>(null)
  const [selectedPrinciples, setSelectedPrinciples] = useState<string[]>([])
  const [competencies, setCompetencies] = useState<string[]>([''])
  const [calendlyUrl, setCalendlyUrl] = useState('')
  const [sendInvite, setSendInvite] = useState(true)
  const [hmEmail, setHmEmail] = useState('')
  const [processHmId, setProcessHmId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Estado para evaluación
  const [activeCompetencies, setActiveCompetencies] = useState<string[]>([])
  const [newCompetency, setNewCompetency] = useState('')
  const [extraPrinciples, setExtraPrinciples] = useState<string[]>([])
  const [extraPrincipleNotes, setExtraPrincipleNotes] = useState<Record<string, string>>({})
  // IMPORTANTE: todos los hooks antes de cualquier early return (Rules of Hooks)
  const [principleRatings, setPrincipleRatings] = useState<Record<string, PrincipleRating>>({})
  const [principleQuestions, setPrincipleQuestions] = useState<Record<string, string | null>>({})

  useEffect(() => {
    loadData()
  }, [pcId])

  async function loadData() {
    setLoading(true)
    const { data: pc } = await supabase
      .from('process_candidates')
      .select(`
        id, status,
        candidate:candidates(full_name, email, linkedin_url, cv_text),
        process:processes(title, capa_intencional, entry_mode, hiring_manager_or_sponsor_id, hiring_manager_or_sponsor:users!hiring_manager_or_sponsor_id(id, email, full_name)),
        phone_screen:phone_screens(
          id, assigned_principles, role_competencies,
          principle_notes, competency_notes, overall_summary,
          decision, completed_at, hm_id, session_analysis
        ),
        screening:screenings(classification, bucket_reason, ai_summary, suggested_capa)
      `)
      .eq('id', pcId)
      .single()

    if (pc) {
      const proc = Array.isArray(pc.process) ? pc.process[0] : pc.process
      const hm = (proc as any)?.hiring_manager_or_sponsor
      const hmData = Array.isArray(hm) ? hm[0] : hm
      if (hmData?.id) setProcessHmId(hmData.id)
      if (hmData?.email) setHmEmail(hmData.email)
      setCandidate(pc.candidate)
      setScreening(Array.isArray(pc.screening) ? pc.screening[0] : pc.screening)
      const ps = Array.isArray(pc.phone_screen) ? pc.phone_screen[0] : pc.phone_screen
      setPhoneScreen(ps)
      if (ps) {
        setSelectedPrinciples(ps.assigned_principles ?? [])
        setCompetencies(ps.role_competencies?.length ? ps.role_competencies : [''])
        setActiveCompetencies(ps.role_competencies ?? [])
        // Cargar ratings y preguntas existentes
        const ratings: Record<string, PrincipleRating> = {}
        const questions: Record<string, string | null> = {}
        Object.entries(ps.principle_notes ?? {}).forEach(([slug, val]: any) => {
          if (val?.rating) ratings[slug] = val.rating
          if (val?.question) questions[slug] = val.question
        })
        setPrincipleRatings(ratings)
        setPrincipleQuestions(questions)
      }
    }
    setLoading(false)
  }

  function togglePrinciple(slug: string) {
    if (selectedPrinciples.includes(slug)) {
      setSelectedPrinciples(prev => prev.filter(s => s !== slug))
    } else {
      if (selectedPrinciples.length >= 2) return
      setSelectedPrinciples(prev => [...prev, slug])
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Cargando...</div>

  // Setup = no existe. Evaluación = existe (siempre editable, incluso si ya está completado)
  const isSetup = !phoneScreen
  // Una vez enviada la evaluación (completed_at), queda bloqueada — no se puede editar
  const isEvaluation = !!phoneScreen && !phoneScreen.completed_at
  const isCompleted = !!phoneScreen?.completed_at
  const selectedPrincipleData = TRUORA_PRINCIPLES.filter(p => selectedPrinciples.includes(p.slug))

  if (isDone && phoneScreen?.decision) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${phoneScreen.decision === 'pass' ? 'bg-green-100' : 'bg-red-100'}`}>
          {phoneScreen.decision === 'pass'
            ? <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            : <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          }
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          {phoneScreen.decision === 'pass' ? 'Phone screen completado — Pasa al loop' : 'Phone screen completado — No avanza'}
        </h1>
        <p className="text-sm text-gray-500">
          {phoneScreen.decision === 'pass'
            ? 'El recruiter recibirá una notificación para abrir el interview loop.'
            : 'El recruiter generará el email de feedback para el candidato.'}
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-gray-500 mb-1">Phone Screen</p>
        <h1 className="text-xl font-semibold text-gray-900">{(candidate as any)?.full_name}</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-gray-500">{(candidate as any)?.email}</span>
          {(candidate as any)?.linkedin_url && (
            <a href={(candidate as any).linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#0800FF] hover:underline">LinkedIn →</a>
          )}
        </div>
      </div>

      {/* Banner: grabar sesión */}
      {!isCompleted && (
        <div className="bg-[#0800FF] rounded-xl p-4 text-white">
          <p className="text-sm font-semibold mb-1">📹 Recuerda grabar esta sesión en Google Meet</p>
          <p className="text-xs opacity-80 leading-relaxed">
            Después de la entrevista, el agente de AI analiza la grabación como un entrevistador independiente
            y le da al Bar Raiser una perspectiva adicional. Para habilitarlo:
          </p>
          <ol className="text-xs opacity-80 mt-2 space-y-0.5 list-none">
            <li>1. Inicia la grabación al comenzar Google Meet → <strong>Actividades → Grabar</strong></li>
            <li>2. Al terminar, la grabación queda en tu Google Drive automáticamente</li>
            <li>3. Vuelve aquí después de enviar tu evaluación — puedes pegar el link de Drive o subir el archivo directamente</li>
          </ol>
        </div>
      )}

      {/* Contexto del screening AI */}
      {screening && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Screening AI</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              screening.classification === 'green' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {screening.classification === 'green' ? '🟢 Avanzar' : '🟡 Posible'}
            </span>
            {screening.suggested_capa && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${screening.suggested_capa === 'liderazgo' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                Sugerido: {screening.suggested_capa}
              </span>
            )}
          </div>
          {screening.bucket_reason && <p className="text-sm text-gray-600 font-medium mb-1">{screening.bucket_reason}</p>}
          {screening.ai_summary && <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line">{screening.ai_summary}</p>}
        </div>
      )}

      {/* SETUP: Selección de principios */}
      {isSetup && (
        <form action={setupPhoneScreen}>
          <input type="hidden" name="process_candidate_id" value={pcId} />

          {/* Principios */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Selecciona 2 principios a evaluar</h2>
              <p className="text-xs text-gray-500 mt-0.5">Elige los más relevantes para este rol. Los seleccionados cargan abajo con sus notas.</p>
            </div>

            {/* Grid de los 8 principios */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              {TRUORA_PRINCIPLES.map(p => {
                const isSelected = selectedPrinciples.includes(p.slug)
                const isDisabled = !isSelected && selectedPrinciples.length >= 2
                const dimColors = DIMENSION_COLORS[p.dimension]
                return (
                  <button
                    key={p.slug}
                    type="button"
                    onClick={() => togglePrinciple(p.slug)}
                    disabled={isDisabled}
                    className={`text-left p-3 rounded-xl border-2 transition-all relative ${
                      isSelected
                        ? 'border-[#0800FF] bg-[#E8E7FF]'
                        : isDisabled
                        ? 'border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`text-xs font-medium px-1.5 py-0.5 rounded-full inline-block mb-1.5 ${dimColors.bg} ${dimColors.text}`}>
                      {p.id}
                    </div>
                    <p className={`text-xs font-semibold leading-tight ${isSelected ? 'text-[#0800FF]' : 'text-gray-800'}`}>
                      {p.name}
                    </p>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-4 h-4 bg-[#0800FF] rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                        </svg>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Principios seleccionados con área de notas — solo en setup */}
            {selectedPrinciples.map(slug => <input key={slug} type="hidden" name="principles" value={slug} />)}

            {selectedPrincipleData.length > 0 && (
              <div className="space-y-3 border-t border-gray-100 pt-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Principios seleccionados</p>
                {selectedPrincipleData.map(p => (
                  <div key={p.slug} className="bg-[#E8E7FF] rounded-xl p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-sm font-semibold text-[#0800FF]">{p.name}</p>
                        <p className="text-xs text-[#0800FF] opacity-75 mt-0.5 leading-relaxed">{p.definition}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3 mb-3">
                      <div className="bg-green-50 rounded-lg p-2">
                        <p className="text-xs font-medium text-green-700 mb-1">Señales hire</p>
                        {p.signals.slice(0, 2).map((s, i) => <p key={i} className="text-xs text-green-800 leading-snug mb-0.5">• {s}</p>)}
                      </div>
                      <div className="bg-red-50 rounded-lg p-2">
                        <p className="text-xs font-medium text-red-700 mb-1">Anti-señales</p>
                        {p.antiSignals.slice(0, 2).map((s, i) => <p key={i} className="text-xs text-red-800 leading-snug mb-0.5">• {s}</p>)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Competencias del rol */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Competencias específicas del rol</h2>
            <p className="text-xs text-gray-500 mb-3">Agrega las habilidades técnicas o funcionales que debes evaluar en esta entrevista.</p>
            <div className="space-y-2">
              {competencies.map((comp, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    name="competencies"
                    value={comp}
                    onChange={e => {
                      const next = [...competencies]
                      next[i] = e.target.value
                      setCompetencies(next)
                    }}
                    placeholder={`Ej: Experiencia en ventas B2B enterprise, manejo de SQL, etc.`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF]"
                  />
                  {competencies.length > 1 && (
                    <button type="button" onClick={() => setCompetencies(prev => prev.filter((_, j) => j !== i))}
                      className="text-gray-400 hover:text-red-500 px-1">✕</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setCompetencies(prev => [...prev, ''])}
                className="text-xs text-[#0800FF] hover:underline font-medium">+ Agregar competencia</button>
            </div>
          </div>

          {/* Scheduling */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Agendar entrevista</h2>
            <p className="text-xs text-gray-500 mb-3">Agrega tu link de agendamiento y el candidato recibirá una invitación para agendar directamente.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tu Link de agendamiento</label>
                <input
                  type="url"
                  name="calendly_url"
                  value={calendlyUrl}
                  onChange={e => setCalendlyUrl(e.target.value)}
                  placeholder="https://calendar.google.com/calendar/appointments/schedules/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF]"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="send_invite" value="true" checked={sendInvite}
                  onChange={e => setSendInvite(e.target.checked)}
                  className="rounded border-gray-300 text-[#0800FF] focus:ring-[#0800FF]" />
                <span className="text-sm text-gray-700">Enviar email de invitación al candidato con el link de agendamiento</span>
              </label>
              {!calendlyUrl && sendInvite && (
                <p className="text-xs text-amber-600">Agrega tu Link de agendamiento para enviar la invitación, o desmarca la opción para configurar el agendamiento manualmente.</p>
              )}
            </div>
          </div>

          {/* HM — mostrar siempre, editable si no está asignado */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Hiring Manager</h2>
            <p className="text-xs text-gray-500 mb-3">
              {processHmId ? 'HM asignado al proceso. Puedes cambiarlo si es necesario.' : 'Este proceso no tiene HM asignado. Selecciónalo aquí para continuar.'}
            </p>
            <input type="hidden" name="hm_email_override" value={hmEmail} />
            <PersonSearch
              value={hmEmail}
              onChange={(email) => setHmEmail(email)}
              placeholder="Buscar Hiring Manager..."
            />
            {!processHmId && !hmEmail && (
              <p className="text-xs text-amber-600 mt-2">⚠ Debes asignar un HM para configurar el phone screen.</p>
            )}
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4"><p className="text-sm text-red-700">{error}</p></div>}

          <div className="flex gap-3">
            <button type="submit"
              disabled={selectedPrinciples.length !== 2 || competencies.filter(c => c.trim()).length === 0 || !hmEmail}
              className="btn-truora disabled:opacity-50 disabled:cursor-not-allowed">
              Guardar y {sendInvite && calendlyUrl ? 'enviar invitación al candidato' : 'continuar'}
            </button>
          </div>
        </form>
      )}

      {/* LECTURA: evaluación enviada y bloqueada */}
      {isCompleted && (
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-gray-600 font-medium">
              Evaluación enviada el {new Date(phoneScreen.completed_at).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <span className={`text-xs font-semibold px-2.5 py-1.5 rounded-full ${phoneScreen?.decision === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {phoneScreen?.decision === 'pass' ? '✓ Pasa al loop' : '✗ No avanza'}
            </span>
          </div>

          {selectedPrincipleData.map(p => {
            const noteData = phoneScreen?.principle_notes?.[p.slug]
            const rating = noteData?.rating ?? null
            const notes = noteData?.notes ?? null
            const question = noteData?.question ?? null
            return (
              <div key={p.slug} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#E8E7FF] text-[#0800FF]">{p.name}</span>
                  {rating && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      rating === 'muy_fuerte' || rating === 'fuerte' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {rating === 'muy_fuerte' ? '↑↑ Muy fuerte' : rating === 'fuerte' ? '↑ Fuerte' : rating === 'debil' ? '↓ Débil' : '↓↓ Muy débil'}
                    </span>
                  )}
                </div>
                {question && (
                  <div className="bg-[#E8E7FF] rounded-lg px-3 py-2 mb-2">
                    <p className="text-xs font-semibold text-[#0800FF] mb-0.5">Pregunta utilizada:</p>
                    <p className="text-xs text-gray-700">{question}</p>
                  </div>
                )}
                {notes ? (
                  <p className="text-sm text-gray-700 leading-relaxed">{notes}</p>
                ) : (
                  <p className="text-xs text-gray-400 italic">Sin notas registradas.</p>
                )}
              </div>
            )
          })}

          {phoneScreen?.role_competencies?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Competencias evaluadas</p>
              <div className="flex flex-wrap gap-2">
                {phoneScreen.role_competencies.map((c: string, i: number) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">{c}</span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Evaluación final</p>
            <p className="text-sm text-gray-700 leading-relaxed">{phoneScreen?.overall_summary ?? <span className="text-gray-400 italic">Sin resumen.</span>}</p>
          </div>

          {/* Análisis de sesión con Gemini — disponible siempre después de completar */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Análisis de sesión — Gemini</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Sube la grabación de la entrevista. Gemini emite su propio veredicto para el Bar Raiser,
                independientemente de tu decisión de avance.
              </p>
            </div>
            <SessionAnalysisUploader
              processCandidateId={pcId}
              type="phone_screen"
              existingAnalysis={phoneScreen?.session_analysis ?? null}
            />
          </div>
        </div>
      )}

      {isEvaluation && (
        <form action={submitPhoneScreenEvaluation}>
          <input type="hidden" name="process_candidate_id" value={pcId} />
          {/* Hidden fields para competencias activas y ratings */}
          {activeCompetencies.map(c => <input key={c} type="hidden" name="competencies" value={c} />)}
          {Object.entries(principleRatings).map(([slug, rating]) => (
            <input key={slug} type="hidden" name={`rating_${slug}`} value={rating} />
          ))}
          {Object.entries(principleQuestions).map(([slug, q]) => q ? (
            <input key={slug} type="hidden" name={`question_${slug}`} value={q} />
          ) : null)}
          {/* Hidden fields para principios extra y sus notas */}
          {extraPrinciples.map(slug => (
            <span key={slug}>
              <input type="hidden" name="extra_principles" value={slug} />
              <input type="hidden" name={`principle_note_${slug}`} value={extraPrincipleNotes[slug] ?? ''} />
            </span>
          ))}

          {/* Principios asignados con señales y notas */}
          {selectedPrincipleData.map(p => (
            <div key={p.slug} className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#E8E7FF] text-[#0800FF]">{p.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-green-700 mb-1.5">Señales hire</p>
                  {p.signals.map((s, i) => <p key={i} className="text-xs text-green-800 leading-snug mb-1">• {s}</p>)}
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-red-700 mb-1.5">Anti-señales</p>
                  {p.antiSignals.map((s, i) => <p key={i} className="text-xs text-red-800 leading-snug mb-1">• {s}</p>)}
                </div>
              </div>
              <QuestionBankSelector
                principle={p}
                selectedQuestion={principleQuestions[p.slug] ?? null}
                onSelect={q => setPrincipleQuestions(prev => ({ ...prev, [p.slug]: q }))}
              />
              <PrincipleRatingSelector
                slug={p.slug}
                value={principleRatings[p.slug] ?? null}
                onChange={(slug, rating) => setPrincipleRatings(prev => ({ ...prev, [slug]: rating }))}
              />
              <textarea
                name={`principle_note_${p.slug}`}
                rows={3}
                placeholder="Cita ejemplos específicos del candidato. Esto lo leerá el Bar Raiser."
                defaultValue={phoneScreen?.principle_notes?.[p.slug]?.notes ?? phoneScreen?.principle_notes?.[p.slug] ?? ''}
                className="w-full px-3 py-2 mt-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF] resize-none"
              />
            </div>
          ))}

          {/* Competencias: lista editable sin notas */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Competencias evaluadas</h2>
                <p className="text-xs text-gray-500 mt-0.5">Puedes quitar o agregar competencias. No requieren nota — la evidencia va en los principios.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {activeCompetencies.map(comp => (
                <span key={comp} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700">
                  {comp}
                  <button type="button" onClick={() => setActiveCompetencies(prev => prev.filter(c => c !== comp))}
                    className="text-gray-400 hover:text-red-500 ml-0.5 text-base leading-none">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCompetency}
                onChange={e => setNewCompetency(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (newCompetency.trim()) {
                      setActiveCompetencies(prev => [...prev, newCompetency.trim()])
                      setNewCompetency('')
                    }
                  }
                }}
                placeholder="Agregar competencia..."
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF]"
              />
              <button type="button"
                onClick={() => { if (newCompetency.trim()) { setActiveCompetencies(prev => [...prev, newCompetency.trim()]); setNewCompetency('') }}}
                className="px-3 py-1.5 border border-[#0800FF] text-[#0800FF] rounded-lg text-sm hover:bg-[#E8E7FF]">
                + Agregar
              </button>
            </div>
          </div>

          {/* Principios adicionales identificados */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-gray-900">¿Identificaste algún otro principio en la entrevista?</h2>
              <p className="text-xs text-gray-500 mt-0.5">Opcional — si el candidato mostró evidencia de otros principios no asignados, agrégalos aquí.</p>
            </div>

            {extraPrinciples.length > 0 && (
              <div className="space-y-4 mb-4">
                {extraPrinciples.map(slug => {
                  const p = TRUORA_PRINCIPLES.find(pr => pr.slug === slug)
                  if (!p) return null
                  return (
                    <div key={slug} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#E8E7FF] text-[#0800FF]">{p.name}</span>
                        <button type="button" onClick={() => setExtraPrinciples(prev => prev.filter(s => s !== slug))}
                          className="text-xs text-red-400 hover:text-red-600">Quitar</button>
                      </div>
                      <textarea
                        rows={2}
                        value={extraPrincipleNotes[slug] ?? ''}
                        onChange={e => setExtraPrincipleNotes(prev => ({ ...prev, [slug]: e.target.value }))}
                        placeholder="¿Qué evidencia observaste para este principio?"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF] resize-none"
                      />
                    </div>
                  )
                })}
              </div>
            )}

            {/* Selector de principios restantes */}
            <div className="flex flex-wrap gap-2">
              {TRUORA_PRINCIPLES
                .filter(p => !selectedPrinciples.includes(p.slug) && !extraPrinciples.includes(p.slug))
                .map(p => (
                  <button key={p.slug} type="button"
                    onClick={() => setExtraPrinciples(prev => [...prev, p.slug])}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-gray-300 text-gray-600 hover:border-[#0800FF] hover:text-[#0800FF] hover:bg-[#E8E7FF] transition-colors">
                    + {p.name}
                  </button>
                ))
              }
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Notas finales</h2>
            <p className="text-xs text-gray-500 mb-4">
              Sintetiza lo que encontraste en <strong>todos</strong> los principios evaluados
              ({[...selectedPrinciples, ...extraPrinciples].length} en total) y explica con evidencia
              concreta por qué esta persona debe o no entrar a Truora.
            </p>

            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              ¿Por qué debería (o no) entrar esta persona a Truora?
            </label>
            <textarea
              name="overall_summary"
              rows={5}
              placeholder={`Basado en los ${[...selectedPrinciples, ...extraPrinciples].length} principios que evaluaste, ¿qué patrón ves en esta persona? ¿Qué evidencia concreta respalda tu decisión? Sé directo — este texto lo leerá el Bar Raiser.`}
              defaultValue={phoneScreen?.overall_summary ?? ''}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF] resize-none mb-3"
            />
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <p className="text-xs text-amber-800 font-medium">Esta es la parte más importante de toda la entrevista.</p>
              <p className="text-xs text-amber-700 mt-0.5">El Bar Raiser lee este texto en el debrief para tomar su decisión final. Sé concreto, cita evidencia real y no dejes ambigüedades.</p>
            </div>
            <p className="text-sm font-medium text-gray-900 mb-3">¿El candidato avanza al interview loop?</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'pass', label: '✓ Sí avanza', desc: 'El candidato pasa al loop completo', color: 'border-green-400 bg-green-50 text-green-800' },
                { value: 'no_pass', label: '✗ No avanza', desc: 'El candidato no cumple el estándar', color: 'border-red-400 bg-red-50 text-red-800' },
              ].map(opt => (
                <label key={opt.value} className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer ${opt.color}`}>
                  <input type="radio" name="decision" value={opt.value} className="mt-0.5" required />
                  <div>
                    <p className="text-sm font-semibold">{opt.label}</p>
                    <p className="text-xs opacity-75 mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-truora">Guardar evaluación</button>
        </form>
      )}
    </div>
  )
}
