import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Verificar que el email pertenece a un dominio corporativo permitido
      const ALLOWED_DOMAINS = ['truora.com', 'zapsign.com.br']
      const emailDomain = data.user.email?.split('@')[1] ?? ''
      if (!ALLOWED_DOMAINS.includes(emailDomain)) {
        await supabase.auth.signOut()
        return NextResponse.redirect(
          `${origin}/auth/login?error=unauthorized_domain`
        )
      }

      // Todo OK → redirigir al destino
      const redirectUrl = new URL(redirect, origin)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Error en el callback → volver al login
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_error`)
}
