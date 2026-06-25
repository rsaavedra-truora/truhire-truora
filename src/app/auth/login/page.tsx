'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Users, Briefcase } from 'lucide-react'

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized_domain: 'Tu cuenta no tiene acceso a TruHire. Usa tu correo corporativo de Truora o ZapSign.',
  account_deactivated: 'Tu cuenta está desactivada. Contacta al equipo de People.',
}

function ErrorBanner() {
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')
  const errorMessage = errorParam
    ? ERROR_MESSAGES[errorParam] ?? 'Ocurrió un error al iniciar sesión.'
    : null
  if (!errorMessage) return null
  return (
    <div
      style={{
        marginBottom: 20,
        padding: '14px 16px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--danger-50)',
        border: '1px solid var(--danger-500)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}
    >
      <span style={{ color: 'var(--danger-500)', flexShrink: 0, marginTop: 1 }}>⚠</span>
      <p style={{ margin: 0, font: '0.875rem var(--font-sans)', color: 'var(--danger-700)', lineHeight: 1.5 }}>
        {errorMessage}
      </p>
    </div>
  )
}

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
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        minHeight: '100vh',
      }}
    >
      {/* Form side */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 8%',
          maxWidth: 520,
          margin: '0 auto',
          width: '100%',
          background: 'var(--surface-card)',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40 }}>
          <img
            src="/logo-truora.png"
            alt="Truora"
            style={{ height: 28 }}
            onError={(e) => {
              const t = e.target as HTMLImageElement
              t.style.display = 'none'
            }}
          />
          <span
            style={{
              font: 'var(--weight-medium) 0.6875rem var(--font-sans)',
              letterSpacing: '0.12em',
              color: 'var(--brand)',
            }}
          >
            HIRE
          </span>
        </div>

        <h1
          style={{
            font: 'var(--weight-medium) var(--text-2xl) var(--font-display)',
            letterSpacing: '-0.01em',
            color: 'var(--text-strong)',
            margin: '0 0 8px',
          }}
        >
          Bienvenido de vuelta
        </h1>
        <p
          style={{
            font: '1rem var(--font-sans)',
            color: 'var(--text-muted)',
            margin: '0 0 32px',
          }}
        >
          Ingresa a tu consola de reclutamiento.
        </p>

        <Suspense fallback={null}>
          <ErrorBanner />
        </Suspense>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            width: '100%',
            padding: '14px 20px',
            borderRadius: 'var(--radius-md)',
            border: '1.5px solid var(--border-default)',
            background: 'var(--surface-card)',
            font: 'var(--weight-medium) 0.9375rem var(--font-sans)',
            color: 'var(--text-strong)',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.background = 'var(--surface-sunken)'
              e.currentTarget.style.borderColor = 'var(--border-strong)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--surface-card)'
            e.currentTarget.style.borderColor = 'var(--border-default)'
          }}
        >
          {loading ? (
            <svg
              style={{ width: 20, height: 20, animation: 'spin 1s linear infinite' }}
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          )}
          {loading ? 'Conectando...' : 'Continuar con Google Workspace'}
        </button>

        <p
          style={{
            font: '0.8125rem var(--font-sans)',
            color: 'var(--text-subtle)',
            marginTop: 20,
            textAlign: 'center',
          }}
        >
          Solo cuentas corporativas de Truora tienen acceso
        </p>
      </div>

      {/* Brand side */}
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--midnight)',
        }}
      >
        {/* Background pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `
              radial-gradient(circle at 30% 20%, rgba(60, 26, 234, 0.4) 0%, transparent 50%),
              radial-gradient(circle at 70% 80%, rgba(60, 26, 234, 0.3) 0%, transparent 40%)
            `,
          }}
        />

        {/* Glass cards */}
        <div
          style={{
            position: 'absolute',
            top: 40,
            right: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 18px',
            background: 'rgba(250, 251, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 'var(--radius-md)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-xs)',
              background: 'var(--brand)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircle size={18} color="white" />
          </span>
          <span style={{ font: 'var(--weight-medium) 0.9375rem var(--font-sans)', color: 'white' }}>
            Procesos activos
          </span>
        </div>

        <div
          style={{
            position: 'absolute',
            top: 120,
            left: 60,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 18px',
            background: 'rgba(250, 251, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 'var(--radius-md)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-xs)',
              background: 'var(--success-500)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={18} color="white" />
          </span>
          <span style={{ font: 'var(--weight-medium) 0.9375rem var(--font-sans)', color: 'white' }}>
            +50 candidatos este mes
          </span>
        </div>

        {/* Main glass card */}
        <div
          style={{
            position: 'absolute',
            left: 40,
            right: 40,
            bottom: 40,
            padding: '28px 32px',
            background: 'rgba(250, 251, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 'var(--radius-lg)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div
            style={{
              font: 'var(--weight-medium) 0.6875rem var(--font-sans)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(255, 255, 255, 0.7)',
            }}
          >
            TruHire Console
          </div>
          <h2
            style={{
              font: 'var(--weight-medium) var(--text-xl) var(--font-display)',
              color: 'white',
              margin: '12px 0 0',
              lineHeight: 1.25,
            }}
          >
            El mejor talento, el proceso más ágil
          </h2>
          <p
            style={{
              font: 'var(--weight-light) 0.9375rem var(--font-sans)',
              color: 'rgba(255, 255, 255, 0.85)',
              margin: '12px 0 0',
              lineHeight: 1.5,
            }}
          >
            Gestiona reclutamiento, entrevistas y decisiones de hiring desde un solo lugar.
          </p>

          {/* Stats row */}
          <div
            style={{
              display: 'flex',
              gap: 32,
              marginTop: 24,
              paddingTop: 20,
              borderTop: '1px solid rgba(255, 255, 255, 0.15)',
            }}
          >
            {[
              { label: 'Procesos', value: '12' },
              { label: 'Entrevistas', value: '48' },
              { label: 'Contratados', value: '7' },
            ].map((stat) => (
              <div key={stat.label}>
                <div
                  style={{
                    font: 'var(--weight-medium) var(--text-lg) var(--font-display)',
                    color: 'white',
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    font: '0.8125rem var(--font-sans)',
                    color: 'rgba(255, 255, 255, 0.6)',
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Decorative elements */}
        <div
          style={{
            position: 'absolute',
            top: '35%',
            right: '15%',
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: 'radial-gradient(circle, var(--brand) 0%, transparent 70%)',
            opacity: 0.15,
            filter: 'blur(40px)',
          }}
        />
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
