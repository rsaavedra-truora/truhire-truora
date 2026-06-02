import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { full_name, cv_text } = await request.json()
    if (!full_name) return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 })

    const { error } = await supabase.from('talent_benchmarks').insert({
      full_name,
      role_at_truora: '—',
      cv_text: cv_text || null,
      added_by: user.id,
      is_active: true,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
