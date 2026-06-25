'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { signalToPrincipleSlug } from '@/lib/principles-data'

type Classification = 'green' | 'talent_pool' | 'yellow' | 'red'

interface CandidateCard {
  pcId: string
  candidateId: string
  name: string
  email: string
  classification: Classification | null
  bucketReason: string | null
  aiSummary: string | null
  truoraSignals: string[]
  antiSignals: string[]
  strengths: string[]
  gaps: string[]
  screeningId: string | null
  status: string
  truoraFitLevel: string | null
  roleFitLevel: string | null
  suggestedCapa: string | null
  identityMatch: string | null
  identityNotes: string | null
}

const COL_CONFIG = {
  green:       { label: 'Avanzar',      emoji: '🟢', bg: 'bg-green-50',   border: 'border-green-200' },
  talent_pool: { label: 'Talent Pool',  emoji: '🟠', bg: 'bg-orange-50',  border: 'border-orange-200' },
  yellow:      { label: 'Posible',      emoji: '🟡', bg: 'bg-yellow-50',  border: 'border-yellow-200' },
  red:         { label: 'Descartar',    emoji: '🔴', bg: 'bg-red-50',     border: 'border-red-200' },
}

export default function ScreeningPage() {
  const params = useParams()
  const processId = params.id as string
  const supabase = createClient()

  const [process, setProcess] = useState<any>(null)
  const [candidates, setCandidates] = useState<CandidateCard[]>([])
  const [loading, setLoading] = useState(true)
  const [screeningInProgress, setScreeningInProgress] = useState<Set<string>>(new Set())
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [challengeCard, setChallengeCard] = useState<string | null>(null)
  const [challengeInput, setChallengeInput] = useState('')
  const [challengeLoading, setChallengeLoading] = useState(false)
  const [challengeHistory, setChallengeHistory] = useState<Record<string, { role: string; content: string }[]>>({})

  useEffect(() => {
    loadData()
  }, [processId])

  async function loadData() {
    setLoading(true)

    const { data: proc } = await supabase
      .from('processes')
      .select('id, title, entry_mode, capa_intencional, status')
      .eq('id', processId)
      .single()
    setProcess(proc)

    const { data: pcs } = await supabase
      .from('process_candidates')
      .select(`
        id, status,
        candidate:candidates(id, full_name, email),
        screening:screenings(
          id, classification, bucket_reason, ai_summary,
          truora_signals, anti_signals, strengths, gaps,
          truora_fit_level, role_fit_level, suggested_capa,
          identity_match, identity_notes
        )
      `)
      .eq('process_id', processId)
      .order('applied_at', { ascending: false })

    const cards: CandidateCard[] = (pcs ?? []).map((pc: any) => {
      const s = Array.isArray(pc.screening) ? pc.screening[0] : pc.screening
      return {
        pcId: pc.id,
        candidateId: pc.candidate?.id,
        name: pc.candidate?.full_name ?? '—',
        email: pc.candidate?.email ?? '—',
        classification: s?.classification ?? null,
        bucketReason: s?.bucket_reason ?? null,
        aiSummary: s?.ai_summary ?? null,
        truoraSignals: s?.truora_signals ?? [],
        antiSignals: s?.anti_signals ?? [],
        strengths: s?.strengths ?? [],
        gaps: s?.gaps ?? [],
        screeningId: s?.id ?? null,
        status: pc.status,
        truoraFitLevel: s?.truora_fit_level ?? null,
        roleFitLevel: s?.role_fit_level ?? null,
        suggestedCapa: s?.suggested_capa ?? null,
        identityMatch: s?.identity_match ?? null,
        identityNotes: s?.identity_notes ?? null,
      }
    })
    setCandidates(cards)
    setLoading(false)
  }

  async function runScreening(pcId: string) {
    setScreeningInProgress(prev => new Set(prev).add(pcId))
    try {
      const res = await fetch('/api/screening', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processCandidateId: pcId }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(`Error: ${err.error}`)
        return
      }
      await loadData()
    } catch (err: any) {
      alert(`Error al correr el screening: ${err.message}`)
    } finally {
      setScreeningInProgress(prev => {
        const next = new Set(prev)
        next.delete(pcId)
        return next
      })
    }
  }

  async function overrideClassification(pcId: string, screeningId: string, newClass: Classification, reasoning?: string) {
    const card = candidates.find(c => c.pcId === pcId)
    const originalClass = card?.classification

    await supabase
      .from('screenings')
      .update({ recruiter_override: newClass, classification: newClass })
      .eq('id', screeningId)

    // Guardar feedback para calibración si es un cambio real
    if (originalClass && originalClass !== newClass) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('screening_feedback').insert({
          screening_id: screeningId,
          recruiter_id: user.id,
          ai_classification: originalClass,
          recruiter_classification: newClass,
          recruiter_reasoning: reasoning ?? null,
          agreed: false,
        })
      }
    }

    setCandidates(prev =>
      prev.map(c => c.pcId === pcId ? { ...c, classification: newClass } : c)
    )
  }

  async function sendChallenge(pcId: string) {
    if (!challengeInput.trim() || challengeLoading) return
    const msg = challengeInput.trim()
    setChallengeInput('')
    setChallengeLoading(true)

    const history = challengeHistory[pcId] ?? []
    const newHistory = [...history, { role: 'user', content: msg }]
    setChallengeHistory(prev => ({ ...prev, [pcId]: newHistory }))

    try {
      const res = await fetch('/api/screening/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          processCandidateId: pcId,
          message: msg,
          conversationHistory: history,
        }),
      })
      const data = await res.json()
      if (data.response) {
        const updated = [...newHistory, { role: 'assistant', content: data.response }]
        setChallengeHistory(prev => ({ ...prev, [pcId]: updated }))
      }
      if (data.classificationUpdate) {
        await loadData()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setChallengeLoading(false)
    }
  }

  const unscreened   = candidates.filter(c => !c.classification)
  const green        = candidates.filter(c => c.classification === 'green')
  const talent_pool  = candidates.filter(c => c.classification === 'talent_pool')
  const yellow       = candidates.filter(c => c.classification === 'yellow')
  const red          = candidates.filter(c => c.classification === 'red')

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Cargando...</div>
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href={`/processes/${processId}`} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2">
            ← {process?.title}
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-gray-900">Screening de candidatos</h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">BETA</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {candidates.length} candidatos · {green.length} para avanzar · {unscreened.length} sin screening
          </p>
          <p className="text-xs text-amber-600 mt-1 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 max-w-xl">
            El agente está en entrenamiento. Revisa el perfil antes de decidir — si cambias la clasificación, el agente aprende de tu criterio.
          </p>
        </div>
        <Link href={`/processes/${processId}/candidates/add`} className="btn-truora text-sm">
          + Agregar candidato
        </Link>
      </div>

      {/* Sin screening */}
      {unscreened.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">Pendientes de screening ({unscreened.length})</span>
            <p className="text-xs text-gray-400 mt-0.5">Estos candidatos no tienen análisis — puede ser que el CV estuviera vacío al momento de aplicar.</p>
          </div>
          <div className="divide-y divide-gray-100">
            {unscreened.map(c => (
              <div key={c.pcId} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.email}</p>
                </div>
                <button
                  onClick={() => runScreening(c.pcId)}
                  disabled={screeningInProgress.has(c.pcId)}
                  className="text-xs px-3 py-1.5 bg-truora-primary text-white rounded-lg hover:bg-truora-primary-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {screeningInProgress.has(c.pcId) ? (
                    <>
                      <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Analizando...
                    </>
                  ) : 'Correr screening'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kanban */}
      {candidates.some(c => c.classification) && (
        <div className="grid grid-cols-4 gap-4">
          {(['green', 'talent_pool', 'yellow', 'red'] as Classification[]).map(col => {
            const colCandidates = candidates.filter(c => c.classification === col)
            const cfg = COL_CONFIG[col]
            return (
              <div key={col} className={`rounded-xl border ${cfg.border} overflow-hidden`}>
                <div className={`px-4 py-3 ${cfg.bg} border-b ${cfg.border}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">{cfg.emoji}</span>
                    <span className="text-sm font-semibold text-gray-900">{cfg.label}</span>
                    <span className="text-xs text-gray-500 ml-auto">{colCandidates.length}</span>
                  </div>
                </div>
                <div className="divide-y divide-gray-100 bg-white">
                  {colCandidates.length === 0 && (
                    <p className="px-4 py-6 text-xs text-gray-400 text-center">Sin candidatos</p>
                  )}
                  {colCandidates.map(c => (
                    <div key={c.pcId} className="p-4">
                      <div
                        className="cursor-pointer"
                        onClick={() => setExpandedCard(expandedCard === c.pcId ? null : c.pcId)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{c.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{c.email}</p>
                          </div>
                          {c.identityMatch === 'mismatch' && (
                            <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded flex-shrink-0">⚠ Identidad</span>
                          )}
                        </div>

                        {/* Bucket reason — siempre visible */}
                        {c.bucketReason && (
                          <p className="text-xs text-gray-600 mt-2 leading-relaxed">{c.bucketReason}</p>
                        )}

                        {/* Fit levels + capa sugerida */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {c.truoraFitLevel && (
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                              c.truoraFitLevel === 'high' ? 'bg-green-100 text-green-700' :
                              c.truoraFitLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              Truora {c.truoraFitLevel === 'high' ? 'alto' : c.truoraFitLevel === 'medium' ? 'medio' : 'bajo'}
                            </span>
                          )}
                          {c.suggestedCapa && (
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                              c.suggestedCapa === 'liderazgo' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {c.suggestedCapa === 'liderazgo' ? 'Liderazgo' : 'Funcional'}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-gray-400 mt-2">{expandedCard === c.pcId ? '▲ menos' : '▼ ver análisis'}</p>
                      </div>

                      {/* Expandido */}
                      {expandedCard === c.pcId && (
                        <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
                          {/* Alerta de identidad */}
                          {c.identityMatch === 'mismatch' && c.identityNotes && (
                            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                              <p className="text-xs text-red-700 font-medium">⚠ Posible CV ajeno</p>
                              <p className="text-xs text-red-600 mt-0.5">{c.identityNotes}</p>
                            </div>
                          )}

                          {/* Resumen conciso */}
                          {c.aiSummary && (
                            <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">
                              {c.aiSummary}
                            </p>
                          )}

                          {/* Señales Truora — botones con link al principio */}
                          {c.truoraSignals.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-2">Señales Truora detectadas</p>
                              <div className="flex flex-wrap gap-1.5">
                                {c.truoraSignals.map((s, i) => {
                                  const slug = signalToPrincipleSlug(s)
                                  const label = s.includes(':') ? s.split(':')[0].trim() : s
                                  const evidence = s.includes(':') ? s.split(':').slice(1).join(':').trim() : s
                                  return slug ? (
                                    <Link
                                      key={i}
                                      href={`/principles/${slug}`}
                                      target="_blank"
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-truora-primary-soft text-truora-primary hover:bg-truora-primary hover:text-white transition-colors"
                                      title={evidence}
                                    >
                                      {label}
                                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                    </Link>
                                  ) : (
                                    <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                      {label}
                                    </span>
                                  )
                                })}
                              </div>
                              {/* Evidencia de la primera señal visible */}
                              {c.truoraSignals[0]?.includes(':') && (
                                <p className="text-xs text-gray-500 mt-2 leading-snug">
                                  {c.truoraSignals[0].split(':').slice(1).join(':').trim()}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Anti-señales — lista simple, sin botón */}
                          {c.antiSignals.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1.5">Red flags</p>
                              <ul className="space-y-1">
                                {c.antiSignals.map((s, i) => (
                                  <li key={i} className="text-xs text-red-700 flex gap-1.5 leading-snug">
                                    <span className="flex-shrink-0 mt-0.5">−</span>
                                    {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Dimensiones de fit */}
                          {(c as any).truoraFitLevel && (
                            <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                              <span className="text-xs text-gray-500">Truora fit: <strong>{(c as any).truoraFitLevel}</strong></span>
                              {(c as any).roleFitLevel && (c as any).roleFitLevel !== 'n/a' && (
                                <span className="text-xs text-gray-500">· Rol fit: <strong>{(c as any).roleFitLevel}</strong></span>
                              )}
                              {(c as any).suggestedCapa && (
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${(c as any).suggestedCapa === 'liderazgo' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                                  {(c as any).suggestedCapa === 'liderazgo' ? 'Liderazgo' : 'Funcional'}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Acciones */}
                          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-100">
                            {col === 'green' && (
                              <Link
                                href={`/processes/${processId}/candidates/${c.pcId}/phone-screen`}
                                className="text-xs px-2.5 py-1 bg-truora-primary text-white rounded-lg hover:bg-truora-primary-hover inline-block"
                              >
                                Configurar phone screen →
                              </Link>
                            )}
                            {col === 'red' && (
                              <Link
                                href={`/processes/${processId}/candidates/${c.pcId}/feedback`}
                                className="text-xs px-2.5 py-1 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 inline-block"
                              >
                                Dar feedback →
                              </Link>
                            )}
                            {col !== 'green' && (
                              <button onClick={() => overrideClassification(c.pcId, c.screeningId!, 'green')}
                                className="text-xs px-2 py-1 border border-green-300 text-green-700 rounded-lg hover:bg-green-50">→ 🟢</button>
                            )}
                            {col !== 'talent_pool' && (
                              <button onClick={() => overrideClassification(c.pcId, c.screeningId!, 'talent_pool')}
                                className="text-xs px-2 py-1 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50">→ 🟠</button>
                            )}
                            {col !== 'yellow' && (
                              <button onClick={() => overrideClassification(c.pcId, c.screeningId!, 'yellow')}
                                className="text-xs px-2 py-1 border border-yellow-300 text-yellow-700 rounded-lg hover:bg-yellow-50">→ 🟡</button>
                            )}
                            {col !== 'red' && (
                              <button onClick={() => overrideClassification(c.pcId, c.screeningId!, 'red')}
                                className="text-xs px-2 py-1 border border-red-300 text-red-700 rounded-lg hover:bg-red-50">→ 🔴</button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); setChallengeCard(challengeCard === c.pcId ? null : c.pcId) }}
                              className="text-xs px-2 py-1 border border-violet-300 text-violet-700 rounded-lg hover:bg-violet-50"
                            >
                              {challengeCard === c.pcId ? 'Cerrar chat' : 'Cuestionar'}
                            </button>
                          </div>

                          {/* Challenge chat */}
                          {challengeCard === c.pcId && (
                            <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
                              <p className="text-xs font-medium text-gray-500">
                                Cuestiona la clasificación — el agente responde con evidencia del CV
                              </p>

                              {/* Historial */}
                              {(challengeHistory[c.pcId] ?? []).length > 0 && (
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                  {(challengeHistory[c.pcId] ?? []).map((msg, i) => (
                                    <div key={i} className={`text-xs p-2 rounded-lg leading-relaxed ${
                                      msg.role === 'user'
                                        ? 'bg-truora-primary-soft text-truora-primary ml-4'
                                        : 'bg-gray-100 text-gray-700 mr-4'
                                    }`}>
                                      <span className="font-medium">{msg.role === 'user' ? 'Tú' : 'Agente'}:</span>{' '}
                                      {msg.content}
                                    </div>
                                  ))}
                                  {challengeLoading && (
                                    <div className="bg-gray-100 text-gray-400 text-xs p-2 rounded-lg mr-4">
                                      Analizando...
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Input */}
                              <div className="flex gap-1.5">
                                <input
                                  type="text"
                                  value={challengeInput}
                                  onChange={e => setChallengeInput(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && sendChallenge(c.pcId)}
                                  placeholder="¿Por qué lo clasificaste así? ¿Consideraste su experiencia en..."
                                  className="flex-1 text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-400"
                                  disabled={challengeLoading}
                                />
                                <button
                                  onClick={() => sendChallenge(c.pcId)}
                                  disabled={!challengeInput.trim() || challengeLoading}
                                  className="text-xs px-2.5 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
                                >
                                  →
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {candidates.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <p className="text-gray-500 text-sm">No hay candidatos en este proceso todavía.</p>
          <Link
            href={`/processes/${processId}/candidates/add`}
            className="mt-3 inline-block text-sm text-truora-primary hover:underline font-medium"
          >
            Agregar el primero →
          </Link>
        </div>
      )}
    </div>
  )
}
