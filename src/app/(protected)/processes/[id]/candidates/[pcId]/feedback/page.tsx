'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function FeedbackPage() {
  const params = useParams()
  const router = useRouter()
  const pcId = params.pcId as string
  const processId = params.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [candidate, setCandidate] = useState<any>(null)
  const [draft, setDraft] = useState('')
  const [level, setLevel] = useState<1 | 2 | 3>(1)
  const [feedbackId, setFeedbackId] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [pcId])

  async function loadData() {
    setLoading(true)
    const { data: pc } = await supabase
      .from('process_candidates')
      .select(`
        id, status,
        candidate:candidates(full_name, email),
        feedback:feedback_emails(id, level, ai_draft, human_edited_text, sent_at)
      `)
      .eq('id', pcId)
      .single()

    if (pc) {
      setCandidate(pc.candidate)
      const fb = Array.isArray(pc.feedback) ? pc.feedback[0] : pc.feedback
      if (fb) {
        setFeedbackId(fb.id)
        setLevel(fb.level)
        setDraft(fb.human_edited_text ?? fb.ai_draft ?? '')
        setSent(!!fb.sent_at)
      }
    }
    setLoading(false)
  }

  async function generateDraft() {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processCandidateId: pcId }),
      })
      const data = await res.json()
      if (data.draft) {
        setDraft(data.draft)
        setLevel(data.level)
        setFeedbackId(data.feedbackEmailId)
      } else {
        setError(data.error ?? 'Error al generar el borrador.')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  async function saveDraft() {
    if (!feedbackId) return
    await supabase
      .from('feedback_emails')
      .update({ human_edited_text: draft })
      .eq('id', feedbackId)
  }

  async function sendFeedback() {
    if (!feedbackId || !candidate?.email) return
    setSending(true)
    setError(null)
    try {
      // Guardar texto editado
      await supabase.from('feedback_emails')
        .update({ human_edited_text: draft })
        .eq('id', feedbackId)

      // Enviar via Resend
      const res = await fetch('/api/send-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackEmailId: feedbackId, processCandidateId: pcId }),
      })
      const data = await res.json()
      if (data.success) {
        setSent(true)
        await loadData()
      } else {
        setError(data.error ?? 'Error al enviar el email.')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const levelLabels = {
    1: 'Filtro inicial',
    2: 'Manager Screening',
    3: 'Loop completo',
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Cargando...</div>

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-3 flex items-center gap-1">
          ← Volver
        </button>
        <h1 className="text-xl font-semibold text-gray-900">Feedback al candidato</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {(candidate as any)?.full_name} · {(candidate as any)?.email}
        </p>
      </div>

      {sent && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
          <p className="text-sm text-green-700 font-medium">Email enviado al candidato.</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Borrador del email</h2>
            {draft && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full mt-1 inline-block">
                Nivel {level} — {levelLabels[level]}
              </span>
            )}
          </div>
          {!sent && (
            <button
              onClick={generateDraft}
              disabled={generating}
              className="text-xs px-3 py-1.5 border border-[#0800FF] text-[#0800FF] rounded-lg hover:bg-[#E8E7FF] disabled:opacity-50 flex items-center gap-1.5"
            >
              {generating ? (
                <>
                  <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Generando...
                </>
              ) : draft ? 'Re-generar' : 'Generar con AI'}
            </button>
          )}
        </div>

        {!draft && !generating && (
          <div className="bg-gray-50 rounded-xl p-6 text-center">
            <p className="text-sm text-gray-500 mb-3">
              El AI genera un borrador basado en el nivel del proceso que alcanzó el candidato.
              Tú lo revisas y editas antes de enviar.
            </p>
            <button onClick={generateDraft} disabled={generating}
              className="btn-truora text-sm">
              Generar borrador con AI
            </button>
          </div>
        )}

        {draft && (
          <>
            <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              <p className="text-xs text-amber-700">
                <strong>Revisa antes de enviar:</strong> el AI nunca menciona scores, principios evaluados ni la identidad del Bar Raiser.
                Edita el texto si necesitas personalizar o ajustar el tono.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Para: {(candidate as any)?.email}
              </label>
              <textarea
                rows={10}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                disabled={sent}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF] resize-none font-sans disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <p className="text-sm text-red-700">⚠ {error}</p>
              </div>
            )}

            {!sent && (
              <div className="flex gap-3">
                <button
                  onClick={sendFeedback}
                  disabled={sending || !draft.trim()}
                  className="btn-truora disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {sending ? 'Enviando...' : 'Revisar y enviar email'}
                </button>
                <button
                  onClick={saveDraft}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  Guardar borrador
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-medium text-gray-600 mb-1">¿Qué incluye el feedback?</p>
        <ul className="text-xs text-gray-500 space-y-0.5">
          <li>✓ Agradecimiento genuino por el tiempo del candidato</li>
          <li>✓ 1-2 fortalezas concretas detectadas (cuando aplica)</li>
          <li>✓ Puerta abierta para futuras oportunidades</li>
          <li>✗ No incluye scores, votos, principios evaluados ni identidad del Bar Raiser</li>
        </ul>
      </div>
    </div>
  )
}
