'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function AddCandidatePage() {
  const router = useRouter()
  const params = useParams()
  const processId = params.id as string
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [step, setStep] = useState<'form' | 'processing'>('form')

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.type === 'application/pdf') { setSelectedFile(file); setError(null) }
    else setError('Solo se aceptan archivos PDF.')
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file?.type === 'application/pdf') { setSelectedFile(file); setError(null) }
    else setError('Solo se aceptan archivos PDF.')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!selectedFile) {
      setError('Por favor sube el CV en PDF.')
      return
    }

    setStep('processing')

    const form = e.currentTarget
    const formData = new FormData()
    formData.set('process_id', processId)
    formData.set('full_name', (form.elements.namedItem('full_name') as HTMLInputElement).value)
    formData.set('email', (form.elements.namedItem('email') as HTMLInputElement).value)
    formData.set('linkedin_url', (form.elements.namedItem('linkedin_url') as HTMLInputElement).value)
    formData.set('cv', selectedFile)

    try {
      const res = await fetch('/api/referral', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al agregar el candidato.')
        setStep('form')
        return
      }
      router.push(`/processes/${processId}/screening`)
      router.refresh()
    } catch (err: any) {
      setError(err.message ?? 'Error de conexión.')
      setStep('form')
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-3 flex items-center gap-1">
          ← Volver al proceso
        </button>
        <h1 className="text-xl font-semibold text-gray-900">Referir candidato</h1>
        <p className="text-sm text-gray-500 mt-1">
          Sube el CV del candidato. El sistema lo convierte a Markdown y corre el screening automáticamente.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Datos del candidato</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nombre completo <span className="text-red-500">*</span>
              </label>
              <input name="full_name" type="text" required placeholder="Ana García López"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF] focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email <span className="text-red-500">*</span>
              </label>
              <input name="email" type="email" required placeholder="ana@ejemplo.com"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF] focus:border-transparent" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              LinkedIn <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input name="linkedin_url" type="url" placeholder="https://linkedin.com/in/..."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF] focus:border-transparent" />
          </div>
        </div>

        {/* PDF Drop zone */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">CV del candidato</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              PDF · Máximo 5MB. El sistema extrae el texto automáticamente y corre el screening.
            </p>
            {/* Tip para cuando no hay CV */}
            <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5 flex items-start gap-2">
              <svg className="w-3.5 h-3.5 text-[#0800FF] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs text-[#0800FF] font-medium">¿Solo tienes el perfil de LinkedIn?</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Ve al perfil → botón <strong>Más</strong> → <strong>Guardar como PDF</strong>. Sube ese PDF aquí y el sistema lo procesa igual.
                </p>
                <a
                  href="https://www.linkedin.com/help/linkedin/answer/a541960"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#0800FF] hover:underline mt-1 inline-block font-medium"
                >
                  Ver instrucciones de LinkedIn →
                </a>
              </div>
            </div>
          </div>
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragging ? 'border-[#0800FF] bg-[#E8E7FF]'
              : selectedFile ? 'border-green-400 bg-green-50'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            {selectedFile ? (
              <div>
                <svg className="w-8 h-8 text-green-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB ·{' '}
                  <span className="text-[#0800FF]" onClick={(e) => { e.stopPropagation(); setSelectedFile(null) }}>
                    Cambiar
                  </span>
                </p>
              </div>
            ) : (
              <div>
                <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-gray-600">
                  <span className="text-[#0800FF] font-medium">Arrastra el PDF</span> o haz clic para seleccionar
                </p>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleFileSelect} className="hidden" />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex items-center gap-3 pb-6">
          <button type="submit" disabled={step === 'processing'}
            className="btn-truora disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            {step === 'processing' ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Procesando CV y corriendo screening...
              </>
            ) : 'Agregar y correr screening'}
          </button>
          <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
