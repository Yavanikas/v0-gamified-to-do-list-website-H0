import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import { Silkscreen, VT323 } from 'next/font/google'
import './globals.css'

const silkscreen = Silkscreen({
  variable: '--font-silkscreen',
  subsets: ['latin'],
  weight: ['400', '700'],
})

const vt323 = VT323({
  variable: '--font-vt323',
  subsets: ['latin'],
  weight: ['400'],
})

export const metadata: Metadata = {
  title: 'PixelQuest — Gamified To-Do',
  description: 'A gamified, AI-powered to-do list with real-life rewards.',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${silkscreen.variable} ${vt323.variable} bg-background`}
    >
      <body className="font-mono antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
