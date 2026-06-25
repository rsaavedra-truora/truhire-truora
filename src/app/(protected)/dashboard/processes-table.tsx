'use client'

import Link from 'next/link'
import { PROCESS_STATUS_LABELS } from '@/lib/types'
import type { ProcessStatus } from '@/lib/types'

interface Process {
  id: string
  title: string
  entry_mode: string
  capa_intencional: string
  status: string
  hiring_manager_or_sponsor: { full_name: string }[] | { full_name: string } | null
}

export function ProcessesTable({ processes }: { processes: Process[] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: 'var(--surface-sunken)' }}>
          <Th>Proceso</Th>
          <Th>Capa</Th>
          <Th>Modo</Th>
          <Th>Estado</Th>
          <Th>Responsable</Th>
        </tr>
      </thead>
      <tbody>
        {processes.map((p, i) => (
          <TableRow key={p.id} process={p} isLast={i === processes.length - 1} />
        ))}
      </tbody>
    </table>
  )
}

function TableRow({ process: p, isLast }: { process: Process; isLast: boolean }) {
  return (
    <tr
      style={{
        borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
        transition: 'background 100ms ease',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-sunken)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <td style={{ padding: '14px 20px' }}>
        <Link
          href={`/processes/${p.id}`}
          style={{
            font: 'var(--weight-medium) 0.9375rem var(--font-sans)',
            color: 'var(--text-strong)',
            textDecoration: 'none',
          }}
        >
          {p.title}
        </Link>
      </td>
      <td style={{ padding: '14px 16px' }}>
        <CapaBadge capa={p.capa_intencional} />
      </td>
      <td style={{ padding: '14px 16px', font: '0.8125rem var(--font-sans)', color: 'var(--text-muted)' }}>
        {p.entry_mode === 'role_first' ? 'Role-first' : 'Talent-first'}
      </td>
      <td style={{ padding: '14px 16px' }}>
        <StatusBadge status={p.status as ProcessStatus} />
      </td>
      <td style={{ padding: '14px 16px', font: '0.875rem var(--font-sans)', color: 'var(--text-muted)' }}>
        {Array.isArray(p.hiring_manager_or_sponsor)
          ? p.hiring_manager_or_sponsor[0]?.full_name ?? '—'
          : p.hiring_manager_or_sponsor?.full_name ?? '—'}
      </td>
    </tr>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: 'left',
        padding: '12px 20px',
        font: 'var(--weight-medium) 0.75rem var(--font-sans)',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: 'var(--text-subtle)',
      }}
    >
      {children}
    </th>
  )
}

function CapaBadge({ capa }: { capa: string }) {
  const isLiderazgo = capa === 'liderazgo'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: 'var(--radius-pill)',
        font: 'var(--weight-medium) 0.75rem var(--font-sans)',
        background: isLiderazgo ? 'var(--violet-100)' : 'var(--brand-subtle)',
        color: isLiderazgo ? 'var(--violet-700)' : 'var(--brand)',
      }}
    >
      {isLiderazgo ? 'Liderazgo' : 'Funcional'}
    </span>
  )
}

function StatusBadge({ status }: { status: ProcessStatus }) {
  const map: Record<ProcessStatus, { bg: string; color: string; dot: string }> = {
    draft:          { bg: 'var(--surface-sunken)', color: 'var(--text-muted)', dot: 'var(--text-subtle)' },
    open:           { bg: 'var(--brand-subtle)', color: 'var(--brand)', dot: 'var(--brand)' },
    screening:      { bg: 'var(--orange-50)', color: 'var(--orange-700)', dot: 'var(--orange-500)' },
    phone_screen:   { bg: 'var(--violet-100)', color: 'var(--violet-700)', dot: 'var(--violet-500)' },
    challenge:      { bg: 'var(--orange-50)', color: 'var(--orange-700)', dot: 'var(--orange-500)' },
    loop:           { bg: 'var(--violet-100)', color: 'var(--violet-700)', dot: 'var(--violet-500)' },
    decision:       { bg: 'var(--violet-100)', color: 'var(--violet-700)', dot: 'var(--violet-500)' },
    closed_hire:    { bg: 'var(--success-50)', color: 'var(--success-700)', dot: 'var(--success-500)' },
    closed_no_hire: { bg: 'var(--danger-50)', color: 'var(--danger-700)', dot: 'var(--danger-500)' },
  }
  const s = map[status] ?? map.draft
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 'var(--radius-pill)',
        font: 'var(--weight-medium) 0.75rem var(--font-sans)',
        background: s.bg,
        color: s.color,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {PROCESS_STATUS_LABELS[status] ?? status}
    </span>
  )
}
