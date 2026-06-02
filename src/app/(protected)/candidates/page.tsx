import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CandidatesTableClient } from '@/components/candidates-table-client'

export const metadata = { title: 'Candidatos' }

export default async function CandidatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!['recruiter', 'head_of_people'].includes((profile as any)?.role ?? '')) redirect('/dashboard')

  const { data: candidates } = await supabase
    .from('candidates')
    .select(`
      id, full_name, email, linkedin_url, created_at,
      process_candidates(
        id, status,
        process:processes(id, title),
        screening:screenings(classification)
      )
    `)
    .order('created_at', { ascending: false })

  // Normalizar para serialización segura Server → Client
  const normalized = (candidates ?? []).map(c => ({
    id: c.id,
    full_name: c.full_name,
    email: c.email,
    linkedin_url: c.linkedin_url,
    created_at: c.created_at,
    process_candidates: ((c.process_candidates as any[]) ?? []).map((pc: any) => ({
      id: pc.id,
      status: pc.status,
      process: pc.process
        ? { id: Array.isArray(pc.process) ? pc.process[0]?.id : pc.process?.id, title: Array.isArray(pc.process) ? pc.process[0]?.title : pc.process?.title }
        : null,
      screening: pc.screening
        ? { classification: Array.isArray(pc.screening) ? pc.screening[0]?.classification : pc.screening?.classification }
        : null,
    })).filter((pc: any) => pc.process?.id),
  }))

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ letterSpacing: '-0.02em' }}>Candidatos</h1>
        <p className="text-sm text-gray-500 mt-0.5">{normalized.length} candidatos en el sistema</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(11,16,32,0.06)' }}>
        <CandidatesTableClient candidates={normalized} />
      </div>
    </div>
  )
}
