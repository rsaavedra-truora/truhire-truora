import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getPrincipleBySlug } from '@/lib/principles-data'
import { submitDecision } from '@/app/actions/debrief'
import { RatingBadge } from '@/components/principle-rating'

export default async function DebriefPage({
  params,
}: {
  params: { id: string; pcId: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Datos del candidato
  const { data: pc } = await supabase
    .from('process_candidates')
    .select(`
      id, status,
      candidate:candidates(full_name, email),
      process:processes(id, title, capa_intencional, entry_mode)
    `)
    .eq('id', params.pcId)
    .single()

  if (!pc) notFound()

  const candidate = pc.candidate as any
  const proc = pc.process as any

  // Todas las evaluaciones
  const [
    { data: screening },
    { data: phoneScreen },
    { data: loop },
    { data: existingDecision },
  ] = await Promise.all([
    supabase.from('screenings').select('classification, bucket_reason, ai_summary, truora_signals, strengths, gaps, suggested_capa').eq('process_candidate_id', params.pcId).maybeSingle(),
    supabase.from('phone_screens').select('assigned_principles, principle_notes, overall_summary, decision, session_analysis, hm:users!hm_id(full_name)').eq('process_candidate_id', params.pcId).maybeSingle(),
    supabase.from('loops').select('id, bar_raiser_id, ai_evaluation, assignments:loop_assignments(id, principles, interviewer:users!interviewer_id(id, full_name))').eq('process_candidate_id', params.pcId).maybeSingle(),
    supabase.from('decisions').select('*').eq('process_candidate_id', params.pcId).maybeSingle(),
  ])

  // Evaluaciones de los entrevistadores
  let evaluations: any[] = []
  if (loop) {
    const { data: evals } = await supabase
      .from('evaluations')
      .select('interviewer_id, principle_notes, summary, conclusion, recommendation, signed_at, session_analysis')
      .eq('loop_id', loop.id)
    evaluations = evals ?? []
  }

  const assignments = (loop?.assignments as any[]) ?? []
  const allSigned = assignments.length > 0 && assignments.every(a => {
    const interviewer = Array.isArray(a.interviewer) ? a.interviewer[0] : a.interviewer
    return evaluations.some(e => e.interviewer_id === interviewer?.id && e.signed_at)
  })

  const hireCount = evaluations.filter(e => e.recommendation === true).length
  const noHireCount = evaluations.filter(e => e.recommendation === false).length

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <Link href={`/processes/${params.id}/candidates/${params.pcId}`} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-3">
          ← {candidate?.full_name}
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Debrief — {candidate?.full_name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{proc?.title} · {proc?.capa_intencional === 'liderazgo' ? 'Liderazgo' : 'Funcional'}</p>
          </div>
          {existingDecision && (
            <span className={`text-sm px-3 py-1.5 rounded-full font-semibold flex-shrink-0 ${
              existingDecision.outcome === 'hire' ? 'bg-green-100 text-green-700'
              : existingDecision.outcome === 'no_hire' ? 'bg-red-100 text-red-700'
              : 'bg-blue-100 text-blue-700'
            }`}>
              {existingDecision.outcome === 'hire' ? '✓ Hire' : existingDecision.outcome === 'no_hire' ? '✗ No Hire' : '~ Otra capa'}
            </span>
          )}
        </div>
      </div>

      {/* Grid de principios × entrevistadores — PRIMERO para el Bar Raiser */}
      {(assignments.length > 0 || phoneScreen) && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Grid de evaluaciones por principio</p>
            <p className="text-xs text-gray-400 mt-0.5">Calificación que cada entrevistador asignó a cada principio evaluado. Hover sobre la calificación para ver las notas.</p>
          </div>
          <PrincipleGrid
            phoneScreen={phoneScreen}
            assignments={assignments}
            evaluations={evaluations}
            loopId={loop?.id ?? null}
          />
        </div>
      )}

      {/* Resumen de votos */}
      {evaluations.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Resumen de evaluaciones</p>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{hireCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">👍 Hire</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-500">{noHireCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">👎 No Hire</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-400">{evaluations.length - hireCount - noHireCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">Sin firmar</p>
            </div>
            {!allSigned && (
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg ml-auto">
                ⚠ Faltan evaluaciones por firmar
              </p>
            )}
          </div>
        </div>
      )}

      {/* Screening AI */}
      {screening && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Screening AI</p>
          <div className="flex gap-2 mb-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${screening.classification === 'green' ? 'bg-green-100 text-green-700' : screening.classification === 'yellow' ? 'bg-yellow-100 text-yellow-700' : 'bg-orange-100 text-orange-700'}`}>
              {screening.classification === 'green' ? '🟢 Avanzar' : screening.classification === 'yellow' ? '🟡 Posible' : '🟠 Talent Pool'}
            </span>
            {screening.suggested_capa && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${screening.suggested_capa === 'liderazgo' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                Capa sugerida: {screening.suggested_capa}
              </span>
            )}
          </div>
          {screening.bucket_reason && <p className="text-sm text-gray-700 font-medium mb-1">{screening.bucket_reason}</p>}
          {screening.ai_summary && <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{screening.ai_summary}</p>}
        </div>
      )}

      {/* Manager Screening — HM */}
      {phoneScreen && (() => {
        const psNotes: Record<string, any> = phoneScreen.principle_notes ?? {}
        const assignedSlugs: string[] = phoneScreen.assigned_principles ?? []
        const extraSlugs = Object.keys(psNotes).filter(s => !assignedSlugs.includes(s))
        const allSlugs = [...assignedSlugs, ...extraSlugs]
        return (
          <div className="bg-white rounded-xl border border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">
                Manager Screening — {(phoneScreen.hm as any)?.full_name ?? 'HM'}
              </p>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${phoneScreen.decision === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {phoneScreen.decision === 'pass' ? '✓ Pasa' : '✗ No pasa'}
              </span>
            </div>

            <div className="divide-y divide-gray-50">
              {/* Notas por principio */}
              {allSlugs.map(slug => {
                const p = getPrincipleBySlug(slug)
                const data = psNotes[slug]
                const isExtra = !assignedSlugs.includes(slug)
                if (!p && !data) return null
                return (
                  <div key={slug} className="px-5 py-4 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {p && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isExtra ? 'bg-violet-100 text-violet-700' : 'bg-[#E8E7FF] text-[#0800FF]'}`}>
                          {isExtra ? '+ ' : ''}{p.name}
                        </span>
                      )}
                      {data?.rating && <RatingBadge rating={data.rating} />}
                    </div>
                    {data?.question && (
                      <p className="text-xs text-gray-500 italic">
                        <span className="font-medium not-italic text-gray-700">Pregunta:</span>{' '}{data.question}
                      </p>
                    )}
                    {data?.notes ? (
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{data.notes}</p>
                    ) : (
                      <p className="text-xs text-gray-400 italic">Sin notas escritas.</p>
                    )}
                  </div>
                )
              })}

              {/* Conclusión del HM */}
              {phoneScreen.overall_summary && (
                <div className="px-5 py-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Conclusión</p>
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">{phoneScreen.overall_summary}</p>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Evaluaciones del loop — una tarjeta por entrevistador con notas completas */}
      {assignments.map((assignment: any) => {
        const interviewer = Array.isArray(assignment.interviewer) ? assignment.interviewer[0] : assignment.interviewer
        const evaluation = evaluations.find(e => e.interviewer_id === interviewer?.id)
        const isSigned = !!evaluation?.signed_at
        const principleNotes = evaluation?.principle_notes ?? {}

        // Principios asignados + extras que el entrevistador haya evaluado
        const assignedSlugs = (assignment.principles as string[]) ?? []
        const extraSlugs = Object.keys(principleNotes).filter(s => !assignedSlugs.includes(s))
        const allEvalSlugs = [...assignedSlugs, ...extraSlugs]

        return (
          <div key={assignment.id} className={`bg-white rounded-xl border ${isSigned ? 'border-gray-200' : 'border-dashed border-gray-300'}`}>
            {/* Header del entrevistador */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <p className="text-sm font-semibold text-gray-900">{interviewer?.full_name ?? 'Entrevistador'}</p>
                {isSigned
                  ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ Firmado</span>
                  : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Pendiente</span>
                }
              </div>
              {evaluation?.recommendation !== null && evaluation?.recommendation !== undefined && (
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-semibold ${evaluation.recommendation ? 'text-green-700' : 'text-red-600'}`}>
                    {evaluation.recommendation ? 'Hire' : 'No Hire'}
                  </span>
                  <span className="text-xl">{evaluation.recommendation ? '👍' : '👎'}</span>
                </div>
              )}
            </div>

            {!isSigned ? (
              <p className="text-sm text-gray-400 italic px-5 py-4">
                Este entrevistador aún no ha firmado su evaluación.
              </p>
            ) : (
              <div className="divide-y divide-gray-50">
                {/* Principios evaluados — uno por uno */}
                {allEvalSlugs.map(slug => {
                  const p = getPrincipleBySlug(slug)
                  const data = principleNotes[slug]
                  const isExtra = !assignedSlugs.includes(slug)
                  if (!data && !p) return null
                  return (
                    <div key={slug} className="px-5 py-4 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {p && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            isExtra
                              ? 'bg-violet-100 text-violet-700'
                              : 'bg-[#E8E7FF] text-[#0800FF]'
                          }`}>
                            {isExtra ? '+ ' : ''}{p.name}
                          </span>
                        )}
                        {data?.rating && <RatingBadge rating={data.rating} />}
                      </div>
                      {data?.question && (
                        <p className="text-xs text-gray-500 italic">
                          <span className="font-medium not-italic text-gray-700">Pregunta:</span>{' '}
                          {data.question}
                        </p>
                      )}
                      {data?.notes ? (
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                          {data.notes}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 italic">Sin notas escritas.</p>
                      )}
                    </div>
                  )
                })}

                {/* Conclusión */}
                {evaluation?.conclusion && (
                  <div className="px-5 py-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Conclusión
                    </p>
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                      {evaluation.conclusion}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}


      {/* Decisión del Bar Raiser */}
      <div className="bg-white rounded-xl border-2 border-[#0800FF] p-6">
        <p className="text-xs font-semibold text-[#0800FF] uppercase tracking-wider mb-1">Decisión del Bar Raiser</p>
        <p className="text-xs text-gray-500 mb-5">
          Esta es la última palabra. La decisión y justificación se enviarán al head of people por email.
          La identidad del Bar Raiser es confidencial.
        </p>

        {existingDecision ? (
          <div className="space-y-3">
            <div className={`rounded-xl p-4 ${existingDecision.outcome === 'hire' ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className={`text-lg font-bold mb-2 ${existingDecision.outcome === 'hire' ? 'text-green-700' : 'text-red-700'}`}>
                {existingDecision.outcome === 'hire' ? '✓ Hire' : existingDecision.outcome === 'no_hire' ? '✗ No Hire' : '~ Hire en otra capa'}
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">{existingDecision.justification}</p>
            </div>
            <p className="text-xs text-gray-400">
              Decidido el {new Date(existingDecision.decided_at).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        ) : (
          <DebriefForm pcId={params.pcId} capa={proc?.capa_intencional} />
        )}
      </div>
    </div>
  )
}

function PrincipleGrid({
  phoneScreen, assignments, evaluations, loopId,
}: {
  phoneScreen: any
  assignments: any[]
  evaluations: any[]
  loopId: string | null
}) {
  // Principios base (asignados) + extras que los entrevistadores hayan evaluado
  const slugSet = new Set<string>([
    ...(phoneScreen?.assigned_principles ?? []),
    ...assignments.flatMap(a => a.principles as string[] ?? []),
  ])
  // Agregar principios extra de evaluaciones existentes
  assignments.forEach(a => {
    const interviewer = Array.isArray(a.interviewer) ? a.interviewer[0] : a.interviewer
    const evaluation = evaluations.find(e => e.interviewer_id === interviewer?.id)
    if (evaluation?.principle_notes) {
      Object.keys(evaluation.principle_notes).forEach(slug => slugSet.add(slug))
    }
  })

  type RowType = 'hm' | 'hm_ai' | 'interviewer' | 'interviewer_ai'
  const rows: Array<{
    name: string
    type: RowType
    assignedSlugs: string[]
    principleNotes: Record<string, any>
    recommendation: boolean | null | undefined
    aiVerdict?: string | null
  }> = []

  // Helper: normaliza un JSONB de principle_notes al shape {notes, rating, question}
  function normalizePrincipleNotes(raw: any): Record<string, any> {
    const parsed: Record<string, any> = JSON.parse(JSON.stringify(raw ?? {}))
    const out: Record<string, any> = {}
    Object.keys(parsed).forEach(slug => {
      const val = parsed[slug]
      out[slug] = {
        notes: val?.notes ?? '',
        rating: val?.rating ?? null,
        question: val?.question ?? null,
      }
    })
    return out
  }

  // --- HM humano ---
  if (phoneScreen) {
    rows.push({
      name: `HM — ${(phoneScreen.hm as any)?.full_name ?? 'Hiring Manager'}`,
      type: 'hm',
      assignedSlugs: phoneScreen.assigned_principles ?? [],
      principleNotes: normalizePrincipleNotes(phoneScreen.principle_notes),
      recommendation: phoneScreen.decision === 'pass',
    })
    // --- HM AI (phone screen session analysis) ---
    const psAI = phoneScreen.session_analysis
    if (psAI?.principle_notes) {
      const aiSlugs = Object.keys(psAI.principle_notes)
      aiSlugs.forEach(s => slugSet.add(s))
      rows.push({
        name: `AI — ${(phoneScreen.hm as any)?.full_name ?? 'Manager Screening'}`,
        type: 'hm_ai',
        assignedSlugs: aiSlugs,
        principleNotes: normalizePrincipleNotes(psAI.principle_notes),
        recommendation: psAI.recommendation ?? (psAI.ai_verdict === 'hire' ? true : psAI.ai_verdict === 'no_hire' ? false : null),
        aiVerdict: psAI.ai_verdict ?? null,
      })
    }
  }

  // --- Entrevistadores del loop (humano + AI) ---
  assignments.forEach(a => {
    const interviewer = Array.isArray(a.interviewer) ? a.interviewer[0] : a.interviewer
    const evaluation = evaluations.find(e => e.interviewer_id === interviewer?.id)

    rows.push({
      name: interviewer?.full_name ?? '—',
      type: 'interviewer',
      assignedSlugs: a.principles ?? [],
      principleNotes: normalizePrincipleNotes(evaluation?.principle_notes),
      recommendation: evaluation?.recommendation ?? null,
    })

    // AI por entrevistador (session_analysis guardado en evaluations.session_analysis)
    const intAI = evaluation?.session_analysis
    if (intAI?.principle_notes) {
      const aiSlugs = Object.keys(intAI.principle_notes)
      aiSlugs.forEach(s => slugSet.add(s))
      rows.push({
        name: `AI — ${interviewer?.full_name ?? 'Entrevistador'}`,
        type: 'interviewer_ai',
        assignedSlugs: aiSlugs,
        principleNotes: normalizePrincipleNotes(intAI.principle_notes),
        recommendation: intAI.recommendation ?? (intAI.ai_verdict === 'hire' ? true : intAI.ai_verdict === 'no_hire' ? false : null),
        aiVerdict: intAI.ai_verdict ?? null,
      })
    }
  })

  const allSlugs = Array.from(slugSet)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm table-fixed">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500" style={{width:'20%'}}>Entrevistador</th>
            {allSlugs.map(slug => {
              const p = getPrincipleBySlug(slug)
              return (
                <th key={slug} className="text-left px-2 py-3 text-xs font-medium text-gray-500" style={{width:`${Math.floor(72/allSlugs.length)}%`}}>
                  <p className="text-[#0800FF] font-semibold leading-tight text-xs">{p?.name ?? slug}</p>
                </th>
              )
            })}
            <th className="text-left px-2 py-3 text-xs font-medium text-gray-500" style={{width:'8%'}}>Rec.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, i) => (
            <tr key={i} className={`${row.type === 'hm_ai' || row.type === 'interviewer_ai' ? 'bg-violet-50/40 hover:bg-violet-50' : 'hover:bg-gray-50'}`}>
              <td className="px-4 py-4">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-medium text-gray-900">{row.name}</p>
                  {(row.type === 'hm_ai' || row.type === 'interviewer_ai') && (
                    <span className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-medium">AI</span>
                  )}
                  {row.aiVerdict && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                      row.aiVerdict === 'hire' ? 'bg-green-100 text-green-700'
                      : row.aiVerdict === 'no_hire' ? 'bg-red-100 text-red-700'
                      : 'bg-orange-100 text-orange-700'
                    }`}>
                      {row.aiVerdict === 'hire' ? '✓ Hire' : row.aiVerdict === 'no_hire' ? '✗ No Hire' : '~ Talent Pool'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  {row.type === 'hm' ? 'Manager Screening'
                    : row.type === 'hm_ai' ? 'Análisis AI — Manager Screening'
                    : row.type === 'interviewer_ai'
                    ? (loopId
                        ? <Link href={`/interview/${loopId}/ai-analysis`} className="text-violet-600 hover:underline">Ver análisis →</Link>
                        : 'Análisis AI')
                    : 'Loop'}
                </p>
              </td>
              {allSlugs.map(slug => {
                const wasAssigned = row.assignedSlugs.includes(slug)
                const data = row.principleNotes[slug]
                const rating = data?.rating ?? null
                const notes = data?.notes ?? null
                const question = data?.question ?? null
                const isExtra = !wasAssigned && (rating || notes)
                return (
                  <td key={slug} className="px-3 py-4">
                    {wasAssigned || isExtra ? (
                      rating ? (
                        <div className="flex items-center gap-1">
                          <RatingBadge rating={rating} />
                          {isExtra && (
                            <span className="text-[9px] font-bold text-violet-500 leading-none" title="Evaluado por iniciativa">+</span>
                          )}
                        </div>
                      ) : wasAssigned ? (
                        <span className="text-xs text-amber-500 font-medium">Pendiente</span>
                      ) : null
                    ) : (
                      <span className="text-xs text-gray-200">—</span>
                    )}
                  </td>
                )
              })}
              <td className="px-3 py-4">
                {row.recommendation !== null && row.recommendation !== undefined
                  ? <span className="text-lg">{row.recommendation ? '👍' : '👎'}</span>
                  : <span className="text-xs text-gray-300">—</span>
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DebriefForm({ pcId, capa }: { pcId: string; capa: string }) {
  return (
    <form action={submitDecision} className="space-y-5">
      <input type="hidden" name="process_candidate_id" value={pcId} />

      {/* Decisión */}
      <div>
        <p className="text-sm font-medium text-gray-900 mb-3">Decisión</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'hire', label: '✓ Hire', desc: 'La persona entra a Truora', color: 'border-green-400 bg-green-50 text-green-800' },
            { value: 'no_hire', label: '✗ No Hire', desc: 'La persona no entra', color: 'border-red-400 bg-red-50 text-red-800' },
            { value: 'hire_other_capa', label: '~ Otra capa', desc: 'Entra pero en otra capa', color: 'border-blue-400 bg-blue-50 text-blue-800' },
          ].map(opt => (
            <label key={opt.value} className={`flex items-start gap-2.5 p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-sm ${opt.color}`}>
              <input type="radio" name="outcome" value={opt.value} className="mt-0.5" required />
              <div>
                <p className="text-sm font-semibold">{opt.label}</p>
                <p className="text-xs opacity-75 mt-0.5">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Capa alternativa — solo si hire_other_capa */}
      <div className="debrief-alternative-capa" style={{ display: 'none' }}>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Capa alternativa
        </label>
        <select name="alternative_capa" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF]">
          <option value="">Selecciona una capa</option>
          <option value="liderazgo">Liderazgo</option>
          <option value="funcional">Funcional</option>
        </select>
      </div>
      <style>{`
        form:has(input[value="hire_other_capa"]:checked) .debrief-alternative-capa { display: block !important; }
      `}</style>

      {/* Justificación */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-1.5">
          Justificación <span className="text-gray-400 font-normal text-xs">(mínimo 3 oraciones — esta es tu decisión, hazla clara)</span>
        </label>
        <textarea
          name="justification"
          rows={5}
          required
          placeholder="Explica por qué tomaste esta decisión. Cita evidencia concreta de las evaluaciones. ¿Qué patrón viste en el candidato? ¿Qué te hizo decidir Hire o No Hire? Sé específico."
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF] resize-none"
        />
      </div>

      <button type="submit" className="btn-truora">
        Confirmar decisión y notificar a People →
      </button>
    </form>
  )
}
