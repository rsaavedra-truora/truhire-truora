'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function addBenchmark(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const fullName = formData.get('full_name') as string
  const roleAtTruora = formData.get('role_at_truora') as string
  const layer = formData.get('layer') as string || null
  const cvText = formData.get('cv_text') as string || null
  const notes = formData.get('notes') as string || null

  if (!fullName || !roleAtTruora) throw new Error('Nombre y rol son obligatorios.')

  const { error } = await supabase.from('talent_benchmarks').insert({
    full_name: fullName,
    role_at_truora: roleAtTruora,
    layer,
    cv_text: cvText,
    notes,
    added_by: user.id,
    is_active: true,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/settings/calibration')
  redirect('/settings/calibration')
}

export async function toggleBenchmark(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const id = formData.get('id') as string
  const isActive = formData.get('is_active') === 'true'

  await supabase.from('talent_benchmarks').update({ is_active: !isActive }).eq('id', id)

  revalidatePath('/settings/calibration')
}

export async function deleteBenchmark(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  await supabase.from('talent_benchmarks').delete().eq('id', id)
  revalidatePath('/settings/calibration')
}
