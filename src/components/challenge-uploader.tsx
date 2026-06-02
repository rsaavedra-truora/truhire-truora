'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  processCandidateId: string
  existing: {
    spec_text?: string | null
    delivery_url?: string | null
  } | null
}

export function ChallengeUploader({ processCandidateId, existing }: Props) {
  const [specText, setSpecText] = useState(existing?.spec_text ?? '')
  const [deliveryUrl, setDeliveryUrl] = useState(existing?.delivery_url ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(!existing)

  async function handleSave() {
    setSaving(true)
    setError(null)
    const supabase = createClient()

    // Upsert — si ya existe un challenge para este pc_id, actualiza; si no, inserta
    const payload: Record<string, any> = {
      process_candidate_id: processCandidateId,
    }
    if (specText.trim()) payload.spec_text = specText.trim()
    if (deliveryUrl.trim()) {
      // Asegurarse de que sea una URL válida
      try { new URL(deliveryUrl.trim()) } catch {
        setError('El link de entrega no es una URL válida.')
        setSaving(false)
        return
      }
      payload.delivery_url = deliveryUrl.trim()
      payload.submitted_at = new Date().toISOString()
    }

    const { error: dbError } = await supabase
      .from('challenges')
      .upsert(payload, { onConflict: 'process_candidate_id' })

    setSaving(false)
    if (dbError) {
      setError(dbError.message)
    } else {
      setSaved(true)
      setIsOpen(false)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  return (
    <div className="space-y-3">
      {/* Resumen cuando está colapsado */}
      {!isOpen && existing && (
        <div className="space-y-2">
          {existing.delivery_url && (
            <a
              href={existing.delivery_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#0800FF] hover:underline block"
            >
              Ver entrega del candidato →
            </a>
          )}
          {existing.spec_text && (
            <details>
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">Ver instrucciones del reto ▼</summary>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed whitespace-pre-line">{existing.spec_text}</p>
            </details>
          )}
          <button
            onClick={() => setIsOpen(true)}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Editar reto
          </button>
        </div>
      )}

      {/* Formulario de edición / creación */}
      {isOpen && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Link de entrega del candidato
              <span className="text-gray-400 font-normal ml-1">(URL del reto resuelto)</span>
            </label>
            <input
              type="url"
              value={deliveryUrl}
              onChange={e => setDeliveryUrl(e.target.value)}
              placeholder="https://github.com/candidato/..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Instrucciones del reto
              <span className="text-gray-400 font-normal ml-1">(opcional)</span>
            </label>
            <textarea
              value={specText}
              onChange={e => setSpecText(e.target.value)}
              rows={3}
              placeholder="Describe el reto que se le envió al candidato..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF] resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <span>⚠</span> {error}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || (!deliveryUrl.trim() && !specText.trim())}
              className="btn-truora text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar reto'}
            </button>
            {existing && (
              <button
                onClick={() => setIsOpen(false)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sin reto aún */}
      {!isOpen && !existing && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400 italic">No hay reto configurado.</p>
          <button
            onClick={() => setIsOpen(true)}
            className="text-xs text-[#0800FF] hover:underline font-medium"
          >
            + Agregar reto
          </button>
        </div>
      )}
    </div>
  )
}
