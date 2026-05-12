/**
 * POST /api/extract-text
 * Extrae texto de PDF, DOCX, MD o TXT para job descriptions.
 *
 * Mismo patrón que /api/apply y /api/referral que ya funcionan:
 * - Sin SSR cookie auth (que falla en API routes)
 * - Imports dinámicos para evitar problemas de bundling
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No se recibió archivo.' }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo no puede superar 10MB.' }, { status: 400 })
    }

    const name = file.name.toLowerCase()
    const buffer = Buffer.from(await file.arrayBuffer())
    let text = ''

    // Markdown y texto plano — sin dependencias
    if (name.endsWith('.md') || name.endsWith('.txt') || file.type.startsWith('text/')) {
      text = buffer.toString('utf-8').trim()
      if (!text) return NextResponse.json({ error: 'El archivo está vacío.' }, { status: 400 })
      return NextResponse.json({ text })
    }

    // PDF — misma librería que usa /api/apply exitosamente
    if (name.endsWith('.pdf') || file.type === 'application/pdf') {
      const { extractText } = await import('unpdf')
      const result = await extractText(new Uint8Array(buffer), { mergePages: true })
      text = result.text?.trim() ?? ''
      if (!text) return NextResponse.json({ error: 'El PDF no tiene texto extraíble.' }, { status: 400 })
      return NextResponse.json({ text })
    }

    // DOCX
    if (name.endsWith('.docx') || name.endsWith('.doc')) {
      const mammoth = require('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      text = result.value?.trim() ?? ''
      if (!text) return NextResponse.json({ error: 'No se pudo extraer texto del Word.' }, { status: 400 })
      return NextResponse.json({ text })
    }

    return NextResponse.json({ error: 'Formato no soportado. Usa PDF, Word, Markdown o texto plano.' }, { status: 400 })

  } catch (err: any) {
    console.error('[extract-text]', err?.message)
    return NextResponse.json({ error: err?.message ?? 'Error interno.' }, { status: 500 })
  }
}
