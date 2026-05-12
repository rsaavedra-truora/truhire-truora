import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'TruHire',
    template: '%s | TruHire',
  },
  description: 'Plataforma de reclutamiento de Truora',
  robots: 'noindex, nofollow', // app interna
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
