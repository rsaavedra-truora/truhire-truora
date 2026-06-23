'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createLoop } from '@/app/actions/loop'
import { PersonSearch } from '@/components/person-search'

interface DirectoryPerson {
  id: string
  full_name: string
  email: string
  area: string | null
  position: string | null
  is_bar_raiser_certified: boolean
}

interface InterviewerAssignment {
  email: string
  userId: string | null   // null si aún no ha entrado a TruHire
  name: string
}

export default function LoopSetupPage() {
  const params = useParams()
  const router = useRouter()
  const pcId = params.pcId as string
  const processId = params.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [candidate, setCandidate] = useState<any>(null)
  const [proc, setProc] = useState<any>(null)
  const [assignments, setAssignments] = useState<InterviewerAssignment[]>([
    { email: '', userId: null, name: '' },
    { email: '', userId: null, name: '' },
  ])
  const [barRaiserEmail, setBarRaiserEmail] = useState('')
  const [barRaiserId, setBarRaiserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { loadData() }, [pcId])

  async function loadData() {
    setLoading(true)
    const { data: pc } = await supabase.from('process_candidates').select(`
      id,
      candidate:candidates(full_name, email),
      process:processes(id, title, capa_intencional, hiring_manager_or_sponsor_id)
    `).eq('id', pcId).single()
    if (pc) { setCandidate(pc.candidate); setProc(pc.process) }
    setLoading(false)
  }

  async function resolveEmailToUserId(email: string): Promise<string | null> {
    const normalized = email.trim().toLowerCase()

    // 1. Buscar directamente en users por email exacto (login email)
    const { data: directMatch } = await supabase
      .from('users').select('id').ilike('email', normalized).maybeSingle()
    if (directMatch?.id) return directMatch.id

    // 2. Si no encontró, buscar login_email en truora_directory para obtener el email real de TruHire
    const { data: dirEntry } = await supabase
      .from('truora_directory').select('login_email').ilike('email', normalized).maybeSingle()
    if (dirEntry?.login_email) {
      const { data: viaLogin } = await supabase
        .from('users').select('id').ilike('email', dirEntry.login_email).maybeSingle()
      if (viaLogin?.id) return viaLogin.id
    }

    return null
  }

  async function setInterviewer(index: number, email: string, person: any) {
    const userId = email ? await resolveEmailToUserId(email) : null
    setAssignments(prev => prev.map((a, i) =>
      i === index ? { ...a, email, userId, name: person?.full_name ?? '' } : a
    ))
  }

  function addInterviewer() {
    if (assignments.length >= 3) return
    setAssignments(prev => [...prev, { email: '', userId: null, name: '' }])
  }

  function removeInterviewer(index: number) {
    if (assignments.length <= 2) return
    setAssignments(prev => prev.filter((_, i) => i !== index))
  }

  const assignedEmails = assignments.map(a => a.email).filter(Boolean)

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Cargando...</div>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-3 flex items-center gap-1">← Volver</button>
        <h1 className="text-xl font-semibold text-gray-900">Configurar interview loop</h1>
        <p className="text-sm text-gray-500 mt-1">
          {(candidate as any)?.full_name} · {(proc as any)?.title}
        </p>
      </div>

      <form action={async () => {
        setError(null)
        if (!barRaiserEmail) { setError('Debes seleccionar un Bar Raiser.'); return }
        for (const a of assignments) {
          if (!a.email) { setError('Asigna un entrevistador a cada fila.'); return }
        }

        const newFd = new FormData()
        newFd.set('process_candidate_id', pcId)
        newFd.set('bar_raiser_id', barRaiserId ?? '')
        newFd.set('bar_raiser_email', barRaiserEmail)
        for (const a of assignments) {
          newFd.append('interviewer_ids', a.userId ?? 'null')
          newFd.append('interviewer_emails', a.email)
        }
        try { await createLoop(newFd) }
        catch (e: any) { setError(e.message) }
      }}>
        <input type="hidden" name="process_candidate_id" value={pcId} />

        {/* Bar Raiser */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Bar Raiser</h2>
          <p className="text-xs text-gray-500 mb-3">Tiene la última palabra en el debrief. No puede ser el sponsor del candidato.</p>
          <PersonSearch
            value={barRaiserEmail}
            onChange={async (email, person) => {
              setBarRaiserEmail(email)
              if (email) {
                const uid = await resolveEmailToUserId(email)
                setBarRaiserId(uid)
              } else {
                setBarRaiserId(null)
              }
            }}
            filterBarRaiser={true}
            excludeEmails={assignedEmails}
            placeholder="Buscar Bar Raiser..."
          />
        </div>

        {/* Entrevistadores */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Entrevistadores</h2>
              <p className="text-xs text-gray-500 mt-0.5">2-3 entrevistadores. Cada uno seleccionará los principios que evaluó directamente en su entrevista.</p>
            </div>
            {assignments.length < 3 && (
              <button type="button" onClick={addInterviewer}
                className="text-xs text-[#0800FF] hover:underline font-medium">+ Agregar entrevistador</button>
            )}
          </div>

          {assignments.map((assignment, idx) => (
            <div key={idx} className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 flex-1">
                  <span className="text-xs font-mono text-gray-400 w-4 mt-3">#{idx + 1}</span>
                  <div className="flex-1">
                    <PersonSearch
                      value={assignment.email}
                      onChange={(email, person) => setInterviewer(idx, email, person)}
                      excludeEmails={[barRaiserEmail, ...assignedEmails.filter((_, i) => i !== idx)]}
                      placeholder="Buscar entrevistador..."
                    />
                    {assignment.email && !assignment.userId && (
                      <p className="text-xs text-amber-600 mt-1">⚠ Aún no ha ingresado a TruHire — se asignará automáticamente cuando haga login</p>
                    )}
                  </div>
                </div>
                {assignments.length > 2 && (
                  <button type="button" onClick={() => removeInterviewer(idx)} className="text-xs text-red-400 hover:text-red-600 mt-3">Quitar</button>
                )}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pb-6">
          <button type="submit" className="btn-truora">
            Crear loop y notificar entrevistadores
          </button>
          <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
