import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ProcessesTableClient } from '@/components/processes-table-client'

export const metadata = { title: 'Procesos' }

export default async function ProcessesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const isRecruiterOrAdmin = ['recruiter', 'head_of_people'].includes((profile as any)?.role ?? '')

  const { data: processes } = await supabase
    .from('processes')
    .select(`
      id, title, entry_mode, capa_intencional, status, created_at,
      hiring_manager_or_sponsor:users!hiring_manager_or_sponsor_id(full_name),
      candidates:process_candidates(status)
    `)
    .order('created_at', { ascending: false })

  // Normalizar para que sea serializable (sin proxies de Supabase)
  const normalized = (processes ?? []).map(p => ({
    id: p.id,
    title: p.title,
    entry_mode: p.entry_mode,
    capa_intencional: p.capa_intencional,
    status: p.status,
    created_at: p.created_at,
    hiring_manager_or_sponsor: (p.hiring_manager_or_sponsor as any)?.full_name
      ? { full_name: (p.hiring_manager_or_sponsor as any).full_name }
      : null,
    candidates: ((p as any).candidates ?? []).map((c: any) => ({ status: c.status })),
  }))

  const active = normalized.filter(p => !['closed_hire', 'closed_no_hire'].includes(p.status))
  const closed = normalized.filter(p => ['closed_hire', 'closed_no_hire'].includes(p.status))

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ letterSpacing: '-0.02em' }}>Procesos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{active.length} activos · {closed.length} cerrados</p>
        </div>
        {isRecruiterOrAdmin && <Link href="/processes/new" className="btn-truora">+ Nuevo proceso</Link>}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(11,16,32,0.06)' }}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">Procesos activos</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{active.length}</span>
        </div>
        <ProcessesTableClient processes={active} />
      </div>

      {closed.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(11,16,32,0.06)', opacity: 0.8 }}>
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-500">Cerrados</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{closed.length}</span>
          </div>
          <ProcessesTableClient processes={closed} />
        </div>
      )}
    </div>
  )
}
