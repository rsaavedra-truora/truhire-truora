'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ChallengeFile {
  name: string
  url: string
  type: string
  size: number
  uploaded_at: string
}

interface Props {
  processCandidateId: string
  existing: {
    spec_text?: string | null
    delivery_url?: string | null
    files?: ChallengeFile[] | null
  } | null
}

const ACCEPTED_TYPES = '.pdf,.doc,.docx,.xls,.xlsx,.json,.png,.jpg,.jpeg,.gif,.webp,.txt,.md,.csv'
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

function fileIcon(type: string) {
  if (type.includes('pdf')) return '📄'
  if (type.includes('word') || type.includes('doc')) return '📝'
  if (type.includes('excel') || type.includes('sheet') || type.includes('xls')) return '📊'
  if (type.includes('json')) return '🔧'
  if (type.includes('image')) return '🖼️'
  return '📎'
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function ChallengeUploader({ processCandidateId, existing }: Props) {
  const [files, setFiles] = useState<ChallengeFile[]>(existing?.files ?? [])
  const [specText, setSpecText] = useState(existing?.spec_text ?? '')
  const [deliveryUrl, setDeliveryUrl] = useState(existing?.delivery_url ?? '')
  const [uploading, setUploading] = useState(false)
  const [savingMeta, setSavingMeta] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function uploadFile(file: File) {
    if (file.size > MAX_FILE_SIZE) {
      setError(`${file.name} supera el límite de 20MB.`)
      return
    }

    setUploading(true)
    setError(null)
    const supabase = createClient()

    const ext = file.name.split('.').pop()
    const path = `${processCandidateId}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`

    const { error: uploadError } = await supabase.storage
      .from('challenge-files')
      .upload(path, file, { contentType: file.type, upsert: false })

    if (uploadError) {
      setError(`Error al subir ${file.name}: ${uploadError.message}`)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('challenge-files')
      .getPublicUrl(path)

    const newFile: ChallengeFile = {
      name: file.name,
      url: publicUrl,
      type: file.type,
      size: file.size,
      uploaded_at: new Date().toISOString(),
    }

    const updatedFiles = [...files, newFile]
    setFiles(updatedFiles)
    await persistToDb(updatedFiles)
    setUploading(false)
  }

  async function handleFiles(fileList: FileList) {
    for (const file of Array.from(fileList)) {
      await uploadFile(file)
    }
  }

  async function removeFile(index: number) {
    const updated = files.filter((_, i) => i !== index)
    setFiles(updated)
    await persistToDb(updated)
  }

  async function persistToDb(updatedFiles: ChallengeFile[]) {
    const supabase = createClient()
    await supabase.from('challenges').upsert(
      {
        process_candidate_id: processCandidateId,
        files: updatedFiles,
        spec_text: specText.trim() || null,
        delivery_url: deliveryUrl.trim() || null,
      },
      { onConflict: 'process_candidate_id' }
    )
  }

  async function saveMeta() {
    if (deliveryUrl.trim()) {
      try { new URL(deliveryUrl.trim()) } catch {
        setError('El link de entrega no es una URL válida.')
        return
      }
    }
    setSavingMeta(true)
    setError(null)
    await persistToDb(files)
    setSavingMeta(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-4">

      {/* Drop zone para archivos */}
      <div>
        <div
          onClick={() => !uploading && fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false) }}
          onDrop={e => {
            e.preventDefault(); setIsDragging(false)
            if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
          }}
          className={`border-2 border-dashed rounded-xl p-5 text-center transition-colors ${
            uploading ? 'border-blue-300 bg-blue-50 cursor-wait'
            : isDragging ? 'border-[#0800FF] bg-[#E8E7FF] cursor-copy'
            : 'border-gray-200 hover:border-[#0800FF] hover:bg-gray-50 cursor-pointer'
          }`}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4 text-[#0800FF]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <span className="text-sm text-blue-600">Subiendo archivo...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <svg className="h-7 w-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p className="text-sm text-gray-600">
                <span className="text-[#0800FF] font-medium">Arrastra archivos</span> o haz clic
              </p>
              <p className="text-xs text-gray-400">PDF, Word, Excel, JSON, imágenes · Máx. 20MB c/u</p>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = '' }}
        />
      </div>

      {/* Lista de archivos subidos */}
      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2 group">
              <span className="text-base flex-shrink-0">{fileIcon(f.type)}</span>
              <div className="flex-1 min-w-0">
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-gray-800 hover:text-[#0800FF] truncate block"
                >
                  {f.name}
                </a>
                <p className="text-xs text-gray-400">
                  {formatSize(f.size)} · {new Date(f.uploaded_at).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <button
                onClick={() => removeFile(i)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                title="Eliminar archivo"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Campos opcionales: link de entrega + notas */}
      <details className="group">
        <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none list-none flex items-center gap-1">
          <svg className="w-3 h-3 group-open:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
          </svg>
          Agregar link de entrega o notas del reto
        </summary>
        <div className="mt-3 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Link de entrega del candidato</label>
            <input
              type="url"
              value={deliveryUrl}
              onChange={e => setDeliveryUrl(e.target.value)}
              placeholder="https://github.com/candidato/..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0800FF]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas del reto <span className="text-gray-400 font-normal">(instrucciones, contexto)</span></label>
            <textarea
              value={specText}
              onChange={e => setSpecText(e.target.value)}
              rows={3}
              placeholder="Describe el reto que se le envió al candidato..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0800FF] resize-none"
            />
          </div>
          {error && <p className="text-xs text-red-600">⚠ {error}</p>}
          <button
            onClick={saveMeta}
            disabled={savingMeta}
            className="btn-truora text-sm disabled:opacity-50"
          >
            {savingMeta ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar'}
          </button>
        </div>
      </details>

      {error && !specText && !deliveryUrl && (
        <p className="text-xs text-red-600">⚠ {error}</p>
      )}
    </div>
  )
}
