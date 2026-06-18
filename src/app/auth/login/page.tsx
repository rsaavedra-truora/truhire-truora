'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleGoogleLogin() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (error) {
      console.error('Login error:', error.message)
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--truora-bg-canvas)' }}
    >
      <div className="w-full max-w-[400px]">

        {/* Logotipo + título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-5">
            <img
              src="/logo-truora.png"
              alt="Truora"
              className="h-7 w-auto"
              onError={e => {
                const t = e.target as HTMLImageElement
                t.style.display = 'none'
                const fb = t.nextElementSibling as HTMLElement
                if (fb) fb.style.display = 'flex'
              }}
            />
            <div
              className="hidden w-8 h-8 rounded-lg items-center justify-center"
              style={{ background: 'var(--truora-primary)' }}
            >
              <span className="text-white font-bold text-sm">T</span>
            </div>
          </div>

          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--truora-ink)', letterSpacing: '-0.02em' }}
          >
            TruHire
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--truora-ink-muted)' }}>
            Plataforma interna de reclutamiento
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-xl p-7"
          style={{
            background: 'var(--truora-bg)',
            border: '1px solid var(--truora-line)',
            boxShadow: '0 1px 3px rgba(11,16,32,0.06), 0 4px 16px rgba(11,16,32,0.04)',
          }}
        >
          <h2
            className="text-base font-semibold mb-1"
            style={{ color: 'var(--truora-ink)' }}
          >
            Ingresa con tu cuenta Truora
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--truora-ink-muted)' }}>
            Solo cuentas corporativas de Truora tienen acceso a esta plataforma.
          </p>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg
                       font-medium text-sm text-truora-ink transition-colors duration-150
                       bg-truora-bg hover:bg-truora-bg-soft
                       border border-truora-line
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <svg className="animate-spin h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24"
                style={{ color: 'var(--truora-ink-muted)' }}>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {loading ? 'Redirigiendo...' : 'Continuar con Google Workspace'}
          </button>
        </div>

        <p className="text-center text-xs mt-5" style={{ color: 'var(--truora-ink-subtle)' }}>
          TruHire · Uso interno de Truora
        </p>
      </div>
    </div>
  )
}
