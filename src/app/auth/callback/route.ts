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
      // Verificar que el email es @truora.com (doble verificación además del trigger SQL)
      if (!data.user.email?.endsWith('@truora.com')) {
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
