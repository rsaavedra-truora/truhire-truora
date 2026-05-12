'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function createProcess(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const title = formData.get('title') as string
  const entry_mode = formData.get('entry_mode') as string
  const capa_intencional = formData.get('capa_intencional') as string
  const role_slug = (formData.get('role_slug') as string)?.trim().toLowerCase().replace(/\s+/g, '-') || null
  const role_description = formData.get('role_description') as string || null

  if (!title || !entry_mode || !capa_intencional) throw new Error('Faltan campos obligatorios')

  const { data: process, error } = await supabase
    .from('processes')
    .insert({ title, entry_mode, capa_intencional, role_slug, role_description, recruiter_id: user.id, status: 'open' })
    .select()
    .single()

  if (error) throw new Error(error.message)

  await supabase.from('process_participants').insert({ process_id: process.id, user_id: user.id, role_in_process: 'recruiter' })

  revalidatePath('/processes')
  redirect(`/processes/${process.id}`)
}

export async function updateProcess(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const processId = formData.get('process_id') as string
  const title = formData.get('title') as string
  const entry_mode = formData.get('entry_mode') as string
  const capa_intencional = formData.get('capa_intencional') as string
  const role_slug = (formData.get('role_slug') as string)?.trim().toLowerCase().replace(/\s+/g, '-') || null
  const role_description = formData.get('role_description') as string || null

  if (!title || !entry_mode || !capa_intencional) throw new Error('Faltan campos obligatorios')

  const { error } = await supabase
    .from('processes')
    .update({ title, entry_mode, capa_intencional, role_slug, role_description })
    .eq('id', processId)

  if (error) throw new Error(error.message)

  revalidatePath(`/processes/${processId}`)
  redirect(`/processes/${processId}`)
}

export async function closeProcess(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const processId = formData.get('process_id') as string
  const reason = formData.get('reason') as 'closed_hire' | 'closed_no_hire' | null

  const { error } = await supabase
    .from('processes')
    .update({ status: reason ?? 'closed_no_hire', closed_at: new Date().toISOString() })
    .eq('id', processId)

  if (error) throw new Error(error.message)

  revalidatePath('/processes')
  revalidatePath(`/processes/${processId}`)
  redirect('/processes')
}
