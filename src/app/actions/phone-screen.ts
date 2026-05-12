'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { sendEmail, phoneScreenInviteEmail } from '@/lib/email'

export async function setupPhoneScreen(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const pcId = formData.get('process_candidate_id') as string
  const principles = formData.getAll('principles') as string[]
  const competencies = formData.getAll('competencies') as string[]
  const calendlyUrl = formData.get('calendly_url') as string || null
  const sendInvite = formData.get('send_invite') === 'true'

  if (principles.length !== 2) throw new Error('Debes seleccionar exactamente 2 principios.')
  if (competencies.filter(c => c.trim()).length === 0) throw new Error('Agrega al menos una competencia a evaluar.')

  // Obtener datos del proceso y candidato
  const { data: pc } = await supabase
    .from('process_candidates')
    .select(`
      id, process_id,
      candidate:candidates(full_name, email),
      process:processes(title, hiring_manager_or_sponsor_id)
    `)
    .eq('id', pcId)
    .single()

  if (!pc) throw new Error('Candidato no encontrado.')

  const proc = pc.process as any
  const candidate = pc.candidate as any
  const hmId = proc?.hiring_manager_or_sponsor_id ?? user.id

  // Crear o actualizar phone screen
  const { error } = await supabase
    .from('phone_screens')
    .upsert(
      {
        process_candidate_id: pcId,
        hm_id: hmId,
        assigned_principles: principles,
        role_competencies: competencies.filter(c => c.trim()),
      },
      { onConflict: 'process_candidate_id' }
    )

  if (error) throw new Error(error.message)

  // Actualizar status
  await supabase
    .from('process_candidates')
    .update({ status: 'phone_screen' })
    .eq('id', pcId)

  await supabase
    .from('process_participants')
    .upsert({ process_id: pc.process_id, user_id: hmId, role_in_process: 'hiring_manager' })

  // Enviar email al candidato si se solicitó y hay Calendly URL
  if (sendInvite && calendlyUrl && candidate?.email) {
    const { data: hm } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', hmId)
      .single()

    const email = phoneScreenInviteEmail({
      candidateName: candidate.full_name,
      roleTitle: proc?.title ?? 'la posición',
      hmName: (hm as any)?.full_name ?? 'el equipo',
      calendlyUrl,
    })

    await sendEmail({ to: candidate.email, ...email })
  }

  revalidatePath(`/processes/${pc.process_id}`)
  redirect(`/processes/${pc.process_id}`)
}

export async function submitPhoneScreenEvaluation(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const pcId = formData.get('process_candidate_id') as string
  const principleNotes: Record<string, string> = {}
  const competencyNotes: Record<string, string> = {}
  const overallSummary = formData.get('overall_summary') as string
  const decision = formData.get('decision') as 'pass' | 'no_pass'

  // Extraer notas por principio y competencia
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('principle_note_')) {
      const principle = key.replace('principle_note_', '')
      principleNotes[principle] = value as string
    }
    if (key.startsWith('competency_note_')) {
      const competency = key.replace('competency_note_', '')
      competencyNotes[competency] = value as string
    }
  }

  const { data: ps } = await supabase
    .from('phone_screens')
    .select('id, process_candidate_id')
    .eq('process_candidate_id', pcId)
    .single()

  if (!ps) throw new Error('Phone screen no encontrado.')

  await supabase
    .from('phone_screens')
    .update({
      principle_notes: principleNotes,
      competency_notes: competencyNotes,
      overall_summary: overallSummary,
      decision,
      completed_at: new Date().toISOString(),
    })
    .eq('id', ps.id)

  // Actualizar status del candidato
  const newStatus = decision === 'pass' ? 'loop' : 'rejected'
  await supabase
    .from('process_candidates')
    .update({ status: newStatus })
    .eq('id', pcId)

  const { data: pc } = await supabase
    .from('process_candidates')
    .select('process_id')
    .eq('id', pcId)
    .single()

  const processId = (pc as any)?.process_id
  revalidatePath(`/processes/${processId}`)

  if (decision === 'pass') {
    redirect(`/processes/${processId}/candidates/${pcId}/loop-setup`)
  } else {
    redirect(`/processes/${processId}/candidates/${pcId}/phone-screen?done=true`)
  }
}
