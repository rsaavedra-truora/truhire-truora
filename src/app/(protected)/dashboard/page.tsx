import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PROCESS_STATUS_LABELS } from '@/lib/types'
import type { ProcessStatus } from '@/lib/types'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Perfil con rol
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  // Procesos activos (el RLS filtra según el rol automáticamente)
  const { data: processes } = await supabase
    .from('processes')
    .select(`
      id, title, entry_mode, capa_intencional, status,
      hiring_manager_or_sponsor:users!hiring_manager_or_sponsor_id(full_name),
      recruiter:users!recruiter_id(full_name)
    `)
    .not('status', 'in', '("closed_hire","closed_no_hire")')
    .order('created_at', { ascending: false })
    .limit(10)

  // Métricas rápidas (solo recruiters y head_of_people ven los totales reales)
  const { count: totalOpen } = await supabase
    .from('processes')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'open')

  const { count: totalScreening } = await supabase
    .from('processes')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'screening')

  const { count: totalLoop } = await supabase
    .from('processes')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'loop')

  const isRecruiterOrAdmin =
    profile?.role === 'recruiter' || profile?.role === 'head_of_people'

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header de página */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Buenos días, {profile?.full_name?.split(' ')[0] ?? 'equipo'} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Aquí está el estado de los procesos activos.
          </p>
        </div>
        {isRecruiterOrAdmin && (
          <Link href="/processes/new" className="btn-truora">
            + Nuevo proceso
          </Link>
        )}
      </div>

      {/* Métricas rápidas */}
      {isRecruiterOrAdmin && (
        <div className="grid grid-cols-3 gap-4">
          <MetricCard
            label="Procesos abiertos"
            value={totalOpen ?? 0}
            color="blue"
          />
          <MetricCard
            label="En screening"
            value={totalScreening ?? 0}
            color="yellow"
          />
          <MetricCard
            label="En interview loop"
            value={totalLoop ?? 0}
            color="violet"
          />
        </div>
      )}

      {/* Tabla de procesos activos */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            Procesos activos
          </h2>
          {isRecruiterOrAdmin && (
            <Link
              href="/processes"
              className="text-xs text-[#0800FF] hover:underline font-medium"
            >
              Ver todos →
            </Link>
          )}
        </div>

        {!processes || processes.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-gray-500">
              No hay procesos activos por el momento.
            </p>
            {isRecruiterOrAdmin && (
              <Link
                href="/processes/new"
                className="mt-3 inline-block text-sm text-[#0800FF] hover:underline font-medium"
              >
                Crear el primer proceso →
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proceso
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capa
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Modo
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Manager / Sponsor
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {processes.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/processes/${p.id}`}
                      className="font-medium text-gray-900 hover:text-[#0800FF]"
                    >
                      {p.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.capa_intencional === 'liderazgo'
                          ? 'bg-violet-100 text-violet-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {p.capa_intencional === 'liderazgo'
                        ? 'Liderazgo'
                        : 'Funcional'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-gray-500 text-xs">
                    {p.entry_mode === 'role_first' ? 'Role-first' : 'Talent-first'}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={p.status as ProcessStatus} />
                  </td>
                  <td className="px-4 py-3.5 text-gray-500">
                    {(p.hiring_manager_or_sponsor as any)?.full_name ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// -------------------------------------------------------
// Subcomponentes
// -------------------------------------------------------

function MetricCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: 'blue' | 'yellow' | 'violet'
}) {
  const colorMap = {
    blue:   'bg-blue-50 text-[#0800FF]',
    yellow: 'bg-yellow-50 text-yellow-700',
    violet: 'bg-violet-50 text-violet-700',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </p>
      <p
        className={`text-3xl font-bold mt-1 ${colorMap[color].split(' ')[1]}`}
      >
        {value}
      </p>
    </div>
  )
}

function StatusBadge({ status }: { status: ProcessStatus }) {
  const colorMap: Record<ProcessStatus, string> = {
    draft:          'bg-gray-100 text-gray-600',
    open:           'bg-blue-100 text-blue-700',
    screening:      'bg-yellow-100 text-yellow-700',
    challenge:      'bg-orange-100 text-orange-700',
    loop:           'bg-violet-100 text-violet-700',
    decision:       'bg-purple-100 text-purple-700',
    closed_hire:    'bg-green-100 text-green-700',
    closed_no_hire: 'bg-red-100 text-red-700',
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorMap[status] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {PROCESS_STATUS_LABELS[status] ?? status}
    </span>
  )
}
