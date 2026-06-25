import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { feedbackEmailId, processCandidateId } = await request.json()

    const { data: fb } = await supabase
      .from('feedback_emails')
      .select('*, process_candidate:process_candidates(candidate:candidates(full_name, email), process:processes(title))')
      .eq('id', feedbackEmailId)
      .single()

    if (!fb) return NextResponse.json({ error: 'Feedback no encontrado' }, { status: 404 })

    const body = (fb as any).human_edited_text ?? (fb as any).ai_draft
    const candidate = (fb as any).process_candidate?.candidate
    const procTitle = (fb as any).process_candidate?.process?.title

    if (!candidate?.email) return NextResponse.json({ error: 'El candidato no tiene email.' }, { status: 400 })

    await sendEmail({
      to: candidate.email,
      subject: `Actualización sobre tu proceso — ${procTitle}`,
      html: `
<div style="font-family: 'Host Grotesk', system-ui, sans-serif; max-width: 580px; margin: 0 auto; padding: 40px 20px; color: #01022E;">
  <div style="margin-bottom: 28px;">
    <div style="width: 36px; height: 36px; background: #3C1AEA; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center;">
      <span style="color: white; font-weight: 700; font-size: 16px;">T</span>
    </div>
  </div>
  <div style="font-size: 15px; line-height: 1.7; color: #01022E; white-space: pre-wrap;">${body}</div>
  <hr style="border: none; border-top: 1px solid #E1E5EE; margin: 32px 0;">
  <p style="font-size: 11px; color: #8892A6; margin: 0;">Truora · Este email es confidencial y de uso exclusivo del destinatario.</p>
</div>`,
    })

    // Marcar como enviado
    await supabase.from('feedback_emails').update({
      sent_at: new Date().toISOString(),
      sent_by_id: user.id,
    }).eq('id', feedbackEmailId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[SendFeedback]', error?.message)
    return NextResponse.json({ error: error?.message ?? 'Error al enviar' }, { status: 500 })
  }
}
