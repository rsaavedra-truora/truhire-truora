import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresca la sesión (imprescindible para SSR)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Rutas públicas que no requieren auth
  const publicPaths = [
    '/auth/login',
    '/auth/callback',
    '/apply',     // careers.truora.com/apply/...
    '/api/apply', // endpoint público para recibir candidatos
  ]

  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p))

  // Si no hay sesión y no es ruta pública → redirigir al login
  if (!user && !isPublicPath) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/auth/login'
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Si hay sesión verificar que el usuario esté activo en TruHire
  if (user && !isPublicPath) {
    const { data: profile } = await supabase
      .from('users')
      .select('id, is_active')
      .eq('id', user.id)
      .maybeSingle()

    if (profile && profile.is_active === false) {
      // Usuario desactivado — cerrar sesión y redirigir
      await supabase.auth.signOut()
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/auth/login'
      loginUrl.searchParams.set('error', 'account_deactivated')
      return NextResponse.redirect(loginUrl)
    }

    // Si el usuario está autenticado pero no tiene perfil en public.users,
    // crearlo ahora para evitar el loop
    if (!profile) {
      await supabase.from('users').upsert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? '',
        avatar_url: user.user_metadata?.avatar_url ?? null,
        role: 'head_of_people',
        is_active: true,
      }, { onConflict: 'id', ignoreDuplicates: true })
    }

    // Backfill: si hay loop_assignments o loops con pending_email igual al email
    // del usuario que acaba de entrar, asignarle su ID real ahora
    if (user.email) {
      await supabase
        .from('loop_assignments')
        .update({ interviewer_id: user.id, pending_email: null })
        .eq('pending_email', user.email)
        .is('interviewer_id', null)

      await supabase
        .from('loops')
        .update({ bar_raiser_id: user.id, bar_raiser_pending_email: null })
        .eq('bar_raiser_pending_email', user.email)
        .is('bar_raiser_id', null)
    }
  }

  // Si hay sesión y está en /auth/login → redirigir al dashboard
  if (user && pathname === '/auth/login') {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = '/dashboard'
    return NextResponse.redirect(dashboardUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Aplica el middleware solo a rutas de página (no API).
     * Las API routes manejan su propia autenticación internamente.
     * Excluye: _next/*, favicon, imágenes, y todas las rutas /api/*
     */
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
