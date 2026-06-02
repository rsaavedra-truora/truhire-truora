import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { CAPA_LABELS } from '@/lib/types'
import { getPrincipleBySlug } from '@/lib/principles-data'
import { getProcessPermissions } from '@/lib/permissions'
import { updateCandidateStatus } from '@/app/actions/candidates'
import { CandidateStatusControl, StatusBadgeReadOnly } from '@/components/candidate-status-control'
import { ChallengeUploader } from '@/components/challenge-uploader'

export default async function CandidateProfilePage({
  params,
}: {
  params: { id: string; pcId: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Query principal
  const { data: pc } = await supabase
    .from('process_candidates')
    .select(`
      id, status, applied_at,
      candidate:candidates(id, full_name, email, linkedin_url, cv_text, cv_url),
      process:processes(id, title, capa_intencional, entry_mode, role_description)
    `)
    .eq('id', params.pcId)
    .eq('process_id', params.id)
    .single()

  if (!pc) notFound()

  const candidate = pc.candidate as any
  const proc = pc.process as any

  // Permisos del usuario actual para este proceso — enforced server-side
  const perms = await getProcessPermissions(params.id, params.pcId)

  // Queries separadas para mayor confiabilidad
  const [
    { data: screening },
    { data: phoneScreen },
    { data: challenge },
    { data: loop },
    { data: finalDecision },
  ] = await Promise.all([
    supabase.from('screenings').select('*').eq('process_candidate_id', params.pcId).maybeSingle(),
    supabase.from('phone_screens').select('*, hm:users!hm_id(full_name)').eq('process_candidate_id', params.pcId).maybeSingle(),
    supabase.from('challenges').select('*').eq('process_candidate_id', params.pcId).maybeSingle(),
    supabase.from('loops').select('*, bar_raiser:users!bar_raiser_id(full_name), assignments:loop_assignments(id, principles, interviewer:users!interviewer_id(id, full_name))').eq('process_candidate_id', params.pcId).maybeSingle(),
    supabase.from('decisions').select('*, bar_raiser:users!bar_raiser_id(full_name)').eq('process_candidate_id', params.pcId).maybeSingle(),
  ])

  // Evaluaciones del loop (query separada)
  let evaluations: any[] = []
  if (loop) {
    const { data: evals } = await supabase
      .from('evaluations')
      .select('loop_id, interviewer_id, principle_notes, summary, conclusion, recommendation, signed_at')
      .eq('loop_id', loop.id)
    evaluations = evals ?? []
  }

  const classificationColors: Record<string, string> = {
    green: 'bg-green-100 text-green-700', talent_pool: 'bg-orange-100 text-orange-700',
    yellow: 'bg-yellow-100 text-yellow-700', red: 'bg-red-100 text-red-700',
  }
  const classificationLabels: Record<string, string> = {
    green: '🟢 Avanzar', talent_pool: '🟠 Talent Pool', yellow: '🟡 Posible', red: '🔴 Descartar',
  }
  const statusLabels: Record<string, string> = {
    applied: 'Aplicó', screening: 'Screening AI', phone_screen: 'Phone screen',
    loop: 'Interview Loop', decision: 'Decisión', hired: 'Contratado', rejected: 'Descartado',
  }

  return (
    <div className="max-w-4xl mx-auto space-y-3">
      {/* Header con estado editable para recruiter, solo lectura para el resto */}
      <div className="mb-4">
        <Link href={`/processes/${params.id}`} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-3">
          ← {proc?.title}
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900" style={{ letterSpacing: '-0.02em' }}>
              {candidate?.full_name}
            </h1>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="text-sm text-gray-500">{candidate?.email}</span>
              {candidate?.linkedin_url && (
                <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#0800FF] hover:underline">LinkedIn →</a>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${proc?.capa_intencional === 'liderazgo' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
              {CAPA_LABELS[proc?.capa_intencional as keyof typeof CAPA_LABELS]}
            </span>

            {/* Estado del candidato */}
            {perms.canManageProcess ? (
              <CandidateStatusControl
                pcId={params.pcId}
                processId={params.id}
                currentStatus={pc.status}
              />
            ) : (
              <StatusBadgeReadOnly status={pc.status} />
            )}
          </div>
        </div>
      </div>

      {/* 01 — CV */}
      <Section number="01" title="Perfil y CV" status={candidate?.cv_text ? 'done' : 'empty'}>
        {candidate?.cv_text ? (
          <details>
            <summary className="text-sm text-[#0800FF] cursor-pointer hover:underline select-none">Ver CV completo ▼</summary>
            <div className="mt-3 bg-gray-50 rounded-xl p-4 max-h-96 overflow-y-auto">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{candidate.cv_text}</pre>
            </div>
          </details>
        ) : <EmptyState text="No hay CV cargado." />}
        {candidate?.cv_url && (
          <a href={candidate.cv_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#0800FF] hover:underline mt-2 inline-block">
            Descargar PDF →
          </a>
        )}
      </Section>

      {/* 02 — Screening AI (solo Recruiter, head_of_people y Bar Raiser) */}
      {perms.canSeeScreeningAI && (
      <Section
        number="02" title="Screening AI — BETA"
        status={screening ? 'done' : 'pending'}
        badge={screening ? classificationLabels[screening.classification] : undefined}
        badgeColor={screening ? classificationColors[screening.classification] : undefined}
      >
        {screening ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {screening.truora_fit_level && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${screening.truora_fit_level === 'high' ? 'bg-green-100 text-green-700' : screening.truora_fit_level === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                  Truora fit: {screening.truora_fit_level === 'high' ? 'Alto' : screening.truora_fit_level === 'medium' ? 'Medio' : 'Bajo'}
                </span>
              )}
              {screening.suggested_capa && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${screening.suggested_capa === 'liderazgo' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                  Capa sugerida: {screening.suggested_capa}
                </span>
              )}
              {screening.identity_match && screening.identity_match !== 'confirmed' && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">⚠ Identidad: {screening.identity_match}</span>
              )}
            </div>
            {screening.bucket_reason && <p className="text-sm text-gray-800 font-medium">{screening.bucket_reason}</p>}
            {screening.ai_summary && <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{screening.ai_summary}</p>}
            {screening.truora_signals?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {screening.truora_signals.map((s: string, i: number) => (
                  <span key={i} className="text-xs bg-[#E8E7FF] text-[#0800FF] px-2.5 py-1 rounded-full">
                    {s.includes(':') ? s.split(':')[0].trim() : s}
                  </span>
                ))}
              </div>
            )}
            {screening.anti_signals?.length > 0 && (
              <ul className="space-y-0.5">
                {screening.anti_signals.map((s: string, i: number) => (
                  <li key={i} className="text-xs text-red-600 flex gap-1.5"><span>−</span>{s}</li>
                ))}
              </ul>
            )}
          </div>
        ) : <EmptyState text="El screening AI aún no se ha ejecutado." />}
      </Section>
      )}

      {/* 03 — Phone Screen: visible para recruiter, HM y Bar Raiser */}
      {perms.canSeePhoneScreen && <Section
        number="03" title="Phone Screen — Hiring Manager"
        status={phoneScreen?.completed_at ? 'done' : phoneScreen ? 'in_progress' : 'pending'}
        badge={phoneScreen?.decision === 'pass' ? '✓ Pasa al loop' : phoneScreen?.decision === 'no_pass' ? '✗ No avanza' : undefined}
        badgeColor={phoneScreen?.decision === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
        action={{ href: `/processes/${params.id}/candidates/${params.pcId}/phone-screen`, label: phoneScreen?.completed_at ? 'Ver evaluación →' : !phoneScreen ? 'Configurar →' : 'Completar evaluación →' }}
      >
        {phoneScreen ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500">HM: <strong className="text-gray-700">{(phoneScreen.hm as any)?.full_name ?? '—'}</strong></span>
              {phoneScreen.assigned_principles?.map((slug: string) => {
                const p = getPrincipleBySlug(slug)
                return p ? <span key={slug} className="text-xs bg-[#E8E7FF] text-[#0800FF] px-2 py-0.5 rounded-full">{p.name}</span> : null
              })}
            </div>
            {phoneScreen.role_competencies?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {phoneScreen.role_competencies.map((c: string, i: number) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{c}</span>
                ))}
              </div>
            )}
            {phoneScreen.completed_at && phoneScreen.overall_summary && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-700 mb-2 uppercase tracking-wider">Evaluación del HM</p>
                <p className="text-sm text-gray-700 leading-relaxed">{phoneScreen.overall_summary}</p>
              </div>
            )}
          </div>
        ) : <EmptyState text="El phone screen aún no ha sido configurado." />}
      </Section>}

      {/* 04 — Reto */}
      {perms.canManageProcess && (
        <Section
          number="04" title="Reto"
          status={challenge?.evaluated_at ? 'done' : challenge?.submitted_at ? 'in_progress' : 'pending'}
          optional
        >
          <ChallengeUploader
            processCandidateId={params.pcId}
            existing={challenge ? { spec_text: challenge.spec_text, delivery_url: challenge.delivery_url } : null}
          />
          {challenge?.ai_evaluation && (
            <div className="bg-gray-50 rounded-xl p-4 mt-3">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Evaluación AI</p>
                {challenge.ai_score && <span className="text-xs font-bold text-[#0800FF]">{challenge.ai_score}/10</span>}
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{challenge.ai_evaluation}</p>
            </div>
          )}
        </Section>
      )}

      {/* 05 — Loop */}
      <Section
        number="05" title="Interview Loop"
        status={loop?.status === 'completed' ? 'done' : loop ? 'in_progress' : 'pending'}
        action={!loop && pc.status === 'loop' ? { href: `/processes/${params.id}/candidates/${params.pcId}/loop-setup`, label: 'Configurar loop →' } : undefined}
      >
        {loop ? (
          <div className="space-y-3">
            <div className="text-xs text-gray-500">
              {perms.canSeeBarRaiserIdentity
                ? <span>Bar Raiser: <strong className="text-gray-700">{(loop.bar_raiser as any)?.full_name ?? '—'}</strong></span>
                : <span>Bar Raiser: <strong className="text-gray-700">Confidencial</strong></span>
              }
              {loop.scheduled_at && <span> · {new Date(loop.scheduled_at).toLocaleDateString('es', { day: 'numeric', month: 'long' })}</span>}
            </div>
            <div className="space-y-3">
              {(loop.assignments as any[])?.map((assignment: any) => {
                const interviewer = Array.isArray(assignment.interviewer) ? assignment.interviewer[0] : assignment.interviewer
                const evaluation = evaluations.find(e => e.interviewer_id === interviewer?.id)
                const isSigned = !!evaluation?.signed_at
                return (
                  <div key={assignment.id} className={`border rounded-xl p-4 ${isSigned ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <p className="text-sm font-medium text-gray-900">{interviewer?.full_name ?? '—'}</p>
                          {isSigned
                            ? <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-medium">✓ Firmado</span>
                            : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Pendiente</span>
                          }
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(assignment.principles as string[])?.map((slug: string) => {
                            const p = getPrincipleBySlug(slug)
                            return p ? <span key={slug} className="text-xs bg-[#E8E7FF] text-[#0800FF] px-2 py-0.5 rounded-full">{p.name}</span> : null
                          })}
                        </div>
                      </div>
                      {evaluation?.recommendation !== null && evaluation?.recommendation !== undefined && (
                        <span className="text-lg flex-shrink-0">{evaluation.recommendation ? '👍' : '👎'}</span>
                      )}
                    </div>
                    {/* Conclusión: solo visible si el usuario tiene permiso para ver eval de otros */}
                    {isSigned && evaluation?.conclusion && perms.canSeeOtherEvaluations && (
                      <p className="text-sm text-gray-600 mt-3 leading-relaxed border-t border-green-200 pt-3">{evaluation.conclusion}</p>
                    )}
                    {!isSigned && (
                      <Link href={`/interview/${loop.id}`} className="text-xs text-[#0800FF] hover:underline font-medium mt-2 inline-block">
                        Ir a entrevista →
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ) : <EmptyState text="El loop aún no ha sido configurado." />}
      </Section>


      {/* Feedback al candidato rechazado — aplica en cualquier etapa de rechazo */}
      {(pc.status === 'rejected' || (pc.status === 'screening' && screening?.classification === 'red')) && perms.canSendFeedback && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-orange-800">Candidato no avanzó</p>
            <p className="text-xs text-orange-600 mt-0.5">Envía un email de feedback empático. El AI genera un borrador, tú lo revisas antes de enviar.</p>
          </div>
          <Link href={`/processes/${params.id}/candidates/${params.pcId}/feedback`}
            className="text-xs px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex-shrink-0">
            Enviar feedback →
          </Link>
        </div>
      )}

      {/* 06 — Debrief */}
      <Section
        number="06" title="Debrief — Decisión final"
        status={finalDecision ? 'done' : loop ? 'pending' : 'locked'}
        badge={finalDecision ? (finalDecision.outcome === 'hire' ? '✓ Hire' : finalDecision.outcome === 'no_hire' ? '✗ No Hire' : '~ Otra capa') : undefined}
        badgeColor={finalDecision?.outcome === 'hire' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
        action={loop && !finalDecision ? { href: `/processes/${params.id}/candidates/${params.pcId}/debrief`, label: 'Ir al debrief →' } : undefined}
      >
        {finalDecision ? (
          <div className="space-y-3">
            <div className="text-xs text-gray-500">
              Bar Raiser: <strong className="text-gray-700">{(finalDecision.bar_raiser as any)?.full_name ?? '—'}</strong>
              <span> · {new Date(finalDecision.decided_at).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-700 leading-relaxed">{finalDecision.justification}</p>
            </div>
            {finalDecision.alternative_capa && (
              <p className="text-xs text-gray-500">Capa alternativa sugerida: <strong>{finalDecision.alternative_capa}</strong></p>
            )}
          </div>
        ) : loop
          ? <EmptyState text="El debrief ocurre después de que todos los entrevistadores firmen sus evaluaciones." />
          : <EmptyState text="Disponible una vez que el loop esté configurado." />
        }
      </Section>
    </div>
  )
}

function Section({ number, title, status, badge, badgeColor, children, optional, action }: {
  number: string; title: string; status: string
  badge?: string; badgeColor?: string; children: React.ReactNode
  optional?: boolean; action?: { href: string; label: string }
}) {
  const dots: Record<string, string> = {
    done: 'bg-green-500', in_progress: 'bg-blue-400', pending: 'bg-gray-300', empty: 'bg-gray-200', locked: 'bg-gray-100',
  }
  return (
    <div className={`bg-white rounded-xl border p-5 ${status === 'locked' ? 'border-gray-100 opacity-50' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dots[status] ?? 'bg-gray-200'}`} />
          <span className="text-xs font-mono text-gray-400">{number}</span>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {optional && <span className="text-xs text-gray-400">(opcional)</span>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {badge && badgeColor && (
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${badgeColor}`}>{badge}</span>
          )}
          {action && (
            <Link href={action.href} className="text-xs text-[#0800FF] hover:underline font-medium">{action.label}</Link>
          )}
        </div>
      </div>
      {children}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-gray-400 italic">{text}</p>
}
