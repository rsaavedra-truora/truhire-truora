'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email'

export async function createLoop(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const pcId = formData.get('process_candidate_id') as string
  const barRaiserId = formData.get('bar_raiser_id') as string
  const scheduledAt = formData.get('scheduled_at') as string || null
  const interviewerIds = formData.getAll('interviewer_ids') as string[]

  if (interviewerIds.length < 2) throw new Error('El loop requiere al menos 2 entrevistadores.')
  if (!barRaiserId) throw new Error('Debes asignar un Bar Raiser.')

  const { data: pc } = await supabase
    .from('process_candidates')
    .select(`
      id, process_id,
      candidate:candidates(full_name, email),
      process:processes(title, capa_intencional)
    `)
    .eq('id', pcId)
    .single()

  if (!pc) throw new Error('Candidato no encontrado.')

  // Crear el loop
  const { data: loop, error: loopError } = await supabase
    .from('loops')
    .upsert(
      {
        process_candidate_id: pcId,
        bar_raiser_id: barRaiserId,
        scheduled_at: scheduledAt || null,
        status: 'open',
      },
      { onConflict: 'process_candidate_id' }
    )
    .select()
    .single()

  if (loopError) throw new Error(loopError.message)

  // Crear assignments por entrevistador
  for (const interviewerId of interviewerIds) {
    const principles = formData.getAll(`principles_${interviewerId}`) as string[]
    if (principles.length < 2) continue

    await supabase
      .from('loop_assignments')
      .upsert(
        { loop_id: loop.id, interviewer_id: interviewerId, principles },
        { onConflict: 'loop_id,interviewer_id' }
      )

    // Agregar como participante del proceso
    await supabase
      .from('process_participants')
      .upsert(
        { process_id: pc.process_id, user_id: interviewerId, role_in_process: 'interviewer' },
        { onConflict: 'process_id,user_id' }
      )

    // Enviar email al entrevistador
    const { data: interviewer } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', interviewerId)
      .single()

    if ((interviewer as any)?.email) {
      const interviewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/interview/${loop.id}`
      await sendEmail({
        to: (interviewer as any).email,
        subject: `Tienes una entrevista asignada — ${(pc.process as any)?.title}`,
        html: `
<div style="font-family: Inter, system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #0B1020;">
  <div style="margin-bottom: 24px;">
    <div style="width: 32px; height: 32px; background: #0800FF; border-radius: 7px; display: inline-flex; align-items: center; justify-content: center;">
      <span style="color: white; font-weight: 700; font-size: 14px;">T</span>
    </div>
  </div>
  <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 8px;">Hola ${(interviewer as any).full_name?.split(' ')[0]},</h1>
  <p style="font-size: 15px; color: #4A5374; line-height: 1.6; margin: 0 0 16px;">
    Quedaste asignado como entrevistador en el proceso de
    <strong style="color: #0B1020;">${(pc.process as any)?.title}</strong>.
    Tu evaluación cubre los principios asignados específicamente para ti.
  </p>
  <p style="font-size: 15px; color: #4A5374; line-height: 1.6; margin: 0 0 24px;">
    Los principios que evalúas, las señales de referencia y el espacio para tomar notas están en TruHire:
  </p>
  <a href="${interviewUrl}"
     style="display: inline-block; background: #0800FF; color: white; text-decoration: none;
            padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px;">
    Ver mi entrevista →
  </a>
  <p style="font-size: 13px; color: #8892A6; margin-top: 32px;">
    — TruHire · Truora
  </p>
</div>`,
      })
    }
  }

  // Agregar Bar Raiser como participante
  await supabase
    .from('process_participants')
    .upsert(
      { process_id: pc.process_id, user_id: barRaiserId, role_in_process: 'bar_raiser' },
      { onConflict: 'process_id,user_id' }
    )

  // Notificar al Bar Raiser que fue asignado a este proceso
  const { data: barRaiser } = await supabase
    .from('users')
    .select('full_name, email')
    .eq('id', barRaiserId)
    .single()

  if ((barRaiser as any)?.email) {
    const debriefUrl = `${process.env.NEXT_PUBLIC_APP_URL}/processes/${pc.process_id}/candidates/${pcId}/debrief`
    await sendEmail({
      to: (barRaiser as any).email,
      subject: `Fuiste asignado como Bar Raiser — ${(pc.process as any)?.title}`,
      html: `
<div style="font-family: Inter, system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #0B1020;">
  <div style="margin-bottom: 24px;">
    <div style="width: 32px; height: 32px; background: #0800FF; border-radius: 7px; display: inline-flex; align-items: center; justify-content: center;">
      <span style="color: white; font-weight: 700; font-size: 14px;">T</span>
    </div>
  </div>
  <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 8px;">Hola ${(barRaiser as any).full_name?.split(' ')[0]},</h1>
  <p style="font-size: 15px; color: #4A5374; line-height: 1.6; margin: 0 0 16px;">
    Fuiste asignado como <strong style="color: #0B1020;">Bar Raiser</strong> en el proceso de
    <strong style="color: #0B1020;">${(pc.process as any)?.title}</strong>.
  </p>
  <p style="font-size: 14px; color: #4A5374; line-height: 1.6; margin: 0 0 24px;">
    Una vez que los entrevistadores completen sus evaluaciones, podrás acceder al debrief y tomar la decisión final. Tu identidad como Bar Raiser es confidencial.
  </p>
  <a href="${debriefUrl}" style="display: inline-block; background: #0800FF; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px;">
    Ver debrief →
  </a>
  <p style="font-size: 13px; color: #8892A6; margin-top: 32px;">— TruHire · Truora</p>
</div>`,
    })
  }

  // Actualizar status del proceso
  await supabase
    .from('processes')
    .update({ status: 'loop' })
    .eq('id', pc.process_id)

  await supabase
    .from('process_candidates')
    .update({ status: 'loop' })
    .eq('id', pcId)

  revalidatePath(`/processes/${pc.process_id}`)
  redirect(`/processes/${pc.process_id}/candidates/${pcId}`)
}
