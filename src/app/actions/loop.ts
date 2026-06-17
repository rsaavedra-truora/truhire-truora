'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email'

export async function createLoop(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const pcId            = formData.get('process_candidate_id') as string
  const barRaiserId     = formData.get('bar_raiser_id') as string | null     // puede ser null
  const barRaiserEmail  = formData.get('bar_raiser_email') as string | null  // fallback
  const scheduledAt     = formData.get('scheduled_at') as string || null
  const interviewerIds  = formData.getAll('interviewer_ids') as string[]     // puede contener 'null'
  const interviewerEmails = formData.getAll('interviewer_emails') as string[]

  if (interviewerEmails.filter(Boolean).length < 2) throw new Error('El loop requiere al menos 2 entrevistadores.')
  if (!barRaiserId && !barRaiserEmail) throw new Error('Debes asignar un Bar Raiser.')

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

  // Resolver Bar Raiser: intentar una última vez si no tenemos ID
  let resolvedBrId = barRaiserId || null
  if (!resolvedBrId && barRaiserEmail) {
    const { data: brUser } = await supabase.from('users').select('id').eq('email', barRaiserEmail).maybeSingle()
    resolvedBrId = brUser?.id ?? null
  }

  // Crear el loop — bar_raiser_id puede ser null si aún no ha hecho login
  const { data: loop, error: loopError } = await supabase
    .from('loops')
    .upsert(
      {
        process_candidate_id: pcId,
        bar_raiser_id: resolvedBrId,                    // null si pendiente
        bar_raiser_pending_email: resolvedBrId ? null : barRaiserEmail,
        scheduled_at: scheduledAt || null,
        status: 'open',
      },
      { onConflict: 'process_candidate_id' }
    )
    .select()
    .single()

  if (loopError) throw new Error(loopError.message)

  // Crear assignments por entrevistador
  for (let i = 0; i < interviewerEmails.length; i++) {
    const email = interviewerEmails[i]
    if (!email) continue

    // Intentar resolver ID (puede ya venir del front, o intentar de nuevo)
    let uid = interviewerIds[i] && interviewerIds[i] !== 'null' ? interviewerIds[i] : null
    if (!uid) {
      const { data: u } = await supabase.from('users').select('id').eq('email', email).maybeSingle()
      uid = u?.id ?? null
    }

    const principles = uid
      ? formData.getAll(`principles_${uid}`) as string[]
      : formData.getAll(`principles_${email}`) as string[]

    if (principles.length < 2) continue

    await supabase
      .from('loop_assignments')
      .upsert(
        {
          loop_id: loop.id,
          interviewer_id: uid,                // null si no ha hecho login
          pending_email: uid ? null : email,  // guardar email para backfill en login
          principles,
        },
        { onConflict: uid ? 'loop_id,interviewer_id' : 'loop_id,pending_email' }
      )

    // Agregar como participante solo si ya tenemos el ID
    if (uid) {
      await supabase
        .from('process_participants')
        .upsert(
          { process_id: pc.process_id, user_id: uid, role_in_process: 'interviewer' },
          { onConflict: 'process_id,user_id' }
        )
    }

    // Obtener nombre del directorio para el email de notificación
    const { data: dirPerson } = await supabase
      .from('truora_directory')
      .select('full_name')
      .eq('email', email)
      .maybeSingle()

    const interviewerName = (dirPerson as any)?.full_name ?? email.split('@')[0]
    const interviewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/interview/${loop.id}`

    await sendEmail({
      to: email,
      subject: `Tienes una entrevista asignada — ${(pc.process as any)?.title}`,
      html: `
<div style="font-family: Inter, system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #0B1020;">
  <div style="margin-bottom: 24px;">
    <div style="width: 32px; height: 32px; background: #0800FF; border-radius: 7px; display: inline-flex; align-items: center; justify-content: center;">
      <span style="color: white; font-weight: 700; font-size: 14px;">T</span>
    </div>
  </div>
  <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 8px;">Hola ${interviewerName.split(' ')[0]},</h1>
  <p style="font-size: 15px; color: #4A5374; line-height: 1.6; margin: 0 0 16px;">
    Quedaste asignado como entrevistador en el proceso de
    <strong style="color: #0B1020;">${(pc.process as any)?.title}</strong>.
    Tu evaluación cubre los principios asignados específicamente para ti.
  </p>
  <p style="font-size: 15px; color: #4A5374; line-height: 1.6; margin: 0 0 24px;">
    Ingresa a TruHire con tu cuenta <strong>@truora.com</strong> para ver tu entrevista:
  </p>
  <a href="${interviewUrl}"
     style="display: inline-block; background: #0800FF; color: white; text-decoration: none;
            padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px;">
    Ver mi entrevista →
  </a>
  <p style="font-size: 13px; color: #8892A6; margin-top: 32px;">— TruHire · Truora</p>
</div>`,
    })
  }

  // Bar Raiser como participante (si ya tiene ID)
  if (resolvedBrId) {
    await supabase
      .from('process_participants')
      .upsert(
        { process_id: pc.process_id, user_id: resolvedBrId, role_in_process: 'bar_raiser' },
        { onConflict: 'process_id,user_id' }
      )
  }

  // Notificar al Bar Raiser — usar email del directorio si no tiene ID aún
  const brContactEmail = barRaiserEmail ?? (resolvedBrId
    ? (await supabase.from('users').select('email').eq('id', resolvedBrId).single()).data?.email
    : null)

  if (brContactEmail) {
    const { data: brDir } = await supabase.from('truora_directory').select('full_name').eq('email', brContactEmail).maybeSingle()
    const brName = (brDir as any)?.full_name ?? brContactEmail.split('@')[0]
    const debriefUrl = `${process.env.NEXT_PUBLIC_APP_URL}/processes/${pc.process_id}/candidates/${pcId}/debrief`

    await sendEmail({
      to: brContactEmail,
      subject: `Fuiste asignado como Bar Raiser — ${(pc.process as any)?.title}`,
      html: `
<div style="font-family: Inter, system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #0B1020;">
  <div style="margin-bottom: 24px;">
    <div style="width: 32px; height: 32px; background: #0800FF; border-radius: 7px; display: inline-flex; align-items: center; justify-content: center;">
      <span style="color: white; font-weight: 700; font-size: 14px;">T</span>
    </div>
  </div>
  <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 8px;">Hola ${brName.split(' ')[0]},</h1>
  <p style="font-size: 15px; color: #4A5374; line-height: 1.6; margin: 0 0 16px;">
    Fuiste asignado como <strong style="color: #0B1020;">Bar Raiser</strong> en el proceso de
    <strong style="color: #0B1020;">${(pc.process as any)?.title}</strong>.
  </p>
  <p style="font-size: 14px; color: #4A5374; line-height: 1.6; margin: 0 0 24px;">
    Una vez que los entrevistadores completen sus evaluaciones, podrás acceder al debrief y tomar la decisión final.
    Tu identidad como Bar Raiser es confidencial.
  </p>
  <a href="${debriefUrl}" style="display: inline-block; background: #0800FF; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px;">
    Ver debrief →
  </a>
  <p style="font-size: 13px; color: #8892A6; margin-top: 32px;">— TruHire · Truora</p>
</div>`,
    })
  }

  // Actualizar status
  await supabase.from('processes').update({ status: 'loop' }).eq('id', pc.process_id)
  await supabase.from('process_candidates').update({ status: 'loop' }).eq('id', pcId)

  revalidatePath(`/processes/${pc.process_id}`)
  redirect(`/processes/${pc.process_id}/candidates/${pcId}`)
}
