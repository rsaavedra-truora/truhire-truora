'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PersonSearch } from '@/components/person-search'

interface PoolCandidate {
  id: string
  full_name: string
  email: string
  linkedin_url: string | null
  cv_url: string | null
  has_cv_text: boolean
  talent_pool_source: string | null
  talent_pool_notes: string | null
  added_to_pool_at: string | null
  added_by_name: string | null
  recommended_by_name?: string | null
  screening: {
    id: string
    truora_fit_level: string
    signals: string[]
    gaps: string[]
    suggested_roles: string[]
    ai_summary: string
  } | null
}

interface Process {
  id: string
  title: string
  status: string
  capa_intencional: string
}

const SOURCE_LABELS: Record<string, string> = {
  referral: 'Referido',
  linkedin: 'LinkedIn',
  event: 'Evento',
  inbound: 'Aplicación espontánea',
  other: 'Otra fuente',
}

const FIT_COLORS: Record<string, string> = {
  high: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-red-100 text-red-700',
}

const FIT_LABELS: Record<string, string> = {
  high: 'Alto fit Truora',
  medium: 'Fit medio',
  low: 'Bajo fit',
}

export default function TalentPoolPage() {
  const router = useRouter()
  const supabase = createClient()

  const [candidates, setCandidates] = useState<PoolCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [showPanel, setShowPanel] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [rescreeningId, setRescreeningId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [benchmarkState, setBenchmarkState] = useState<Record<string, { notes: string; saving: boolean; saved: boolean }>>({})
  const [benchmarkOpenId, setBenchmarkOpenId] = useState<string | null>(null)
  const [processes, setProcesses] = useState<Process[]>([])
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [form, setForm] = useState({
    full_name: '', email: '', linkedin_url: '', source: 'referral',
    referred_by: '', recommended_by: '', notes: '',
  })
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)

    // Candidatos agregados directamente al pool
    const { data: direct } = await supabase
      .from('candidates')
      .select(`
        id, full_name, email, linkedin_url, cv_url, cv_text,
        talent_pool_source, talent_pool_notes, talent_pool_recommended_by, added_to_pool_at,
        added_by:users!added_to_pool_by(full_name)
      `)
      .eq('in_talent_pool', true)
      .order('added_to_pool_at', { ascending: false })

    // Candidatos que llegaron por proceso con clasificación talent_pool
    const { data: fromProcess } = await supabase
      .from('screenings')
      .select(`
        id, truora_fit_level, signals, gaps, suggested_roles, ai_summary,
        process_candidate:process_candidates(
          candidate:candidates(id, full_name, email, linkedin_url, cv_url, cv_text,
            in_talent_pool, talent_pool_source, talent_pool_notes, added_to_pool_at)
        )
      `)
      .eq('classification', 'talent_pool')
      .order('created_at', { ascending: false })

    // Screenings del pool directo
    const directIds = (direct ?? []).map(c => c.id)
    let poolScreenings: any[] = []
    if (directIds.length > 0) {
      const { data: ps } = await supabase
        .from('talent_pool_screenings')
        .select('*')
        .in('candidate_id', directIds)
      poolScreenings = ps ?? []
    }

    const screeningMap = new Map(poolScreenings.map(s => [s.candidate_id, s]))

    // Resolver nombres de recommended_by desde el directorio
    const recommendedEmails = (direct ?? [])
      .map((c: any) => c.talent_pool_recommended_by)
      .filter(Boolean)
    const recommendedNames = new Map<string, string>()
    if (recommendedEmails.length > 0) {
      const { data: dirPeople } = await supabase
        .from('truora_directory')
        .select('email, full_name')
        .in('email', recommendedEmails)
      ;(dirPeople ?? []).forEach((p: any) => recommendedNames.set(p.email, p.full_name))
    }

    // Merge: directo + proceso (evitar duplicados por email)
    const seen = new Set<string>()
    const merged: PoolCandidate[] = []

    // Primero los directos
    for (const c of direct ?? []) {
      if (seen.has(c.email)) continue
      seen.add(c.email)
      const s = screeningMap.get(c.id)
      const recEmail = (c as any).talent_pool_recommended_by
      merged.push({
        id: c.id,
        full_name: c.full_name,
        email: c.email,
        linkedin_url: c.linkedin_url,
        cv_url: (c as any).cv_url ?? null,
        has_cv_text: !!((c as any).cv_text?.length > 100),
        talent_pool_source: c.talent_pool_source,
        talent_pool_notes: c.talent_pool_notes,
        added_to_pool_at: c.added_to_pool_at,
        added_by_name: (c as any).added_by?.full_name ?? null,
        recommended_by_name: recEmail ? (recommendedNames.get(recEmail) ?? recEmail) : null,
        screening: s ? {
          id: s.id,
          truora_fit_level: s.truora_fit_level,
          signals: s.signals ?? [],
          gaps: s.gaps ?? [],
          suggested_roles: s.suggested_roles ?? [],
          ai_summary: s.ai_summary ?? '',
        } : null,
      })
    }

    // Luego los que llegaron por proceso
    for (const s of fromProcess ?? []) {
      const c = (s as any).process_candidate?.candidate
      if (!c || seen.has(c.email)) continue
      seen.add(c.email)
      merged.push({
        id: c.id,
        full_name: c.full_name,
        email: c.email,
        linkedin_url: c.linkedin_url,
        cv_url: c.cv_url ?? null,
        has_cv_text: !!(c.cv_text?.length > 100),
        talent_pool_source: c.talent_pool_source ?? 'process',
        talent_pool_notes: c.talent_pool_notes,
        added_to_pool_at: c.added_to_pool_at,
        added_by_name: null,
        screening: {
          id: s.id,
          truora_fit_level: s.truora_fit_level ?? 'medium',
          signals: s.signals ?? [],
          gaps: s.gaps ?? [],
          suggested_roles: s.suggested_roles ?? [],
          ai_summary: s.ai_summary ?? '',
        },
      })
    }

    setCandidates(merged)
    setLoading(false)
  }

  async function loadProcesses() {
    const { data } = await supabase
      .from('processes')
      .select('id, title, status, capa_intencional')
      .not('status', 'in', '("closed_hire","closed_no_hire")')
      .order('created_at', { ascending: false })
    setProcesses(data ?? [])
  }

  async function handleSubmit() {
    if (!form.full_name.trim() || !form.email.trim()) {
      setFormError('Nombre y email son obligatorios.')
      return
    }
    setSubmitting(true)
    setFormError(null)

    const fd = new FormData()
    fd.set('full_name', form.full_name)
    fd.set('email', form.email)
    fd.set('linkedin_url', form.linkedin_url)
    fd.set('source', form.source)
    fd.set('referred_by', form.referred_by)
    fd.set('recommended_by', form.recommended_by)
    fd.set('notes', form.notes)
    if (cvFile) fd.set('cv', cvFile)

    const res = await fetch('/api/talent-pool/add', { method: 'POST', body: fd })
    const data = await res.json()

    if (!res.ok) {
      setFormError(data.error ?? 'Error al agregar.')
      setSubmitting(false)
      return
    }

    setShowPanel(false)
    setForm({ full_name: '', email: '', linkedin_url: '', source: 'referral', referred_by: '', recommended_by: '', notes: '' })
    setCvFile(null)
    setSubmitting(false)
    loadData()
  }

  async function addAsBenchmark(candidateId: string, fullName: string, cvText: string | null) {
    const state = benchmarkState[candidateId]
    setBenchmarkState(prev => ({ ...prev, [candidateId]: { ...prev[candidateId] ?? { notes: '' }, saving: true, saved: false } }))

    const res = await fetch('/api/benchmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: fullName,
        cv_text: cvText ?? '',
        notes: state?.notes ?? '',
        layer: 'talent_pool',
      }),
    })

    if (res.ok) {
      setBenchmarkState(prev => ({ ...prev, [candidateId]: { ...prev[candidateId], saving: false, saved: true } }))
      setTimeout(() => setBenchmarkOpenId(null), 1500)
    } else {
      setBenchmarkState(prev => ({ ...prev, [candidateId]: { ...prev[candidateId], saving: false } }))
    }
  }

  async function rescreen(candidateId: string) {
    setRescreeningId(candidateId)
    setError(null)
    const res = await fetch('/api/talent-pool/rescreen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateId }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Error al recalificar.'); setRescreeningId(null); return }
    // Actualizar screening en el estado local
    setCandidates(prev => prev.map(c => {
      if (c.id !== candidateId) return c
      return { ...c, screening: data.screening }
    }))
    setRescreeningId(null)
  }

  async function removeFromPool(candidateId: string) {
    await supabase.from('candidates')
      .update({ in_talent_pool: false })
      .eq('id', candidateId)
    setCandidates(prev => prev.filter(c => c.id !== candidateId))
    setConfirmDeleteId(null)
  }

  async function assignToProcess(candidateId: string, processId: string) {
    // Verificar si ya está en el proceso
    const { data: existing } = await supabase
      .from('process_candidates')
      .select('id')
      .eq('process_id', processId)
      .eq('candidate_id', candidateId)
      .maybeSingle()

    if (existing) {
      setError('Este candidato ya está en ese proceso.')
      return
    }

    const { error: pcError } = await supabase
      .from('process_candidates')
      .insert({ process_id: processId, candidate_id: candidateId, status: 'applied' })

    if (pcError) { setError(pcError.message); return }

    setAssigningId(null)
    router.push(`/processes/${processId}`)
  }

  const highFit = candidates.filter(c => c.screening?.truora_fit_level === 'high')
  const rest = candidates.filter(c => c.screening?.truora_fit_level !== 'high')

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Talent Pool</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {candidates.length} perfiles · {highFit.length} alto fit Truora
          </p>
        </div>
        <button onClick={() => setShowPanel(true)} className="btn-truora">
          + Agregar talento
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Cargando pool...</div>
      ) : candidates.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900">El Talent Pool está vacío</p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
            Agrega personas con potencial aunque no haya una vacante activa para ellas.
          </p>
          <button onClick={() => setShowPanel(true)} className="mt-4 btn-truora text-sm">
            + Agregar primer talento
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {[...highFit, ...rest].map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Card header */}
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/candidates/${c.id}`} className="font-semibold text-gray-900 hover:text-truora-primary transition-colors">
                        {c.full_name}
                      </Link>
                      {c.screening && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FIT_COLORS[c.screening.truora_fit_level] ?? 'bg-gray-100 text-gray-600'}`}>
                          {FIT_LABELS[c.screening.truora_fit_level] ?? c.screening.truora_fit_level}
                        </span>
                      )}
                      {!c.screening && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">Sin screening</span>
                      )}
                      {/* Recalificar */}
                      <button
                        onClick={() => rescreen(c.id)}
                        disabled={rescreeningId === c.id || !c.has_cv_text}
                        title={c.has_cv_text ? 'Recalificar con AI' : 'Sube el CV primero para poder recalificar'}
                        className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-truora-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {rescreeningId === c.id ? (
                          <svg className="animate-spin w-3.5 h-3.5 text-truora-primary" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/>
                          </svg>
                        )}
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{c.email}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {c.cv_url && (
                        <a href={c.cv_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-truora-primary hover:underline flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
                          </svg>
                          Ver CV
                        </a>
                      )}
                      {!c.cv_url && !c.has_cv_text && (
                        <span className="text-xs text-amber-500 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
                          </svg>
                          Sin CV — el rescreen no funcionará
                        </span>
                      )}
                      {c.linkedin_url && (
                        <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-truora-primary hover:underline">LinkedIn →</a>
                      )}
                      {c.talent_pool_source && (
                        <span className="text-xs text-gray-400">
                          {SOURCE_LABELS[c.talent_pool_source] ?? c.talent_pool_source}
                        </span>
                      )}
                      {(c as any).recommended_by_name && (
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          💬 {(c as any).recommended_by_name}
                        </span>
                      )}
                      {c.added_by_name && c.added_by_name !== (c as any).recommended_by_name && (
                        <span className="text-xs text-gray-400">subido por {c.added_by_name}</span>
                      )}
                      {c.added_to_pool_at && (
                        <span className="text-xs text-gray-400">
                          {new Date(c.added_to_pool_at).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>

                    {/* Roles sugeridos */}
                    {c.screening?.suggested_roles && c.screening.suggested_roles.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {c.screening.suggested_roles.map((r, i) => (
                          <span key={i} className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">{r}</span>
                        ))}
                      </div>
                    )}

                    {/* Estado recalificando */}
                    {rescreeningId === c.id && (
                      <p className="text-xs text-truora-primary mt-2 flex items-center gap-1.5">
                        <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Analizando con Truora DNA AI...
                      </p>
                    )}

                    {/* Resumen AI */}
                    {c.screening?.ai_summary && rescreeningId !== c.id && (
                      <p className="text-sm text-gray-600 mt-2 leading-relaxed">{c.screening.ai_summary}</p>
                    )}

                    {/* Notas del recruiter */}
                    {c.talent_pool_notes && (
                      <p className="text-xs text-gray-400 mt-1 italic">"{c.talent_pool_notes}"</p>
                    )}

                    {/* Confirmar como referencia Truora → calibra el AI */}
                    <div className="mt-3">
                      {benchmarkOpenId !== c.id ? (
                        <button
                          onClick={() => {
                            setBenchmarkOpenId(c.id)
                            if (!benchmarkState[c.id]) {
                              setBenchmarkState(prev => ({ ...prev, [c.id]: { notes: '', saving: false, saved: false } }))
                            }
                          }}
                          className="text-xs text-gray-400 hover:text-violet-600 flex items-center gap-1.5 transition-colors group"
                        >
                          <svg className="w-3 h-3 group-hover:text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.798-1.4 2.798H4.198c-1.43 0-2.4-1.798-1.4-2.798L4.2 15.3"/>
                          </svg>
                          Confirmar como referencia Truora → entrena el AI
                        </button>
                      ) : (
                        <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 space-y-2.5">
                          <div>
                            <p className="text-xs font-semibold text-violet-800">Confirmar como referencia de talento Truora</p>
                            <p className="text-xs text-violet-600 mt-0.5">
                              Su CV se agregará al pool de calibración. El AI usará este perfil como referencia en futuros screenings.
                            </p>
                          </div>
                          <textarea
                            value={benchmarkState[c.id]?.notes ?? ''}
                            onChange={e => setBenchmarkState(prev => ({ ...prev, [c.id]: { ...prev[c.id], notes: e.target.value } }))}
                            placeholder="¿Por qué encaja con Truora? Ej: Gran track record en B2B SaaS, lideró 0→$3M ARR, ownership real..."
                            rows={2}
                            className="w-full px-3 py-2 border border-violet-200 bg-white rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-violet-400 resize-none"
                          />
                          <div className="flex gap-2 items-center">
                            <button
                              onClick={() => addAsBenchmark(c.id, c.full_name, null)}
                              disabled={benchmarkState[c.id]?.saving}
                              className="px-3 py-1.5 text-xs font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
                            >
                              {benchmarkState[c.id]?.saved ? '✓ Agregado al pool de calibración' : benchmarkState[c.id]?.saving ? 'Guardando...' : 'Confirmar'}
                            </button>
                            <button onClick={() => setBenchmarkOpenId(null)} className="text-xs text-gray-400 hover:text-gray-600">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={async () => {
                        if (assigningId === c.id) { setAssigningId(null); return }
                        setAssigningId(c.id)
                        setConfirmDeleteId(null)
                        await loadProcesses()
                      }}
                      className="px-3 py-1.5 text-xs font-medium border border-truora-primary text-truora-primary rounded-lg hover:bg-truora-primary-soft transition-colors whitespace-nowrap"
                    >
                      Asignar a proceso →
                    </button>
                    <button
                      onClick={() => router.push(`/processes/new?candidate_id=${c.id}&mode=talent_first&name=${encodeURIComponent(c.full_name)}`)}
                      className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
                    >
                      Crear proceso →
                    </button>

                    {/* Eliminar del pool */}
                    {confirmDeleteId === c.id ? (
                      <div className="flex gap-1.5 items-center">
                        <button
                          onClick={() => removeFromPool(c.id)}
                          className="px-2 py-1 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setConfirmDeleteId(c.id); setAssigningId(null) }}
                        className="px-3 py-1.5 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left"
                      >
                        Quitar del pool
                      </button>
                    )}
                  </div>
                </div>

                {/* Señales expandibles */}
                {c.screening && (c.screening.signals.length > 0 || c.screening.gaps.length > 0) && (
                  <button
                    onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                    className="mt-3 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                  >
                    <svg className={`w-3 h-3 transition-transform ${expandedId === c.id ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                    </svg>
                    Ver señales del análisis
                  </button>
                )}
              </div>

              {/* Señales expandidas */}
              {expandedId === c.id && c.screening && (
                <div className="px-5 pb-4 border-t border-gray-50 pt-3 grid grid-cols-2 gap-4">
                  {c.screening.signals.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-green-700 mb-2">✓ Señales positivas</p>
                      <ul className="space-y-1">
                        {c.screening.signals.map((s, i) => (
                          <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                            <span className="text-green-400 flex-shrink-0">·</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {c.screening.gaps.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-red-600 mb-2">△ Gaps</p>
                      <ul className="space-y-1">
                        {c.screening.gaps.map((g, i) => (
                          <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                            <span className="text-red-300 flex-shrink-0">·</span>{g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Asignar a proceso — dropdown */}
              {assigningId === c.id && (
                <div className="px-5 pb-4 border-t border-gray-100 pt-3">
                  <p className="text-xs font-medium text-gray-700 mb-2">Selecciona el proceso:</p>
                  {processes.length === 0 ? (
                    <p className="text-xs text-gray-400">No hay procesos activos.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {processes.map(p => (
                        <button
                          key={p.id}
                          onClick={() => assignToProcess(c.id, p.id)}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors"
                        >
                          <p className="text-sm font-medium text-gray-900">{p.title}</p>
                          <p className="text-xs text-gray-400">
                            {p.capa_intencional === 'liderazgo' ? 'Liderazgo' : 'Funcional'} · {p.status}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Panel lateral — Agregar talento */}
      {showPanel && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/20" onClick={() => setShowPanel(false)}/>
          <div className="w-[420px] bg-white shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Agregar al Talent Pool</h2>
                <p className="text-xs text-gray-500 mt-0.5">El AI analizará el fit con Truora DNA</p>
              </div>
              <button onClick={() => setShowPanel(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* Datos básicos */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
                  <input type="text" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                    placeholder="Chuchito Pérez"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-truora-primary" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="chuchito@empresa.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-truora-primary" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">LinkedIn</label>
                <input type="url" value={form.linkedin_url} onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-truora-primary" />
              </div>

              {/* Fuente */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Fuente</label>
                <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-truora-primary">
                  <option value="referral">Referido por alguien del equipo</option>
                  <option value="linkedin">LinkedIn search</option>
                  <option value="event">Evento / conferencia</option>
                  <option value="inbound">Aplicación espontánea</option>
                  <option value="other">Otra fuente</option>
                </select>
              </div>

              {form.source === 'referral' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Referido formalmente por</label>
                  <PersonSearch
                    value={form.referred_by}
                    onChange={(email) => setForm(f => ({ ...f, referred_by: email }))}
                    placeholder="Buscar en el equipo..."
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  ¿Quién en Truora lo conoce o recomienda?
                  <span className="text-gray-400 font-normal ml-1">(puede ser diferente a quien sube)</span>
                </label>
                <PersonSearch
                  value={form.recommended_by}
                  onChange={(email) => setForm(f => ({ ...f, recommended_by: email }))}
                  placeholder="Ej: Mariangel, Daniel..."
                />
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  ¿Por qué esta persona?
                  <span className="text-gray-400 font-normal ml-1">(opcional pero recomendado)</span>
                </label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3} placeholder="Ej: Lo conocí en SaaStr, tiene track record sólido en B2B SaaS latam, lideró el crecimiento de X de 0 a $5M ARR..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-truora-primary resize-none" />
              </div>

              {/* CV Upload */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  CV / Perfil de LinkedIn como PDF
                  <span className="text-gray-400 font-normal ml-1">(recomendado para el análisis AI)</span>
                </label>
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) setCvFile(f) }}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                    isDragging ? 'border-truora-primary bg-truora-primary-soft'
                    : cvFile ? 'border-green-400 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {cvFile ? (
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-gray-900 font-medium truncate">{cvFile.name}</p>
                      <button type="button" onClick={e => { e.stopPropagation(); setCvFile(null) }}
                        className="text-gray-400 hover:text-red-500 flex-shrink-0">✕</button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      <span className="text-truora-primary font-medium">Arrastra el PDF</span> o haz clic
                    </p>
                  )}
                </div>
                <input ref={fileRef} type="file" accept=".pdf" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) setCvFile(f); e.target.value = '' }} />
              </div>

              {formError && <p className="text-sm text-red-600">⚠ {formError}</p>}
            </div>

            <div className="px-6 py-4 border-t border-gray-100">
              <button onClick={handleSubmit} disabled={submitting}
                className="btn-truora w-full disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Analizando con AI...
                  </>
                ) : 'Agregar al pool'}
              </button>
              <p className="text-xs text-gray-400 text-center mt-2">
                {cvFile ? 'El AI analizará el fit con Truora DNA (~20 seg)' : 'Sin CV no habrá análisis AI'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
