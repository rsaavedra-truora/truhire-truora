import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { PROCESS_STATUS_LABELS, CAPA_LABELS, ENTRY_MODE_LABELS } from '@/lib/types'
import type { ProcessStatus, CapaIntencional, EntryMode } from '@/lib/types'
import { CloseProcessButton } from '@/components/close-process-button'
import { CopyUrlButton } from '@/components/copy-url-button'
import { removeCandidateFromProcess } from '@/app/actions/candidates'
import { RoleDescriptionDisplay } from '@/components/role-description-display'

export default async function ProcessDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const appUrl = (globalThis as any).process?.env?.NEXT_PUBLIC_APP_URL ?? 'https://truhire-truora.vercel.app'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: process } = await supabase
    .from('processes')
    .select(`
      *,
      hiring_manager_or_sponsor:users!hiring_manager_or_sponsor_id(id, full_name, email),
      recruiter:users!recruiter_id(id, full_name, email)
    `)
    .eq('id', params.id)
    .single()

  if (!process) notFound()

  // Si HM tiene pending email (no ha hecho login), buscar nombre en directorio
  let pendingHMName: string | null = null
  if (!process.hiring_manager_or_sponsor && process.hiring_manager_pending_email) {
    const { data: dir } = await supabase
      .from('truora_directory')
      .select('full_name')
      .eq('email', process.hiring_manager_pending_email)
      .maybeSingle()
    pendingHMName = (dir as any)?.full_name ?? process.hiring_manager_pending_email
  }

  // Candidatos en este proceso
  const { data: processCandidates } = await supabase
    .from('process_candidates')
    .select(`
      id, status, applied_at,
      candidate:candidates(id, full_name, email, linkedin_url, cv_url)
    `)
    .eq('process_id', params.id)
    .order('applied_at', { ascending: false })

  const statusColor: Record<ProcessStatus, string> = {
    draft:          'bg-gray-100 text-gray-600',
    open:           'bg-blue-50 text-blue-700',
    screening:      'bg-yellow-50 text-yellow-700',
    phone_screen:   'bg-sky-50 text-sky-700',
    challenge:      'bg-orange-50 text-orange-700',
    loop:           'bg-violet-50 text-violet-700',
    decision:       'bg-purple-50 text-purple-700',
    closed_hire:    'bg-green-50 text-green-700',
    closed_no_hire: 'bg-red-50 text-red-700',
  }

  const totalCandidates = processCandidates?.length ?? 0

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link href="/processes" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-3">
          ← Procesos
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{process.title}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusColor[process.status as ProcessStatus]}`}>
                {PROCESS_STATUS_LABELS[process.status as ProcessStatus]}
              </span>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                process.capa_intencional === 'liderazgo'
                  ? 'bg-violet-100 text-violet-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {CAPA_LABELS[process.capa_intencional as CapaIntencional]}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                {ENTRY_MODE_LABELS[process.entry_mode as EntryMode]}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/processes/${process.id}/edit`}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
              Editar
            </Link>
            <Link href={`/processes/${process.id}/candidates/add`} className="btn-truora text-sm">
              + Agregar candidato
            </Link>
            {!['closed_hire', 'closed_no_hire'].includes(process.status) && (
              <CloseProcessButton processId={process.id} />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Info del proceso */}
        <div className="col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Detalles</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-500">
                  {process.entry_mode === 'talent_first' ? 'Sponsor' : 'Hiring manager'}
                </dt>
                <dd className="text-sm text-gray-900 mt-0.5 font-medium">
                  {(process.hiring_manager_or_sponsor as any)?.full_name ?? pendingHMName ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Recruiter</dt>
                <dd className="text-sm text-gray-900 mt-0.5 font-medium">
                  {(process.recruiter as any)?.full_name ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Benchmark</dt>
                <dd className="text-sm text-gray-900 mt-0.5 font-medium">
                  {process.capa_intencional === 'liderazgo' ? 'Superar al 50%' : 'Superar al 80%'}
                </dd>
              </div>
              {process.role_slug && (
                <div>
                  <dt className="text-xs text-gray-500 mb-1">URL de aplicación</dt>
                  <dd className="flex items-start gap-2">
                    <span className="text-xs text-truora-primary font-mono break-all leading-relaxed">
                      {`${appUrl}/apply/${process.role_slug}`}
                    </span>
                    <CopyUrlButton slug={process.role_slug} />
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-gray-500">Creado</dt>
                <dd className="text-sm text-gray-900 mt-0.5">
                  {new Date(process.created_at).toLocaleDateString('es', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </dd>
              </div>
            </dl>
          </div>

          {(process.role_description_structured || process.role_description) && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 overflow-y-auto" style={{ maxHeight: '400px' }}>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Descripción del rol</h2>
              <RoleDescriptionDisplay
                structured={process.role_description_structured as any}
                plainText={process.role_description}
                title={process.title}
              />
            </div>
          )}
        </div>

        {/* Candidatos */}
        <div className="col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">
                Candidatos <span className="text-gray-400 font-normal">({totalCandidates})</span>
              </h2>
              {totalCandidates > 0 && (
                <Link
                  href={`/processes/${process.id}/screening`}
                  className="text-xs text-truora-primary hover:underline font-medium"
                >
                  Ver screening →
                </Link>
              )}
            </div>

            {totalCandidates === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm text-gray-500">No hay candidatos en este proceso todavía.</p>
                <Link
                  href={`/processes/${process.id}/candidates/add`}
                  className="mt-3 inline-block text-sm text-truora-primary hover:underline font-medium"
                >
                  Agregar candidato →
                </Link>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Candidato</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Aplicó</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {processCandidates?.map((pc) => {
                    const statusLabel: Record<string, string> = {
                      applied: 'Aplicó', screening: 'Screening', phone_screen: 'Manager Screening',
                      loop: 'Loop', decision: 'Decisión', hired: 'Contratado', rejected: 'Descartado',
                    }
                    const actionLink = (() => {
                      if (pc.status === 'screening') return { href: `/processes/${process.id}/screening`, label: 'Ver screening →' }
                      if (pc.status === 'phone_screen') return { href: `/processes/${process.id}/candidates/${pc.id}/phone-screen`, label: 'Evaluar candidato →' }
                      if (pc.status === 'loop') return { href: `/processes/${process.id}/candidates/${pc.id}`, label: 'Ver loop →' }
                      if (pc.status === 'decision') return { href: `/processes/${process.id}/candidates/${pc.id}/debrief`, label: 'Ir al debrief →' }
                      return null
                    })()
                    return (
                      <tr key={pc.id} className="group hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <Link href={`/processes/${process.id}/candidates/${pc.id}`} className="font-medium text-gray-900 hover:text-truora-primary">
                            {(pc.candidate as any)?.full_name}
                          </Link>
                          <p className="text-xs text-gray-500">{(pc.candidate as any)?.email}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            {statusLabel[pc.status] ?? pc.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-gray-400 text-xs">
                          {new Date(pc.applied_at).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            {actionLink && (
                              <Link href={actionLink.href} className="text-xs text-truora-primary hover:underline font-medium">
                                {actionLink.label}
                              </Link>
                            )}
                            <form action={removeCandidateFromProcess}>
                              <input type="hidden" name="pc_id" value={pc.id} />
                              <input type="hidden" name="process_id" value={process.id} />
                              <button
                                type="submit"
                                title="Eliminar candidato del proceso"
                                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all p-1 rounded"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"/>
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                  <path d="M10 11v6M14 11v6"/>
                                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                                </svg>
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
