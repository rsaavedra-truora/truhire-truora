'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface DirectoryPerson {
  id: string
  full_name: string
  email: string
  area: string | null
  position: string | null
  is_bar_raiser_certified: boolean
  is_active: boolean
  default_role: string
  // joined from users table
  user_id: string | null
  current_role: string | null
}

const ROLES = [
  { value: 'interviewer', label: 'Entrevistador' },
  { value: 'hiring_manager', label: 'Hiring Manager' },
  { value: 'recruiter', label: 'Recruiter' },
  { value: 'head_of_people', label: 'Head of People' },
]

const ROLE_COLORS: Record<string, string> = {
  interviewer: 'bg-gray-100 text-gray-600',
  hiring_manager: 'bg-blue-100 text-blue-700',
  recruiter: 'bg-violet-100 text-violet-700',
  head_of_people: 'bg-orange-100 text-orange-700',
}

const emptyForm = { full_name: '', email: '', area: '', position: '', default_role: 'interviewer', is_bar_raiser_certified: false }

export default function DirectoryPage() {
  const [people, setPeople] = useState<DirectoryPerson[]>([])
  const [filtered, setFiltered] = useState<DirectoryPerson[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [showPanel, setShowPanel] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const { data: dir, error: dirError } = await supabase
      .from('truora_directory')
      .select('*')
      .order('full_name')

    if (dirError) {
      console.error('[directory] error:', dirError)
      alert('Error cargando directorio: ' + dirError.message)
    }
    console.log('[directory] rows:', dir?.length, dir?.[0])

    const { data: users } = await supabase
      .from('users')
      .select('id, email, role')

    const userMap = new Map((users ?? []).map(u => [u.email, u]))

    const merged: DirectoryPerson[] = (dir ?? []).map(d => {
      const u = userMap.get(d.email)
      return {
        ...d,
        user_id: u?.id ?? null,
        current_role: u?.role ?? null,
      }
    })
    setPeople(merged)
    setFiltered(merged)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!query) { setFiltered(people); return }
    const q = query.toLowerCase()
    setFiltered(people.filter(p =>
      p.full_name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.area ?? '').toLowerCase().includes(q) ||
      (p.position ?? '').toLowerCase().includes(q)
    ))
  }, [query, people])

  async function updateDirectoryField(id: string, field: string, value: any) {
    setSaving(id)
    await supabase.from('truora_directory').update({ [field]: value }).eq('id', id)
    setPeople(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
    setSaving(null)
  }

  async function updateUserRole(email: string, userId: string, role: string) {
    setSaving(email)
    await supabase.from('users').update({ role }).eq('id', userId)
    // Also update default_role in directory
    await supabase.from('truora_directory').update({ default_role: role }).eq('email', email)
    setPeople(prev => prev.map(p => p.email === email ? { ...p, current_role: role, default_role: role } : p))
    setSaving(null)
  }

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm)
    setFormError(null)
    setShowPanel(true)
  }

  function openEdit(p: DirectoryPerson) {
    setEditingId(p.id)
    setForm({
      full_name: p.full_name,
      email: p.email,
      area: p.area ?? '',
      position: p.position ?? '',
      default_role: p.default_role ?? 'interviewer',
      is_bar_raiser_certified: p.is_bar_raiser_certified,
    })
    setFormError(null)
    setShowPanel(true)
  }

  async function handleSave() {
    if (!form.full_name.trim() || !form.email.trim()) {
      setFormError('Nombre y email son obligatorios.')
      return
    }
    setSaving('form')
    setFormError(null)

    if (editingId) {
      const { error } = await supabase.from('truora_directory').update({
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        area: form.area.trim() || null,
        position: form.position.trim() || null,
        default_role: form.default_role,
        is_bar_raiser_certified: form.is_bar_raiser_certified,
      }).eq('id', editingId)
      if (error) { setFormError(error.message); setSaving(null); return }
    } else {
      const { error } = await supabase.from('truora_directory').insert({
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        area: form.area.trim() || null,
        position: form.position.trim() || null,
        default_role: form.default_role,
        is_bar_raiser_certified: form.is_bar_raiser_certified,
        is_active: true,
      })
      if (error) { setFormError(error.message); setSaving(null); return }
    }

    setSaving(null)
    setShowPanel(false)
    load()
  }

  const activeCount = people.filter(p => p.is_active).length
  const brCount = people.filter(p => p.is_bar_raiser_certified).length
  const loggedInCount = people.filter(p => p.user_id).length

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Directorio Truora</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {activeCount} activos · {loggedInCount} en TruHire · {brCount} Bar Raisers
          </p>
        </div>
        <button onClick={openAdd} className="btn-truora">+ Agregar persona</button>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por nombre, email, área o posición..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-truora-primary"
        />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Cargando directorio...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Persona</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Área / Posición</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Rol en TruHire</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">BR</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Activo</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(p => (
                <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${!p.is_active ? 'opacity-40' : ''}`}>
                  {/* Persona */}
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{p.full_name}</p>
                    <p className="text-xs text-gray-400">{p.email}</p>
                    {p.user_id && (
                      <span className="text-xs text-green-600 font-medium">● en TruHire</span>
                    )}
                  </td>

                  {/* Área / Posición */}
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-700">{p.position ?? '—'}</p>
                    <p className="text-xs text-gray-400">{p.area ?? '—'}</p>
                  </td>

                  {/* Rol */}
                  <td className="px-4 py-3">
                    {p.user_id ? (
                      <select
                        value={p.current_role ?? 'interviewer'}
                        onChange={e => updateUserRole(p.email, p.user_id!, e.target.value)}
                        disabled={saving === p.email}
                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-truora-primary ${ROLE_COLORS[p.current_role ?? 'interviewer']}`}
                      >
                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    ) : (
                      <div>
                        <select
                          value={p.default_role ?? 'interviewer'}
                          onChange={e => updateDirectoryField(p.id, 'default_role', e.target.value)}
                          disabled={saving === p.id}
                          className="text-xs text-gray-500 border border-dashed border-gray-300 rounded px-2 py-1 focus:outline-none"
                          title="Rol que se asignará cuando haga login"
                        >
                          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                        <p className="text-xs text-gray-400 mt-0.5">al ingresar</p>
                      </div>
                    )}
                  </td>

                  {/* Bar Raiser toggle */}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => updateDirectoryField(p.id, 'is_bar_raiser_certified', !p.is_bar_raiser_certified)}
                      disabled={saving === p.id}
                      className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto transition-colors ${
                        p.is_bar_raiser_certified ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                      title={p.is_bar_raiser_certified ? 'Quitar certificación BR' : 'Certificar como BR'}
                    >
                      <svg className="w-4 h-4" fill={p.is_bar_raiser_certified ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
                      </svg>
                    </button>
                  </td>

                  {/* Activo toggle */}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => updateDirectoryField(p.id, 'is_active', !p.is_active)}
                      disabled={saving === p.id}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        p.is_active ? 'bg-truora-primary' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${p.is_active ? 'translate-x-4' : 'translate-x-0'}`}/>
                    </button>
                  </td>

                  {/* Editar */}
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(p)} className="text-xs text-gray-400 hover:text-truora-primary">
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Panel lateral */}
      {showPanel && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/20" onClick={() => setShowPanel(false)}/>
          <div className="w-96 bg-white shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">
                {editingId ? 'Editar persona' : 'Agregar persona'}
              </h2>
              <button onClick={() => setShowPanel(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {[
                { label: 'Nombre completo', field: 'full_name', placeholder: 'Ana García López', required: true },
                { label: 'Email', field: 'email', placeholder: 'ana@truora.com', required: true },
                { label: 'Área', field: 'area', placeholder: 'Product', required: false },
                { label: 'Posición', field: 'position', placeholder: 'Product Manager', required: false },
              ].map(({ label, field, placeholder, required }) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {label} {required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type={field === 'email' ? 'email' : 'text'}
                    value={(form as any)[field]}
                    onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-truora-primary"
                  />
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Rol por defecto</label>
                <select
                  value={form.default_role}
                  onChange={e => setForm(f => ({ ...f, default_role: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-truora-primary"
                >
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_bar_raiser_certified}
                  onChange={e => setForm(f => ({ ...f, is_bar_raiser_certified: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-truora-primary focus:ring-truora-primary"
                />
                <span className="text-sm text-gray-700">Bar Raiser certificado</span>
              </label>

              {formError && <p className="text-sm text-red-600">⚠ {formError}</p>}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving === 'form'}
                className="btn-truora flex-1 disabled:opacity-50"
              >
                {saving === 'form' ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Agregar'}
              </button>
              <button onClick={() => setShowPanel(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
