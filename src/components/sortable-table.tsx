'use client'

import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, X } from 'lucide-react'

export type Column<T> = {
  key: string
  label: string
  sortable?: boolean
  filterable?: boolean
  filterOptions?: { value: string; label: string }[]
  render: (row: T) => React.ReactNode
  searchable?: boolean // incluir en búsqueda global de texto
  getValue?: (row: T) => string // valor para búsqueda/sort
}

interface Props<T> {
  data: T[]
  columns: Column<T>[]
  emptyMessage?: string
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
}

export function SortableTable<T>({ data, columns, emptyMessage = 'Sin datos.', rowKey, onRowClick }: Props<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')

  function handleSort(key: string) {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc')
      else { setSortKey(null); setSortDir('asc') }
    } else {
      setSortKey(key); setSortDir('asc')
    }
  }

  function setFilter(key: string, value: string) {
    setFilters(prev => value ? { ...prev, [key]: value } : Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key)))
  }

  const activeFilters = Object.keys(filters).length
  const hasSearch = search.trim().length > 0

  const filtered = useMemo(() => {
    let rows = [...data]

    // Búsqueda global
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(row =>
        columns.filter(c => c.searchable && c.getValue).some(c => c.getValue!(row).toLowerCase().includes(q))
      )
    }

    // Filtros por columna
    Object.entries(filters).forEach(([key, value]) => {
      const col = columns.find(c => c.key === key)
      if (col?.getValue) {
        rows = rows.filter(row => col.getValue!(row) === value)
      }
    })

    // Sort
    if (sortKey) {
      const col = columns.find(c => c.key === sortKey)
      if (col?.getValue) {
        rows.sort((a, b) => {
          const va = col.getValue!(a).toLowerCase()
          const vb = col.getValue!(b).toLowerCase()
          return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
        })
      }
    }

    return rows
  }, [data, search, filters, sortKey, sortDir])

  const searchableCols = columns.filter(c => c.searchable)
  const filterableCols = columns.filter(c => c.filterable && c.filterOptions)

  return (
    <div>
      {/* Controls bar */}
      {(searchableCols.length > 0 || filterableCols.length > 0) && (
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3 flex-wrap" style={{ background: '#FAFAFA' }}>
          {/* Search */}
          {searchableCols.length > 0 && (
            <div className="relative flex-shrink-0">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="pl-7 pr-7 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#0800FF] focus:border-[#0800FF] w-48"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {/* Filter dropdowns */}
          {filterableCols.map(col => (
            <div key={col.key} className="relative flex-shrink-0">
              <select
                value={filters[col.key] ?? ''}
                onChange={e => setFilter(col.key, e.target.value)}
                className={`text-xs border rounded-lg px-3 py-1.5 pr-7 focus:outline-none focus:ring-1 focus:ring-[#0800FF] appearance-none cursor-pointer ${
                  filters[col.key]
                    ? 'border-[#0800FF] bg-[#E5E4FF] text-[#0800FF] font-medium'
                    : 'border-gray-200 bg-white text-gray-600'
                }`}
              >
                <option value="">{col.label}: Todos</option>
                {col.filterOptions!.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
            </div>
          ))}

          {/* Clear filters */}
          {(activeFilters > 0 || hasSearch) && (
            <button
              onClick={() => { setFilters({}); setSearch('') }}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 ml-1"
            >
              <X size={11} /> Limpiar
            </button>
          )}

          <span className="ml-auto text-xs text-gray-400">
            {filtered.length === data.length ? `${data.length} filas` : `${filtered.length} de ${data.length}`}
          </span>
        </div>
      )}

      {/* Table */}
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100" style={{ background: '#FAFAFA' }}>
            {columns.map(col => (
              <th key={col.key} className="text-left px-5 py-3">
                {col.sortable ? (
                  <button
                    onClick={() => handleSort(col.key)}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-400 uppercase hover:text-gray-700 transition-colors group"
                    style={{ letterSpacing: '0.06em' }}
                  >
                    {col.label}
                    <span className={`transition-colors ${sortKey === col.key ? 'text-[#0800FF]' : 'text-gray-300 group-hover:text-gray-500'}`}>
                      {sortKey === col.key
                        ? sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                        : <ChevronsUpDown size={12} />
                      }
                    </span>
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-gray-400 uppercase" style={{ letterSpacing: '0.06em' }}>{col.label}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!filtered.length ? (
            <tr>
              <td colSpan={columns.length} className="px-5 py-12 text-center text-sm text-gray-400 italic">
                {activeFilters > 0 || hasSearch ? 'Sin resultados para los filtros aplicados.' : emptyMessage}
              </td>
            </tr>
          ) : (
            filtered.map((row, i) => (
              <tr
                key={rowKey(row)}
                className={`border-b border-gray-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''} hover:bg-blue-50/20`}
                style={i === filtered.length - 1 ? { borderBottom: 'none' } : {}}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map(col => (
                  <td key={col.key} className="px-5 py-4">{col.render(row)}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
