import { redirect } from 'next/navigation'

export default function LoopSetupPage({ params }: { params: { id: string; pcId: string } }) {
  redirect(`/processes/${params.id}/candidates/${params.pcId}`)
}
