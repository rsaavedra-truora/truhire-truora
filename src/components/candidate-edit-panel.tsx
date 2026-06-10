'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  candidate: {
    id: string
    full_name: string
    email: string
    linkedin_url: string | null
    cv_url: string | null
  }
}

export function CandidateEditPanel({ candidate }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [form, setForm] = useState({
    full_name: candidate.full_name,
    email: candidate.email,
    linkedin_url: candidate.linkedin_url ?? '',
  })
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)

    try {
      let cvUrl = candidate.cv_url
      let cvText: string | null = null

      // Si hay nuevo CV, subir y extraer texto
      if (cvFile) {
        const fd = new FormData()
        fd.set('file', cvFile)
        const extractRes = await fetch('/api/extract-text', { method: 'POST', body: fd })
        const extractData = await extractRes.json()
        if (extractData.text) cvText = extractData.text

        const cvBuffer = await cvFile.arrayBuffer()
        const fileName = `${candidate.id}/${Date.now()}-${form.email.replace('@', '-at-')}.pdf`
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('cvs')
          .upload(fileName, cvBuffer, { contentType: 'application/pdf', upsert: false })

        if (!uploadError) {
          cvUrl = supabase.storage.from('cvs').getPublicUrl(fileName).data.publicUrl
        }
      }

      const updatePayload: Record<string, any> = {
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        linkedin_url: form.linkedin_url.trim() || null,
        ...(cvUrl && { cv_url: cvUrl }),
        ...(cvText && { cv_text: cvText }),
      }

      const { error: updateError } = await supabase
        .from('candidates')
        .update(updatePayload)
        .eq('id', candidate.id)

      if (updateError) throw new Error(updateError.message)

      setShowEdit(false)
      setCvFile(null)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    const { error } = await supabase
      .from('candidates')
      .delete()
      .eq('id', candidate.id)

    if (error) {
      setError(error.message)
      setDeleting(false)
      return
    }

    router.push('/candidates')
    router.refresh()
  }

  return (
    <>
      {/* Botones de acción */}
      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <button
          onClick={() => { setShowEdit(true); setShowDelete(false) }}
          className="flex-1 text-xs font-medium px-3 py-2 border border-gray-200 rounded-lg text-gray-600 hover:border-[#0800FF] hover:text-[#0800FF] transition-colors"
        >
          Editar perfil
        </button>
        <button
          onClick={() => { setShowDelete(true); setShowEdit(false) }}
          className="text-xs font-medium px-3 py-2 border border-red-200 rounded-lg text-red-400 hover:border-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          Eliminar
        </button>
      </div>

      {/* Panel de edición */}
      {showEdit && (
        <div className="mt-4 bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-700">Editar candidato</p>
            <button onClick={() => setShowEdit(false)} className="text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Nombre completo</label>
            <input
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0800FF]"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0800FF]"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">LinkedIn</label>
            <input
              value={form.linkedin_url}
              onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))}
              placeholder="https://linkedin.com/in/..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0800FF]"
            />
          </div>

          {/* CV Upload */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              {candidate.cv_url ? 'Reemplazar CV (PDF)' : 'Subir CV (PDF)'}
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => {
                e.preventDefault(); setIsDragging(false)
                const f = e.dataTransfer.files[0]
                if (f?.type === 'application/pdf') setCvFile(f)
              }}
              className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${
                isDragging ? 'border-[#0800FF] bg-[#E8E7FF]'
                : cvFile ? 'border-green-400 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {cvFile ? (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-gray-800 font-medium truncate">{cvFile.name}</p>
                  <button type="button" onClick={e => { e.stopPropagation(); setCvFile(null) }}
                    className="text-gray-400 hover:text-red-500">✕</button>
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  <span className="text-[#0800FF] font-medium">Arrastra el PDF</span> o haz clic
                </p>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".pdf" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) setCvFile(f); e.target.value = '' }} />
            {candidate.cv_url && !cvFile && (
              <a href={candidate.cv_url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-[#0800FF] hover:underline mt-1 inline-block">
                Ver CV actual →
              </a>
            )}
          </div>

          {error && <p className="text-xs text-red-600">⚠ {error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-truora text-xs flex-1 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button onClick={() => setShowEdit(false)} className="text-xs text-gray-400 hover:text-gray-600 px-2">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Confirmación de eliminación */}
      {showDelete && (
        <div className="mt-4 bg-red-50 rounded-xl border border-red-200 p-4 space-y-3">
          <p className="text-xs font-semibold text-red-700">¿Eliminar a {candidate.full_name}?</p>
          <p className="text-xs text-red-600 leading-relaxed">
            Se eliminará el candidato y toda su información del sistema.
            Esta acción no se puede deshacer.
          </p>
          {error && <p className="text-xs text-red-700 font-medium">⚠ {error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 text-xs font-medium px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {deleting ? 'Eliminando...' : 'Sí, eliminar'}
            </button>
            <button
              onClick={() => setShowDelete(false)}
              className="text-xs text-gray-500 hover:text-gray-700 px-3"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
