import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  console.log('[Layout] user:', user?.id, user?.email)
  console.log('[Layout] userError:', userError)

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  console.log('[Layout] profile:', profile)
  console.log('[Layout] profileError:', profileError)

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar userRole={profile?.role ?? 'interviewer'} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header user={profile} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
