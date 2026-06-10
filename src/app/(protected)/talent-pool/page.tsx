'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { PersonSearch } from '@/components/person-search'

interface PoolCandidate {
  id: string
  full_name: string
  email: string
  linkedin_url: string | null
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
        id, full_name, email, linkedin_url, talent_pool_source,
        talent_pool_notes, talent_pool_recommended_by, added_to_pool_at,
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
          candidate:candidates(id, full_name, email, linkedin_url,
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
                      <p className="font-semibold text-gray-900">{c.full_name}</p>
                      {c.screening && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FIT_COLORS[c.screening.truora_fit_level] ?? 'bg-gray-100 text-gray-600'}`}>
                          {FIT_LABELS[c.screening.truora_fit_level] ?? c.screening.truora_fit_level}
                        </span>
                      )}
                      {!c.screening && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">Sin screening</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{c.email}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {c.linkedin_url && (
                        <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-[#0800FF] hover:underline">LinkedIn →</a>
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

                    {/* Resumen AI */}
                    {c.screening?.ai_summary && (
                      <p className="text-sm text-gray-600 mt-2 leading-relaxed">{c.screening.ai_summary}</p>
                    )}

                    {/* Notas del recruiter */}
                    {c.talent_pool_notes && (
                      <p className="text-xs text-gray-400 mt-1 italic">"{c.talent_pool_notes}"</p>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={async () => {
                        if (assigningId === c.id) { setAssigningId(null); return }
                        setAssigningId(c.id)
                        await loadProcesses()
                      }}
                      className="px-3 py-1.5 text-xs font-medium border border-[#0800FF] text-[#0800FF] rounded-lg hover:bg-[#E8E7FF] transition-colors whitespace-nowrap"
                    >
                      Asignar a proceso →
                    </button>
                    <button
                      onClick={() => router.push(`/processes/new?candidate_id=${c.id}&mode=talent_first&name=${encodeURIComponent(c.full_name)}`)}
                      className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
                    >
                      Crear proceso →
                    </button>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="chuchito@empresa.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF]" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">LinkedIn</label>
                <input type="url" value={form.linkedin_url} onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF]" />
              </div>

              {/* Fuente */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Fuente</label>
                <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF]">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF] resize-none" />
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
                    isDragging ? 'border-[#0800FF] bg-[#E8E7FF]'
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
                      <span className="text-[#0800FF] font-medium">Arrastra el PDF</span> o haz clic
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
