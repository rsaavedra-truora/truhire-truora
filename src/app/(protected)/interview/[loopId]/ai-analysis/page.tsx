import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getPrincipleBySlug } from '@/lib/principles-data'
import { RatingBadge } from '@/components/principle-rating'

export default async function AIAnalysisPage({ params }: { params: { loopId: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: loop } = await supabase
    .from('loops')
    .select(`
      id, ai_evaluation,
      process_candidate:process_candidates(
        candidate:candidates(full_name, email),
        process:processes(id, title, capa_intencional)
      )
    `)
    .eq('id', params.loopId)
    .single()

  if (!loop || !loop.ai_evaluation) notFound()

  const pc = loop.process_candidate as any
  const candidate = Array.isArray(pc?.candidate) ? pc.candidate[0] : pc?.candidate
  const proc = Array.isArray(pc?.process) ? pc.process[0] : pc?.process
  const ae = loop.ai_evaluation as any

  const verdictConfig = {
    hire:        { bg: '#ECFDF5', color: '#065F46', label: '✓ Hire' },
    talent_pool: { bg: '#FFF7ED', color: '#C2410C', label: '~ Talent Pool' },
    no_hire:     { bg: '#FEF2F2', color: '#991B1B', label: '✗ No Hire' },
  }
  const vc = ae.ai_verdict ? verdictConfig[ae.ai_verdict as keyof typeof verdictConfig] : null

  const answerPatternLabels: Record<string, { label: string; color: string }> = {
    star_valido_con_datos:  { label: '✓ STAR + datos', color: '#065F46' },
    star_valido_sin_datos:  { label: '✓ STAR sin datos', color: '#166534' },
    evasion:               { label: '⚠ Evasión', color: '#991B1B' },
    compensacion_forzada:  { label: '⚠ Comp. forzada', color: '#991B1B' },
    ejemplo_debil:         { label: '↓ Ej. débil', color: '#92400E' },
    declaracion_general:   { label: '~ Declaración gral.', color: '#6B7280' },
    sin_respuesta:         { label: '— Sin respuesta', color: '#6B7280' },
  }

  const principleEntries = Object.entries(ae.principle_notes ?? {})

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <Link href={`/interview/${params.loopId}`} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-3">
          ← Volver al loop
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-semibold text-gray-900">Evaluación — Gemini AI</h1>
              <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">Entrevistador AI</span>
            </div>
            <p className="text-sm text-gray-500">{candidate?.full_name} · {proc?.title}</p>
          </div>
          {vc && (
            <div className="flex flex-col items-end gap-1">
              <span className="text-sm font-bold px-3 py-1.5 rounded-full" style={{ background: vc.bg, color: vc.color }}>
                {vc.label}
              </span>
              {ae.ai_confidence && (
                <span className="text-xs text-gray-400">confianza {ae.ai_confidence}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Principios evaluados */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Evaluación por principio</h2>
        {principleEntries.map(([slug, data]: [string, any]) => {
          const p = getPrincipleBySlug(slug)
          const ap = data.answer_pattern ? answerPatternLabels[data.answer_pattern] : null
          return (
            <div key={slug} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#E8E7FF] text-[#0800FF]">
                  {p?.name ?? slug}
                </span>
                {data.rating && <RatingBadge rating={data.rating} />}
                {ap && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100" style={{ color: ap.color }}>
                    {ap.label}
                  </span>
                )}
              </div>

              {data.question && (
                <div className="bg-[#E8E7FF] rounded-lg px-3 py-2">
                  <p className="text-xs font-semibold text-[#0800FF] mb-0.5">Pregunta evaluada:</p>
                  <p className="text-xs text-gray-700">{data.question}</p>
                </div>
              )}

              {data.data_provided && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5">
                  <p className="text-xs text-blue-700"><strong>Datos citados:</strong> {data.data_provided}</p>
                </div>
              )}

              <p className="text-sm text-gray-700 leading-relaxed">{data.notes}</p>
            </div>
          )
        })}
      </div>

      {/* Resumen y conclusión */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Resumen de la sesión</h2>
        {ae.summary && <p className="text-sm text-gray-600 leading-relaxed">{ae.summary}</p>}

        {ae.conclusion && (
          <div className="bg-[#0B1020] rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Conclusión del AI</p>
            <p className="text-sm text-white leading-relaxed">{ae.conclusion}</p>
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <span className="text-sm font-medium text-gray-700">Recomendación:</span>
          <span className="text-xl">{ae.recommendation ? '👍 Hire' : '👎 No Hire'}</span>
        </div>
      </div>

      {/* Para el Bar Raiser */}
      {ae.recommendation_for_bar_raiser && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-violet-700 uppercase tracking-wider mb-2">Para el Bar Raiser</p>
          <p className="text-sm text-gray-700 leading-relaxed">{ae.recommendation_for_bar_raiser}</p>
        </div>
      )}
    </div>
  )
}
