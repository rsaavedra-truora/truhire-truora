'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SortableTable } from '@/components/sortable-table'

const CLASS_CONFIG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  green:       { label: 'Avanzar',     bg: '#ECFDF5', color: '#065F46', dot: '#10B981' },
  talent_pool: { label: 'Talent Pool', bg: '#FFF7ED', color: '#C2410C', dot: '#F97316' },
  yellow:      { label: 'Posible',     bg: '#FFFBEB', color: '#92400E', dot: '#F59E0B' },
  red:         { label: 'Descartar',   bg: '#FEF2F2', color: '#991B1B', dot: '#EF4444' },
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  applied:      { label: 'Aplicó',       bg: '#F3F4F6', color: '#4B5563' },
  screening:    { label: 'Screening',    bg: '#FFFBEB', color: '#92400E' },
  phone_screen: { label: 'Phone screen', bg: '#EDE9FE', color: '#5B21B6' },
  loop:         { label: 'Loop',         bg: '#F5F3FF', color: '#4C1D95' },
  decision:     { label: 'Decisión',     bg: '#FAF5FF', color: '#6B21A8' },
  hired:        { label: 'Contratado',   bg: '#ECFDF5', color: '#065F46' },
  rejected:     { label: 'Rechazado',    bg: '#FEF2F2', color: '#991B1B' },
}

type CandidateRow = {
  id: string; full_name: string; email: string; linkedin_url: string | null; created_at: string
  process_candidates: { id: string; status: string; process: { id: string; title: string } | null; screening: { classification: string } | null }[]
}

export function CandidatesTableClient({ candidates }: { candidates: CandidateRow[] }) {
  const router = useRouter()

  function getProfileUrl(r: CandidateRow): string {
    return `/candidates/${r.id}`
  }

  const columns = [
    {
      key: 'name', label: 'Candidato', sortable: true, searchable: true,
      getValue: (r: CandidateRow) => r.full_name,
      render: (r: CandidateRow) => {
        const url = getProfileUrl(r)
        return (
          <div>
            <Link href={url} className="font-semibold text-gray-900 hover:text-[#0800FF] transition-colors text-sm" onClick={e => e.stopPropagation()}>
              {r.full_name}
            </Link>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-gray-400">{r.email}</p>
              {r.linkedin_url && (
                <a href={r.linkedin_url} target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-xs text-[#0800FF] hover:underline font-medium">LinkedIn</a>
              )}
            </div>
          </div>
        )
      },
    },
    {
      key: 'process', label: 'Procesos',
      getValue: (r: CandidateRow) => r.process_candidates.map(pc => pc.process?.title ?? '').join(', '),
      render: (r: CandidateRow) => (
        <div className="flex flex-wrap gap-1">
          {r.process_candidates.map(pc => pc.process ? (
            <Link key={pc.id} href={`/processes/${pc.process.id}/candidates/${pc.id}`}
              onClick={e => e.stopPropagation()}
              className="text-xs px-2 py-0.5 rounded-full border border-gray-200 text-gray-600 hover:border-[#0800FF] hover:text-[#0800FF] transition-colors bg-white">
              {pc.process.title}
            </Link>
          ) : null)}
        </div>
      ),
    },
    {
      key: 'screening', label: 'Screening', filterable: true,
      filterOptions: [
        { value: 'green', label: '🟢 Avanzar' },
        { value: 'talent_pool', label: '🟠 Talent Pool' },
        { value: 'yellow', label: '🟡 Posible' },
        { value: 'red', label: '🔴 Descartar' },
      ],
      getValue: (r: CandidateRow) => r.process_candidates[0]?.screening?.classification ?? '',
      render: (r: CandidateRow) => {
        const cls = r.process_candidates[0]?.screening?.classification
        const conf = cls ? CLASS_CONFIG[cls] : null
        return conf ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ background: conf.bg, color: conf.color }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: conf.dot }} />
            {conf.label}
          </span>
        ) : <span className="text-xs text-gray-400">—</span>
      },
    },
    {
      key: 'status', label: 'Estado', sortable: true, filterable: true,
      filterOptions: Object.entries(STATUS_CONFIG).map(([v, c]) => ({ value: v, label: c.label })),
      getValue: (r: CandidateRow) => r.process_candidates[0]?.status ?? '',
      render: (r: CandidateRow) => {
        const st = r.process_candidates[0]?.status
        const conf = st ? STATUS_CONFIG[st] : null
        return conf ? (
          <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: conf.bg, color: conf.color }}>
            {conf.label}
          </span>
        ) : <span className="text-xs text-gray-400">—</span>
      },
    },
    {
      key: 'created_at', label: 'Agregado', sortable: true,
      getValue: (r: CandidateRow) => r.created_at,
      render: (r: CandidateRow) => <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</span>,
    },
  ]

  return (
    <SortableTable
      data={candidates}
      columns={columns}
      rowKey={r => r.id}
      emptyMessage="No hay candidatos aún."
      onRowClick={r => router.push(getProfileUrl(r))}
    />
  )
}
