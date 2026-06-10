import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { full_name, cv_text, notes, layer } = await request.json()
    if (!full_name) return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 })

    // Si viene del talent pool, buscar el cv_text del candidato por full_name
    let finalCvText = cv_text || null
    if (!finalCvText && layer === 'talent_pool') {
      const { data: candidate } = await supabase
        .from('candidates').select('cv_text').eq('full_name', full_name).maybeSingle()
      finalCvText = candidate?.cv_text ?? null
    }

    const { error } = await supabase.from('talent_benchmarks').insert({
      full_name,
      role_at_truora: layer === 'talent_pool' ? 'Talent Pool' : '—',
      cv_text: finalCvText,
      notes: notes || null,
      layer: layer || null,
      added_by: user.id,
      is_active: true,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
