/**
 * TruHire — Email utilities via Resend
 */

interface SendEmailParams {
  to: string
  subject: string
  html: string
  from?: string
}

export async function sendEmail({ to, subject, html, from }: SendEmailParams) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || apiKey === 're_...') {
    console.warn('[Email] RESEND_API_KEY not configured — email not sent')
    return { success: false, error: 'API key not configured' }
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: from ?? 'TruHire <noreply@truora.com>',
      to,
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    console.error('[Email] Resend error:', err)
    return { success: false, error: err }
  }

  return { success: true }
}

export function phoneScreenInviteEmail({
  candidateName,
  roleTitle,
  hmName,
  calendlyUrl,
  companyName = 'Truora',
}: {
  candidateName: string
  roleTitle: string
  hmName: string
  calendlyUrl: string
  companyName?: string
}) {
  return {
    subject: `Siguiente paso en tu proceso — ${roleTitle} en ${companyName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Inter, system-ui, sans-serif; max-width: 580px; margin: 0 auto; padding: 40px 20px; color: #0B1020;">
  <div style="margin-bottom: 32px;">
    <div style="width: 36px; height: 36px; background: #0800FF; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center;">
      <span style="color: white; font-weight: 700; font-size: 16px;">T</span>
    </div>
  </div>

  <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 8px; color: #0B1020;">
    Hola ${candidateName},
  </h1>

  <p style="font-size: 15px; line-height: 1.6; color: #4A5374; margin: 0 0 24px;">
    Revisamos tu perfil y nos gustaría avanzar al siguiente paso en el proceso para el rol de
    <strong style="color: #0B1020;">${roleTitle}</strong>.
  </p>

  <p style="font-size: 15px; line-height: 1.6; color: #4A5374; margin: 0 0 8px;">
    El siguiente paso es una primera conversación con <strong style="color: #0B1020;">${hmName}</strong>.
    Puedes agendar directamente en el horario que mejor te funcione:
  </p>

  <div style="margin: 32px 0;">
    <a href="${calendlyUrl}"
       style="display: inline-block; background: #0800FF; color: white; text-decoration: none;
              padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
      Agendar entrevista →
    </a>
  </div>

  <p style="font-size: 13px; color: #8892A6; line-height: 1.6; margin: 0 0 4px;">
    Si tienes alguna pregunta, responde directamente a este email.
  </p>
  <p style="font-size: 13px; color: #8892A6;">
    — El equipo de ${companyName}
  </p>

  <hr style="border: none; border-top: 1px solid #E1E5EE; margin: 32px 0;">
  <p style="font-size: 11px; color: #8892A6; margin: 0;">
    ${companyName} · Este email es parte de un proceso de selección activo.
  </p>
</body>
</html>`,
  }
}
