import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'JOANResearchOS',
  description: 'AI-assisted statistical analysis powered by R — built for nurses, physicians, and epidemiologists.',
  // Prevents iOS Safari from auto-linking bare numbers (p-values, coefficients,
  // row counts in R output/scripts) as tappable phone numbers.
  other: {
    'format-detection': 'telephone=no',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'JOANResearchOS',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // maximumScale intentionally left unset — locking zoom breaks accessibility
  // for users who need to pinch-zoom statistical tables on a small screen.
  themeColor: '#1a3a5c',
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
