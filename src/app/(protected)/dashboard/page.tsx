import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PROCESS_STATUS_LABELS } from '@/lib/types'
import type { ProcessStatus } from '@/lib/types'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

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

  const { count: totalOpen }      = await supabase.from('processes').select('*', { count: 'exact', head: true }).eq('status', 'open')
  const { count: totalScreening } = await supabase.from('processes').select('*', { count: 'exact', head: true }).eq('status', 'screening')
  const { count: totalLoop }      = await supabase.from('processes').select('*', { count: 'exact', head: true }).eq('status', 'loop')

  const isRecruiterOrAdmin = profile?.role === 'recruiter' || profile?.role === 'head_of_people'

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-semibold"
            style={{ color: 'var(--truora-ink)', letterSpacing: '-0.02em' }}
          >
            Buenos días, {profile?.full_name?.split(' ')[0] ?? 'equipo'} 👋
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--truora-ink-muted)' }}>
            Aquí está el estado de los procesos activos.
          </p>
        </div>
        {isRecruiterOrAdmin && (
          <Link href="/processes/new" className="btn-truora">
            + Nuevo proceso
          </Link>
        )}
      </div>

      {/* Métricas */}
      {isRecruiterOrAdmin && (
        <div className="grid grid-cols-3 gap-4">
          <MetricCard label="Procesos abiertos" value={totalOpen ?? 0}      accent="var(--truora-primary)" />
          <MetricCard label="En screening"       value={totalScreening ?? 0} accent="#F59E0B" />
          <MetricCard label="En interview loop"  value={totalLoop ?? 0}      accent="#7C3AED" />
        </div>
      )}

      {/* Tabla de procesos activos */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--truora-bg)', border: '1px solid var(--truora-line)', boxShadow: '0 1px 2px rgba(11,16,32,0.04)' }}
      >
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--truora-line)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--truora-ink)' }}>
            Procesos activos
          </h2>
          {isRecruiterOrAdmin && (
            <Link
              href="/processes"
              className="text-xs font-medium hover:underline"
              style={{ color: 'var(--truora-primary)' }}
            >
              Ver todos →
            </Link>
          )}
        </div>

        {!processes || processes.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm" style={{ color: 'var(--truora-ink-muted)' }}>
              No hay procesos activos por el momento.
            </p>
            {isRecruiterOrAdmin && (
              <Link
                href="/processes/new"
                className="mt-3 inline-block text-sm font-medium hover:underline"
                style={{ color: 'var(--truora-primary)' }}
              >
                Crear el primer proceso →
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--truora-bg-soft)', borderBottom: '1px solid var(--truora-line)' }}>
                <Th>Proceso</Th>
                <Th>Capa</Th>
                <Th>Modo</Th>
                <Th>Estado</Th>
                <Th>Manager / Sponsor</Th>
              </tr>
            </thead>
            <tbody>
              {processes.map((p) => (
                <tr
                  key={p.id}
                  className="transition-colors cursor-pointer hover:bg-truora-bg-soft border-b border-truora-line/50 last:border-b-0"
                >
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/processes/${p.id}`}
                      className="font-medium text-truora-ink hover:text-truora-primary hover:underline transition-colors"
                    >
                      {p.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5">
                    <CapaBadge capa={p.capa_intencional} />
                  </td>
                  <td className="px-4 py-3.5 text-xs" style={{ color: 'var(--truora-ink-muted)' }}>
                    {p.entry_mode === 'role_first' ? 'Role-first' : 'Talent-first'}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={p.status as ProcessStatus} />
                  </td>
                  <td className="px-4 py-3.5 text-sm" style={{ color: 'var(--truora-ink-muted)' }}>
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

// ── Subcomponentes ─────────────────────────────────────────────────────────

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="text-left px-5 py-3 font-semibold"
      style={{ fontSize: '0.8125rem', color: 'var(--truora-ink-muted)' }}
    >
      {children}
    </th>
  )
}

function MetricCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--truora-bg)', border: '1px solid var(--truora-line)', boxShadow: '0 1px 2px rgba(11,16,32,0.04)' }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--truora-ink-muted)' }}>
        {label}
      </p>
      <p className="text-3xl font-bold mt-1.5" style={{ color: accent, letterSpacing: '-0.03em', lineHeight: 1 }}>
        {value}
      </p>
    </div>
  )
}

function CapaBadge({ capa }: { capa: string }) {
  const isLiderazgo = capa === 'liderazgo'
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{
        background: isLiderazgo ? '#F3F0FF' : 'var(--truora-primary-soft)',
        color: isLiderazgo ? '#5B21B6' : 'var(--truora-primary)',
      }}
    >
      {isLiderazgo ? 'Liderazgo' : 'Funcional'}
    </span>
  )
}

function StatusBadge({ status }: { status: ProcessStatus }) {
  const map: Record<ProcessStatus, { bg: string; color: string; dot: string }> = {
    draft:          { bg: 'var(--truora-bg-canvas)', color: 'var(--truora-ink-muted)', dot: 'var(--truora-ink-subtle)' },
    open:           { bg: 'var(--truora-primary-soft)', color: 'var(--truora-primary)', dot: 'var(--truora-primary)' },
    screening:      { bg: '#FEF3C7', color: '#92400E', dot: '#F59E0B' },
    phone_screen:   { bg: '#EDE9FE', color: '#5B21B6', dot: '#8B5CF6' },
    challenge:      { bg: '#FFEDD5', color: '#9A3412', dot: '#F97316' },
    loop:           { bg: '#F5F3FF', color: '#4C1D95', dot: '#7C3AED' },
    decision:       { bg: '#FAF5FF', color: '#6B21A8', dot: '#A855F7' },
    closed_hire:    { bg: '#D1FAE5', color: '#065F46', dot: 'var(--truora-success)' },
    closed_no_hire: { bg: '#FEE2E2', color: '#991B1B', dot: 'var(--truora-danger)' },
  }
  const s = map[status] ?? map.draft
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
      {PROCESS_STATUS_LABELS[status] ?? status}
    </span>
  )
}
