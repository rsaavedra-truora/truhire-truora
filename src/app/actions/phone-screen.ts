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

  // Notificar al HM si es diferente al recruiter actual
  if (hmId !== user.id) {
    const { data: hm } = await supabase.from('users').select('email, full_name').eq('id', hmId).single()
    if ((hm as any)?.email) {
      const psUrl = `${process.env.NEXT_PUBLIC_APP_URL}/processes/${pc.process_id}/candidates/${pcId}/phone-screen`
      await sendEmail({
        to: (hm as any).email,
        subject: `Tienes un phone screen asignado — ${proc?.title}`,
        html: `
<div style="font-family: Inter, system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #0B1020;">
  <div style="margin-bottom: 24px;"><div style="width: 32px; height: 32px; background: #0800FF; border-radius: 7px; display: inline-flex; align-items: center; justify-content: center;"><span style="color: white; font-weight: 700; font-size: 14px;">T</span></div></div>
  <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 8px;">Hola ${(hm as any).full_name?.split(' ')[0]},</h1>
  <p style="font-size: 15px; color: #4A5374; line-height: 1.6; margin: 0 0 24px;">
    Tienes un <strong style="color: #0B1020;">phone screen asignado</strong> para el proceso de <strong style="color: #0B1020;">${proc?.title}</strong>. Realiza la entrevista y completa tu evaluación en TruHire.
  </p>
  <a href="${psUrl}" style="display: inline-block; background: #0800FF; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px;">Ir a mi evaluación →</a>
  <p style="font-size: 13px; color: #8892A6; margin-top: 32px;">— TruHire · Truora</p>
</div>`,
      })
    }
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

  // Extraer notas y ratings por principio
  const ratings: Record<string, string> = {}
  for (const [key, value] of Array.from(formData.entries())) {
    if (key.startsWith('principle_note_')) {
      const principle = key.replace('principle_note_', '')
      principleNotes[principle] = value as string
    }
    if (key.startsWith('competency_note_')) {
      const competency = key.replace('competency_note_', '')
      competencyNotes[competency] = value as string
    }
    if (key.startsWith('rating_')) {
      const principle = key.replace('rating_', '')
      ratings[principle] = value as string
    }
  }

  // Extraer preguntas seleccionadas por principio
  const questions: Record<string, string> = {}
  for (const [key, value] of Array.from(formData.entries())) {
    if (key.startsWith('question_')) {
      questions[key.replace('question_', '')] = value as string
    }
  }

  // Combinar notas + rating + pregunta en el JSONB
  const allSlugs = new Set([...Object.keys(principleNotes), ...Object.keys(ratings), ...Object.keys(questions)])
  const combinedPrincipleNotes: Record<string, { notes: string; rating: string | null; question: string | null }> = {}
  allSlugs.forEach(slug => {
    combinedPrincipleNotes[slug] = {
      notes: principleNotes[slug] ?? '',
      rating: ratings[slug] ?? null,
      question: questions[slug] ?? null,
    }
  })

  const { data: ps } = await supabase
    .from('phone_screens')
    .select('id, process_candidate_id')
    .eq('process_candidate_id', pcId)
    .single()

  if (!ps) throw new Error('Phone screen no encontrado.')

  await supabase
    .from('phone_screens')
    .update({
      principle_notes: combinedPrincipleNotes,
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
