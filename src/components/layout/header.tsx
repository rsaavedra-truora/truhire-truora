'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@/lib/types'
import { LogOut, ChevronDown } from 'lucide-react'
import { useState } from 'react'

interface HeaderProps {
  user: User | null
}

export function Header({ user }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : '?'

  return (
    <header className="h-14 bg-white flex items-center justify-between px-6 flex-shrink-0" style={{ borderBottom: '1px solid #E1E5EE' }}>
      {/* Breadcrumb placeholder — se sobreescribe por página */}
      <div id="page-title" />

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-gray-100 transition-colors"
        >
          {/* Avatar */}
          {user?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatar_url}
              alt={user.full_name ?? 'Avatar'}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#0800FF] flex items-center justify-center">
              <span className="text-white text-xs font-semibold">{initials}</span>
            </div>
          )}
          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium text-gray-900 leading-tight">
              {user?.full_name ?? user?.email}
            </p>
            <p className="text-xs text-gray-500 capitalize leading-tight">
              {user?.role?.replace('_', ' ')}
            </p>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <>
            {/* Overlay para cerrar */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
