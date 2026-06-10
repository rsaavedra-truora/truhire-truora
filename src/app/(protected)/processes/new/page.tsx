'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createProcess } from '@/app/actions/processes'
import { JDUploadZone } from '@/components/jd-upload-zone'
import { PersonSearch } from '@/components/person-search'

export default function NewProcessPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [entryMode, setEntryMode] = useState<'role_first' | 'talent_first'>('role_first')
  const [capa, setCapa] = useState<'liderazgo' | 'funcional'>('funcional')
  const [error, setError] = useState<string | null>(null)
  const [hmEmail, setHmEmail] = useState('')
  const descRef = useRef<HTMLTextAreaElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('hiring_manager_email', hmEmail)
    startTransition(async () => {
      try {
        await createProcess(fd)
      } catch (err: any) {
        setError(err.message ?? 'Error al crear el proceso.')
      }
    })
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <button type="button" onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-3 flex items-center gap-1">
          ← Volver
        </button>
        <h1 className="text-xl font-semibold text-gray-900">Nuevo proceso de reclutamiento</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Hidden inputs para valores controlados */}
        <input type="hidden" name="entry_mode" value={entryMode} />
        <input type="hidden" name="capa_intencional" value={capa} />

        {/* Info del rol */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Información del rol</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nombre del proceso <span className="text-red-500">*</span>
            </label>
            <input name="title" type="text" required placeholder="Ej: Head of Sales LATAM"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF]" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              URL de aplicación <span className="text-gray-400 font-normal text-xs">(opcional)</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 whitespace-nowrap">careers.truora.com/apply/</span>
              <input name="role_slug" type="text" placeholder="head-of-sales-latam"
                className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF]" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Descripción del rol <span className="text-gray-400 font-normal text-xs">(opcional)</span>
            </label>

            <JDUploadZone descRef={descRef} onExtracted={() => {}} />

            <textarea ref={descRef} name="role_description" rows={4}
              placeholder="O escribe la descripción del rol aquí..."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF] resize-none" />
          </div>
        </div>

        {/* Modo de entrada */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Modo de entrada</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { v: 'role_first' as const, l: 'Role-first', d: 'Posición abierta, candidatos aplican.' },
              { v: 'talent_first' as const, l: 'Talent-first', d: 'Persona identificada antes del rol.' },
            ].map(o => (
              <button key={o.v} type="button" onClick={() => setEntryMode(o.v)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${entryMode === o.v ? 'border-[#0800FF] bg-[#E8E7FF]' : 'border-gray-200 hover:border-gray-300'}`}>
                <p className="text-sm font-medium text-gray-900">{o.l}</p>
                <p className="text-xs text-gray-500 mt-1">{o.d}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Capa */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Capa intencional</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { v: 'liderazgo' as const, l: 'Liderazgo', d: 'Reporta a Daniel o Mariangel · bench 50%' },
              { v: 'funcional' as const, l: 'Funcional', d: 'Roles funcionales · bench 80%' },
            ].map(o => (
              <button key={o.v} type="button" onClick={() => setCapa(o.v)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${capa === o.v ? 'border-[#0800FF] bg-[#E8E7FF]' : 'border-gray-200 hover:border-gray-300'}`}>
                <p className="text-sm font-medium text-gray-900">{o.l}</p>
                <p className="text-xs text-gray-500 mt-1">{o.d}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Hiring manager */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            {entryMode === 'talent_first' ? 'Sponsor' : 'Hiring manager'}
            <span className="text-gray-400 font-normal text-xs ml-1">(opcional)</span>
          </h2>
          <PersonSearch
            value={hmEmail}
            onChange={(email) => setHmEmail(email)}
            placeholder="Buscar por nombre..."
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex items-center gap-3 pb-6">
          <button type="submit" disabled={isPending}
            className="btn-truora disabled:opacity-50 disabled:cursor-not-allowed">
            {isPending ? 'Creando proceso...' : 'Crear proceso'}
          </button>
          <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
