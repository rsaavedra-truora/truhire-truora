'use client'

import { useState, useTransition } from 'react'
import { updateCandidateStatus } from '@/app/actions/candidates'
import { ChevronDown } from 'lucide-react'

const STAGE_CONFIG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  applied:      { label: 'Recién aplicado',   bg: '#F3F4F6', color: '#374151', dot: '#9CA3AF' },
  screening:    { label: 'En screening AI',   bg: '#FFFBEB', color: '#92400E', dot: '#F59E0B' },
  phone_screen: { label: 'Phone screen',      bg: '#EDE9FE', color: '#5B21B6', dot: '#8B5CF6' },
  loop:         { label: 'Interview loop',    bg: '#F5F3FF', color: '#4C1D95', dot: '#7C3AED' },
  decision:     { label: 'Decisión final',    bg: '#FAF5FF', color: '#6B21A8', dot: '#A855F7' },
  hired:        { label: 'Contratado',        bg: '#ECFDF5', color: '#065F46', dot: '#10B981' },
  rejected:     { label: 'Descartado',        bg: '#FEF2F2', color: '#991B1B', dot: '#EF4444' },
}

// Siguiente etapa lógica en el flujo
const NEXT_STAGE: Record<string, string | null> = {
  applied:      'screening',
  screening:    'phone_screen',
  phone_screen: 'loop',
  loop:         'decision',
  decision:     'hired',
  hired:        null,
  rejected:     null,
}

const NEXT_STAGE_LABEL: Record<string, string> = {
  screening:    'Mover a screening',
  phone_screen: 'Mover a phone screen',
  loop:         'Mover a loop',
  decision:     'Marcar como decisión pendiente',
  hired:        'Marcar como contratado',
}

export function CandidateStatusControl({
  pcId, processId, currentStatus,
}: { pcId: string; processId: string; currentStatus: string }) {
  const [isPending, startTransition] = useTransition()
  const [showMenu, setShowMenu] = useState(false)
  const config = STAGE_CONFIG[currentStatus] ?? STAGE_CONFIG.applied
  const nextStage = NEXT_STAGE[currentStatus]

  async function changeStatus(newStatus: string) {
    setShowMenu(false)
    const fd = new FormData()
    fd.set('pc_id', pcId)
    fd.set('process_id', processId)
    fd.set('status', newStatus)
    startTransition(async () => { await updateCandidateStatus(fd) })
  }

  return (
    <div className="flex items-center gap-2 relative">
      {/* Badge del estado actual */}
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
        style={{ background: config.bg, color: config.color }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.dot }} />
        {config.label}
      </span>

      {/* Botón de avanzar — solo si hay siguiente etapa */}
      {nextStage && currentStatus !== 'rejected' && (
        <button
          onClick={() => changeStatus(nextStage)}
          disabled={isPending}
          className="text-xs px-2.5 py-1.5 bg-[#0800FF] text-white rounded-lg hover:bg-[#0600CC] font-medium disabled:opacity-50 whitespace-nowrap"
        >
          {isPending ? '...' : NEXT_STAGE_LABEL[nextStage] ?? `→ ${nextStage}`}
        </button>
      )}

      {/* Menú con más opciones */}
      {currentStatus !== 'hired' && currentStatus !== 'rejected' && (
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            disabled={isPending}
            className="text-xs px-2 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 disabled:opacity-50 flex items-center gap-1"
          >
            <ChevronDown size={12} />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl border border-gray-200 shadow-lg z-20 overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Mover a etapa</p>
                </div>
                {Object.entries(STAGE_CONFIG)
                  .filter(([s]) => s !== currentStatus && s !== 'hired')
                  .map(([status, conf]) => (
                    <button key={status} onClick={() => changeStatus(status)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 text-left transition-colors">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: conf.dot }} />
                      <div>
                        <p className="text-xs font-medium text-gray-800">{conf.label}</p>
                        {status === 'rejected' && (
                          <p className="text-xs text-orange-500">Habilitará el envío de feedback</p>
                        )}
                      </div>
                    </button>
                  ))
                }
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function StatusBadgeReadOnly({ status }: { status: string }) {
  const config = STAGE_CONFIG[status] ?? STAGE_CONFIG.applied
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
      style={{ background: config.bg, color: config.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.dot }} />
      {config.label}
    </span>
  )
}
