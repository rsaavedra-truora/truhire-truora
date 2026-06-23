'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Person {
  id: string
  full_name: string
  email: string
  area: string | null
  position: string | null
  is_bar_raiser_certified: boolean
}

interface Props {
  value: string           // email seleccionado
  onChange: (email: string, person: Person | null) => void
  placeholder?: string
  filterBarRaiser?: boolean  // si true, solo muestra Bar Raisers certificados
  excludeEmails?: string[]   // emails a excluir (ej. ya seleccionados)
  label?: string
  required?: boolean
}

export function PersonSearch({
  value, onChange, placeholder = 'Buscar persona...', filterBarRaiser = false,
  excludeEmails = [], label, required = false,
}: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Person[]>([])
  const [selected, setSelected] = useState<Person | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Cargar persona seleccionada si hay valor inicial
  // IMPORTANTE: usar flag de cancelación para evitar race condition
  // Si el usuario selecciona otra persona antes de que retorne la query async,
  // el resultado viejo no debe sobreescribir la nueva selección
  useEffect(() => {
    let cancelled = false
    if (value && !selected) {
      supabase.from('truora_directory').select('*').eq('email', value).single().then(({ data }) => {
        if (!cancelled && data) { setSelected(data as Person); setQuery(data.full_name) }
      })
    }
    if (!value) { setSelected(null); setQuery('') }
    return () => { cancelled = true }
  }, [value])

  // Cerrar al click fuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        // Si cerró sin seleccionar y hay query, restaurar nombre seleccionado
        if (selected) setQuery(selected.full_name)
        else setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [selected])

  async function search(q: string) {
    setQuery(q)
    setOpen(true)
    if (q.length < 1) { setResults([]); return }
    setLoading(true)
    let req = supabase
      .from('truora_directory')
      .select('*')
      .eq('is_active', true)
      .ilike('full_name', `%${q}%`)
      .order('full_name')
      .limit(8)

    if (filterBarRaiser) req = req.eq('is_bar_raiser_certified', true)

    const { data } = await req
    const filtered = (data as Person[] ?? []).filter(p => !excludeEmails.includes(p.email))
    setResults(filtered)
    setLoading(false)
  }

  function select(person: Person) {
    setSelected(person)
    setQuery(person.full_name)
    setOpen(false)
    onChange(person.email, person)
  }

  function clear() {
    setSelected(null)
    setQuery('')
    onChange('', null)
  }

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => search(e.target.value)}
          onFocus={() => { if (!selected) setOpen(true); if (query.length > 0) search(query) }}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF] pr-8"
        />
        {selected && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      {/* Chip con área cuando hay selección */}
      {selected && (
        <p className="text-xs text-gray-400 mt-1">{selected.position} · {selected.area}</p>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-2.5 text-sm text-gray-400">Buscando...</div>
          ) : results.length === 0 && query.length > 0 ? (
            <div className="px-3 py-2.5 text-sm text-gray-400">No se encontraron resultados</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2.5 text-sm text-gray-400">Escribe para buscar...</div>
          ) : (
            results.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => select(p)}
                className="w-full text-left px-3 py-2.5 hover:bg-gray-50 flex items-center justify-between gap-3 border-b border-gray-50 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.full_name}</p>
                  <p className="text-xs text-gray-400">{p.position} · {p.area}</p>
                </div>
                {p.is_bar_raiser_certified && (
                  <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">BR</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
