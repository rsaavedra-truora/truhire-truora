import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PROCESS_STATUS_LABELS, CAPA_LABELS, ENTRY_MODE_LABELS } from '@/lib/types'
import type { ProcessStatus, CapaIntencional, EntryMode } from '@/lib/types'

export const metadata = { title: 'Procesos' }

const STATUS_COLORS: Record<ProcessStatus, string> = {
  draft:          'bg-gray-100 text-gray-600',
  open:           'bg-blue-50 text-blue-700',
  screening:      'bg-yellow-50 text-yellow-700',
  challenge:      'bg-orange-50 text-orange-700',
  loop:           'bg-violet-50 text-violet-700',
  decision:       'bg-purple-50 text-purple-700',
  closed_hire:    'bg-green-50 text-green-700',
  closed_no_hire: 'bg-red-50 text-red-700',
}

export default async function ProcessesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const isRecruiterOrAdmin = profile?.role === 'recruiter' || profile?.role === 'head_of_people'

  // Traer todos los procesos con candidatos por etapa
  const { data: processes } = await supabase
    .from('processes')
    .select(`
      id, title, entry_mode, capa_intencional, status, created_at,
      hiring_manager_or_sponsor:users!hiring_manager_or_sponsor_id(full_name),
      recruiter:users!recruiter_id(full_name),
      candidates:process_candidates(status)
    `)
    .order('created_at', { ascending: false })

  const active = processes?.filter(p => !['closed_hire', 'closed_no_hire'].includes(p.status)) ?? []
  const closed = processes?.filter(p => ['closed_hire', 'closed_no_hire'].includes(p.status)) ?? []

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Procesos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {active.length} activos · {closed.length} cerrados
          </p>
        </div>
        {isRecruiterOrAdmin && (
          <Link href="/processes/new" className="btn-truora">
            + Nuevo proceso
          </Link>
        )}
      </div>

      {/* Tabla activos */}
      <ProcessTable
        processes={active}
        title="Procesos activos"
        empty="No hay procesos activos."
        emptyAction={isRecruiterOrAdmin ? <Link href="/processes/new" className="text-sm text-[#0800FF] hover:underline">Crear el primero →</Link> : null}
      />

      {/* Tabla cerrados */}
      {closed.length > 0 && (
        <ProcessTable
          processes={closed}
          title="Cerrados"
          empty=""
          emptyAction={null}
        />
      )}
    </div>
  )
}

function CandidateTracker({ candidates }: { candidates: { status: string }[] }) {
  if (!candidates.length) return <span className="text-xs text-gray-400">—</span>

  const stages = [
    { key: 'screening',    label: 'Screening',    color: 'bg-yellow-100 text-yellow-700' },
    { key: 'phone_screen', label: 'Phone screen', color: 'bg-blue-100 text-blue-700' },
    { key: 'loop',         label: 'Loop',         color: 'bg-violet-100 text-violet-700' },
    { key: 'decision',     label: 'Decisión',     color: 'bg-purple-100 text-purple-700' },
    { key: 'hired',        label: 'Contratado',   color: 'bg-green-100 text-green-700' },
  ]

  const counts = stages
    .map(s => ({ ...s, count: candidates.filter(c => c.status === s.key).length }))
    .filter(s => s.count > 0)

  const total = candidates.length

  if (counts.length === 0) {
    return (
      <span className="text-xs text-gray-400">{total} {total === 1 ? 'candidato' : 'candidatos'}</span>
    )
  }

  return (
    <div className="flex flex-wrap gap-1">
      {counts.map(s => (
        <span key={s.key} className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${s.color}`}>
          {s.count} {s.label}
        </span>
      ))}
      {total - counts.reduce((a, s) => a + s.count, 0) > 0 && (
        <span className="text-xs text-gray-400 px-1">
          +{total - counts.reduce((a, s) => a + s.count, 0)} aplicaron
        </span>
      )}
    </div>
  )
}

function ProcessTable({
  processes,
  title,
  empty,
  emptyAction,
}: {
  processes: any[]
  title: string
  empty: string
  emptyAction: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>

      {processes.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-sm text-gray-500">{empty}</p>
          {emptyAction && <div className="mt-2">{emptyAction}</div>}
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Proceso</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Capa</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Modo</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Candidatos</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Manager / Sponsor</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Creado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {processes.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3.5">
                  <Link href={`/processes/${p.id}`} className="font-medium text-gray-900 hover:text-[#0800FF]">
                    {p.title}
                  </Link>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    p.capa_intencional === 'liderazgo'
                      ? 'bg-violet-100 text-violet-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {CAPA_LABELS[p.capa_intencional as CapaIntencional]}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-gray-500 text-xs">
                  {ENTRY_MODE_LABELS[p.entry_mode as EntryMode]}
                </td>
                <td className="px-4 py-3.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status as ProcessStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                    {PROCESS_STATUS_LABELS[p.status as ProcessStatus]}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <CandidateTracker candidates={(p as any).candidates ?? []} />
                </td>
                <td className="px-4 py-3.5 text-gray-500 text-sm">
                  {(p.hiring_manager_or_sponsor as any)?.full_name ?? '—'}
                </td>
                <td className="px-4 py-3.5 text-gray-400 text-xs">
                  {new Date(p.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
