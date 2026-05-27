import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Providers } from '@/components/providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'JobPilot — AI-powered job search',
  description: 'Manage your entire job search with AI — CV adaptation, cover letters, and interview prep.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning className="h-full">
        <body className="min-h-full antialiased">
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  )
}
