import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { candidateId, fitLevel, notes } = await request.json()
    if (!candidateId || !fitLevel) {
      return NextResponse.json({ error: 'candidateId y fitLevel son obligatorios' }, { status: 400 })
    }

    // Actualizar screening con feedback del recruiter
    const { error } = await supabase
      .from('talent_pool_screenings')
      .update({
        recruiter_fit_level: fitLevel,
        recruiter_notes: notes ?? null,
        recruiter_feedback_at: new Date().toISOString(),
      })
      .eq('candidate_id', candidateId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Si el recruiter marca como alto fit y hay notas, agregar a benchmarks de calibración
    if (fitLevel === 'high' && notes?.trim()) {
      const { data: candidate } = await supabase
        .from('candidates')
        .select('full_name, cv_text')
        .eq('id', candidateId)
        .single()

      if (candidate?.cv_text) {
        await supabase.from('talent_benchmarks').upsert({
          full_name: candidate.full_name,
          cv_text: candidate.cv_text,
          notes: `[Talent Pool - Alto fit confirmado] ${notes}`,
          layer: 'talent_pool',
        }, { onConflict: 'full_name' })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[talent-pool/feedback]', error)
    return NextResponse.json({ error: error.message ?? 'Error interno' }, { status: 500 })
  }
}
