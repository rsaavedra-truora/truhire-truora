/**
 * TruHire — Utilidades para procesamiento de PDFs
 *
 * Flujo:
 * 1. unpdf (Mozilla PDF.js) extrae texto del PDF — compatible con Next.js App Router
 * 2. GPT-4o-mini convierte el texto a Markdown estructurado y limpio
 * 3. El Markdown se almacena en cv_text para el agente de screening
 *
 * Por qué unpdf:
 * - Construida sobre Mozilla PDF.js (estándar de industria)
 * - Funciona nativamente en entornos serverless y Edge sin configuración de webpack
 * - No requiere serverExternalPackages ni patches de bundler
 */

import { extractText } from 'unpdf'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

/**
 * Extrae texto crudo de un buffer PDF usando unpdf
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const { text } = await extractText(new Uint8Array(buffer), { mergePages: true })
  return text
}

/**
 * Convierte texto crudo de CV a Markdown limpio y estructurado.
 * Usa GPT-4o-mini por su velocidad y bajo costo para esta tarea.
 */
export async function convertCVToMarkdown(rawText: string): Promise<string> {
  if (!rawText || rawText.trim().length < 30) {
    throw new Error('El PDF no tiene suficiente texto para procesar.')
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 2048,
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: `Eres un asistente que convierte texto extraído de CVs a Markdown limpio y bien estructurado.

Tu tarea:
1. Toma el texto crudo (puede venir con espacios extraños, saltos de línea inconsistentes, encoding raro)
2. Identifica las secciones: datos de contacto, experiencia, educación, habilidades, logros
3. Genera un Markdown limpio y legible, fiel al contenido original
4. NO inventes ni agregues información que no esté en el texto original
5. Preserva todos los datos cuantitativos (números, fechas, métricas) exactamente como aparecen
6. Usa encabezados ##, listas con -, y **negrita** para énfasis donde corresponda

Responde SOLO con el Markdown del CV, sin comentarios ni explicaciones.`,
      },
      {
        role: 'user',
        content: `Convierte este texto de CV a Markdown limpio:\n\n${rawText}`,
      },
    ],
  })

  return completion.choices[0].message.content ?? rawText
}

/**
 * Procesa un PDF completo: extrae texto y convierte a Markdown
 * Retorna el Markdown listo para guardar en cv_text
 */
export async function processPDFToMarkdown(buffer: Buffer): Promise<string> {
  const rawText = await extractTextFromPDF(buffer)
  const markdown = await convertCVToMarkdown(rawText)
  return markdown
}
