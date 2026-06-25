'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PrincipleRatingSelector, type PrincipleRating } from '@/components/principle-rating'
import { QuestionBankSelector } from '@/components/question-bank-selector'
import { SessionAnalysisUploader } from '@/components/session-analysis'
import { getPrincipleBySlug, TRUORA_PRINCIPLES } from '@/lib/principles-data'

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
  const [extraPrinciples, setExtraPrinciples] = useState<string[]>([])
  const [showPrinciplePicker, setShowPrinciplePicker] = useState(false)

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
      if (user) {
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

          // Cargar todos los principios evaluados (todos son libres)
          const evaluatedSlugs = Object.keys(notes).filter(slug => notes[slug])
          if (evaluatedSlugs.length) setExtraPrinciples(evaluatedSlugs)
        }
      }
    }
    setLoading(false)
  }

  async function saveEvaluation(sign = false) {
    if (!currentUser) return
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

  const myPrinciples: any[] = []

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
                className="text-xs text-truora-primary hover:underline">LinkedIn →</a>
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

      {/* Banner: notas con Gemini */}
      {!isSigned && (
        <div className="rounded-xl p-4 flex items-start gap-3 bg-truora-primary-soft border border-truora-primary/30">
          <span className="text-lg flex-shrink-0">✦</span>
          <div>
            <p className="text-sm font-semibold text-truora-primary">
              Toma notas con Gemini durante la entrevista
            </p>
            <p className="text-xs mt-0.5 leading-relaxed text-truora-primary-hover">
              Activa Gemini en Google Meet para que transcriba la sesión. Luego usa esas notas aquí para construir una evaluación más completa y sólida antes de enviarla al Bar Raiser.
            </p>
          </div>
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
          <p className="text-xs text-gray-400">Solo ves el perfil del candidato — el screening y phone screen son visibles después de firmar.</p>

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

      {/* Bloque 2: Principios evaluados */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Principios evaluados</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Selecciona los principios que evaluaste durante la entrevista. Puedes evaluar desde 1 hasta los 8 principios.
            </p>
          </div>
          {!isSigned && extraPrinciples.length > 0 && (
            <button
              type="button"
              onClick={() => setShowPrinciplePicker(v => !v)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors"
              style={{
                color: 'var(--truora-primary)',
                borderColor: 'var(--truora-primary)',
                background: showPrinciplePicker ? 'var(--truora-primary-soft)' : 'transparent',
              }}
            >
              {showPrinciplePicker ? 'Cerrar ✕' : '+ Agregar principio'}
            </button>
          )}
        </div>

        {/* Picker — siempre visible si no hay principios aún, o cuando se activa */}
        {(extraPrinciples.length === 0 || showPrinciplePicker) && !isSigned && (
          <div
            className="rounded-xl border p-4 grid grid-cols-2 gap-2"
            style={{ background: 'var(--truora-bg-soft)', borderColor: 'var(--truora-line)' }}
          >
            {TRUORA_PRINCIPLES
              .filter(p => !extraPrinciples.includes(p.slug))
              .map(p => (
                <button
                  key={p.slug}
                  type="button"
                  onClick={() => {
                    setExtraPrinciples(prev => [...prev, p.slug])
                    setExpandedPrinciple(p.slug)
                    setShowPrinciplePicker(false)
                  }}
                  className="text-left p-3 rounded-lg border border-gray-200 bg-white hover:border-truora-primary hover:bg-truora-primary-soft transition-all"
                >
                  <span
                    className="text-xs font-mono font-semibold"
                    style={{ color: 'var(--truora-primary)' }}
                  >
                    {p.id}
                  </span>
                  <p className="text-xs font-medium text-gray-800 mt-0.5 leading-tight">{p.name}</p>
                </button>
              ))}
            {TRUORA_PRINCIPLES.filter(p => !extraPrinciples.includes(p.slug)).length === 0 && (
              <p className="text-xs text-gray-400 col-span-2 text-center py-2">
                Ya evaluaste todos los principios disponibles.
              </p>
            )}
          </div>
        )}

        {/* Principle cards */}
        {extraPrinciples.map(slug => {
          const p = getPrincipleBySlug(slug)
          if (!p) return null
          const isExpanded = expandedPrinciple === slug
          const showQuestions = expandedQuestions === slug
          return (
            <div
              key={slug}
              className="bg-white rounded-xl border border-truora-primary/20 overflow-hidden"
            >
              <div
                className="px-5 py-4 cursor-pointer flex items-start justify-between gap-3"
                onClick={() => setExpandedPrinciple(isExpanded ? null : slug)}
              >
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <span
                    className="text-xs px-1.5 py-0.5 rounded font-semibold flex-shrink-0 mt-0.5"
                    style={{ background: 'var(--truora-primary-soft)', color: 'var(--truora-primary)' }}
                  >
                    {p.id}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{p.definition}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!isSigned && (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        setExtraPrinciples(prev => prev.filter(s => s !== slug))
                        setPrincipleNotes(prev => { const n = { ...prev }; delete n[slug]; return n })
                        setPrincipleRatings(prev => { const r = { ...prev }; delete r[slug]; return r })
                        setPrincipleQuestions(prev => { const q = { ...prev }; delete q[slug]; return q })
                      }}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      Quitar
                    </button>
                  )}
                  <span className="text-xs text-gray-400">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {isExpanded && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
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

                  <PrincipleRatingSelector
                    slug={p.slug}
                    value={principleRatings[p.slug] ?? null}
                    onChange={(s, rating) => setPrincipleRatings(prev => ({ ...prev, [s]: rating }))}
                    disabled={isSigned}
                  />

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Evidencia concreta
                    </label>
                    <textarea
                      rows={3}
                      value={principleNotes[p.slug] ?? ''}
                      onChange={e => setPrincipleNotes(prev => ({ ...prev, [p.slug]: e.target.value }))}
                      placeholder="Qué evidencia observaste de este principio durante la entrevista."
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-truora-primary resize-none"
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
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-truora-primary resize-none"
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
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-truora-primary resize-none"
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
