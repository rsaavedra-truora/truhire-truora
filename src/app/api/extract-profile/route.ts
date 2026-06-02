import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export async function POST(request: NextRequest) {
  try {
    const { cvText } = await request.json()
    if (!cvText) return NextResponse.json({ full_name: '', last_role: '' })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 100,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: `Extrae el nombre completo y el último rol o posición más reciente de este CV.
Responde SOLO con JSON: {"full_name": "...", "last_role": "..."}
Si no encuentras alguno, usa string vacío.

CV:
${cvText.slice(0, 2000)}`
      }]
    })

    const data = JSON.parse(completion.choices[0].message.content ?? '{}')
    return NextResponse.json({ full_name: data.full_name ?? '', last_role: data.last_role ?? '' })
  } catch {
    return NextResponse.json({ full_name: '', last_role: '' })
  }
}
