'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addReference(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const candidateId = formData.get('candidate_id') as string
  const processId = formData.get('process_id') as string
  const referenceName = formData.get('reference_name') as string
  const referenceRelationship = formData.get('reference_relationship') as string
  const scoreRaw = formData.get('score') as string
  const performance90Days = formData.get('performance_90_days') as string
  const wouldVouch = formData.get('would_vouch') as string
  const achievement12Months = formData.get('achievement_12_months') as string

  if (!referenceName) throw new Error('El nombre de la referencia es obligatorio')

  const { error } = await supabase.from('candidate_references').insert({
    candidate_id: candidateId,
    process_id: processId,
    reference_name: referenceName,
    reference_relationship: referenceRelationship || null,
    score: scoreRaw ? parseInt(scoreRaw) : null,
    performance_90_days: performance90Days || null,
    would_vouch: wouldVouch || null,
    achievement_12_months: achievement12Months || null,
    added_by: user.id,
  })

  if (error) throw new Error(error.message)

  revalidatePath(`/processes/${processId}/candidates`)
}
