/**
 * POST /api/analyze-session
 * Analiza la grabación de una entrevista con Gemini 1.5 Pro.
 * Acepta un link de Google Drive (compartido como "cualquier persona con el link").
 * Usa el Gemini File API para manejar videos grandes (hasta 2GB).
 */

export const runtime = 'nodejs'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server'
import { SESSION_ANALYSIS_SYSTEM_PROMPT, buildSessionAnalysisPrompt } from '@/lib/session-analysis-prompt'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

/** Extrae el fileId de cualquier formato de link de Google Drive */
function extractDriveFileId(url: string): string | null {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,   // /file/d/FILE_ID/view
    /[?&]id=([a-zA-Z0-9_-]+)/,        // ?id=FILE_ID
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

export async function POST(request: NextRequest) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY!)
  let tempFile: string | null = null

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Acepta JSON (driveUrl) o FormData (video file)
    const contentType = request.headers.get('content-type') ?? ''
    let evaluationType: 'phone_screen' | 'loop'
    let referenceId: string
    let processCandidateId: string
    let driveUrl: string | null = null
    let videoFile: File | null = null

    if (contentType.includes('multipart/form-data')) {
      const fd = await request.formData()
      videoFile = fd.get('video') as File | null
      evaluationType = fd.get('type') as 'phone_screen' | 'loop'
      referenceId = fd.get('reference_id') as string
      processCandidateId = fd.get('process_candidate_id') as string
    } else {
      const body = await request.json()
      driveUrl = body.driveUrl
      evaluationType = body.type
      referenceId = body.reference_id
      processCandidateId = body.process_candidate_id
    }

    if (!driveUrl && !videoFile) {
      return NextResponse.json({ error: 'Se requiere un link de Drive o un archivo de video.' }, { status: 400 })
    }

    let fileId: string | null = null
    if (driveUrl) {
      fileId = extractDriveFileId(driveUrl)
      if (!fileId) {
        return NextResponse.json({
          error: 'Link de Drive inválido. Copia el link desde el botón "Compartir" del archivo en Drive.',
        }, { status: 400 })
      }
    }

    // ── 1. Obtener contexto de la entrevista ──────────────────────────────
    let principles: string[] = []
    let interviewerName = 'Entrevistador'
    let candidateName = 'Candidato'
    let processTitle = ''

    if (evaluationType === 'loop') {
      const { data: loop } = await supabase
        .from('loops')
        .select(`
          id,
          assignments:loop_assignments(principles, interviewer:users!interviewer_id(full_name)),
          process_candidate:process_candidates(
            candidate:candidates(full_name),
            process:processes(title)
          )
        `)
        .eq('id', referenceId)
        .single()

      if (loop) {
        const myAssignment = (loop.assignments as any[]).find(a => {
          const iv = Array.isArray(a.interviewer) ? a.interviewer[0] : a.interviewer
          return iv?.id === user.id
        })
        principles = myAssignment?.principles ?? []
        const iv = Array.isArray(myAssignment?.interviewer) ? myAssignment?.interviewer[0] : myAssignment?.interviewer
        interviewerName = iv?.full_name ?? interviewerName
        const pc = loop.process_candidate as any
        candidateName = (Array.isArray(pc?.candidate) ? pc.candidate[0]?.full_name : pc?.candidate?.full_name) ?? candidateName
        processTitle = (Array.isArray(pc?.process) ? pc.process[0]?.title : pc?.process?.title) ?? ''
      }
    } else {
      const { data: ps } = await supabase
        .from('phone_screens')
        .select(`
          assigned_principles,
          hm:users!hm_id(full_name),
          process_candidate:process_candidates(
            candidate:candidates(full_name),
            process:processes(title)
          )
        `)
        .eq('process_candidate_id', processCandidateId)
        .single()

      if (ps) {
        principles = (ps.assigned_principles as string[]) ?? []
        interviewerName = (Array.isArray(ps.hm) ? ps.hm[0]?.full_name : (ps.hm as any)?.full_name) ?? interviewerName
        const pc = ps.process_candidate as any
        candidateName = (Array.isArray(pc?.candidate) ? pc.candidate[0]?.full_name : pc?.candidate?.full_name) ?? candidateName
        processTitle = (Array.isArray(pc?.process) ? pc.process[0]?.title : pc?.process?.title) ?? ''
      }
    }

    // ── 2. Obtener el video (Drive o archivo subido) ──────────────────────
    let mimeType = 'video/mp4'

    if (driveUrl && fileId) {
      // Descarga desde Google Drive (requiere "cualquier persona con el link")
      const downloadUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&authuser=0&confirm=t`
      const downloadRes = await fetch(downloadUrl, { redirect: 'follow' })

      if (!downloadRes.ok) {
        return NextResponse.json({
          error: `No se pudo descargar el video desde Drive (HTTP ${downloadRes.status}). Verifica que el link tenga acceso "Cualquier persona con el link puede ver".`,
        }, { status: 400 })
      }

      const ct = downloadRes.headers.get('content-type') ?? 'video/mp4'
      const isVideo = ct.startsWith('video/') || ct === 'application/octet-stream'
      if (!isVideo) {
        return NextResponse.json({
          error: 'El link no apunta a un video. Asegúrate de compartir el archivo de video directamente (no una carpeta) y con acceso "Cualquier persona con el link".',
        }, { status: 400 })
      }
      mimeType = ct.startsWith('video/') ? ct : 'video/mp4'
      const ext = ct.includes('webm') ? '.webm' : '.mp4'
      tempFile = path.join(os.tmpdir(), `truhire-${Date.now()}${ext}`)
      const buffer = Buffer.from(await downloadRes.arrayBuffer())
      fs.writeFileSync(tempFile, buffer)

    } else if (videoFile) {
      // Archivo subido directamente
      if (videoFile.size > 500 * 1024 * 1024) {
        return NextResponse.json({ error: 'El video no puede superar 500MB.' }, { status: 400 })
      }
      mimeType = videoFile.type || 'video/mp4'
      const ext = mimeType.includes('webm') ? '.webm' : '.mp4'
      tempFile = path.join(os.tmpdir(), `truhire-${Date.now()}${ext}`)
      const buffer = Buffer.from(await videoFile.arrayBuffer())
      fs.writeFileSync(tempFile, buffer)
    }

    // ── 3. Subir al Gemini File API ───────────────────────────────────────
    if (!tempFile) {
      return NextResponse.json({ error: 'No se pudo preparar el video para análisis.' }, { status: 500 })
    }
    const uploadResult = await fileManager.uploadFile(tempFile, {
      mimeType,
      displayName: `Entrevista — ${candidateName}`,
    })

    // Limpiar temp inmediatamente (no necesitamos el archivo local más)
    fs.unlinkSync(tempFile)
    tempFile = null

    // Esperar a que Gemini procese el video (puede tomar 1-2 min para videos largos)
    let geminiFile = await fileManager.getFile(uploadResult.file.name)
    let retries = 0
    while (geminiFile.state === FileState.PROCESSING && retries < 30) {
      await new Promise(r => setTimeout(r, 10_000)) // 10s entre intentos
      geminiFile = await fileManager.getFile(uploadResult.file.name)
      retries++
    }

    if (geminiFile.state === FileState.FAILED) {
      await fileManager.deleteFile(uploadResult.file.name).catch(() => {})
      return NextResponse.json({ error: 'Gemini no pudo procesar el video. Intenta con otro formato (MP4).' }, { status: 500 })
    }

    // ── 4. Generar análisis ───────────────────────────────────────────────
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SESSION_ANALYSIS_SYSTEM_PROMPT,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      ],
    })

    const prompt = buildSessionAnalysisPrompt({
      candidateName,
      interviewerName,
      principles,
      interviewType: evaluationType,
      processTitle,
    })

    const result = await model.generateContent([
      {
        fileData: {
          fileUri: geminiFile.uri,
          mimeType: geminiFile.mimeType,
        },
      },
      { text: prompt },
    ])

    // Limpiar archivo de Gemini (se auto-elimina a las 48h pero lo borramos ya)
    await fileManager.deleteFile(uploadResult.file.name).catch(() => {})

    const rawText = result.response.text()

    let analysis: any
    try {
      const jsonMatch = rawText.match(/```json\n?([\s\S]*?)\n?```/)
      analysis = JSON.parse(jsonMatch ? jsonMatch[1] : rawText.trim())
    } catch {
      return NextResponse.json({ error: 'Gemini devolvió respuesta no parseable.', raw: rawText }, { status: 500 })
    }

    // ── 5. Guardar en base de datos ───────────────────────────────────────
    if (evaluationType === 'loop') {
      await supabase
        .from('evaluations')
        .upsert(
          { loop_id: referenceId, interviewer_id: user.id, session_analysis: analysis },
          { onConflict: 'loop_id,interviewer_id' }
        )
    } else {
      await supabase
        .from('phone_screens')
        .update({ session_analysis: analysis })
        .eq('process_candidate_id', processCandidateId)
    }

    return NextResponse.json({ analysis })

  } catch (error: any) {
    // Limpiar archivo temporal si quedó
    if (tempFile) {
      try { fs.unlinkSync(tempFile) } catch {}
    }
    console.error('[AnalyzeSession]', error?.message)
    return NextResponse.json({ error: error.message ?? 'Error interno.' }, { status: 500 })
  }
}
