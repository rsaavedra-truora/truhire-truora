import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPrincipleBySlug, DIMENSION_COLORS, ANTIVALOR_COLORS } from '@/lib/principles-data'

export default function PrincipleDetailPage({ params }: { params: { slug: string } }) {
  const principle = getPrincipleBySlug(params.slug)
  if (!principle) notFound()

  const dimColors = DIMENSION_COLORS[principle.dimension]
  const avColors = ANTIVALOR_COLORS[principle.antivalorType]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/principles" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
        ← Todos los principios
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-mono text-gray-400">{principle.id}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${dimColors.bg} ${dimColors.text}`}>
                {principle.dimensionLabel}
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">{principle.name}</h1>
          </div>
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0 ${avColors.bg} ${avColors.text}`}>
            Anti-valor: {principle.antivalor}
          </span>
        </div>
        <p className="text-base text-gray-700 leading-relaxed mt-4 border-t border-gray-100 pt-4">
          {principle.definition}
        </p>
        <p className="text-xs text-gray-400 mt-3">
          Predice: {principle.predicts}
        </p>
      </div>

      {/* Tabla bias avoidance: señales vs anti-señales */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Tabla de calibración — evitar el sesgo</h2>
        <div className="grid grid-cols-2 gap-4">
          {/* Señales HIRE */}
          <div className="bg-green-50 rounded-xl border border-green-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <p className="text-xs font-semibold text-green-800 uppercase tracking-wide">Señales — Hire</p>
            </div>
            <ul className="space-y-2">
              {principle.signals.map((s, i) => (
                <li key={i} className="text-sm text-green-900 flex gap-2">
                  <span className="text-green-400 flex-shrink-0 mt-0.5">•</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Anti-señales NO HIRE */}
          <div className="bg-red-50 rounded-xl border border-red-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </span>
              <p className="text-xs font-semibold text-red-800 uppercase tracking-wide">Anti-señales — Flag / No Hire</p>
            </div>
            <ul className="space-y-2">
              {principle.antiSignals.map((s, i) => (
                <li key={i} className="text-sm text-red-900 flex gap-2">
                  <span className="text-red-400 flex-shrink-0 mt-0.5">•</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Anti-valor */}
      <div className={`rounded-xl border p-4 ${avColors.bg} border-opacity-50`} style={{ borderColor: 'currentColor' }}>
        <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${avColors.text}`}>
          Anti-valor asociado — {principle.antivalor}
        </p>
        <p className={`text-sm leading-relaxed ${avColors.text}`}>
          {principle.antivalorDescription}
        </p>
      </div>

      {/* Ejemplo de respuesta */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Ejemplo de respuesta</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-green-300 p-4">
            <p className="text-xs font-semibold text-green-700 mb-2">✓ Respuesta fuerte</p>
            <p className="text-sm text-gray-700 leading-relaxed italic">{principle.strongExample}</p>
          </div>
          <div className="bg-white rounded-xl border border-red-300 p-4">
            <p className="text-xs font-semibold text-red-700 mb-2">✗ Respuesta débil / flag</p>
            <p className="text-sm text-gray-700 leading-relaxed italic">{principle.weakExample}</p>
          </div>
        </div>
      </div>

      {/* Preguntas de entrevista */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Preguntas de entrevista</h2>
        <p className="text-xs text-gray-500 mb-4">
          Usar 2-3 preguntas por entrevista. La primera abre; los follow-ups son donde está la evidencia real.
        </p>
        <div className="space-y-4">
          {principle.questions.map((q, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex gap-3">
                <span className="text-xs font-mono text-gray-400 flex-shrink-0 mt-0.5">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{q.question}</p>
                  <div className="mt-2 space-y-1">
                    {q.followups.map((f, j) => (
                      <p key={j} className="text-xs text-gray-500 flex gap-1.5">
                        <span className="text-[#0800FF] flex-shrink-0">↳</span>
                        {f}
                      </p>
                    ))}
                  </div>
                  <span className="inline-block mt-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    Evalúa: {q.evaluates}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
