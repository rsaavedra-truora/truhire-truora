'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { updateProcess } from '@/app/actions/processes'

export default function EditProcessPage() {
  const router = useRouter()
  const params = useParams()
  const processId = params.id as string
  const [isPending, startTransition] = useTransition()
  const [entryMode, setEntryMode] = useState<'role_first' | 'talent_first'>('role_first')
  const [capa, setCapa] = useState<'liderazgo' | 'funcional'>('funcional')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [extracting, setExtracting] = useState(false)
  const [jdError, setJdError] = useState<string | null>(null)
  const descRef = useRef<HTMLTextAreaElement>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('processes').select('*').eq('id', processId).single().then(({ data }) => {
      if (data) {
        setEntryMode(data.entry_mode)
        setCapa(data.capa_intencional)
        // Pre-fill uncontrolled inputs via DOM after render
        setTimeout(() => {
          const titleEl = document.querySelector<HTMLInputElement>('input[name="title"]')
          const slugEl = document.querySelector<HTMLInputElement>('input[name="role_slug"]')
          if (titleEl) titleEl.value = data.title ?? ''
          if (slugEl) slugEl.value = data.role_slug ?? ''
          if (descRef.current) descRef.current.value = data.role_description ?? ''
        }, 0)
      }
      setLoading(false)
    })
  }, [processId])

  async function extractFromFile(file: File) {
    setJdError(null)
    setExtracting(true)
    try {
      const fd = new FormData()
      fd.set('file', file)
      const res = await fetch('/api/extract-text', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.text && descRef.current) { descRef.current.value = data.text }
      else if (data.error) setJdError(data.error)
    } catch (err: any) { setJdError(err.message) }
    finally { setExtracting(false) }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try { await updateProcess(fd) }
      catch (err: any) { setError(err.message ?? 'Error al guardar.') }
    })
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Cargando...</div>

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <button type="button" onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-3 flex items-center gap-1">← Volver</button>
        <h1 className="text-xl font-semibold text-gray-900">Editar proceso</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <input type="hidden" name="process_id" value={processId} />
        <input type="hidden" name="entry_mode" value={entryMode} />
        <input type="hidden" name="capa_intencional" value={capa} />

        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Información del rol</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre del proceso <span className="text-red-500">*</span></label>
            <input name="title" type="text" required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">URL de aplicación <span className="text-gray-400 font-normal text-xs">(opcional)</span></label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 whitespace-nowrap">careers.truora.com/apply/</span>
              <input name="role_slug" type="text" className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF]" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción del rol</label>
            {extracting ? (
              <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50">
                <svg className="animate-spin h-4 w-4 text-[#0800FF]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                <span className="text-xs text-blue-600">Extrayendo...</span>
              </div>
            ) : (
              <div className="mb-2">
                <input type="file" accept=".pdf,.docx,.doc,.md,.txt"
                  className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#E8E7FF] file:text-[#0800FF] file:font-medium file:text-xs hover:file:bg-[#0800FF] hover:file:text-white file:cursor-pointer"
                  onChange={e => { const f = e.target.files?.[0]; if (f) extractFromFile(f); e.target.value = '' }} />
              </div>
            )}
            {jdError && <p className="text-xs text-red-600 mb-1">⚠ {jdError}</p>}
            <textarea ref={descRef} name="role_description" rows={4}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF] resize-none" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Modo de entrada</h2>
          <div className="grid grid-cols-2 gap-3">
            {[{ v: 'role_first' as const, l: 'Role-first', d: 'Posición abierta' }, { v: 'talent_first' as const, l: 'Talent-first', d: 'Persona identificada' }].map(o => (
              <button key={o.v} type="button" onClick={() => setEntryMode(o.v)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${entryMode === o.v ? 'border-[#0800FF] bg-[#E8E7FF]' : 'border-gray-200 hover:border-gray-300'}`}>
                <p className="text-sm font-medium text-gray-900">{o.l}</p>
                <p className="text-xs text-gray-500 mt-1">{o.d}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Capa intencional</h2>
          <div className="grid grid-cols-2 gap-3">
            {[{ v: 'liderazgo' as const, l: 'Liderazgo', d: 'Bench 50%' }, { v: 'funcional' as const, l: 'Funcional', d: 'Bench 80%' }].map(o => (
              <button key={o.v} type="button" onClick={() => setCapa(o.v)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${capa === o.v ? 'border-[#0800FF] bg-[#E8E7FF]' : 'border-gray-200 hover:border-gray-300'}`}>
                <p className="text-sm font-medium text-gray-900">{o.l}</p>
                <p className="text-xs text-gray-500 mt-1">{o.d}</p>
              </button>
            ))}
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3"><p className="text-sm text-red-700">{error}</p></div>}

        <div className="flex gap-3 pb-6">
          <button type="submit" disabled={isPending} className="btn-truora disabled:opacity-50">
            {isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancelar</button>
        </div>
      </form>
    </div>
  )
}
