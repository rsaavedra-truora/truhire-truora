import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { toggleBenchmark, deleteBenchmark } from '@/app/actions/benchmarks'
import { BenchmarkUploaderWrapper } from '@/components/benchmark-uploader-wrapper'

export const metadata = { title: 'Calibración del agente de screening' }

const CLASS_LABELS: Record<string, string> = {
  green: '🟢 Avanzar', talent_pool: '🟠 Talent Pool',
  yellow: '🟡 Posible', red: '🔴 Descartar',
}

export default async function CalibrationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!['recruiter', 'head_of_people'].includes((profile as any)?.role ?? '')) redirect('/dashboard')

  // Historial de correcciones
  // Perfiles de referencia — unicornios del equipo
  const { data: benchmarks } = await supabase
    .from('talent_benchmarks')
    .select('id, full_name, role_at_truora, layer, notes, is_active, created_at')
    .order('created_at', { ascending: false })

  const { data: feedback } = await supabase
    .from('screening_feedback')
    .select(`
      id, ai_classification, recruiter_classification, recruiter_reasoning, agreed, created_at,
      recruiter:users!recruiter_id(full_name),
      screening:screenings(
        ai_summary,
        process_candidate:process_candidates(
          candidate:candidates(full_name),
          process:processes(title)
        )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  const total = feedback?.length ?? 0
  const disagreements = feedback?.filter(f => !f.agreed).length ?? 0
  const agreementRate = total > 0 ? Math.round(((total - disagreements) / total) * 100) : null

  // Distribución de correcciones
  const corrections = feedback?.filter(f => !f.agreed) ?? []
  const correctionMap: Record<string, Record<string, number>> = {}
  corrections.forEach(f => {
    if (!correctionMap[f.ai_classification]) correctionMap[f.ai_classification] = {}
    correctionMap[f.ai_classification][f.recruiter_classification] =
      (correctionMap[f.ai_classification][f.recruiter_classification] ?? 0) + 1
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/settings" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-3">← Configuración</Link>
        <h1 className="text-2xl font-bold text-gray-900" style={{ letterSpacing: '-0.02em' }}>Calibración del agente de screening</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Cada vez que corriges una clasificación del AI, el agente aprende. Esta página muestra el estado del entrenamiento.
        </p>
      </div>

      {/* Estado del entrenamiento */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Correcciones registradas</p>
          <p className="text-3xl font-bold text-gray-900">{disagreements}</p>
          <p className="text-xs text-gray-400 mt-1">de {total} evaluaciones totales</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Agreement rate</p>
          <p className={`text-3xl font-bold ${agreementRate !== null && agreementRate < 70 ? 'text-amber-500' : 'text-green-600'}`}>
            {agreementRate !== null ? `${agreementRate}%` : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {agreementRate !== null && agreementRate < 70
              ? '⚠ Calibración necesaria'
              : agreementRate !== null ? '✓ Alineado con el equipo' : 'Sin datos aún'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Ejemplos en prompt activo</p>
          <p className="text-3xl font-bold text-truora-primary">{Math.min(disagreements, 3)}</p>
          <p className="text-xs text-gray-400 mt-1">de {disagreements} disponibles (máx. 3)</p>
        </div>
      </div>

      {/* Cómo funciona */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
        <p className="text-sm font-semibold text-blue-900 mb-2">¿Cómo aprende el agente?</p>
        <div className="text-sm text-blue-800 space-y-1.5">
          <p>1. El agente clasifica a un candidato (🟢🟡🟠🔴)</p>
          <p>2. Tú mueves al candidato a otra clasificación en el kanban — eso registra una corrección</p>
          <p>3. Las 3 correcciones más recientes con razonamiento se inyectan automáticamente en el prompt del agente</p>
          <p>4. En futuras evaluaciones, el agente considera esos ejemplos para calibrar su criterio</p>
        </div>
        <p className="text-xs text-blue-600 mt-3">
          <strong>Importante:</strong> Agrega el razonamiento cuando corrijas — "rechacé porque no tiene experiencia en SaaS" es más útil que solo mover el candidato.
          El agente aprende del razonamiento, no solo del cambio.
        </p>
      </div>

      {/* Patrones de corrección */}
      {Object.keys(correctionMap).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Patrones de corrección del equipo</h2>
          <p className="text-xs text-gray-500 mb-4">Dónde el AI y el equipo difieren más frecuentemente.</p>
          <div className="space-y-3">
            {Object.entries(correctionMap).map(([aiClass, corrections]) => (
              <div key={aiClass} className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 w-28 flex-shrink-0">
                  AI: {CLASS_LABELS[aiClass] ?? aiClass}
                </span>
                <span className="text-gray-400 text-xs">→ equipo lo movió a:</span>
                <div className="flex gap-2">
                  {Object.entries(corrections).map(([toClass, count]) => (
                    <span key={toClass} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                      {CLASS_LABELS[toClass] ?? toClass} ({count}x)
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Perfiles de referencia — anclaje positivo */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Perfiles de referencia — High performers de Truora</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Agrega CVs de personas del equipo que han demostrado ser excepcionales — de cualquier nivel y trayectoria. El agente aprende el patrón de talento de Truora a partir de ejemplos reales.
          </p>
        </div>

        {/* Filosofía */}
        <div className="px-5 py-3 border-b border-gray-100 bg-amber-50">
          <p className="text-xs text-amber-800">
            <strong>Filosofía:</strong> No solo agregues los perfiles más costosos o con el CV más impresionante.
            Truora busca diamantes en bruto — personas con la preparación o experiencia correcta sin ser lo más caro del mercado.
            Incluye perfiles de distintos niveles y trayectorias. El AI aprende a detectar el patrón de talento, no el precio del talento.
          </p>
        </div>

        {/* Upload de CV */}
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-700 mb-1">Agrega un perfil de referencia</p>
          <p className="text-xs text-gray-400 mb-3">Arrastra el CV o perfil — el sistema extrae el texto y el nombre automáticamente.</p>
          <BenchmarkUploaderWrapper />
        </div>

        {/* Lista de perfiles */}
        {!benchmarks?.length ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-gray-400">No hay perfiles de referencia todavía.</p>
            <p className="text-xs text-gray-400 mt-1">Agrega al menos 2-3 unicornios del equipo para que el AI tenga contexto de lo que busca Truora.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {benchmarks.map(b => (
              <div key={b.id} className={`px-5 py-4 flex items-start justify-between gap-4 ${!b.is_active ? 'opacity-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-semibold text-gray-900">{b.full_name}</p>
                    {!b.is_active && <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Inactivo</span>}
                  </div>
                  <p className="text-xs text-gray-400">
                    Agregado {new Date(b.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <form action={toggleBenchmark}>
                    <input type="hidden" name="id" value={b.id} />
                    <input type="hidden" name="is_active" value={b.is_active.toString()} />
                    <button type="submit"
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                        b.is_active
                          ? 'border-gray-300 text-gray-600 hover:border-amber-300 hover:text-amber-600'
                          : 'border-green-300 text-green-600 hover:bg-green-50'
                      }`}>
                      {b.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  </form>
                  <form action={deleteBenchmark}>
                    <input type="hidden" name="id" value={b.id} />
                    <button type="submit"
                      className="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                      Eliminar
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Estado de inyección */}
        {(benchmarks?.filter(b => b.is_active).length ?? 0) > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-green-50">
            {(() => {
              const count = benchmarks?.filter(b => b.is_active).length ?? 0
              return (
                <p className="text-xs text-green-700">
                  ✓ <strong>{count} {count === 1 ? 'perfil activo' : 'perfiles activos'}</strong> — el agente los usa como referencia en cada evaluación de screening.
                </p>
              )
            })()}
          </div>
        )}
      </div>

      {/* Historial de correcciones con razonamiento */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Historial de correcciones</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Las correcciones con razonamiento son las más valiosas para el entrenamiento del agente.
          </p>
        </div>
        {!corrections.length ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-400">Sin correcciones todavía.</p>
            <p className="text-xs text-gray-400 mt-1">Mueve candidatos entre clasificaciones en el kanban para entrenar al agente.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {corrections.slice(0, 20).map((f: any) => {
              const screening = Array.isArray(f.screening) ? f.screening[0] : f.screening
              const pc = screening?.process_candidate
              const candidate = Array.isArray(pc?.candidate) ? pc?.candidate[0] : pc?.candidate
              const proc = Array.isArray(pc?.process) ? pc?.process[0] : pc?.process
              const recruiter = Array.isArray(f.recruiter) ? f.recruiter[0] : f.recruiter
              return (
                <div key={f.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-medium text-gray-900">{candidate?.full_name ?? '—'}</p>
                        <span className="text-xs text-gray-400">{proc?.title ?? '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs">{CLASS_LABELS[f.ai_classification] ?? f.ai_classification}</span>
                        <span className="text-gray-400 text-xs">→</span>
                        <span className="text-xs font-medium">{CLASS_LABELS[f.recruiter_classification] ?? f.recruiter_classification}</span>
                        <span className="text-xs text-gray-400">por {recruiter?.full_name ?? 'recruiter'}</span>
                      </div>
                      {f.recruiter_reasoning ? (
                        <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 leading-relaxed">
                          "{f.recruiter_reasoning}"
                        </p>
                      ) : (
                        <p className="text-xs text-amber-600 italic">Sin razonamiento — agrega uno para mejorar el entrenamiento</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {new Date(f.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
