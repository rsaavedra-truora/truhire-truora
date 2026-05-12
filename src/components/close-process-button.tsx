'use client'

import { useTransition } from 'react'
import { closeProcess } from '@/app/actions/processes'

export function CloseProcessButton({ processId }: { processId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleClose() {
    if (!confirm('¿Cerrar este proceso? Quedará archivado y no aparecerá en la lista activa.')) return
    const fd = new FormData()
    fd.set('process_id', processId)
    fd.set('reason', 'closed_no_hire')
    startTransition(async () => { await closeProcess(fd) })
  }

  return (
    <button
      type="button"
      onClick={handleClose}
      disabled={isPending}
      className="px-3 py-2 text-sm border border-red-200 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
    >
      {isPending ? 'Cerrando...' : 'Cerrar'}
    </button>
  )
}
