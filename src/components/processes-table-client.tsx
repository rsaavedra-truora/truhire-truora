'use client'

import Link from 'next/link'
import { SortableTable } from '@/components/sortable-table'
import { CAPA_LABELS, ENTRY_MODE_LABELS, PROCESS_STATUS_LABELS } from '@/lib/types'
import type { ProcessStatus, CapaIntencional, EntryMode } from '@/lib/types'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; dot: string }> = {
    draft:          { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF' },
    open:           { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
    screening:      { bg: '#FFFBEB', text: '#92400E', dot: '#F59E0B' },
    phone_screen:   { bg: '#EDE9FE', text: '#5B21B6', dot: '#8B5CF6' },
    loop:           { bg: '#F5F3FF', text: '#4C1D95', dot: '#7C3AED' },
    decision:       { bg: '#FAF5FF', text: '#6B21A8', dot: '#A855F7' },
    closed_hire:    { bg: '#ECFDF5', text: '#065F46', dot: '#10B981' },
    closed_no_hire: { bg: '#FEF2F2', text: '#991B1B', dot: '#EF4444' },
  }
  const s = map[status] ?? map.draft
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: s.bg, color: s.text }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
      {PROCESS_STATUS_LABELS[status as ProcessStatus] ?? status}
    </span>
  )
}

function CapaBadge({ capa }: { capa: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" style={{
      background: capa === 'liderazgo' ? '#F3F0FF' : '#EFF6FF',
      color: capa === 'liderazgo' ? '#5B21B6' : '#1D4ED8',
    }}>
      {CAPA_LABELS[capa as CapaIntencional] ?? capa}
    </span>
  )
}

function CandidateTracker({ candidates }: { candidates: { status: string }[] }) {
  if (!candidates.length) return <span className="text-xs text-gray-400">—</span>
  const stages = [
    { key: 'screening', label: 'Screening', bg: '#FFFBEB', color: '#92400E' },
    { key: 'phone_screen', label: 'Manager Screening', bg: '#EDE9FE', color: '#5B21B6' },
    { key: 'loop', label: 'Loop', bg: '#F5F3FF', color: '#4C1D95' },
    { key: 'hired', label: 'Hire', bg: '#ECFDF5', color: '#065F46' },
  ]
  const counts = stages.map(s => ({ ...s, count: candidates.filter(c => c.status === s.key).length })).filter(s => s.count > 0)
  if (!counts.length) return <span className="text-xs text-gray-400">{candidates.length} aplicaron</span>
  return (
    <div className="flex flex-wrap gap-1">
      {counts.map(s => (
        <span key={s.key} className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: s.bg, color: s.color }}>
          {s.count} {s.label}
        </span>
      ))}
    </div>
  )
}

type ProcessRow = {
  id: string; title: string; entry_mode: string; capa_intencional: string
  status: string; created_at: string
  hiring_manager_or_sponsor: { full_name: string } | null
  candidates: { status: string }[]
}

export function ProcessesTableClient({ processes }: { processes: ProcessRow[] }) {
  const columns = [
    {
      key: 'title', label: 'Proceso', sortable: true, searchable: true,
      getValue: (r: ProcessRow) => r.title,
      render: (r: ProcessRow) => (
        <Link href={`/processes/${r.id}`} className="font-semibold text-gray-900 hover:text-truora-primary transition-colors text-sm">
          {r.title}
        </Link>
      ),
    },
    {
      key: 'capa', label: 'Capa', sortable: true, filterable: true,
      filterOptions: [{ value: 'liderazgo', label: 'Liderazgo' }, { value: 'funcional', label: 'Funcional' }],
      getValue: (r: ProcessRow) => r.capa_intencional,
      render: (r: ProcessRow) => <CapaBadge capa={r.capa_intencional} />,
    },
    {
      key: 'entry_mode', label: 'Modo', sortable: true, filterable: true,
      filterOptions: [{ value: 'role_first', label: 'Role-first' }, { value: 'talent_first', label: 'Talent-first' }],
      getValue: (r: ProcessRow) => r.entry_mode,
      render: (r: ProcessRow) => <span className="text-sm text-gray-500">{ENTRY_MODE_LABELS[r.entry_mode as EntryMode] ?? r.entry_mode}</span>,
    },
    {
      key: 'status', label: 'Estado', filterable: true,
      filterOptions: ['open','screening','phone_screen','loop','decision'].map(s => ({ value: s, label: PROCESS_STATUS_LABELS[s as ProcessStatus] ?? s })),
      getValue: (r: ProcessRow) => r.status,
      render: (r: ProcessRow) => <StatusBadge status={r.status} />,
    },
    {
      key: 'candidates', label: 'Candidatos',
      getValue: (r: ProcessRow) => String(r.candidates?.length ?? 0),
      render: (r: ProcessRow) => {
        const active = (r.candidates ?? []).filter(c => !['hired', 'rejected'].includes(c.status)).length
        const total = r.candidates?.length ?? 0
        if (!total) return <span className="text-xs text-gray-400">—</span>
        return <span className="text-sm text-gray-700">{active} en proceso</span>
      },
    },
    {
      key: 'manager', label: 'Manager', sortable: true,
      getValue: (r: ProcessRow) => r.hiring_manager_or_sponsor?.full_name ?? '',
      render: (r: ProcessRow) => <span className="text-sm text-gray-500">{r.hiring_manager_or_sponsor?.full_name ?? '—'}</span>,
    },
    {
      key: 'created_at', label: 'Creado', sortable: true,
      getValue: (r: ProcessRow) => r.created_at,
      render: (r: ProcessRow) => <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</span>,
    },
  ]

  return <SortableTable data={processes} columns={columns} rowKey={r => r.id} emptyMessage="No hay procesos." />
}
