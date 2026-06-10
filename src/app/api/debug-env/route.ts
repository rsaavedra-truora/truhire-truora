import { NextResponse } from 'next/server'

// TEMPORAL — eliminar después del diagnóstico
export async function GET() {
  return NextResponse.json({
    OPENAI_API_KEY_present: !!process.env.OPENAI_API_KEY,
    OPENAI_API_KEY_length: process.env.OPENAI_API_KEY?.length ?? 0,
    OPENAI_API_KEY_starts: process.env.OPENAI_API_KEY?.slice(0, 8) ?? 'MISSING',
    SUPABASE_URL_present: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    GEMINI_present: !!process.env.GEMINI_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
  })
}
