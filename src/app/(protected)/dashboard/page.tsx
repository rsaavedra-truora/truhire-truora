import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PROCESS_STATUS_LABELS } from '@/lib/types'
import type { ProcessStatus } from '@/lib/types'
import { Plus, ArrowUpRight, TrendingUp } from 'lucide-react'
import { ProcessesTable } from './processes-table'

export const metadata = { title: 'Resumen' }

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
      id, title, entry_mode, capa_intencional, status, created_at,
      hiring_manager_or_sponsor:users!hiring_manager_or_sponsor_id(full_name),
      recruiter:users!recruiter_id(full_name)
    `)
    .not('status', 'in', '("closed_hire","closed_no_hire")')
    .order('created_at', { ascending: false })
    .limit(8)

  const { count: totalOpen }      = await supabase.from('processes').select('*', { count: 'exact', head: true }).eq('status', 'open')
  const { count: totalScreening } = await supabase.from('processes').select('*', { count: 'exact', head: true }).eq('status', 'screening')
  const { count: totalLoop }      = await supabase.from('processes').select('*', { count: 'exact', head: true }).eq('status', 'loop')
  const { count: totalHired }     = await supabase.from('processes').select('*', { count: 'exact', head: true }).eq('status', 'closed_hire')

  const isRecruiterOrAdmin = profile?.role === 'recruiter' || profile?.role === 'head_of_people'

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1
            style={{
              font: 'var(--weight-medium) var(--text-2xl) var(--font-display)',
              color: 'var(--text-strong)',
              letterSpacing: '-0.01em',
              margin: 0,
            }}
          >
            {getGreeting()}, {profile?.full_name?.split(' ')[0] ?? 'equipo'}
          </h1>
          <p style={{ font: '0.9375rem var(--font-sans)', color: 'var(--text-muted)', margin: '6px 0 0' }}>
            Estado de los procesos de reclutamiento activos.
          </p>
        </div>
        {isRecruiterOrAdmin && (
          <Link
            href="/processes/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 20px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--cta)',
              color: 'white',
              font: 'var(--weight-medium) 0.875rem var(--font-sans)',
              textDecoration: 'none',
              transition: 'background 150ms ease',
            }}
          >
            <Plus size={18} />
            Nuevo proceso
          </Link>
        )}
      </div>

      {/* Stats Grid */}
      {isRecruiterOrAdmin && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          <StatCard label="Procesos abiertos" value={totalOpen ?? 0} trend="+2 esta semana" />
          <StatCard label="En screening" value={totalScreening ?? 0} />
          <StatCard label="En interview loop" value={totalLoop ?? 0} />
          <StatCard label="Contratados (YTD)" value={totalHired ?? 0} trend="+12%" positive />
        </div>
      )}

      {/* Processes Table */}
      <div
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <div
          style={{
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <h2 style={{ font: 'var(--weight-medium) 1rem var(--font-display)', color: 'var(--text-strong)', margin: 0 }}>
            Procesos activos
          </h2>
          {isRecruiterOrAdmin && (
            <Link
              href="/processes"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                font: 'var(--weight-medium) 0.8125rem var(--font-sans)',
                color: 'var(--brand)',
                textDecoration: 'none',
              }}
            >
              Ver todos
              <ArrowUpRight size={14} />
            </Link>
          )}
        </div>

        {!processes || processes.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <p style={{ font: '0.9375rem var(--font-sans)', color: 'var(--text-muted)', margin: 0 }}>
              No hay procesos activos por el momento.
            </p>
            {isRecruiterOrAdmin && (
              <Link
                href="/processes/new"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 16,
                  font: 'var(--weight-medium) 0.875rem var(--font-sans)',
                  color: 'var(--brand)',
                  textDecoration: 'none',
                }}
              >
                Crear el primer proceso
                <ArrowUpRight size={14} />
              </Link>
            )}
          </div>
        ) : (
          <ProcessesTable processes={processes} />
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, trend, positive }: { label: string; value: number; trend?: string; positive?: boolean }) {
  return (
    <div
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 22px',
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      <p style={{ font: '0.8125rem var(--font-sans)', color: 'var(--text-muted)', margin: 0 }}>
        {label}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 10 }}>
        <span
          style={{
            font: 'var(--weight-medium) var(--text-2xl) var(--font-display)',
            color: 'var(--text-strong)',
            letterSpacing: '-0.01em',
          }}
        >
          {value}
        </span>
        {trend && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              font: 'var(--weight-medium) 0.75rem var(--font-sans)',
              color: positive ? 'var(--success-500)' : 'var(--text-subtle)',
            }}
          >
            {positive && <TrendingUp size={12} />}
            {trend}
          </span>
        )}
      </div>
    </div>
  )
}
