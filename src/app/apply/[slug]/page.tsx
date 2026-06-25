'use client'

import { useState, useRef } from 'react'
import { useParams } from 'next/navigation'

type Step = 'form' | 'uploading' | 'success' | 'error'

export default function ApplyPage() {
  const params = useParams()
  const slug = params.slug as string
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('form')
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.type === 'application/pdf') setSelectedFile(file)
    else setError('Solo se aceptan archivos PDF.')
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file?.type === 'application/pdf') {
      setSelectedFile(file)
      setError(null)
    } else {
      setError('Solo se aceptan archivos PDF.')
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!selectedFile) {
      setError('Por favor sube tu CV en PDF.')
      return
    }

    if (!consentChecked) {
      setError('Debes aceptar el aviso de privacidad para continuar.')
      return
    }

    setStep('uploading')

    const formData = new FormData(e.currentTarget)
    formData.set('process_slug', slug)
    formData.set('cv', selectedFile)

    try {
      const res = await fetch('/api/apply', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Ocurrió un error. Intenta de nuevo.')
        setStep('form')
        return
      }
      setStep('success')
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
      setStep('form')
    }
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">¡Aplicación recibida!</h1>
          <p className="text-gray-500">
            Gracias por tu interés. Revisaremos tu perfil y nos pondremos en contacto contigo si hay un match.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center">
          <img src="/logo-truora.png" alt="Truora" className="h-6 w-auto" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Aplica a esta posición</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Completa el formulario y sube tu CV. El proceso es 100% en línea.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Datos personales */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Datos personales</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nombre completo <span className="text-red-500">*</span>
                </label>
                <input
                  name="full_name"
                  type="text"
                  required
                  placeholder="Ana García López"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-truora-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="ana@ejemplo.com"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-truora-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                LinkedIn <span className="text-gray-400 font-normal">(opcional pero recomendado)</span>
              </label>
              <input
                name="linkedin_url"
                type="url"
                placeholder="https://linkedin.com/in/tu-perfil"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-truora-primary"
              />
            </div>
          </div>

          {/* CV Upload */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">CV / Hoja de vida</h2>
              <p className="text-xs text-gray-500 mt-0.5">Solo PDF · Máximo 5MB</p>
            </div>

            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              className={`
                border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                ${isDragging
                  ? 'border-truora-primary bg-truora-primary-soft'
                  : selectedFile
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }
              `}
            >
              {selectedFile ? (
                <div>
                  <svg className="w-8 h-8 text-green-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB ·{' '}
                    <span
                      className="text-truora-primary hover:underline"
                      onClick={(e) => { e.stopPropagation(); setSelectedFile(null) }}
                    >
                      Cambiar archivo
                    </span>
                  </p>
                </div>
              ) : (
                <div>
                  <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-gray-600">
                    <span className="text-truora-primary font-medium">Haz clic</span> o arrastra tu CV aquí
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PDF únicamente</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Consentimiento LFPDPPP */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={e => setConsentChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-truora-primary focus:ring-truora-primary cursor-pointer flex-shrink-0"
              />
              <span className="text-sm text-gray-600 leading-relaxed">
                He leído y acepto el{' '}
                <a
                  href="https://www.truora.com/es/aviso-de-privacidad-integral"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-truora-primary hover:underline font-medium"
                >
                  Aviso de Privacidad
                </a>{' '}
                de Truora. Consiento el tratamiento de mis datos personales (nombre, correo electrónico, perfil profesional y CV) con la finalidad de participar en este proceso de selección, conforme a la{' '}
                <span className="font-medium">Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)</span>.
              </span>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={step === 'uploading' || !consentChecked}
            className="w-full py-3 bg-truora-primary text-white font-medium rounded-xl hover:bg-truora-primary-hover active:bg-truora-primary-active transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {step === 'uploading' ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Procesando tu CV...
              </>
            ) : 'Enviar aplicación'}
          </button>

          <p className="text-xs text-gray-400 text-center pb-6">
            Tus datos se usan únicamente para este proceso de selección y no serán compartidos con terceros sin tu consentimiento.
          </p>
        </form>
      </main>
    </div>
  )
}
