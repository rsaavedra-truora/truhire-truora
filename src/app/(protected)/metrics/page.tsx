import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Métricas' }

export default async function MetricsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()

  if (!['recruiter', 'head_of_people'].includes((profile as any)?.role ?? '')) {
    redirect('/dashboard')
  }

  // Funnel de conversión
  const [
    { count: totalApplied },
    { count: totalScreened },
    { count: totalPhoneScreen },
    { count: totalLoop },
    { count: totalHired },
    { count: totalRejected },
    { data: screeningOverrides },
    { data: processes },
    { data: hires },
  ] = await Promise.all([
    supabase.from('process_candidates').select('*', { count: 'exact', head: true }),
    supabase.from('screenings').select('*', { count: 'exact', head: true }),
    supabase.from('phone_screens').select('*', { count: 'exact', head: true }).not('completed_at', 'is', null),
    supabase.from('loops').select('*', { count: 'exact', head: true }),
    supabase.from('process_candidates').select('*', { count: 'exact', head: true }).eq('status', 'hired'),
    supabase.from('process_candidates').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
    supabase.from('screening_feedback').select('ai_classification, recruiter_classification').eq('agreed', false),
    supabase.from('processes').select('id, title, status, created_at').order('created_at', { ascending: false }).limit(10),
    supabase.from('process_candidates')
      .select(`
        id, applied_at,
        candidate:candidates(full_name, email, linkedin_url),
        process:processes(id, title, capa_intencional, entry_mode),
        decision:decisions(decided_at, outcome),
        screening:screenings(suggested_capa)
      `)
      .eq('status', 'hired')
      .order('applied_at', { ascending: false }),
  ])

  // Agreement rate AI vs recruiter
  const totalFeedback = screeningOverrides?.length ?? 0
  // TODO: implementar cuando exista feedback_classification
  // agreedCount = screenings donde la clasificación AI coincide con la clasificación final del recruiter
  const agreedCount = 0
  const agreementRate = (totalScreened ?? 0) === 0
    ? null
    : Math.round((1 - totalFeedback / Math.max(totalScreened ?? 1, 1)) * 100)

  // Distribución de clasificaciones
  const { data: classDistrib } = await supabase
    .from('screenings')
    .select('classification')

  const distribution = (classDistrib ?? []).reduce((acc: Record<string, number>, s: any) => {
    acc[s.classification] = (acc[s.classification] ?? 0) + 1
    return acc
  }, {})

  const total = totalApplied ?? 0

  function pct(n: number | null) {
    if (!n || !total) return '—'
    return `${Math.round((n / total) * 100)}%`
  }

  const funnelSteps = [
    { label: 'Candidatos totales', value: totalApplied ?? 0, color: 'bg-gray-400' },
    { label: 'Screening AI corrido', value: totalScreened ?? 0, color: 'bg-blue-400' },
    { label: 'Manager Screenings completados', value: totalPhoneScreen ?? 0, color: 'bg-violet-400' },
    { label: 'Loops ejecutados', value: totalLoop ?? 0, color: 'bg-[#0800FF]' },
    { label: 'Contratados', value: totalHired ?? 0, color: 'bg-green-500' },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Métricas</h1>
        <p className="text-sm text-gray-500 mt-0.5">Visibilidad del funnel y calibración del agente AI</p>
      </div>

      {/* Funnel */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Funnel de conversión</h2>
        <div className="space-y-2">
          {funnelSteps.map((step, i) => {
            const width = total > 0 ? Math.max((step.value / total) * 100, step.value > 0 ? 4 : 0) : 0
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-48 flex-shrink-0">{step.label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${step.color}`}
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-900 w-10 text-right">{step.value}</span>
                <span className="text-xs text-gray-400 w-8">{i > 0 ? pct(step.value) : '100%'}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Tasa de contratación</p>
          <p className="text-3xl font-bold text-[#0800FF] mt-1">
            {total > 0 ? `${Math.round(((totalHired ?? 0) / total) * 100)}%` : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-1">{totalHired ?? 0} de {total} candidatos</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Agreement rate AI</p>
          <p className={`text-3xl font-bold mt-1 ${agreementRate !== null && agreementRate < 70 ? 'text-amber-500' : 'text-green-600'}`}>
            {agreementRate !== null ? `${agreementRate}%` : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-1">{totalFeedback} override{totalFeedback !== 1 ? 's' : ''} del recruiter</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Talent Pool</p>
          <p className="text-3xl font-bold text-orange-500 mt-1">{distribution['talent_pool'] ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">candidatos con DNA Truora</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Rechazados</p>
          <p className="text-3xl font-bold text-gray-400 mt-1">{totalRejected ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">no avanzaron</p>
        </div>
      </div>

      {/* Distribución screening AI */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Distribución del screening AI</h2>
        <div className="grid grid-cols-4 gap-4">
          {[
            { key: 'green', label: '🟢 Avanzar', color: 'bg-green-100 text-green-700' },
            { key: 'talent_pool', label: '🟠 Talent Pool', color: 'bg-orange-100 text-orange-700' },
            { key: 'yellow', label: '🟡 Posible', color: 'bg-yellow-100 text-yellow-700' },
            { key: 'red', label: '🔴 Descartar', color: 'bg-red-100 text-red-700' },
          ].map(item => (
            <div key={item.key} className={`rounded-xl p-4 ${item.color}`}>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-3xl font-bold mt-1">{distribution[item.key] ?? 0}</p>
              <p className="text-xs opacity-70 mt-0.5">
                {totalScreened ? `${Math.round(((distribution[item.key] ?? 0) / (totalScreened ?? 1)) * 100)}%` : '—'} del total
              </p>
            </div>
          ))}
        </div>
        {agreementRate !== null && agreementRate < 70 && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <p className="text-sm text-amber-800 font-medium">⚠ Agreement rate bajo el 70%</p>
            <p className="text-xs text-amber-700 mt-0.5">
              El agente de screening y el recruiter no están alineados. Considera revisar el prompt o calibrar con más ejemplos.
            </p>
          </div>
        )}
      </div>

      {/* Contratados */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Contratados</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Candidatos que pasaron el proceso completo. A los 6 y 12 meses el manager califica su desempeño — eso alimenta el IQS.
          </p>
        </div>
        {!hires?.length ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-gray-400 italic">Aún no hay contratados registrados.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Candidato</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Proceso</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Capa</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Tiempo al hire</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Snapshot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(hires ?? []).map((h: any) => {
                const candidate = Array.isArray(h.candidate) ? h.candidate[0] : h.candidate
                const proc = Array.isArray(h.process) ? h.process[0] : h.process
                const decision = Array.isArray(h.decision) ? h.decision[0] : h.decision
                const screening = Array.isArray(h.screening) ? h.screening[0] : h.screening
                const capa = proc?.capa_intencional ?? screening?.suggested_capa
                const appliedDate = new Date(h.applied_at)
                const decidedDate = decision?.decided_at ? new Date(decision.decided_at) : null
                const daysToHire = decidedDate
                  ? Math.round((decidedDate.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24))
                  : null
                return (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-900">{candidate?.full_name}</p>
                      <p className="text-xs text-gray-500">{candidate?.email}</p>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-700">{proc?.title ?? '—'}</td>
                    <td className="px-4 py-3.5">
                      {capa && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          capa === 'liderazgo' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {capa === 'liderazgo' ? 'Liderazgo' : 'Funcional'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">
                      {daysToHire !== null ? `${daysToHire} días` : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">Pendiente 6m</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Procesos recientes */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Procesos recientes</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Proceso</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Creado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(processes ?? []).map((p: any) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900">{p.title}</td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{p.status}</span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {new Date(p.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
