import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // En Server Components el set puede fallar — se maneja en middleware
          }
        },
      },
    }
  )
}

/**
 * Verifica si el usuario autenticado está activo en TruHire.
 * Retorna null si el usuario no existe o está desactivado.
 */
export async function getActiveUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('id, role, is_active, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.is_active === false) return null
  return { ...user, profile }
}

// Cliente con service_role (solo para API routes que necesiten bypass de RLS)
export function createServiceClient() {
  const { createClient } = require('@supabase/supabase-js')
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
