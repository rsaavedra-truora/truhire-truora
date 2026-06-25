'use client'

import { useState } from 'react'
import type { TruoraPrinciple } from '@/lib/principles-data'

interface QuestionBankSelectorProps {
  principle: TruoraPrinciple
  selectedQuestion: string | null
  onSelect: (question: string | null) => void
}

export function QuestionBankSelector({ principle, selectedQuestion, onSelect }: QuestionBankSelectorProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="mb-3">
      {/* Pregunta seleccionada */}
      {selectedQuestion && (
        <div className="bg-truora-primary-soft border border-truora-primary border-opacity-20 rounded-lg px-3 py-2.5 mb-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-truora-primary mb-1">Pregunta utilizada:</p>
              <p className="text-xs text-gray-700 leading-relaxed">{selectedQuestion}</p>
            </div>
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0 text-sm leading-none mt-0.5"
              title="Cambiar pregunta"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Toggle del banco */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-truora-primary hover:underline flex items-center gap-1"
      >
        <span>{expanded ? '▲' : '▼'}</span>
        {selectedQuestion ? 'Cambiar pregunta del banco' : 'Seleccionar pregunta del banco'}
      </button>

      {/* Lista de preguntas */}
      {expanded && (
        <div className="mt-2 space-y-2 max-h-64 overflow-y-auto pr-1">
          {principle.questions.map((q, i) => (
            <div
              key={i}
              className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                selectedQuestion === q.question
                  ? 'border-truora-primary bg-truora-primary-soft'
                  : 'border-gray-200 hover:border-truora-primary hover:bg-gray-50'
              }`}
              onClick={() => { onSelect(q.question); setExpanded(false) }}
            >
              <p className="text-xs font-medium text-gray-900 mb-1.5">{q.question}</p>
              <div className="space-y-0.5 mb-2">
                {q.followups.map((f, j) => (
                  <p key={j} className="text-xs text-gray-500 flex gap-1">
                    <span className="text-truora-primary flex-shrink-0">↳</span>{f}
                  </p>
                ))}
              </div>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                Evalúa: {q.evaluates}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
