'use client'

import { useState, useRef } from 'react'
import { CheckCircle, AlertCircle, Loader, Link as LinkIcon, Upload } from 'lucide-react'

type AnalysisState = 'idle' | 'analyzing' | 'done' | 'error'
type InputMode = 'link' | 'file'

interface Props {
  loopId?: string
  processCandidateId?: string
  type: 'phone_screen' | 'loop'
  existingAnalysis?: any | null
}

export function SessionAnalysisUploader({ loopId, processCandidateId, type, existingAnalysis }: Props) {
  const [state, setState] = useState<AnalysisState>(existingAnalysis ? 'done' : 'idle')
  const [analysis, setAnalysis] = useState<any>(existingAnalysis ?? null)
  const [error, setError] = useState<string | null>(null)
  const [driveUrl, setDriveUrl] = useState('')
  const [inputMode, setInputMode] = useState<InputMode>('link')
  const [isDragging, setIsDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Análisis vía link de Drive ──────────────────────────────────────────
  async function handleLink() {
    if (!driveUrl.trim()) return
    setState('analyzing')
    setError(null)

    try {
      const res = await fetch('/api/analyze-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driveUrl,
          type,
          reference_id: loopId ?? '',
          process_candidate_id: processCandidateId ?? '',
        }),
      })
      const data = await res.json()
      if (data.analysis) { setAnalysis(data.analysis); setState('done') }
      else { setError(data.error ?? 'Error al analizar.'); setState('error') }
    } catch (err: any) {
      setError(err.message); setState('error')
    }
  }

  // ── Análisis vía archivo subido ─────────────────────────────────────────
  async function handleFile(file: File) {
    if (!file.type.startsWith('video/')) {
      setError('Solo se aceptan archivos de video (MP4, MOV, WebM…)'); return
    }
    if (file.size > 500 * 1024 * 1024) {
      setError('El video no puede superar 500MB'); return
    }
    setState('analyzing')
    setError(null)

    const fd = new FormData()
    fd.set('video', file)
    fd.set('type', type)
    fd.set('reference_id', loopId ?? '')
    fd.set('process_candidate_id', processCandidateId ?? '')

    try {
      const res = await fetch('/api/analyze-session', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.analysis) { setAnalysis(data.analysis); setState('done') }
      else { setError(data.error ?? 'Error al analizar.'); setState('error') }
    } catch (err: any) {
      setError(err.message); setState('error')
    }
  }

  const evidenceColors: Record<string, { bg: string; color: string }> = {
    muy_fuerte:    { bg: '#ECFDF5', color: '#065F46' },
    fuerte:        { bg: '#D1FAE5', color: '#065F46' },
    moderada:      { bg: '#FFFBEB', color: '#92400E' },
    debil:         { bg: '#FEF2F2', color: '#991B1B' },
    sin_evidencia: { bg: '#F3F4F6', color: '#6B7280' },
  }

  const patternConfig: Record<string, { label: string; bg: string; color: string }> = {
    star_valido_con_datos: { label: '✓ STAR + datos',    bg: '#ECFDF5', color: '#065F46' },
    star_valido_sin_datos: { label: '✓ STAR sin datos',  bg: '#D1FAE5', color: '#065F46' },
    evasion:               { label: '⚠ Evasión',         bg: '#FEF2F2', color: '#991B1B' },
    compensacion_forzada:  { label: '⚠ Comp. forzada',   bg: '#FEF2F2', color: '#991B1B' },
    ejemplo_debil:         { label: '↓ Ej. débil',       bg: '#FFFBEB', color: '#92400E' },
    declaracion_general:   { label: '~ Gral.',           bg: '#F3F4F6', color: '#6B7280' },
    sin_respuesta:         { label: '— Sin respuesta',   bg: '#F3F4F6', color: '#6B7280' },
  }

  return (
    <div className="space-y-4">

      {/* ── Entrada ── */}
      {state === 'idle' && (
        <div className="space-y-3">

          {/* Tabs link / archivo */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
            {(['link', 'file'] as InputMode[]).map(m => (
              <button
                key={m}
                onClick={() => { setInputMode(m); setError(null) }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  inputMode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {m === 'link' ? '🔗 Link de Drive' : '📁 Subir archivo'}
              </button>
            ))}
          </div>

          {/* Link de Drive */}
          {inputMode === 'link' && (
            <div className="space-y-2">
              <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                <p className="text-xs text-amber-800">
                  El archivo debe estar compartido con <strong>"Cualquier persona con el link"</strong>.
                  Si solo puedes compartir con Truora, usa la opción <strong>Subir archivo</strong>.
                </p>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="url"
                    value={driveUrl}
                    onChange={e => setDriveUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/..."
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0800FF]"
                    onKeyDown={e => e.key === 'Enter' && handleLink()}
                  />
                </div>
                <button
                  onClick={handleLink}
                  disabled={!driveUrl.trim()}
                  className="btn-truora disabled:opacity-50 disabled:cursor-not-allowed text-sm px-4"
                >
                  Analizar
                </button>
              </div>
            </div>
          )}

          {/* Subir archivo */}
          {inputMode === 'file' && (
            <div>
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false) }}
                onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  isDragging ? 'border-[#0800FF] bg-[#E8E7FF] cursor-copy'
                  : 'border-gray-300 hover:border-[#0800FF] hover:bg-gray-50'
                }`}
              >
                <Upload size={24} className="mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">
                  <span className="text-[#0800FF] font-medium">Arrastra el video</span> o haz clic
                </p>
                <p className="text-xs text-gray-400 mt-1">MP4, MOV, WebM · Máximo 500MB</p>
              </div>
              <input ref={fileRef} type="file" accept="video/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 flex items-start gap-1.5">
              <span className="flex-shrink-0 mt-0.5">⚠</span>{error}
            </p>
          )}
        </div>
      )}

      {/* ── Analizando ── */}
      {state === 'analyzing' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <Loader size={18} className="text-[#0800FF] animate-spin flex-shrink-0" />
            <p className="text-sm font-medium text-blue-900">Gemini analizando la sesión</p>
          </div>
          <p className="text-xs text-blue-700 ml-7">
            Procesando video y generando análisis. Tarda 3–8 minutos según la duración de la entrevista.
          </p>
        </div>
      )}

      {/* ── Error ── */}
      {state === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={() => { setState('idle'); setError(null) }}
              className="text-xs text-red-600 hover:underline mt-1">
              Intentar de nuevo
            </button>
          </div>
        </div>
      )}

      {/* ── Resultado ── */}
      {state === 'done' && analysis && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600" />
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wider">Análisis — Gemini</p>
            </div>
            <button onClick={() => { setState('idle'); setAnalysis(null); setDriveUrl('') }}
              className="text-xs text-gray-400 hover:text-gray-600">Re-analizar</button>
          </div>

          {/* Veredicto */}
          {analysis.ai_verdict && (
            <div className={`rounded-xl p-5 border-2 ${
              analysis.ai_verdict === 'hire' ? 'border-green-400 bg-green-50'
              : analysis.ai_verdict === 'talent_pool' ? 'border-orange-400 bg-orange-50'
              : 'border-red-400 bg-red-50'
            }`}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{
                color: analysis.ai_verdict === 'hire' ? '#065F46' : analysis.ai_verdict === 'talent_pool' ? '#92400E' : '#991B1B'
              }}>
                Veredicto Gemini · Confianza {analysis.ai_confidence}
              </p>
              <p className="text-2xl font-bold" style={{
                color: analysis.ai_verdict === 'hire' ? '#065F46' : analysis.ai_verdict === 'talent_pool' ? '#C2410C' : '#991B1B'
              }}>
                {analysis.ai_verdict === 'hire' ? '✓ Hire' : analysis.ai_verdict === 'talent_pool' ? '~ Talent Pool' : '✗ No Hire'}
              </p>
              {analysis.verdict_reasoning && (
                <p className="text-sm mt-3 leading-relaxed" style={{
                  color: analysis.ai_verdict === 'hire' ? '#065F46' : analysis.ai_verdict === 'talent_pool' ? '#92400E' : '#991B1B'
                }}>{analysis.verdict_reasoning}</p>
              )}
              {analysis.critical_concern && (
                <div className="mt-3 pt-3 border-t border-current/20">
                  <p className="text-xs font-semibold mb-0.5" style={{
                    color: analysis.ai_verdict === 'hire' ? '#166534' : '#7F1D1D'
                  }}>Factor clave:</p>
                  <p className="text-xs leading-relaxed" style={{
                    color: analysis.ai_verdict === 'hire' ? '#166534' : analysis.ai_verdict === 'talent_pool' ? '#92400E' : '#991B1B'
                  }}>{analysis.critical_concern}</p>
                </div>
              )}
            </div>
          )}

          {/* Impresión general */}
          {analysis.overall_impression && (
            <div className="bg-[#0B1020] rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Impresión general</p>
              <p className="text-sm text-white leading-relaxed">{analysis.overall_impression}</p>
            </div>
          )}

          {/* Por principio */}
          {analysis.principles_observed?.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Por principio</p>
              {analysis.principles_observed.map((po: any, i: number) => {
                const conf = evidenceColors[po.evidence_quality] ?? evidenceColors.sin_evidencia
                const pc = patternConfig[po.answer_pattern]
                return (
                  <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#E8E7FF] text-[#0800FF]">{po.principle_name}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: conf.bg, color: conf.color }}>
                        {po.evidence_quality?.replace(/_/g, ' ')}
                      </span>
                      {pc && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: pc.bg, color: pc.color }}>{pc.label}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{po.observation}</p>
                    {po.data_provided && (
                      <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5">
                        <p className="text-xs text-blue-700"><strong>Datos citados:</strong> {po.data_provided}</p>
                      </div>
                    )}
                    {po.notable_moment && (
                      <div className="mt-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        <p className="text-xs text-amber-700"><strong>Momento clave:</strong> {po.notable_moment}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Señales */}
          <div className="grid grid-cols-2 gap-3">
            {analysis.authenticity_signals?.length > 0 && (
              <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-green-700 mb-2">Señales positivas</p>
                <ul className="space-y-1">
                  {analysis.authenticity_signals.map((s: string, i: number) => (
                    <li key={i} className="text-xs text-green-800 flex gap-1.5"><span className="flex-shrink-0">+</span>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.concern_signals?.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-red-700 mb-2">Señales de alerta</p>
                <ul className="space-y-1">
                  {analysis.concern_signals.map((s: string, i: number) => (
                    <li key={i} className="text-xs text-red-800 flex gap-1.5"><span className="flex-shrink-0">−</span>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Para el Bar Raiser */}
          {analysis.recommendation_for_bar_raiser && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-violet-700 uppercase tracking-wider mb-2">Para el Bar Raiser</p>
              <p className="text-sm text-gray-700 leading-relaxed">{analysis.recommendation_for_bar_raiser}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
