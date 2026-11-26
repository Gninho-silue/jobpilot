import type { Metadata, Viewport } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Providers } from '@/components/providers'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Geist } from 'next/font/google'
import './globals.css'

// Text font (JetBrains Mono stays for figures and code: see globals.css).
const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' })

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0c' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://jobpilot.app'),
  title: {
    default: 'JobPilot — Tailor your CV to every job offer, without inventing anything',
    template: '%s | JobPilot',
  },
  description:
    'Adapt your CV and write your cover letter from each job offer, in French or English. Every claim is checked against your original CV, and what it cannot find is flagged before you export.',
  applicationName: 'JobPilot',
  keywords: [
    'Job tracker',
    'AI resume tailor',
    'AI cover letter generator',
    'Interview preparation',
    'Career assistant',
    'Job application pipeline',
    'Job search dashboard',
    'Kanban job search',
  ],
  authors: [{ name: 'JobPilot' }],
  creator: 'JobPilot',
  publisher: 'JobPilot',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'JobPilot',
    title: 'JobPilot — Tailor your CV to every job offer, without inventing anything',
    description:
      'Adapt your CV and write your cover letter from each job offer, in French or English. Every claim is checked against your original CV, and what it cannot find is flagged before you export.',
    images: [
      {
        url: '/screenshots/kanban.png',
        width: 1200,
        height: 630,
        alt: 'JobPilot Kanban Application Tracker & AI Career Copilot',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JobPilot — Tailor your CV to every job offer, without inventing anything',
    description:
      'Adapt your CV and write your cover letter from each job offer, in French or English. Every claim is checked against your original CV, and what it cannot find is flagged before you export.',
    images: ['/screenshots/kanban.png'],
    creator: '@jobpilot',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

const themeScript = `(function(){try{var t=localStorage.getItem('theme');document.documentElement.classList.toggle('dark',t!=='light')}catch(e){}})();`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // No Clerk telemetry from the browser; the server side reads NEXT_PUBLIC_CLERK_TELEMETRY_DISABLED.
    <ClerkProvider telemetry={false}>
      <html lang="en" suppressHydrationWarning className={`dark h-full ${geist.variable}`}>
        <head>
          {/* Runs before React hydrates — prevents FOUC without injecting into React tree */}
          <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        </head>
        <body className="min-h-full antialiased">
          <Providers>{children}</Providers>
          <Analytics />
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  )
}
