/**
 * POST /api/parse-jd
 * Recibe texto crudo de un documento JD + título del rol.
 * Llama al AI para estructurar SOLO la info del rol específico.
 * Retorna un objeto estructurado listo para mostrar y para usar en screening.
 */

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const maxDuration = 30

export interface StructuredJD {
  summary: string
  area: string
  seniority: string
  responsibilities: string[]
  requirements: string[]
  nice_to_have: string[]
}

export async function POST(request: NextRequest) {
  try {
    const { text, title } = await request.json()

    if (!text || !title) {
      return NextResponse.json({ error: 'text y title son requeridos.' }, { status: 400 })
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

    const prompt = `Eres un experto en reclutamiento. El siguiente texto fue extraído de un documento de descripciones de cargos.
El documento puede contener MÚLTIPLES roles — extrae ÚNICAMENTE la información del cargo "${title}".

Si el rol no está explícitamente en el documento, extrae la información más relevante para ese tipo de cargo basándote en el contexto.

Devuelve un JSON con esta estructura exacta (sin texto adicional, solo el JSON):
{
  "summary": "Resumen del cargo en 2-3 oraciones claras. Qué hace, cuál es el impacto, a quién reporta si está disponible.",
  "area": "Área o equipo (ej: Finanzas, Producto, Ingeniería, Ventas, etc.)",
  "seniority": "Nivel de seniority (ej: Junior, Mid, Senior, Lead, Manager, Director, VP)",
  "responsibilities": ["responsabilidad 1", "responsabilidad 2", ...],
  "requirements": ["requisito 1", "requisito 2", ...],
  "nice_to_have": ["nice to have 1", "nice to have 2", ...]
}

Reglas:
- responsibilities: 4-8 bullets concisos, en español, orientados a acciones
- requirements: 4-7 bullets, lo que SÍ es indispensable
- nice_to_have: 2-5 bullets, lo deseable pero no obligatorio (puede ser array vacío [])
- Todos en español
- Sin bullets, solo el texto del item en cada string

TEXTO DEL DOCUMENTO:
${text.slice(0, 8000)}`

    const completion = await openai.chat.completions.create({
      model: process.env.AI_MODEL ?? 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const structured: StructuredJD = JSON.parse(raw)

    // Validar que tiene los campos mínimos
    if (!structured.summary || !structured.responsibilities) {
      throw new Error('El AI no pudo estructurar el JD correctamente.')
    }

    return NextResponse.json({ structured })

  } catch (err: any) {
    console.error('[parse-jd]', err?.message)
    return NextResponse.json({ error: err?.message ?? 'Error al procesar el JD.' }, { status: 500 })
  }
}
