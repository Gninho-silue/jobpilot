import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'JobPilot — AI-Powered Job Search Copilot',
    short_name: 'JobPilot',
    description: 'Track applications, adapt CVs to every role with AI, generate tailored cover letters, and prepare for interviews.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0c',
    theme_color: '#f59e0b',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/favicon.ico',
        sizes: '16x16 32x32 48x48',
        type: 'image/x-icon',
      },
    ],
  }
}
