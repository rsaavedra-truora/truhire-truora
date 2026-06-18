import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { CAPA_LABELS } from '@/lib/types'
import { getPrincipleBySlug } from '@/lib/principles-data'
import { CandidateStatusControl } from '@/components/candidate-status-control'
import { ChallengeUploader } from '@/components/challenge-uploader'

export default async function CandidateProfilePage({
  params,
}: {
  params: { id: string; pcId: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

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

  const [
    { data: screening },
    { data: phoneScreen },
    { data: challenge },
    { data: loop },
    { data: finalDecision },
  ] = await Promise.all([
    supabase.from('screenings').select('*').eq('process_candidate_id', params.pcId).maybeSingle(),
    supabase
      .from('phone_screens')
      .select('*, hm:users!hm_id(full_name)')
      .eq('process_candidate_id', params.pcId)
      .maybeSingle(),
    supabase.from('challenges').select('*').eq('process_candidate_id', params.pcId).maybeSingle(),
    supabase
      .from('loops')
      .select(`
        id, status, scheduled_at,
        bar_raiser:users!bar_raiser_id(full_name),
        assignments:loop_assignments(id, principles, interviewer:users!interviewer_id(id, full_name))
      `)
      .eq('process_candidate_id', params.pcId)
      .maybeSingle(),
    supabase
      .from('decisions')
      .select('outcome, justification, alternative_capa, decided_at')
      .eq('process_candidate_id', params.pcId)
      .maybeSingle(),
  ])

  let evaluations: any[] = []
  if (loop) {
    const { data: evals } = await supabase
      .from('evaluations')
      .select('interviewer_id, principle_notes, conclusion, recommendation, signed_at')
      .eq('loop_id', loop.id)
    evaluations = evals ?? []
  }

  const assignments = (loop?.assignments as any[]) ?? []

  // Blind eval: si soy entrevistador en este loop y no he firmado, no veo notas de otros
  const myEval = evaluations.find(e => e.interviewer_id === user.id)
  const iAmInterviewer = assignments.some(a => {
    const iv = Array.isArray(a.interviewer) ? a.interviewer[0] : a.interviewer
    return iv?.id === user.id
  })
  const canSeeOthersEvals = !iAmInterviewer || !!myEval?.signed_at

  // Pipeline stages
  type StageStatus = 'done' | 'active' | 'pending'
  const pipeline: { label: string; status: StageStatus; href: string }[] = [
    {
      label: 'Screening',
      status: screening ? 'done' : 'pending',
      href: '#section-02',
    },
    {
      label: 'Phone Screen',
      status: phoneScreen?.completed_at ? 'done' : phoneScreen ? 'active' : 'pending',
      href: `/processes/${params.id}/candidates/${params.pcId}/phone-screen`,
    },
    {
      label: 'Loop',
      status: loop?.status === 'completed' ? 'done' : loop ? 'active' : 'pending',
      href: loop ? '#section-05' : `/processes/${params.id}/candidates/${params.pcId}/loop-setup`,
    },
    {
      label: 'Debrief',
      status: finalDecision ? 'done' : loop ? 'active' : 'pending',
      href: `/processes/${params.id}/candidates/${params.pcId}/debrief`,
    },
  ]

  const classificationColors: Record<string, string> = {
    green: 'bg-green-100 text-green-700',
    talent_pool: 'bg-orange-100 text-orange-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    red: 'bg-red-100 text-red-700',
  }
  const classificationLabels: Record<string, string> = {
    green: '🟢 Avanzar',
    talent_pool: '🟠 Talent Pool',
    yellow: '🟡 Posible',
    red: '🔴 Descartar',
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-12">

      {/* Header */}
      <div>
        <Link
          href={`/processes/${params.id}`}
          className="text-sm flex items-center gap-1 mb-3"
          style={{ color: 'var(--truora-ink-muted)' }}
        >
          ← {proc?.title}
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1
              className="text-2xl font-semibold"
              style={{ color: 'var(--truora-ink)', letterSpacing: '-0.02em' }}
            >
              {candidate?.full_name}
            </h1>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="text-sm" style={{ color: 'var(--truora-ink-muted)' }}>
                {candidate?.email}
              </span>
              {candidate?.linkedin_url && (
                <a
                  href={candidate.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs hover:underline"
                  style={{ color: 'var(--truora-primary)' }}
                >
                  LinkedIn →
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                proc?.capa_intencional === 'liderazgo'
                  ? 'bg-violet-100 text-violet-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {CAPA_LABELS[proc?.capa_intencional as keyof typeof CAPA_LABELS]}
            </span>
            <CandidateStatusControl
              pcId={params.pcId}
              processId={params.id}
              currentStatus={pc.status}
            />
          </div>
        </div>
      </div>

      {/* Pipeline visual */}
      <div
        className="rounded-xl p-4"
        style={{ background: 'var(--truora-bg)', border: '1px solid var(--truora-line)' }}
      >
        <div className="flex items-center">
          {pipeline.map((stage, i) => (
            <div key={stage.label} className="flex items-center flex-1 min-w-0">
              <Link
                href={stage.href}
                className={`flex-1 flex flex-col items-center gap-1.5 py-2 px-1 rounded-lg transition-opacity hover:opacity-80 ${
                  stage.status === 'done'
                    ? 'bg-green-50'
                    : stage.status === 'active'
                    ? 'bg-[#E8E7FF]'
                    : 'bg-gray-50'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    stage.status === 'done'
                      ? 'bg-green-500'
                      : stage.status === 'active'
                      ? 'bg-[#0800FF]'
                      : 'bg-gray-200'
                  }`}
                >
                  {stage.status === 'done' && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {stage.status === 'active' && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                <p
                  className={`text-xs font-medium text-center leading-tight ${
                    stage.status === 'done'
                      ? 'text-green-700'
                      : stage.status === 'active'
                      ? 'text-[#0800FF]'
                      : 'text-gray-400'
                  }`}
                >
                  {stage.label}
                </p>
              </Link>
              {i < pipeline.length - 1 && (
                <div
                  className={`w-3 h-px flex-shrink-0 ${
                    stage.status === 'done' ? 'bg-green-300' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 01 — CV */}
      <Section id="section-01" number="01" title="Perfil y CV" status={candidate?.cv_text ? 'done' : 'empty'}>
        {candidate?.cv_text ? (
          <details>
            <summary
              className="text-sm cursor-pointer hover:underline select-none"
              style={{ color: 'var(--truora-primary)' }}
            >
              Ver CV completo ▼
            </summary>
            <div
              className="mt-3 rounded-xl p-4 max-h-96 overflow-y-auto"
              style={{ background: 'var(--truora-bg-soft)' }}
            >
              <pre
                className="text-xs whitespace-pre-wrap font-sans leading-relaxed"
                style={{ color: 'var(--truora-ink)' }}
              >
                {candidate.cv_text}
              </pre>
            </div>
          </details>
        ) : (
          <EmptyState text="No hay CV cargado." />
        )}
        {candidate?.cv_url && (
          <a
            href={candidate.cv_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs hover:underline mt-2 inline-block"
            style={{ color: 'var(--truora-primary)' }}
          >
            Descargar PDF →
          </a>
        )}
      </Section>

      {/* 02 — Screening AI */}
      <Section
        id="section-02"
        number="02"
        title="Screening AI"
        status={screening ? 'done' : 'pending'}
        badge={screening ? classificationLabels[screening.classification] : undefined}
        badgeColor={screening ? classificationColors[screening.classification] : undefined}
      >
        {screening ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {screening.truora_fit_level && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    screening.truora_fit_level === 'high'
                      ? 'bg-green-100 text-green-700'
                      : screening.truora_fit_level === 'medium'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  Truora fit:{' '}
                  {screening.truora_fit_level === 'high'
                    ? 'Alto'
                    : screening.truora_fit_level === 'medium'
                    ? 'Medio'
                    : 'Bajo'}
                </span>
              )}
              {screening.suggested_capa && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    screening.suggested_capa === 'liderazgo'
                      ? 'bg-violet-100 text-violet-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  Capa sugerida: {screening.suggested_capa}
                </span>
              )}
              {screening.identity_match && screening.identity_match !== 'confirmed' && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                  ⚠ Identidad: {screening.identity_match}
                </span>
              )}
            </div>
            {screening.bucket_reason && (
              <p className="text-sm font-medium" style={{ color: 'var(--truora-ink)' }}>
                {screening.bucket_reason}
              </p>
            )}
            {screening.ai_summary && (
              <p
                className="text-sm leading-relaxed whitespace-pre-line"
                style={{ color: 'var(--truora-ink-muted)' }}
              >
                {screening.ai_summary}
              </p>
            )}
            {screening.truora_signals?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {screening.truora_signals.map((s: string, i: number) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 rounded-full"
                    style={{ background: 'var(--truora-primary-soft)', color: 'var(--truora-primary)' }}
                  >
                    {s.includes(':') ? s.split(':')[0].trim() : s}
                  </span>
                ))}
              </div>
            )}
            {screening.anti_signals?.length > 0 && (
              <ul className="space-y-0.5">
                {screening.anti_signals.map((s: string, i: number) => (
                  <li key={i} className="text-xs text-red-600 flex gap-1.5">
                    <span>−</span>
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <EmptyState text="El screening AI aún no se ha ejecutado." />
        )}
      </Section>

      {/* 03 — Phone Screen */}
      <Section
        id="section-03"
        number="03"
        title="Phone Screen — Hiring Manager"
        status={
          phoneScreen?.completed_at ? 'done' : phoneScreen ? 'in_progress' : 'pending'
        }
        badge={
          phoneScreen?.decision === 'pass'
            ? '✓ Pasa al loop'
            : phoneScreen?.decision === 'no_pass'
            ? '✗ No avanza'
            : undefined
        }
        badgeColor={
          phoneScreen?.decision === 'pass'
            ? 'bg-green-100 text-green-700'
            : 'bg-red-100 text-red-700'
        }
        action={{
          href: `/processes/${params.id}/candidates/${params.pcId}/phone-screen`,
          label: phoneScreen?.completed_at
            ? 'Ver evaluación →'
            : !phoneScreen
            ? 'Configurar →'
            : 'Completar evaluación →',
        }}
      >
        {phoneScreen ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs" style={{ color: 'var(--truora-ink-muted)' }}>
                HM:{' '}
                <strong style={{ color: 'var(--truora-ink)' }}>
                  {(phoneScreen.hm as any)?.full_name ?? '—'}
                </strong>
              </span>
              {phoneScreen.assigned_principles?.map((slug: string) => {
                const p = getPrincipleBySlug(slug)
                return p ? (
                  <span
                    key={slug}
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: 'var(--truora-primary-soft)',
                      color: 'var(--truora-primary)',
                    }}
                  >
                    {p.name}
                  </span>
                ) : null
              })}
            </div>
            {phoneScreen.completed_at && phoneScreen.overall_summary && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-700 mb-2 uppercase tracking-wider">
                  Evaluación del HM
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {phoneScreen.overall_summary}
                </p>
              </div>
            )}
          </div>
        ) : (
          <EmptyState text="El phone screen aún no ha sido configurado." />
        )}
      </Section>

      {/* 04 — Reto (opcional) */}
      <Section
        id="section-04"
        number="04"
        title="Reto"
        status={
          challenge?.evaluated_at ? 'done' : challenge?.submitted_at ? 'in_progress' : 'pending'
        }
        optional
      >
        <ChallengeUploader
          processCandidateId={params.pcId}
          existing={
            challenge
              ? { spec_text: challenge.spec_text, delivery_url: challenge.delivery_url }
              : null
          }
        />
        {challenge?.ai_evaluation && (
          <div
            className="rounded-xl p-4 mt-3"
            style={{ background: 'var(--truora-bg-soft)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--truora-ink-subtle)' }}
              >
                Evaluación AI
              </p>
              {challenge.ai_score && (
                <span
                  className="text-xs font-bold"
                  style={{ color: 'var(--truora-primary)' }}
                >
                  {challenge.ai_score}/10
                </span>
              )}
            </div>
            <p
              className="text-sm leading-relaxed"
              style={{ color: 'var(--truora-ink-muted)' }}
            >
              {challenge.ai_evaluation}
            </p>
          </div>
        )}
      </Section>

      {/* 05 — Interview Loop */}
      <Section
        id="section-05"
        number="05"
        title="Interview Loop"
        status={
          loop?.status === 'completed' ? 'done' : loop ? 'in_progress' : 'pending'
        }
        action={
          !loop
            ? {
                href: `/processes/${params.id}/candidates/${params.pcId}/loop-setup`,
                label: 'Configurar loop →',
              }
            : undefined
        }
      >
        {loop ? (
          <div className="space-y-4">
            {/* Bar Raiser + fecha + edit */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  className="text-xs mb-0.5"
                  style={{ color: 'var(--truora-ink-subtle)' }}
                >
                  Bar Raiser
                </p>
                <p className="text-sm font-medium" style={{ color: 'var(--truora-ink)' }}>
                  {(loop.bar_raiser as any)?.full_name ?? (
                    <span style={{ color: 'var(--truora-ink-subtle)' }} className="italic">
                      Sin asignar
                    </span>
                  )}
                </p>
              </div>
              <Link
                href={`/processes/${params.id}/candidates/${params.pcId}/loop-setup`}
                className="text-xs hover:underline flex-shrink-0"
                style={{ color: 'var(--truora-ink-subtle)' }}
              >
                Editar configuración →
              </Link>
            </div>

            {/* Progress indicator */}
            {(() => {
              const total = assignments.length
              const completed = assignments.filter((a: any) => {
                const iv = Array.isArray(a.interviewer) ? a.interviewer[0] : a.interviewer
                return !!evaluations.find((e: any) => e.interviewer_id === iv?.id && e.signed_at)
              }).length
              const pct = total > 0 ? Math.round((completed / total) * 100) : 0
              return (
                <div className="flex items-center gap-3">
                  <div
                    className="flex-1 h-1.5 rounded-full overflow-hidden"
                    style={{ background: 'var(--truora-bg-soft)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: completed === total && total > 0
                          ? '#16a34a'
                          : 'var(--truora-primary)',
                      }}
                    />
                  </div>
                  <p
                    className="text-xs font-medium flex-shrink-0"
                    style={{
                      color: completed === total && total > 0
                        ? '#16a34a'
                        : 'var(--truora-ink-muted)',
                    }}
                  >
                    {completed} de {total} evaluaciones completadas
                  </p>
                </div>
              )
            })()}

            {/* Interviewers */}
            <div className="space-y-2">
              {assignments.map((assignment: any) => {
                const interviewer = Array.isArray(assignment.interviewer)
                  ? assignment.interviewer[0]
                  : assignment.interviewer
                const evaluation = evaluations.find(
                  e => e.interviewer_id === interviewer?.id
                )
                const isSigned = !!evaluation?.signed_at
                const isMe = interviewer?.id === user.id

                return (
                  <div
                    key={assignment.id}
                    className={`rounded-xl border p-4 ${
                      isSigned
                        ? 'border-green-200 bg-green-50/40'
                        : 'border-truora-line'
                    }`}
                    style={!isSigned ? { borderColor: 'var(--truora-line)' } : undefined}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <p
                            className="text-sm font-medium"
                            style={{ color: 'var(--truora-ink)' }}
                          >
                            {interviewer?.full_name ?? '—'}
                          </p>
                          {isMe && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{
                                background: 'var(--truora-primary-soft)',
                                color: 'var(--truora-primary)',
                              }}
                            >
                              Tú
                            </span>
                          )}
                          {isSigned ? (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                              ✓ Completada
                            </span>
                          ) : (
                            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                              Pendiente
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(assignment.principles as string[])?.map((slug: string) => {
                            const p = getPrincipleBySlug(slug)
                            return p ? (
                              <span
                                key={slug}
                                className="text-xs px-2 py-0.5 rounded-full"
                                style={{
                                  background: 'var(--truora-primary-soft)',
                                  color: 'var(--truora-primary)',
                                }}
                              >
                                {p.name}
                              </span>
                            ) : null
                          })}
                        </div>
                        {/* Conclusión — blind eval */}
                        {isSigned && evaluation?.conclusion && canSeeOthersEvals && (
                          <p
                            className="text-sm leading-relaxed mt-2 pt-2 border-t border-green-200"
                            style={{ color: 'var(--truora-ink-muted)' }}
                          >
                            {evaluation.conclusion}
                          </p>
                        )}
                        {isSigned && !canSeeOthersEvals && !isMe && (
                          <p
                            className="text-xs mt-2 italic"
                            style={{ color: 'var(--truora-ink-subtle)' }}
                          >
                            Disponible después de completar tu evaluación.
                          </p>
                        )}
                      </div>
                      <Link
                        href={`/interview/${loop.id}`}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium flex-shrink-0 transition-colors ${
                          isMe && !isSigned
                            ? 'text-white'
                            : 'hover:underline'
                        }`}
                        style={
                          isMe && !isSigned
                            ? { background: 'var(--truora-primary)' }
                            : { color: 'var(--truora-primary)' }
                        }
                      >
                        {isMe && !isSigned ? 'Hacer evaluación →' : 'Ver →'}
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <EmptyState text="El loop aún no ha sido configurado." />
        )}
      </Section>

      {/* Feedback al candidato rechazado */}
      {(pc.status === 'rejected' ||
        (pc.status === 'screening' && screening?.classification === 'red')) && (
        <div className="rounded-xl p-4 flex items-center justify-between bg-orange-50 border border-orange-200">
          <div>
            <p className="text-sm font-medium text-orange-800">Candidato no avanzó</p>
            <p className="text-xs text-orange-600 mt-0.5">
              Envía un email de feedback empático. El AI genera un borrador.
            </p>
          </div>
          <Link
            href={`/processes/${params.id}/candidates/${params.pcId}/feedback`}
            className="text-xs px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex-shrink-0"
          >
            Enviar feedback →
          </Link>
        </div>
      )}

      {/* 06 — Debrief */}
      <Section
        id="section-06"
        number="06"
        title="Debrief — Decisión final"
        status={finalDecision ? 'done' : loop ? 'pending' : 'locked'}
        badge={
          finalDecision
            ? finalDecision.outcome === 'hire'
              ? '✓ Hire'
              : finalDecision.outcome === 'no_hire'
              ? '✗ No Hire'
              : '~ Otra capa'
            : undefined
        }
        badgeColor={
          finalDecision?.outcome === 'hire'
            ? 'bg-green-100 text-green-700'
            : 'bg-red-100 text-red-700'
        }
        action={
          loop && !finalDecision
            ? {
                href: `/processes/${params.id}/candidates/${params.pcId}/debrief`,
                label: 'Ir al debrief →',
              }
            : undefined
        }
      >
        {finalDecision ? (
          <div className="space-y-3">
            <p className="text-xs" style={{ color: 'var(--truora-ink-subtle)' }}>
              Decidido el{' '}
              {new Date(finalDecision.decided_at).toLocaleDateString('es', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <div
              className="rounded-xl p-4"
              style={{ background: 'var(--truora-bg-soft)' }}
            >
              <p
                className="text-sm leading-relaxed"
                style={{ color: 'var(--truora-ink)' }}
              >
                {finalDecision.justification}
              </p>
            </div>
            {finalDecision.alternative_capa && (
              <p className="text-xs" style={{ color: 'var(--truora-ink-subtle)' }}>
                Capa alternativa sugerida:{' '}
                <strong style={{ color: 'var(--truora-ink)' }}>
                  {finalDecision.alternative_capa}
                </strong>
              </p>
            )}
            <Link
              href={`/processes/${params.id}/candidates/${params.pcId}/debrief`}
              className="text-xs hover:underline inline-block"
              style={{ color: 'var(--truora-primary)' }}
            >
              Ver debrief completo →
            </Link>
          </div>
        ) : loop ? (
          <EmptyState text="El debrief ocurre después de que los entrevistadores completen sus evaluaciones." />
        ) : (
          <EmptyState text="Disponible una vez que el loop esté configurado." />
        )}
      </Section>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Section({
  id,
  number,
  title,
  status,
  badge,
  badgeColor,
  children,
  optional,
  action,
}: {
  id?: string
  number: string
  title: string
  status: string
  badge?: string
  badgeColor?: string
  children: React.ReactNode
  optional?: boolean
  action?: { href: string; label: string }
}) {
  const dots: Record<string, string> = {
    done: 'bg-green-500',
    in_progress: 'bg-blue-400',
    pending: 'bg-gray-300',
    empty: 'bg-gray-200',
    locked: 'bg-gray-100',
  }
  return (
    <div
      id={id}
      className={`rounded-xl border p-5 ${status === 'locked' ? 'opacity-50' : ''}`}
      style={{
        background: 'var(--truora-bg)',
        borderColor: 'var(--truora-line)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dots[status] ?? 'bg-gray-200'}`}
          />
          <span
            className="text-xs font-mono"
            style={{ color: 'var(--truora-ink-subtle)' }}
          >
            {number}
          </span>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--truora-ink)' }}>
            {title}
          </h2>
          {optional && (
            <span className="text-xs" style={{ color: 'var(--truora-ink-subtle)' }}>
              (opcional)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {badge && badgeColor && (
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${badgeColor}`}>
              {badge}
            </span>
          )}
          {action && (
            <Link
              href={action.href}
              className="text-xs font-medium hover:underline"
              style={{ color: 'var(--truora-primary)' }}
            >
              {action.label}
            </Link>
          )}
        </div>
      </div>
      {children}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="text-sm italic" style={{ color: 'var(--truora-ink-subtle)' }}>
      {text}
    </p>
  )
}
