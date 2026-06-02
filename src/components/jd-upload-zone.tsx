'use client'

import { useState, useRef } from 'react'

interface JDUploadZoneProps {
  onExtracted: (text: string) => void
  descRef: React.RefObject<HTMLTextAreaElement>
}

export function JDUploadZone({ onExtracted, descRef }: JDUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setError(null)
    setFileName(file.name)
    setExtracting(true)
    try {
      const fd = new FormData()
      fd.set('file', file)
      const res = await fetch('/api/extract-text', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.text) {
        if (descRef.current) descRef.current.value = data.text
        onExtracted(data.text)
      } else {
        setError(data.error ?? 'No se pudo extraer el texto.')
        setFileName(null)
      }
    } catch (err: any) {
      setError(err.message)
      setFileName(null)
    } finally {
      setExtracting(false)
    }
  }

  return (
    <div className="space-y-2">
      <div
        onClick={() => !extracting && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false) }}
        onDrop={e => {
          e.preventDefault(); setIsDragging(false)
          const f = e.dataTransfer.files[0]
          if (f) handleFile(f)
        }}
        className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors select-none ${
          extracting ? 'border-blue-300 bg-blue-50 cursor-wait'
          : isDragging ? 'border-[#0800FF] bg-[#E8E7FF] cursor-copy'
          : fileName ? 'border-green-400 bg-green-50 cursor-pointer'
          : 'border-gray-300 hover:border-[#0800FF] hover:bg-gray-50 cursor-pointer'
        }`}
      >
        {extracting ? (
          <div className="flex flex-col items-center gap-2">
            <svg className="animate-spin h-8 w-8 text-[#0800FF]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <p className="text-sm text-blue-600">Extrayendo texto del archivo...</p>
          </div>
        ) : fileName ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900">{fileName}</p>
            <p className="text-xs text-gray-500">Texto extraído correctamente · <span className="text-[#0800FF]">Cambiar archivo</span></p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <svg className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-sm text-gray-600">
              <span className="text-[#0800FF] font-medium">Arrastra el JD</span> o haz clic para seleccionar
            </p>
            <p className="text-xs text-gray-400">PDF, Word, Excel, Markdown o texto plano · Máx. 10MB</p>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.doc,.md,.txt,.xlsx,.xls"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
          e.target.value = ''
        }}
      />
      {error && <p className="text-xs text-red-600">⚠ {error}</p>}
    </div>
  )
}
