import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My CV',
}

export default function MyCvLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
