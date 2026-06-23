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

      // Sincronizar login_email en truora_directory para resolver multi-email
      // Si la persona tiene otro email en el directorio, guardamos con cuál entró a TruHire
      const loginEmail = data.user.email!
      const { data: dirEntry } = await supabase
        .from('truora_directory')
        .select('id, login_email')
        .ilike('email', loginEmail)
        .maybeSingle()

      if (!dirEntry) {
        // No encontrado por email principal → buscar si ya tiene login_email registrado
        // (caso donde alguien tiene rodrigo@truora.com en directorio pero entra con rsaavedra@truora.com)
        const { data: byLoginEmail } = await supabase
          .from('truora_directory')
          .select('id')
          .ilike('login_email', loginEmail)
          .maybeSingle()

        if (!byLoginEmail) {
          // Nuevo: intentar match por nombre desde users (best effort, no bloquea)
          // Si no hay match, simplemente no se sincroniza — no es un error crítico
        }
      } else if (dirEntry.login_email !== loginEmail) {
        // Actualizar login_email si cambió o no estaba registrado
        await supabase
          .from('truora_directory')
          .update({ login_email: loginEmail })
          .eq('id', dirEntry.id)
      }

      // Todo OK → redirigir al destino
      const redirectUrl = new URL(redirect, origin)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Error en el callback → volver al login
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_error`)
}
