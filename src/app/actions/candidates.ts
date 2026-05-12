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
  const cvText = formData.get('cv_text') as string || null

  if (!processId || !fullName || !email) {
    throw new Error('Nombre, email y proceso son obligatorios.')
  }

  // Crear o encontrar el candidato por email
  let candidateId: string

  const { data: existing } = await supabase
    .from('candidates')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (existing) {
    candidateId = existing.id
    // Actualizar CV si se proporcionó
    if (cvText) {
      await supabase
        .from('candidates')
        .update({ cv_text: cvText, full_name: fullName, linkedin_url: linkedinUrl })
        .eq('id', candidateId)
    }
  } else {
    const { data: newCandidate, error } = await supabase
      .from('candidates')
      .insert({
        full_name: fullName,
        email: email.toLowerCase().trim(),
        linkedin_url: linkedinUrl,
        cv_text: cvText,
      })
      .select('id')
      .single()

    if (error) throw new Error(error.message)
    candidateId = newCandidate.id
  }

  // Verificar que no esté ya en este proceso
  const { data: existingPC } = await supabase
    .from('process_candidates')
    .select('id')
    .eq('process_id', processId)
    .eq('candidate_id', candidateId)
    .single()

  if (existingPC) {
    throw new Error('Este candidato ya está en el proceso.')
  }

  // Agregar al proceso
  const { error: pcError } = await supabase
    .from('process_candidates')
    .insert({
      process_id: processId,
      candidate_id: candidateId,
      status: 'applied',
    })

  if (pcError) throw new Error(pcError.message)

  revalidatePath(`/processes/${processId}`)
  redirect(`/processes/${processId}`)
}
