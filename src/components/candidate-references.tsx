'use client'

import { useState, useTransition } from 'react'
import { addReference } from '@/app/actions/references'

interface ReferenceCardProps {
  ref_: any
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null
  const color =
    score <= 4
      ? 'bg-red-100 text-red-700'
      : score <= 7
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-green-100 text-green-700'
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${color}`}>
      {score}/10
    </span>
  )
}

function VouchBadge({ value }: { value: string | null }) {
  if (!value) return null
  if (value === 'yes') return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">✓ Sí</span>
  if (value === 'with_reservations') return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">~ Con reservas</span>
  return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">✗ No</span>
}

function ReferenceCard({ ref_ }: ReferenceCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{ref_.reference_name}</p>
          {ref_.reference_relationship && (
            <p className="text-xs text-gray-500 mt-0.5">{ref_.reference_relationship}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <ScoreBadge score={ref_.score} />
          <VouchBadge value={ref_.would_vouch} />
        </div>
      </div>
      {ref_.performance_90_days && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-0.5">Performance a 90 días</p>
          <p className="text-xs text-gray-700 leading-relaxed">{ref_.performance_90_days}</p>
        </div>
      )}
      {ref_.achievement_12_months && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-0.5">Logros en 12 meses</p>
          <p className="text-xs text-gray-700 leading-relaxed">{ref_.achievement_12_months}</p>
        </div>
      )}
    </div>
  )
}

interface CandidateReferencesProps {
  candidateId: string
  processId: string
  initialRefs: any[]
}

export function CandidateReferences({ candidateId, processId, initialRefs }: CandidateReferencesProps) {
  const [refs, setRefs] = useState<any[]>(initialRefs)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    const form = e.currentTarget

    startTransition(async () => {
      try {
        await addReference(formData)
        // Optimistically add to local list
        const newRef = {
          reference_name: formData.get('reference_name'),
          reference_relationship: formData.get('reference_relationship'),
          score: formData.get('score') ? parseInt(formData.get('score') as string) : null,
          performance_90_days: formData.get('performance_90_days'),
          would_vouch: formData.get('would_vouch'),
          achievement_12_months: formData.get('achievement_12_months'),
        }
        setRefs(prev => [newRef, ...prev])
        form.reset()
        setShowForm(false)
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  return (
    <div className="space-y-4">
      {refs.length === 0 && !showForm && (
        <p className="text-sm italic text-gray-400">No hay referencias registradas aún.</p>
      )}

      {refs.length > 0 && (
        <div className="space-y-3">
          {refs.map((ref_, i) => (
            <ReferenceCard key={i} ref_={ref_} />
          ))}
        </div>
      )}

      {!showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="text-xs font-medium text-[#0800FF] hover:underline"
        >
          + Agregar referencia
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
          <input type="hidden" name="candidate_id" value={candidateId} />
          <input type="hidden" name="process_id" value={processId} />

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Nombre de la referencia <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="reference_name"
              required
              placeholder="Nombre completo"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Relación con el candidato
            </label>
            <input
              type="text"
              name="reference_relationship"
              placeholder="Ej: Ex manager, Colega, Cliente"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              ¿Qué score le das para este rol? (1-10)
            </label>
            <input
              type="number"
              name="score"
              min={1}
              max={10}
              placeholder="1-10"
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              ¿Qué performance esperas a los 90 días?
            </label>
            <textarea
              name="performance_90_days"
              rows={2}
              placeholder="Describe qué esperas que logre en los primeros 90 días..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF] resize-none"
            />
          </div>

          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">
              ¿Pondrías tu reputación por esta persona?
            </p>
            <div className="space-y-1.5">
              {[
                { value: 'yes', label: 'Sí, sin dudas' },
                { value: 'with_reservations', label: 'Con algunas reservas' },
                { value: 'no', label: 'No' },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="would_vouch"
                    value={opt.value}
                    className="text-[#0800FF] focus:ring-[#0800FF]"
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              ¿Qué crees que logrará en Truora en 12 meses?
            </label>
            <textarea
              name="achievement_12_months"
              rows={2}
              placeholder="Describe los logros esperados en 12 meses..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF] resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="btn-truora disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Guardando...' : 'Agregar referencia'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(null) }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
