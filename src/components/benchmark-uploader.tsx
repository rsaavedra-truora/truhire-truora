'use client'

import { useState, useRef } from 'react'

interface Props {
  onSave: (data: { full_name: string; role_at_truora?: string; layer?: string; notes?: string; cv_text: string }) => Promise<void>
}

export function BenchmarkUploader({ onSave }: Props) {
  const [state, setState] = useState<'idle' | 'extracting' | 'confirm'>('idle')
  const [isSaving, setIsSaving] = useState(false)
  const [cvText, setCvText] = useState('')
  const [name, setName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setError(null)
    setState('extracting')

    const fd = new FormData()
    fd.set('file', file)

    try {
      const res = await fetch('/api/extract-text', { method: 'POST', body: fd })
      const data = await res.json()
      if (!data.text) { setError(data.error ?? 'No se pudo extraer el texto.'); setState('idle'); return }

      // Extraer nombre automáticamente
      const profileRes = await fetch('/api/extract-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText: data.text }),
      })
      const profileData = await profileRes.json()

      setCvText(data.text)
      setName(profileData.full_name ?? '')
      setState('confirm')
    } catch (err: any) {
      setError(err.message)
      setState('idle')
    }
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      await onSave({ full_name: name || 'Perfil sin nombre', cv_text: cvText })
      setState('idle')
      setIsSaving(false)
      setCvText('')
      setName('')
    } catch (err: any) {
      setError(err.message)
      setState('confirm')
    }
  }

  if (state === 'confirm') {
    return (
      <div className="space-y-3">
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
          <p className="text-xs text-green-700">CV extraído correctamente.</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nombre (para identificarlo en la lista)</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Nombre de la persona"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-truora-primary" />
        </div>
        {error && <p className="text-xs text-red-600">⚠ {error}</p>}
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={isSaving}
            className="btn-truora text-sm disabled:opacity-50">
            {isSaving ? 'Guardando...' : 'Agregar como referencia'}
          </button>
          <button onClick={() => { setState('idle'); setCvText(''); setName(''); setError(null) }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div
        onClick={() => state !== 'extracting' && fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false) }}
        onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
          state === 'extracting' ? 'border-blue-300 bg-blue-50 cursor-wait'
          : isDragging ? 'border-truora-primary bg-truora-primary-soft cursor-copy'
          : 'border-gray-300 hover:border-truora-primary hover:bg-gray-50 cursor-pointer'
        }`}
      >
        {state === 'extracting' ? (
          <div className="flex flex-col items-center gap-2">
            <svg className="animate-spin h-6 w-6 text-truora-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <p className="text-sm text-blue-600">Extrayendo perfil...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-sm text-gray-600">
              <span className="text-truora-primary font-medium">Arrastra el CV</span> o haz clic
            </p>
            <p className="text-xs text-gray-400">PDF, Word o texto plano</p>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.md,.txt" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
      {error && <p className="text-xs text-red-600 mt-1">⚠ {error}</p>}
    </div>
  )
}
