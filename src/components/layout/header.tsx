'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@/lib/types'
import { LogOut, Bell, Search } from 'lucide-react'
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
    <header
      style={{
        height: 68,
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--surface-card)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '0 24px',
        flexShrink: 0,
      }}
    >
      {/* Page title placeholder */}
      <div id="page-title" style={{ flex: 1 }} />

      {/* Search */}
      <div
        style={{
          position: 'relative',
          width: 280,
        }}
      >
        <Search
          size={18}
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-subtle)',
            pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          placeholder="Buscar procesos, candidatos…"
          style={{
            width: '100%',
            height: 40,
            paddingLeft: 40,
            paddingRight: 14,
            border: '1.5px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface-card)',
            font: '0.875rem var(--font-sans)',
            color: 'var(--text-body)',
            outline: 'none',
            transition: 'border-color 150ms ease',
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = 'var(--brand)'}
          onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
        />
      </div>

      {/* Notifications */}
      <button
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: 'var(--radius-sm)',
          border: 'none',
          background: 'transparent',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          transition: 'background 120ms ease',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-sunken)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <Bell size={20} />
      </button>

      {/* User menu */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 10px 6px 6px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            transition: 'background 120ms ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-sunken)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          {/* Avatar */}
          <div style={{ position: 'relative' }}>
            {user?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatar_url}
                alt={user.full_name ?? 'Avatar'}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'var(--brand)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ color: 'white', fontSize: '0.8125rem', fontWeight: 500 }}>{initials}</span>
              </div>
            )}
            {/* Online indicator */}
            <span
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: 'var(--success-500)',
                border: '2px solid var(--surface-card)',
              }}
            />
          </div>
          <div style={{ textAlign: 'left' }}>
            <p
              style={{
                margin: 0,
                font: 'var(--weight-medium) 0.875rem var(--font-sans)',
                color: 'var(--text-strong)',
                lineHeight: 1.3,
              }}
            >
              {user?.full_name ?? user?.email?.split('@')[0]}
            </p>
            <p
              style={{
                margin: 0,
                font: '0.75rem var(--font-sans)',
                color: 'var(--text-muted)',
                textTransform: 'capitalize',
                lineHeight: 1.3,
              }}
            >
              {user?.role?.replace('_', ' ')}
            </p>
          </div>
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 10 }}
              onClick={() => setMenuOpen(false)}
            />
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 6px)',
                width: 220,
                background: 'var(--surface-card)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border-subtle)',
                padding: '6px 0',
                zIndex: 20,
                animation: 'fadeIn 150ms ease',
              }}
            >
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
                <p style={{ margin: 0, font: '0.8125rem var(--font-sans)', color: 'var(--text-muted)' }}>
                  {user?.email}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  border: 'none',
                  background: 'transparent',
                  font: '0.875rem var(--font-sans)',
                  color: 'var(--danger-500)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 100ms ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--danger-50)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <LogOut size={16} />
                Cerrar sesión
              </button>
            </div>
          </>
        )}
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </header>
  )
}
