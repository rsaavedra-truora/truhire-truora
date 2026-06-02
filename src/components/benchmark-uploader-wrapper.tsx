'use client'

import { BenchmarkUploader } from './benchmark-uploader'
import { useRouter } from 'next/navigation'

export function BenchmarkUploaderWrapper() {
  const router = useRouter()

  async function handleSave(data: { full_name: string; role_at_truora?: string; layer?: string; notes?: string; cv_text: string }) {
    const res = await fetch('/api/benchmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error ?? 'Error al guardar.')
    }
    router.refresh()
  }

  return <BenchmarkUploader onSave={handleSave} />
}
