'use client'

import { useState, useRef } from 'react'
import type { StructuredJD } from '@/app/api/parse-jd/route'

interface JDUploadZoneProps {
  roleTitle: string
  onExtracted: (text: string, structured: StructuredJD | null) => void
}

export function JDUploadZone({ roleTitle, onExtracted }: JDUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [stage, setStage] = useState<'idle' | 'extracting' | 'parsing' | 'done' | 'error'>('idle')
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setError(null)
    setFileName(file.name)
    setStage('extracting')

    try {
      // Step 1: Extract raw text from document
      const fd = new FormData()
      fd.set('file', file)
      const extractRes = await fetch('/api/extract-text', { method: 'POST', body: fd })
      const extractData = await extractRes.json()

      if (!extractData.text) {
        throw new Error(extractData.error ?? 'No se pudo extraer el texto.')
      }

      const rawText: string = extractData.text

      // Step 2: AI structures the JD for the specific role
      setStage('parsing')
      const parseRes = await fetch('/api/parse-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText, title: roleTitle || 'el cargo' }),
      })
      const parseData = await parseRes.json()

      setStage('done')
      onExtracted(rawText, parseData.structured ?? null)
    } catch (err: any) {
      setError(err.message)
      setStage('error')
      setFileName(null)
    }
  }

  const busy = stage === 'extracting' || stage === 'parsing'

  const stageLabel = stage === 'extracting'
    ? 'Extrayendo texto del documento...'
    : stage === 'parsing'
    ? 'Estructurando con AI...'
    : null

  return (
    <div className="space-y-2">
      <div
        onClick={() => !busy && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false) }}
        onDrop={e => {
          e.preventDefault(); setIsDragging(false)
          const f = e.dataTransfer.files[0]
          if (f) handleFile(f)
        }}
        className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors select-none ${
          busy
            ? 'border-blue-300 bg-blue-50 cursor-wait'
            : isDragging
            ? 'border-truora-primary bg-truora-primary-soft cursor-copy'
            : stage === 'done'
            ? 'border-green-400 bg-green-50 cursor-pointer'
            : stage === 'error'
            ? 'border-red-300 bg-red-50 cursor-pointer'
            : 'border-gray-300 hover:border-truora-primary hover:bg-gray-50 cursor-pointer'
        }`}
      >
        {stageLabel ? (
          <div className="flex flex-col items-center gap-2">
            <svg className="animate-spin h-8 w-8 text-truora-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <p className="text-sm text-blue-600 font-medium">{stageLabel}</p>
            {stage === 'parsing' && (
              <p className="text-xs text-blue-400">El AI extrae solo la info de este cargo específico</p>
            )}
          </div>
        ) : stage === 'done' ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900">{fileName}</p>
            <p className="text-xs text-gray-500">JD procesado · <span className="text-truora-primary">Cambiar archivo</span></p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <svg className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-sm text-gray-600">
              <span className="text-truora-primary font-medium">Sube el Job Description</span> o arrastra aquí
            </p>
            <p className="text-xs text-gray-400">PDF o Word · El AI extrae solo la info de este cargo</p>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.doc,.md,.txt"
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
