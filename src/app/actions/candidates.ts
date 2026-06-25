'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

/**
 * Elimina un candidato completamente del sistema, incluyendo todos sus registros relacionados.
 */
export async function deleteCandidate(candidateId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  // Verificar permisos
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!['recruiter', 'head_of_people'].includes((profile as any)?.role ?? '')) {
    return { success: false, error: 'No tienes permisos para eliminar candidatos.' }
  }

  // Obtener todos los process_candidates de este candidato
  const { data: pcs } = await supabase
    .from('process_candidates')
    .select('id, process_id')
    .eq('candidate_id', candidateId)

  // Eliminar datos relacionados de cada process_candidate
  if (pcs && pcs.length > 0) {
    for (const pc of pcs) {
      // Eliminar loop y sus dependencias
      const { data: loop } = await supabase.from('loops').select('id').eq('process_candidate_id', pc.id).maybeSingle()
      if (loop) {
        await supabase.from('evaluations').delete().eq('loop_id', loop.id)
        await supabase.from('loop_assignments').delete().eq('loop_id', loop.id)
        await supabase.from('loops').delete().eq('id', loop.id)
      }
      // Eliminar otras dependencias
      await supabase.from('decisions').delete().eq('process_candidate_id', pc.id)
      await supabase.from('screenings').delete().eq('process_candidate_id', pc.id)
      await supabase.from('phone_screens').delete().eq('process_candidate_id', pc.id)
    }
    // Eliminar process_candidates
    await supabase.from('process_candidates').delete().eq('candidate_id', candidateId)
  }

  // Eliminar de talent_pool si existe
  await supabase.from('talent_pool_screenings').delete().eq('candidate_id', candidateId)
  await supabase.from('talent_pool').delete().eq('candidate_id', candidateId)

  // Finalmente eliminar el candidato
  const { error } = await supabase.from('candidates').delete().eq('id', candidateId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/candidates')
  return { success: true }
}

export async function removeCandidateFromProcess(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const pcId = formData.get('pc_id') as string
  const processId = formData.get('process_id') as string

  // Solo se puede eliminar si el candidato está en applied o screening (no ha avanzado)
  const { data: pc } = await supabase
    .from('process_candidates')
    .select('status')
    .eq('id', pcId)
    .eq('process_id', processId)
    .single()

  if (!pc) throw new Error('Candidato no encontrado en este proceso.')

  // Eliminar datos asociados en cascada manual (loop, evaluaciones, etc.)
  if (pc.status === 'loop' || pc.status === 'decision') {
    const { data: loop } = await supabase.from('loops').select('id').eq('process_candidate_id', pcId).maybeSingle()
    if (loop) {
      await supabase.from('evaluations').delete().eq('loop_id', loop.id)
      await supabase.from('loop_assignments').delete().eq('loop_id', loop.id)
      await supabase.from('loops').delete().eq('id', loop.id)
    }
    await supabase.from('decisions').delete().eq('process_candidate_id', pcId)
  }
  await supabase.from('screenings').delete().eq('process_candidate_id', pcId)
  await supabase.from('phone_screens').delete().eq('process_candidate_id', pcId)
  await supabase.from('process_candidates').delete().eq('id', pcId).eq('process_id', processId)

  revalidatePath(`/processes/${processId}`)
  redirect(`/processes/${processId}`)
}

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

  const VALID_STATUSES = ['applied', 'screening', 'phone_screen', 'loop', 'decision', 'hired', 'rejected']
  if (!VALID_STATUSES.includes(newStatus)) throw new Error('Estado no válido.')

  // No permitir cambiar estado de candidatos ya contratados
  const { data: currentPc } = await supabase
    .from('process_candidates').select('status').eq('id', pcId).eq('process_id', processId).single()
  if ((currentPc as any)?.status === 'hired') throw new Error('No se puede cambiar el estado de un candidato ya contratado.')

  // C8: Si se avanza a phone_screen, verificar que existe un screening
  if (newStatus === 'phone_screen') {
    const { data: existingScreening } = await supabase
      .from('screenings')
      .select('id')
      .eq('process_candidate_id', pcId)
      .maybeSingle()
    if (!existingScreening) {
      throw new Error('No se puede avanzar a Manager Screening sin un screening AI previo.')
    }
  }

  // I4: Validar que pcId pertenece realmente a processId
  const { error } = await supabase
    .from('process_candidates')
    .update({ status: newStatus })
    .eq('id', pcId)
    .eq('process_id', processId)

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
