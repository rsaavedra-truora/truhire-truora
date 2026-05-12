'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TRUORA_PRINCIPLES, DIMENSION_COLORS } from '@/lib/principles-data'
import { createLoop } from '@/app/actions/loop'

interface TruoraUser {
  id: string
  full_name: string | null
  email: string
  role: string
  is_bar_raiser_certified: boolean
}

interface InterviewerAssignment {
  userId: string
  principles: string[]
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
  const [users, setUsers] = useState<TruoraUser[]>([])
  const [assignments, setAssignments] = useState<InterviewerAssignment[]>([
    { userId: '', principles: [] },
    { userId: '', principles: [] },
  ])
  const [barRaiserId, setBarRaiserId] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { loadData() }, [pcId])

  async function loadData() {
    setLoading(true)
    const [{ data: pc }, { data: allUsers }] = await Promise.all([
      supabase.from('process_candidates').select(`
        id,
        candidate:candidates(full_name, email),
        process:processes(id, title, capa_intencional, hiring_manager_or_sponsor_id)
      `).eq('id', pcId).single(),
      supabase.from('users').select('id, full_name, email, role, is_bar_raiser_certified').order('full_name'),
    ])
    if (pc) { setCandidate(pc.candidate); setProc(pc.process) }
    if (allUsers) setUsers(allUsers as TruoraUser[])
    setLoading(false)
  }

  function setInterviewer(index: number, userId: string) {
    setAssignments(prev => prev.map((a, i) => i === index ? { ...a, userId } : a))
  }

  function togglePrinciple(index: number, slug: string) {
    setAssignments(prev => prev.map((a, i) => {
      if (i !== index) return a
      const has = a.principles.includes(slug)
      if (!has && a.principles.length >= 3) return a
      return { ...a, principles: has ? a.principles.filter(p => p !== slug) : [...a.principles, slug] }
    }))
  }

  function addInterviewer() {
    if (assignments.length >= 3) return
    setAssignments(prev => [...prev, { userId: '', principles: [] }])
  }

  function removeInterviewer(index: number) {
    if (assignments.length <= 2) return
    setAssignments(prev => prev.filter((_, i) => i !== index))
  }

  // Principios ya asignados a otros entrevistadores
  function usedPrinciples(currentIndex: number) {
    return assignments
      .filter((_, i) => i !== currentIndex)
      .flatMap(a => a.principles)
  }

  const barRaisers = users.filter(u => u.is_bar_raiser_certified)
  const potentialInterviewers = users.filter(u => u.id !== barRaiserId)

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

      <form action={async (fd) => {
        setError(null)
        // Validar
        for (const a of assignments) {
          if (!a.userId) { setError('Asigna un entrevistador a cada fila.'); return }
          if (a.principles.length < 2) { setError('Cada entrevistador necesita al menos 2 principios.'); return }
        }
        // Agregar assignments al formData
        const newFd = new FormData()
        newFd.set('process_candidate_id', pcId)
        newFd.set('bar_raiser_id', barRaiserId)
        newFd.set('scheduled_at', scheduledAt)
        for (const a of assignments) {
          newFd.append('interviewer_ids', a.userId)
          for (const p of a.principles) newFd.append(`principles_${a.userId}`, p)
        }
        try { await createLoop(newFd) }
        catch (e: any) { setError(e.message) }
      }}>
        <input type="hidden" name="process_candidate_id" value={pcId} />

        {/* Bar Raiser */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Bar Raiser</h2>
          <p className="text-xs text-gray-500 mb-3">Tiene la última palabra en el debrief. No puede ser el sponsor del candidato.</p>
          <select
            value={barRaiserId}
            onChange={e => setBarRaiserId(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF]"
            required
          >
            <option value="">Selecciona el Bar Raiser...</option>
            {barRaisers.map(u => (
              <option key={u.id} value={u.id}>{u.full_name ?? u.email}</option>
            ))}
          </select>
          {barRaisers.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">No hay Bar Raisers certificados en el sistema todavía.</p>
          )}
        </div>

        {/* Entrevistadores */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Entrevistadores</h2>
              <p className="text-xs text-gray-500 mt-0.5">2-3 entrevistadores, 2-3 principios cada uno. Los principios no deben solaparse.</p>
            </div>
            {assignments.length < 3 && (
              <button type="button" onClick={addInterviewer}
                className="text-xs text-[#0800FF] hover:underline font-medium">+ Agregar entrevistador</button>
            )}
          </div>

          {assignments.map((assignment, idx) => {
            const used = usedPrinciples(idx)
            return (
              <div key={idx} className="border border-gray-100 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400 w-4">#{idx + 1}</span>
                    <select
                      value={assignment.userId}
                      onChange={e => setInterviewer(idx, e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF]"
                    >
                      <option value="">Selecciona entrevistador...</option>
                      {potentialInterviewers
                        .filter(u => u.id === assignment.userId || !assignments.some((a, i) => i !== idx && a.userId === u.id))
                        .map(u => (
                          <option key={u.id} value={u.id}>{u.full_name ?? u.email} · {u.role}</option>
                        ))
                      }
                    </select>
                  </div>
                  {assignments.length > 2 && (
                    <button type="button" onClick={() => removeInterviewer(idx)} className="text-xs text-red-400 hover:text-red-600">Quitar</button>
                  )}
                </div>

                {/* Selector de principios */}
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    Principios asignados ({assignment.principles.length}/3 — mínimo 2)
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {TRUORA_PRINCIPLES.map(p => {
                      const isSelected = assignment.principles.includes(p.slug)
                      const isUsedByOther = used.includes(p.slug)
                      const isFull = !isSelected && assignment.principles.length >= 3
                      const dimColors = DIMENSION_COLORS[p.dimension]
                      return (
                        <button
                          key={p.slug}
                          type="button"
                          onClick={() => !isUsedByOther && !isFull && togglePrinciple(idx, p.slug)}
                          disabled={isUsedByOther || isFull}
                          className={`text-left p-2.5 rounded-lg border transition-all relative ${
                            isSelected ? 'border-[#0800FF] bg-[#E8E7FF]'
                            : isUsedByOther ? 'border-gray-100 bg-gray-50 opacity-30 cursor-not-allowed'
                            : isFull ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                            : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <span className={`text-xs font-medium inline-block px-1 py-0.5 rounded mb-1 ${dimColors.bg} ${dimColors.text}`}>
                            {p.id}
                          </span>
                          <p className={`text-xs font-medium leading-tight ${isSelected ? 'text-[#0800FF]' : 'text-gray-700'}`}>
                            {p.name}
                          </p>
                          {isUsedByOther && (
                            <span className="text-xs text-gray-400 block mt-0.5">ya asignado</span>
                          )}
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-[#0800FF] rounded-full flex items-center justify-center">
                              <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                              </svg>
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Fecha estimada */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Fecha estimada del loop</h2>
          <p className="text-xs text-gray-500 mb-3">Opcional — para dar contexto a los entrevistadores.</p>
          <input
            type="date"
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF]"
          />
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
