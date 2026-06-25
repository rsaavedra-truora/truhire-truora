'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email'

export async function submitDecision(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const pcId       = formData.get('process_candidate_id') as string
  const outcome    = formData.get('outcome') as 'hire' | 'no_hire' | 'hire_other_capa'
  const justification = formData.get('justification') as string
  const altCapa    = formData.get('alternative_capa') as string || null

  if (!outcome || !justification?.trim()) throw new Error('Faltan campos obligatorios.')

  // Verificar que el usuario es Bar Raiser certificado
  const { data: barRaiser } = await supabase
    .from('users')
    .select('is_bar_raiser_certified, full_name')
    .eq('id', user.id)
    .single()

  if (!(barRaiser as any)?.is_bar_raiser_certified) {
    throw new Error('Solo un Bar Raiser certificado puede tomar esta decisión.')
  }

  // Guardar la decisión
  const { error } = await supabase.from('decisions').upsert(
    {
      process_candidate_id: pcId,
      bar_raiser_id: user.id,
      outcome,
      justification,
      alternative_capa: altCapa || null,
      decided_at: new Date().toISOString(),
    },
    { onConflict: 'process_candidate_id' }
  )
  if (error) throw new Error(error.message)

  // Actualizar status del candidato y proceso
  const newCandidateStatus = outcome === 'hire' ? 'hired' : 'rejected'
  await supabase.from('process_candidates').update({ status: newCandidateStatus }).eq('id', pcId)

  const { data: pc } = await supabase
    .from('process_candidates')
    .select('process_id, candidate:candidates(full_name, email)')
    .eq('id', pcId)
    .single()

  const processId = (pc as any)?.process_id
  const candidateName = (pc as any)?.candidate?.full_name ?? 'el candidato'

  // C6: Solo cerrar el proceso si no quedan candidatos activos
  // Un hire siempre cierra el proceso (encontramos a nuestra persona)
  // Un no_hire solo cierra si ya no hay nadie más en evaluación
  if (outcome === 'hire') {
    await supabase.from('processes')
      .update({ status: 'closed_hire', closed_at: new Date().toISOString() })
      .eq('id', processId)
  } else {
    const { data: stillActive } = await supabase
      .from('process_candidates')
      .select('id')
      .eq('process_id', processId)
      .not('status', 'in', '("rejected","hired")')
      .neq('id', pcId)  // excluir el candidato que acabamos de decidir

    if (!stillActive?.length) {
      // Nadie más activo — cerrar el proceso
      await supabase.from('processes')
        .update({ status: 'closed_no_hire', closed_at: new Date().toISOString() })
        .eq('id', processId)
    }
    // Si hay otros activos, dejar el proceso en su estado actual
  }

  // Obtener datos del proceso para el email
  const { data: proc } = await supabase
    .from('processes')
    .select('title, hiring_manager_or_sponsor_id')
    .eq('id', processId)
    .single()

  // Buscar al head of people para enviarle el email
  const { data: headOfPeople } = await supabase
    .from('users')
    .select('email, full_name')
    .eq('role', 'head_of_people')
    .limit(1)
    .maybeSingle()

  if ((headOfPeople as any)?.email) {
    const outcomeLabels = {
      hire: '✓ Hire',
      no_hire: '✗ No Hire',
      hire_other_capa: '~ Hire en otra capa',
    }

    await sendEmail({
      to: (headOfPeople as any).email,
      subject: `Decisión del Bar Raiser — ${(proc as any)?.title}: ${outcomeLabels[outcome]}`,
      html: `
<div style="font-family: 'Host Grotesk', system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #01022E;">
  <div style="margin-bottom: 24px;">
    <div style="width: 32px; height: 32px; background: #3C1AEA; border-radius: 7px; display: inline-flex; align-items: center; justify-content: center;">
      <span style="color: white; font-weight: 700; font-size: 14px;">T</span>
    </div>
  </div>

  <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 6px;">Decisión del Bar Raiser</h1>
  <p style="font-size: 15px; color: #4A5374; margin: 0 0 24px;">
    Proceso: <strong style="color: #01022E;">${(proc as any)?.title}</strong> · Candidato: <strong style="color: #01022E;">${candidateName}</strong>
  </p>

  <div style="background: ${outcome === 'hire' ? '#DCFCE7' : outcome === 'no_hire' ? '#FEE2E2' : '#DBEAFE'}; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
    <p style="font-size: 22px; font-weight: 700; margin: 0 0 4px; color: ${outcome === 'hire' ? '#166534' : outcome === 'no_hire' ? '#991B1B' : '#1E40AF'};">
      ${outcomeLabels[outcome]}
    </p>
    ${altCapa ? `<p style="font-size: 13px; color: #4A5374; margin: 4px 0 0;">Capa alternativa sugerida: <strong>${altCapa}</strong></p>` : ''}
  </div>

  <div style="background: #F7F8FB; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
    <p style="font-size: 12px; font-weight: 600; color: #8892A6; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 10px;">Justificación del Bar Raiser</p>
    <p style="font-size: 14px; color: #01022E; line-height: 1.7; margin: 0;">${justification}</p>
  </div>

  <p style="font-size: 13px; color: #8892A6;">
    Bar Raiser: <strong style="color: #01022E;">${(barRaiser as any)?.full_name ?? 'Anónimo'}</strong> · ${new Date().toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
  </p>

  <hr style="border: none; border-top: 1px solid #E1E5EE; margin: 24px 0;">
  <p style="font-size: 11px; color: #8892A6; margin: 0;">
    La identidad del Bar Raiser es confidencial y no debe compartirse con el candidato.
  </p>
</div>`,
    })
  }

  revalidatePath(`/processes/${processId}`)
  redirect(`/processes/${processId}/candidates/${pcId}`)
}
