import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'R Research Assistant',
  description: 'AI-assisted statistical analysis powered by R',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
