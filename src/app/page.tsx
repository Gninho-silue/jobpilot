import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Plane, Check } from 'lucide-react'

const features = [
  {
    emoji: '📄',
    title: 'Resume Adapter',
    desc: 'Your CV tailored to every offer in seconds',
  },
  {
    emoji: '✉️',
    title: 'Cover Letter',
    desc: 'Personalized letters in FR or EN automatically',
  },
  {
    emoji: '🎤',
    title: 'Interview Prep',
    desc: '10 targeted questions + AI feedback on your answers',
  },
]

const freeTierItems = [
  '5 job applications',
  '3 CV adaptations',
  '3 cover letters',
  'Job tracker (Kanban)',
]

const proTierItems = [
  'Everything unlimited',
  'PDF export',
  'AI feedback on answers',
  'Priority support',
]

const kanbanColumns = [
  { label: 'Applied', varBg: '--kanban-applied-bg', varText: '--kanban-applied-text', cards: 3 },
  { label: 'Phone Screen', varBg: '--kanban-phone-bg', varText: '--kanban-phone-text', cards: 2 },
  { label: 'Technical', varBg: '--kanban-technical-bg', varText: '--kanban-technical-text', cards: 1 },
  { label: 'Offer', varBg: '--kanban-offer-bg', varText: '--kanban-offer-text', cards: 1 },
  { label: 'Rejected', varBg: '--kanban-rejected-bg', varText: '--kanban-rejected-text', cards: 1 },
]

export default async function LandingPage() {
  const { userId } = await auth()
  if (userId) redirect('/dashboard')

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'hsl(var(--bg-base))', color: 'hsl(var(--text-primary))' }}
    >
      {/* ── Navbar ── */}
      <header
        className="sticky top-0 z-50"
        style={{
          backgroundColor: 'hsl(var(--bg-surface))',
          borderBottom: '1px solid hsl(var(--border-default))',
        }}
      >
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-amber-500" />
            <span className="text-lg font-semibold">JobPilot</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm transition-colors hover:text-white"
              style={{ color: 'hsl(var(--text-secondary))' }}
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-sm transition-colors hover:text-white"
              style={{ color: 'hsl(var(--text-secondary))' }}
            >
              Pricing
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="rounded-lg px-4 py-2 text-sm transition-colors"
              style={{
                border: '1px solid hsl(var(--border-default))',
                color: 'hsl(var(--text-secondary))',
              }}
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-400"
            >
              Get started free
            </Link>
          </div>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-24 text-center">
        <div
          className="mb-8 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-amber-500"
          style={{
            backgroundColor: 'hsl(var(--accent-light))',
            border: '1px solid hsl(38 92% 50% / 0.25)',
          }}
        >
          <Plane className="h-3 w-3" />
          AI-Powered Job Search
        </div>

        <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-6xl">
          Land your dream job
          <br />
          faster with AI
        </h1>

        <p
          className="mx-auto mb-10 max-w-xl text-lg leading-relaxed"
          style={{ color: 'hsl(var(--text-secondary))' }}
        >
          Adapt your CV, generate cover letters and prepare for interviews — all in one place.
          Bilingual FR/EN.
        </p>

        <div className="mb-20 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/sign-up"
            className="rounded-lg bg-amber-500 px-8 py-3 font-medium text-black transition-colors hover:bg-amber-400"
          >
            Get started free →
          </Link>
          <a
            href="#features"
            className="rounded-lg px-8 py-3 text-sm transition-colors"
            style={{
              border: '1px solid hsl(var(--border-default))',
              color: 'hsl(var(--text-secondary))',
            }}
          >
            See how it works
          </a>
        </div>

        {/* Dashboard mockup */}
        <div
          className="mx-auto max-w-4xl rounded-2xl p-6 text-left"
          style={{
            backgroundColor: 'hsl(var(--bg-surface))',
            border: '1px solid hsl(var(--border-default))',
          }}
        >
          {/* Window chrome */}
          <div className="mb-5 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500/60" />
            <div className="h-3 w-3 rounded-full bg-yellow-400/60" />
            <div className="h-3 w-3 rounded-full bg-green-500/60" />
            <span className="ml-2 text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
              jobpilot.app — Job Tracker
            </span>
          </div>

          {/* Mini Kanban */}
          <div className="flex gap-3 overflow-x-auto pb-1">
            {kanbanColumns.map(col => (
              <div key={col.label} className="w-36 flex-none">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span
                    className="text-xs font-medium"
                    style={{ color: `hsl(var(${col.varText}))` }}
                  >
                    {col.label}
                  </span>
                  <span
                    className="rounded-full px-1.5 text-xs"
                    style={{
                      backgroundColor: `hsl(var(${col.varBg}))`,
                      color: `hsl(var(${col.varText}))`,
                    }}
                  >
                    {col.cards}
                  </span>
                </div>
                {Array.from({ length: col.cards }).map((_, i) => (
                  <div
                    key={i}
                    className="mb-2 rounded-lg p-3"
                    style={{
                      backgroundColor: 'hsl(var(--bg-surface-raised))',
                      border: '1px solid hsl(var(--border-default))',
                    }}
                  >
                    <div
                      className="mb-1.5 h-2 w-full rounded"
                      style={{ backgroundColor: 'hsl(var(--border-strong))' }}
                    />
                    <div
                      className="h-2 w-3/4 rounded"
                      style={{ backgroundColor: 'hsl(var(--border-default))' }}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Screenshots ── */}
      <section className="mx-auto max-w-6xl px-6 pb-8 pt-4">
        <div className="mb-10 text-center">
          <h2 className="mb-3 text-3xl font-bold">See JobPilot in action</h2>
          <p style={{ color: 'hsl(var(--text-secondary))' }}>
            A focused workspace built for the whole job-search lifecycle.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Kanban board */}
          <div
            className="overflow-hidden rounded-xl"
            style={{
              backgroundColor: 'hsl(var(--bg-surface))',
              border: '1px solid hsl(var(--border-default))',
              boxShadow: '0 8px 32px hsl(222 47% 4% / 0.6)',
            }}
          >
            <div
              className="flex items-center gap-2 px-4 py-3"
              style={{ borderBottom: '1px solid hsl(var(--border-default))' }}
            >
              <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
              <span className="ml-2 text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
                Applications — Kanban board
              </span>
            </div>
            <Image
              src="/screenshots/kanban.png"
              alt="JobPilot Kanban board — job applications tracked by stage"
              width={1536}
              height={864}
              className="w-full"
              priority
            />
          </div>

          {/* Detail sheet */}
          <div
            className="overflow-hidden rounded-xl"
            style={{
              backgroundColor: 'hsl(var(--bg-surface))',
              border: '1px solid hsl(var(--border-default))',
              boxShadow: '0 8px 32px hsl(222 47% 4% / 0.6)',
            }}
          >
            <div
              className="flex items-center gap-2 px-4 py-3"
              style={{ borderBottom: '1px solid hsl(var(--border-default))' }}
            >
              <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
              <span className="ml-2 text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
                Application detail — tabs: Overview · Resume · Cover Letter · Interview
              </span>
            </div>
            <Image
              src="/screenshots/detail.png"
              alt="JobPilot application detail sheet with AI tools"
              width={960}
              height={540}
              className="w-full"
            />
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-16 text-center">
          <h2 className="mb-3 text-3xl font-bold">Everything you need to get hired</h2>
          <p style={{ color: 'hsl(var(--text-secondary))' }}>Three AI tools. One seamless workflow.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {features.map(f => (
            <div
              key={f.title}
              className="rounded-xl p-6"
              style={{
                backgroundColor: 'hsl(var(--bg-surface))',
                border: '1px solid hsl(var(--border-default))',
              }}
            >
              <span className="mb-4 block text-3xl">{f.emoji}</span>
              <h3 className="mb-2 font-semibold">{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--text-secondary))' }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Social Proof ── */}
      <div className="border-y border-[hsl(var(--border-default))]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-6 px-6 py-10 sm:flex-row sm:gap-16">
          {[
            { stat: '500+', label: 'applications tracked' },
            { stat: '1,200+', label: 'CVs adapted' },
            { stat: '4.9 / 5', label: 'average rating' },
          ].map(({ stat, label }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-bold text-amber-500">{stat}</div>
              <div className="mt-0.5 text-sm text-[hsl(var(--text-secondary))]">
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Pricing ── */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-16 text-center">
          <h2 className="mb-3 text-3xl font-bold">Simple, transparent pricing</h2>
          <p style={{ color: 'hsl(var(--text-secondary))' }}>
            Start for free. Upgrade when you&apos;re ready.
          </p>
        </div>

        <div className="mx-auto grid max-w-3xl gap-5 md:grid-cols-2">
          {/* Free */}
          <div
            className="rounded-xl p-8"
            style={{
              backgroundColor: 'hsl(var(--bg-surface))',
              border: '1px solid hsl(var(--border-default))',
            }}
          >
            <div className="mb-6">
              <h3 className="mb-1 text-lg font-semibold">Free</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>
                  /mo
                </span>
              </div>
            </div>

            <ul className="mb-8 space-y-3">
              {freeTierItems.map(item => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-sm"
                  style={{ color: 'hsl(var(--text-secondary))' }}
                >
                  <Check
                    className="h-4 w-4 flex-none"
                    style={{ color: 'hsl(var(--state-success))' }}
                  />
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href="/sign-up"
              className="block rounded-lg py-2.5 text-center text-sm transition-colors"
              style={{
                border: '1px solid hsl(var(--border-default))',
                color: 'hsl(var(--text-secondary))',
              }}
            >
              Get started
            </Link>
          </div>

          {/* Pro */}
          <div
            className="relative rounded-xl p-8"
            style={{
              backgroundColor: 'hsl(var(--bg-surface))',
              border: '1px solid hsl(38 92% 50% / 0.5)',
            }}
          >
            <div
              className="absolute right-4 top-4 rounded-full px-2 py-0.5 text-xs font-medium text-black"
              style={{ backgroundColor: '#F59E0B' }}
            >
              Popular
            </div>

            <div className="mb-6">
              <h3 className="mb-1 text-lg font-semibold">Pro</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$9</span>
                <span className="text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>
                  /mo
                </span>
              </div>
            </div>

            <ul className="mb-8 space-y-3">
              {proTierItems.map(item => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-sm"
                  style={{ color: 'hsl(var(--text-secondary))' }}
                >
                  <Check className="h-4 w-4 flex-none text-amber-500" />
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href="/sign-up"
              className="block rounded-lg bg-amber-500 py-2.5 text-center text-sm font-medium text-black transition-colors hover:bg-amber-400"
            >
              Get started
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid hsl(var(--border-default))' }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 py-12 md:flex-row">
          <div className="flex items-center gap-3">
            <Plane className="h-5 w-5 text-amber-500" />
            <span className="font-semibold">JobPilot</span>
            <span className="text-sm" style={{ color: 'hsl(var(--text-muted))' }}>
              AI-powered job search assistant
            </span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://github.com/Gninho-silue"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors"
              style={{ color: 'hsl(var(--text-secondary))' }}
              aria-label="GitHub"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
              </svg>
            </a>
            <a
              href="https://www.linkedin.com/in/gninema-silue/"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors"
              style={{ color: 'hsl(var(--text-secondary))' }}
              aria-label="LinkedIn"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286ZM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065Zm1.782 13.019H3.555V9h3.564v11.452ZM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003Z" />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
