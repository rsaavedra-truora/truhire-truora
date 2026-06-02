'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function addCandidateToProcess(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const processId = formData.get('process_id') as string
  const fullName = formData.get('full_name') as string
  const email = formData.get('email') as string
  const linkedinUrl = formData.get('linkedin_url') as string || null

  if (!processId || !fullName || !email) throw new Error('Nombre, email y proceso son obligatorios.')

  let candidateId: string
  const { data: existing } = await supabase.from('candidates').select('id').eq('email', email.toLowerCase().trim()).single()

  if (existing) {
    candidateId = existing.id
  } else {
    const { data: newCandidate, error } = await supabase
      .from('candidates')
      .insert({ full_name: fullName, email: email.toLowerCase().trim(), linkedin_url: linkedinUrl })
      .select('id').single()
    if (error) throw new Error(error.message)
    candidateId = newCandidate.id
  }

  const { data: existingPC } = await supabase
    .from('process_candidates').select('id')
    .eq('process_id', processId).eq('candidate_id', candidateId).single()

  if (existingPC) throw new Error('Este candidato ya está en el proceso.')

  const { error: pcError } = await supabase
    .from('process_candidates')
    .insert({ process_id: processId, candidate_id: candidateId, status: 'applied' })

  if (pcError) throw new Error(pcError.message)

  revalidatePath(`/processes/${processId}`)
  redirect(`/processes/${processId}`)
}

/**
 * Permite al recruiter cambiar el status de un candidato en cualquier momento.
 * El recruiter siempre tiene la última palabra sobre en qué etapa está un candidato.
 */
export async function updateCandidateStatus(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Solo recruiter y head_of_people pueden cambiar el status manualmente
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!['recruiter', 'head_of_people'].includes((profile as any)?.role ?? '')) {
    throw new Error('No tienes permisos para cambiar el estado del candidato.')
  }

  const pcId = formData.get('pc_id') as string
  const newStatus = formData.get('status') as string
  const processId = formData.get('process_id') as string

  const { error } = await supabase
    .from('process_candidates')
    .update({ status: newStatus })
    .eq('id', pcId)

  if (error) throw new Error(error.message)

  // Si se rechaza, actualizar el proceso si ya no quedan candidatos activos
  if (newStatus === 'rejected') {
    const { data: active } = await supabase
      .from('process_candidates')
      .select('id')
      .eq('process_id', processId)
      .not('status', 'in', '("rejected","hired")')

    if (!active?.length) {
      // Todos rechazados — cerrar el proceso
      await supabase.from('processes')
        .update({ status: 'closed_no_hire' })
        .eq('id', processId)
        .eq('status', 'loop') // solo si estaba en loop, no cambiar si ya estaba closed
    }
  }

  revalidatePath(`/processes/${processId}/candidates/${pcId}`)
  redirect(`/processes/${processId}/candidates/${pcId}`)
}
