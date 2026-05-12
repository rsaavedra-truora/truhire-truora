import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata = { title: 'Talent Pool' }

export default async function TalentPoolPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Solo recruiters y head_of_people ven el talent pool global
  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()

  if (!['recruiter', 'head_of_people'].includes(profile?.role ?? '')) {
    redirect('/dashboard')
  }

  // Todos los candidatos clasificados como talent_pool en cualquier proceso
  const { data: poolCandidates } = await supabase
    .from('screenings')
    .select(`
      id, classification, truora_fit_level, suggested_capa, ai_summary,
      truora_signals, strengths, created_at,
      process_candidate:process_candidates(
        id,
        candidate:candidates(id, full_name, email, linkedin_url),
        process:processes(id, title, capa_intencional)
      )
    `)
    .eq('classification', 'talent_pool')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">🟠 Talent Pool</h1>
        <p className="text-sm text-gray-500 mt-1">
          Candidatos con alto DNA Truora que no encajaron en el rol específico donde aplicaron.
          Disponibles para futuros procesos.
        </p>
      </div>

      {(!poolCandidates || poolCandidates.length === 0) ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <p className="text-sm text-gray-500">El talent pool está vacío por ahora.</p>
          <p className="text-xs text-gray-400 mt-1">
            Los candidatos con alto DNA Truora pero que no encajan en el rol donde aplican aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {poolCandidates.map((s: any) => {
            const pc = s.process_candidate
            const candidate = pc?.candidate
            const proc = pc?.process
            return (
              <div key={s.id} className="bg-white rounded-xl border border-orange-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{candidate?.full_name}</p>
                      {s.suggested_capa && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          s.suggested_capa === 'liderazgo'
                            ? 'bg-violet-100 text-violet-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {s.suggested_capa === 'liderazgo' ? 'Liderazgo' : 'Funcional'}
                        </span>
                      )}
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                        Truora fit: {s.truora_fit_level === 'high' ? 'Alto' : s.truora_fit_level === 'medium' ? 'Medio' : 'Bajo'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{candidate?.email}</p>
                    {candidate?.linkedin_url && (
                      <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-[#0800FF] hover:underline mt-0.5 inline-block">
                        LinkedIn →
                      </a>
                    )}

                    {/* Proceso de origen */}
                    <p className="text-xs text-gray-400 mt-2">
                      Identificado en:{' '}
                      <Link href={`/processes/${proc?.id}`} className="text-gray-600 hover:text-[#0800FF]">
                        {proc?.title}
                      </Link>{' '}
                      · {new Date(s.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>

                    {/* Señales Truora */}
                    {s.truora_signals?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {s.truora_signals.slice(0, 3).map((signal: string, i: number) => (
                          <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                            {signal.length > 40 ? signal.slice(0, 38) + '…' : signal}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Resumen AI */}
                    {s.ai_summary && (
                      <p className="text-sm text-gray-600 mt-3 leading-relaxed whitespace-pre-line">
                        {s.ai_summary}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
