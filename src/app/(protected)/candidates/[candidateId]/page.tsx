import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { CandidateEditPanel } from '@/components/candidate-edit-panel'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  applied:      { label: 'Aplicó',        color: 'bg-gray-100 text-gray-600' },
  screening:    { label: 'Screening',     color: 'bg-yellow-100 text-yellow-700' },
  phone_screen: { label: 'Manager Screening', color: 'bg-sky-100 text-sky-700' },
  loop:         { label: 'Loop',          color: 'bg-violet-100 text-violet-700' },
  decision:     { label: 'Decisión',      color: 'bg-purple-100 text-purple-700' },
  hired:        { label: 'Contratado ✓',  color: 'bg-green-100 text-green-700' },
  rejected:     { label: 'Descartado',    color: 'bg-red-100 text-red-700' },
}

const CLASS_LABELS: Record<string, { label: string; color: string; dot: string }> = {
  green:        { label: 'Avanzar',       color: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  talent_pool:  { label: 'Talent Pool',   color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
  yellow:       { label: 'Revisar',       color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' },
  red:          { label: 'Descartado',    color: 'bg-red-100 text-red-700',       dot: 'bg-red-400' },
}

const FIT_LABELS: Record<string, { label: string; color: string }> = {
  high:   { label: 'Alto fit Truora',  color: 'bg-green-100 text-green-700' },
  medium: { label: 'Fit medio',        color: 'bg-yellow-100 text-yellow-700' },
  low:    { label: 'Bajo fit',         color: 'bg-red-100 text-red-700' },
}

export default async function CandidateProfilePage({ params }: { params: { candidateId: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Candidato base
  const { data: candidate } = await supabase
    .from('candidates')
    .select('*')
    .eq('id', params.candidateId)
    .single()

  if (!candidate) notFound()

  // Todos sus procesos con screening y estado
  const { data: processCandidates } = await supabase
    .from('process_candidates')
    .select(`
      id, status, applied_at,
      process:processes(id, title, status, capa_intencional, entry_mode),
      screening:screenings(classification, truora_fit_level, ai_summary, strengths, gaps, truora_signals)
    `)
    .eq('candidate_id', params.candidateId)
    .order('applied_at', { ascending: false })

  // Screening del talent pool si aplica
  const { data: poolScreening } = await supabase
    .from('talent_pool_screenings')
    .select('*')
    .eq('candidate_id', params.candidateId)
    .maybeSingle()

  // Nombre de quien lo recomendó si está en pool
  let recommendedByName: string | null = null
  if (candidate.talent_pool_recommended_by) {
    const { data: rec } = await supabase
      .from('truora_directory')
      .select('full_name')
      .eq('email', candidate.talent_pool_recommended_by)
      .maybeSingle()
    recommendedByName = rec?.full_name ?? candidate.talent_pool_recommended_by
  }

  // Quien lo agregó al pool
  let addedByName: string | null = null
  if (candidate.added_to_pool_by) {
    const { data: adder } = await supabase
      .from('users').select('full_name').eq('id', candidate.added_to_pool_by).maybeSingle()
    addedByName = (adder as any)?.full_name ?? null
  }

  const activeProcesses = (processCandidates ?? []).filter((pc: any) =>
    !['hired', 'rejected'].includes(pc.status)
  )
  const pastProcesses = (processCandidates ?? []).filter((pc: any) =>
    ['hired', 'rejected'].includes(pc.status)
  )

  const initials = candidate.full_name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <Link href="/candidates" className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1">
        ← Candidatos
      </Link>

      <div className="grid grid-cols-3 gap-6">
        {/* ── Columna izquierda — Identidad ── */}
        <div className="col-span-1 space-y-4">

          {/* Card principal */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            {/* Avatar + nombre */}
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-[#0800FF] flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">{initials}</span>
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-semibold text-gray-900 leading-tight">{candidate.full_name}</h1>
                <p className="text-sm text-gray-500 mt-0.5 break-all">{candidate.email}</p>
              </div>
            </div>

            {/* Estado actual — chips */}
            <div className="flex flex-wrap gap-1.5">
              {candidate.in_talent_pool && (
                <span className="text-xs px-2 py-1 rounded-full font-medium bg-orange-100 text-orange-700">
                  🟠 Talent Pool
                </span>
              )}
              {activeProcesses.map((pc: any) => {
                const st = STATUS_LABELS[pc.status]
                return (
                  <span key={pc.id} className={`text-xs px-2 py-1 rounded-full font-medium ${st?.color ?? 'bg-gray-100 text-gray-600'}`}>
                    {pc.process?.title ?? 'Proceso'}
                  </span>
                )
              })}
              {!candidate.in_talent_pool && activeProcesses.length === 0 && (
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">Sin proceso activo</span>
              )}
            </div>

            {/* Links */}
            <div className="space-y-2">
              {candidate.cv_url && (
                <a href={candidate.cv_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[#0800FF] hover:underline">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
                  </svg>
                  Ver CV
                </a>
              )}
              {candidate.linkedin_url && (
                <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[#0800FF] hover:underline">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  LinkedIn
                </a>
              )}
            </div>

            {/* Metadata */}
            <dl className="space-y-2 pt-2 border-t border-gray-100">
              <div>
                <dt className="text-xs text-gray-400">En el sistema desde</dt>
                <dd className="text-sm text-gray-700">{new Date(candidate.created_at).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}</dd>
              </div>
              {candidate.in_talent_pool && candidate.talent_pool_source && (
                <div>
                  <dt className="text-xs text-gray-400">Fuente</dt>
                  <dd className="text-sm text-gray-700 capitalize">{candidate.talent_pool_source}</dd>
                </div>
              )}
              {recommendedByName && (
                <div>
                  <dt className="text-xs text-gray-400">Recomendado por</dt>
                  <dd className="text-sm text-gray-700 font-medium">💬 {recommendedByName}</dd>
                </div>
              )}
              {addedByName && (
                <div>
                  <dt className="text-xs text-gray-400">Agregado por</dt>
                  <dd className="text-sm text-gray-700">{addedByName}</dd>
                </div>
              )}
              {candidate.talent_pool_notes && (
                <div>
                  <dt className="text-xs text-gray-400">Notas</dt>
                  <dd className="text-sm text-gray-600 italic">"{candidate.talent_pool_notes}"</dd>
                </div>
              )}
            </dl>

            {/* Editar / Eliminar */}
            <CandidateEditPanel candidate={{
              id: candidate.id,
              full_name: candidate.full_name,
              email: candidate.email,
              linkedin_url: candidate.linkedin_url,
              cv_url: candidate.cv_url,
            }} />
          </div>
        </div>

        {/* ── Columna derecha — Análisis e historial ── */}
        <div className="col-span-2 space-y-4">

          {/* Análisis Truora DNA (talent pool) */}
          {poolScreening && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Análisis Truora DNA</h2>
                {(() => {
                  const fit = FIT_LABELS[poolScreening.truora_fit_level]
                  return fit ? (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${fit.color}`}>{fit.label}</span>
                  ) : null
                })()}
              </div>

              {poolScreening.ai_summary && (
                <p className="text-sm text-gray-700 leading-relaxed">{poolScreening.ai_summary}</p>
              )}

              <div className="grid grid-cols-2 gap-4">
                {poolScreening.signals?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-green-700 mb-2">✓ Señales positivas</p>
                    <ul className="space-y-1.5">
                      {poolScreening.signals.map((s: string, i: number) => (
                        <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                          <span className="text-green-400 flex-shrink-0 mt-0.5">·</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {poolScreening.gaps?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-500 mb-2">△ Gaps</p>
                    <ul className="space-y-1.5">
                      {poolScreening.gaps.map((g: string, i: number) => (
                        <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                          <span className="text-red-300 flex-shrink-0 mt-0.5">·</span>{g}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {poolScreening.suggested_roles?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-1.5">Roles sugeridos</p>
                  <div className="flex flex-wrap gap-1.5">
                    {poolScreening.suggested_roles.map((r: string, i: number) => (
                      <span key={i} className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">{r}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Procesos activos */}
          {activeProcesses.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Procesos activos</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {activeProcesses.map((pc: any) => {
                  const screening = Array.isArray(pc.screening) ? pc.screening[0] : pc.screening
                  const cls = screening?.classification ? CLASS_LABELS[screening.classification] : null
                  const st = STATUS_LABELS[pc.status]
                  const proc = Array.isArray(pc.process) ? pc.process[0] : pc.process
                  return (
                    <div key={pc.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <Link href={`/processes/${proc?.id}/candidates/${pc.id}`}
                            className="text-sm font-medium text-gray-900 hover:text-[#0800FF]">
                            {proc?.title ?? 'Proceso'}
                          </Link>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(pc.applied_at).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                          {screening?.ai_summary && (
                            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed line-clamp-2">{screening.ai_summary}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          {st && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>}
                          {cls && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${cls.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cls.dot}`}/>
                              {cls.label}
                            </span>
                          )}
                        </div>
                      </div>
                      <Link href={`/processes/${proc?.id}/candidates/${pc.id}`}
                        className="mt-2 inline-block text-xs text-[#0800FF] hover:underline">
                        Ver en el proceso →
                      </Link>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Historial de procesos pasados */}
          {pastProcesses.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900 text-gray-400">Historial</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {pastProcesses.map((pc: any) => {
                  const screening = Array.isArray(pc.screening) ? pc.screening[0] : pc.screening
                  const cls = screening?.classification ? CLASS_LABELS[screening.classification] : null
                  const st = STATUS_LABELS[pc.status]
                  const proc = Array.isArray(pc.process) ? pc.process[0] : pc.process
                  return (
                    <div key={pc.id} className="px-5 py-3 flex items-center justify-between gap-4">
                      <div>
                        <Link href={`/processes/${proc?.id}/candidates/${pc.id}`}
                          className="text-sm text-gray-600 hover:text-[#0800FF]">
                          {proc?.title ?? 'Proceso'}
                        </Link>
                        <p className="text-xs text-gray-400">
                          {new Date(pc.applied_at).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {cls && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls.color}`}>{cls.label}</span>
                        )}
                        {st && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* CV Text (colapsable) */}
          {candidate.cv_text && (
            <details className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <summary className="px-5 py-3 cursor-pointer text-sm font-semibold text-gray-900 hover:bg-gray-50 flex items-center justify-between list-none">
                <span>Texto del CV</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                </svg>
              </summary>
              <div className="px-5 py-4 border-t border-gray-100">
                <pre className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed font-sans max-h-96 overflow-y-auto">
                  {candidate.cv_text}
                </pre>
              </div>
            </details>
          )}

          {/* Vacío total */}
          {!poolScreening && processCandidates?.length === 0 && !candidate.cv_text && (
            <div className="bg-white rounded-xl border border-gray-200 py-12 text-center">
              <p className="text-sm text-gray-400">No hay información adicional registrada para este candidato.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
