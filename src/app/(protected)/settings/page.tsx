import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { UserRole } from '@/lib/types'

export const metadata = { title: 'Configuración' }

const ROLE_LABELS: Record<UserRole, string> = {
  head_of_people: 'Head of People',
  recruiter: 'Recruiter',
  hiring_manager: 'Hiring Manager',
  sponsor: 'Sponsor',
  interviewer: 'Entrevistador',
  bar_raiser: 'Bar Raiser',
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()

  if ((profile as any)?.role !== 'head_of_people') redirect('/dashboard')

  const { data: users } = await supabase
    .from('users')
    .select('id, full_name, email, role, is_bar_raiser_certified, is_active, created_at')
    .order('full_name')

  const active = (users ?? []).filter((u: any) => u.is_active !== false)
  const inactive = (users ?? []).filter((u: any) => u.is_active === false)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Gestión de roles, Bar Raisers y acceso del equipo Truora
        </p>
      </div>

      {/* Usuarios activos */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Equipo activo</h2>
            <p className="text-xs text-gray-500 mt-0.5">{active.length} usuarios con acceso a TruHire</p>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Rol global</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Bar Raiser</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Acceso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {active.map((u: any) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-5 py-3.5">
                  <p className="font-medium text-gray-900">{u.full_name ?? '—'}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </td>
                <td className="px-4 py-3.5">
                  <UpdateRoleForm userId={u.id} currentRole={u.role} currentUserId={user.id} />
                </td>
                <td className="px-4 py-3.5">
                  <UpdateBarRaiserForm userId={u.id} isCertified={u.is_bar_raiser_certified} />
                </td>
                <td className="px-4 py-3.5">
                  {u.id !== user.id ? (
                    <ToggleActiveForm userId={u.id} isActive={true} />
                  ) : (
                    <span className="text-xs text-gray-400">Tu cuenta</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Usuarios desactivados */}
      {inactive.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-500">Usuarios desactivados</h2>
            <p className="text-xs text-gray-400 mt-0.5">No pueden hacer login. Su historial se preserva.</p>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {inactive.map((u: any) => (
                <tr key={u.id} className="opacity-60 hover:opacity-100 hover:bg-gray-50">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-gray-900">{u.full_name ?? '—'}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {ROLE_LABELS[u.role as UserRole] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <ToggleActiveForm userId={u.id} isActive={false} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-medium text-gray-600 mb-1">Sobre los roles</p>
        <p className="text-xs text-gray-500 leading-relaxed">
          El rol global determina el acceso por defecto (qué ves en el sidebar). Para participar como Hiring Manager o Entrevistador en un proceso específico, el recruiter te asigna directamente desde el loop o phone screen — no necesitas cambiar el rol global.
        </p>
      </div>
    </div>
  )
}

function UpdateRoleForm({ userId, currentRole, currentUserId }: { userId: string; currentRole: UserRole; currentUserId: string }) {
  if (userId === currentUserId) {
    return <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">{ROLE_LABELS[currentRole]}</span>
  }
  return (
    <form action={async (fd: FormData) => {
      'use server'
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      await supabase.from('users').update({ role: fd.get('role') as UserRole }).eq('id', fd.get('user_id') as string)
    }}>
      <input type="hidden" name="user_id" value={userId} />
      <div className="flex items-center gap-2">
        <select name="role" defaultValue={currentRole}
          className="text-xs px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0800FF]">
          {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <button type="submit"
          className="text-xs px-2.5 py-1 bg-[#0800FF] text-white rounded-lg hover:bg-[#0600CC]">
          Guardar
        </button>
      </div>
    </form>
  )
}

function UpdateBarRaiserForm({ userId, isCertified }: { userId: string; isCertified: boolean }) {
  return (
    <form action={async (fd: FormData) => {
      'use server'
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const certified = fd.get('certified') === 'true'
      await supabase.from('users').update({ is_bar_raiser_certified: certified }).eq('id', fd.get('user_id') as string)
    }}>
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="certified" value={(!isCertified).toString()} />
      <button type="submit"
        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
          isCertified
            ? 'border-green-300 bg-green-50 text-green-700 hover:bg-red-50 hover:text-red-600 hover:border-red-300'
            : 'border-gray-300 text-gray-600 hover:border-[#0800FF] hover:text-[#0800FF]'
        }`}>
        {isCertified ? '✓ Certificado' : 'Certificar'}
      </button>
    </form>
  )
}

function ToggleActiveForm({ userId, isActive }: { userId: string; isActive: boolean }) {
  return (
    <form action={async (fd: FormData) => {
      'use server'
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const active = fd.get('active') === 'true'
      await supabase.from('users').update({ is_active: active }).eq('id', fd.get('user_id') as string)
    }}>
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="active" value={(!isActive).toString()} />
      <button type="submit"
        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
          isActive
            ? 'border-red-200 text-red-600 hover:bg-red-50'
            : 'border-green-300 text-green-700 hover:bg-green-50'
        }`}>
        {isActive ? 'Desactivar' : 'Reactivar'}
      </button>
    </form>
  )
}
