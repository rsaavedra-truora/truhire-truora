import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata = { title: 'Mis entrevistas' }

export default async function InterviewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Loops donde soy entrevistador
  const { data: assignments } = await supabase
    .from('loop_assignments')
    .select(`
      id, principles,
      loop:loops(
        id, status, scheduled_at,
        process_candidate:process_candidates(
          id,
          candidate:candidates(full_name, email),
          process:processes(title, capa_intencional)
        )
      ),
      evaluation:evaluations!loop_assignments_loop_id_fkey(
        recommendation, signed_at
      )
    `)
    .eq('interviewer_id', user.id)
    .order('created_at', { ascending: false })

  // Phone screens donde soy HM
  const { data: phoneScreens } = await supabase
    .from('phone_screens')
    .select(`
      id, decision, completed_at, assigned_principles,
      process_candidate:process_candidates(
        id,
        candidate:candidates(full_name, email),
        process:processes(id, title, capa_intencional)
      )
    `)
    .eq('hm_id', user.id)
    .order('created_at', { ascending: false })

  const pendingLoops = (assignments ?? []).filter((a: any) => {
    const eval_ = Array.isArray(a.evaluation) ? a.evaluation[0] : a.evaluation
    return !eval_?.signed_at
  })
  const completedLoops = (assignments ?? []).filter((a: any) => {
    const eval_ = Array.isArray(a.evaluation) ? a.evaluation[0] : a.evaluation
    return !!eval_?.signed_at
  })

  const pendingPhoneScreens = (phoneScreens ?? []).filter((ps: any) => !ps.completed_at)
  const completedPhoneScreens = (phoneScreens ?? []).filter((ps: any) => !!ps.completed_at)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Mis entrevistas</h1>
        <p className="text-sm text-gray-500 mt-1">
          {pendingLoops.length + pendingPhoneScreens.length} pendientes de completar
        </p>
      </div>

      {/* Phone screens pendientes */}
      {pendingPhoneScreens.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-amber-50">
            <h2 className="text-sm font-semibold text-amber-800">Phone screens pendientes ({pendingPhoneScreens.length})</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {pendingPhoneScreens.map((ps: any) => {
              const pc = ps.process_candidate
              const proc = Array.isArray(pc?.process) ? pc.process[0] : pc?.process
              const candidate = Array.isArray(pc?.candidate) ? pc.candidate[0] : pc?.candidate
              return (
                <div key={ps.id} className="px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{candidate?.full_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{proc?.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{ps.assigned_principles?.join(' · ')}</p>
                  </div>
                  <Link
                    href={`/processes/${proc?.id}/candidates/${pc?.id}/phone-screen`}
                    className="text-xs px-3 py-1.5 bg-[#0800FF] text-white rounded-lg hover:bg-[#0600CC]"
                  >
                    Evaluar →
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Loop assignments pendientes */}
      {pendingLoops.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Interview loops pendientes ({pendingLoops.length})</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {pendingLoops.map((a: any) => {
              const loop = Array.isArray(a.loop) ? a.loop[0] : a.loop
              const pc = Array.isArray(loop?.process_candidate) ? loop.process_candidate[0] : loop?.process_candidate
              const candidate = Array.isArray(pc?.candidate) ? pc.candidate[0] : pc?.candidate
              const proc = Array.isArray(pc?.process) ? pc.process[0] : pc?.process
              return (
                <div key={a.id} className="px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{candidate?.full_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{proc?.title}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(a.principles as string[]).map((p: string) => (
                        <span key={p} className="text-xs bg-[#E8E7FF] text-[#0800FF] px-2 py-0.5 rounded-full">
                          {p.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ').slice(0, 20)}
                        </span>
                      ))}
                    </div>
                    {loop?.scheduled_at && (
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(loop.scheduled_at).toLocaleDateString('es', { day: 'numeric', month: 'long' })}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/interview/${loop?.id}`}
                    className="text-xs px-3 py-1.5 bg-[#0800FF] text-white rounded-lg hover:bg-[#0600CC]"
                  >
                    Ir a entrevista →
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Completadas */}
      {(completedLoops.length > 0 || completedPhoneScreens.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-500">Completadas</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {completedLoops.map((a: any) => {
              const loop = Array.isArray(a.loop) ? a.loop[0] : a.loop
              const pc = Array.isArray(loop?.process_candidate) ? loop.process_candidate[0] : loop?.process_candidate
              const candidate = Array.isArray(pc?.candidate) ? pc.candidate[0] : pc?.candidate
              const proc = Array.isArray(pc?.process) ? pc.process[0] : pc?.process
              const eval_ = Array.isArray(a.evaluation) ? a.evaluation[0] : a.evaluation
              return (
                <div key={a.id} className="px-5 py-3 flex items-center justify-between opacity-60">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{candidate?.full_name} · {proc?.title}</p>
                    <p className="text-xs text-gray-500">
                      {eval_?.recommendation === true ? '👍 Hire' : '👎 No Hire'} ·
                      Firmado {new Date(eval_?.signed_at).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <Link href={`/interview/${loop?.id}`} className="text-xs text-gray-500 hover:underline">Ver →</Link>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {pendingLoops.length === 0 && pendingPhoneScreens.length === 0 && completedLoops.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <p className="text-sm text-gray-500">No tienes entrevistas asignadas.</p>
        </div>
      )}
    </div>
  )
}
