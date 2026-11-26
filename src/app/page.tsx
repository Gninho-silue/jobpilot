import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { getActor } from '@/lib/actor'
import { billing } from '@/lib/billing'
import { FREE_TIER_LIMITS } from '@/lib/config'
import { isDemoEnabled } from '@/lib/demo/cookie'
import { TryDemoButton } from '@/components/demo/try-demo-button'
import { DemoNotice } from '@/components/demo/demo-notice'

// Every sentence on this page describes what the app does today (README rule:
// every statement must be true). No invented figures, ratings or testimonials.
const features = [
  {
    title: 'An adapted CV for each offer',
    desc: 'JobPilot rewrites your CV for the job you paste, then checks every technology, figure, company and date against your original CV. Anything it cannot find there is flagged, and you can remove it in one click.',
  },
  {
    title: 'A cover letter in French or English',
    desc: 'Written from the offer and your CV. Claims your CV does not support and generic phrases ("aligns perfectly", "proven ability") are flagged before you export.',
  },
  {
    title: 'Interview practice',
    desc: 'Ten questions from the offer and your CV, five technical and five behavioural. On the Pro plan, feedback on each answer.',
  },
]

const freeTierItems = [
  `${FREE_TIER_LIMITS.applications} applications a month`,
  `${FREE_TIER_LIMITS.cvAdaptations} CV adaptations a month`,
  `${FREE_TIER_LIMITS.coverLetters} cover letters a month`,
  'Kanban tracker, PDF export, interview questions',
]

const proTierItems = ['Unlimited applications, CV adaptations and cover letters', 'Feedback on your interview answers']

const BUTTON_PRIMARY =
  'inline-flex h-11 items-center justify-center rounded-lg bg-[hsl(var(--accent-primary))] px-5 text-sm font-semibold text-[hsl(var(--accent-on))] hover:bg-[hsl(var(--accent-hover))]'
const BUTTON_SECONDARY =
  'inline-flex h-11 items-center justify-center rounded-lg border border-[hsl(var(--border-strong))] px-5 text-sm font-medium text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--bg-surface-raised))]'

export default async function LandingPage({ searchParams }: { searchParams: Promise<{ demo?: string | string[] }> }) {
  const { demo } = await searchParams
  if (await getActor()) redirect('/dashboard')
  const demoEnabled = isDemoEnabled()
  const testMode = billing.isTestMode()

  return (
    <div className="min-h-screen overflow-x-clip bg-[hsl(var(--bg-base))] text-[hsl(var(--text-primary))]">
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--border-default))] bg-[hsl(var(--bg-base))]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
          <Link href="/" className="text-[17px] font-semibold tracking-tight">
            JobPilot
          </Link>
          <nav aria-label="Page sections" className="hidden items-center gap-6 text-sm text-[hsl(var(--text-secondary))] sm:flex">
            <a href="#features" className="hover:text-[hsl(var(--text-primary))]">Features</a>
            <a href="#pricing" className="hover:text-[hsl(var(--text-primary))]">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/sign-in" className="rounded-lg px-3 py-1.5 text-sm text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))]">
              Sign in
            </Link>
            <Link href="/sign-up" className="rounded-lg border border-[hsl(var(--border-strong))] px-3 py-1.5 text-sm font-medium hover:bg-[hsl(var(--bg-surface-raised))]">
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-14 pt-14 md:px-6 md:pt-20">
          <div className="max-w-3xl">
            <h1 className="text-[34px] font-semibold leading-[1.1] tracking-tight md:text-[52px]">
              Tailor your CV to every job offer, without inventing anything.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[hsl(var(--text-secondary))]">
              JobPilot adapts your CV and writes your cover letter from the offer, then checks each claim against your original CV.
              What it cannot find there is flagged before you export. In French or English.
            </p>
            <DemoNotice reason={typeof demo === 'string' ? demo : undefined} />
            <div className="mt-8 flex flex-wrap gap-3">
              {demoEnabled ? <TryDemoButton className={BUTTON_PRIMARY} /> : null}
              <Link href="/sign-up" className={demoEnabled ? BUTTON_SECONDARY : BUTTON_PRIMARY}>
                Create a free account
              </Link>
            </div>
            {demoEnabled ? (
              <p className="mt-3 text-sm text-[hsl(var(--text-muted))]">The demo needs no account: a fictional workspace, reset every day.</p>
            ) : null}
          </div>

          {/* Real screenshots of the app (demo workspace, fictional data). */}
          <div className="mt-14 grid items-start gap-4 lg:grid-cols-[1.6fr_1fr]">
            <figure className="overflow-hidden rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))]">
              <Image
                src="/screenshots/dashboard.jpg"
                alt="The JobPilot dashboard: figures, pipeline, what to check and recent applications"
                width={1440}
                height={900}
                priority
                className="h-auto w-full"
              />
              <figcaption className="border-t border-[hsl(var(--border-default))] px-4 py-2.5 text-sm text-[hsl(var(--text-secondary))]">
                The dashboard lists what to check: here, a technology the adapted CV added.
              </figcaption>
            </figure>
            <figure className="overflow-hidden rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))]">
              <Image
                src="/screenshots/fact-check.jpg"
                alt="The adapted CV of an application, with one claim not found in the CV and a Remove button"
                width={390}
                height={844}
                className="h-auto max-h-[520px] w-full object-cover object-top"
              />
              <figcaption className="border-t border-[hsl(var(--border-default))] px-4 py-2.5 text-sm text-[hsl(var(--text-secondary))]">
                Each flagged claim, with its experience and a Remove button.
              </figcaption>
            </figure>
          </div>
        </section>

        <section id="features" aria-labelledby="features-title" className="border-t border-[hsl(var(--border-default))]">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
            <h2 id="features-title" className="text-[26px] font-semibold tracking-tight">What it does</h2>
            <div className="mt-8 grid gap-8 md:grid-cols-3">
              {features.map(f => (
                <div key={f.title} className="max-w-sm">
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-2 leading-relaxed text-[hsl(var(--text-secondary))]">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" aria-labelledby="pricing-title" className="border-t border-[hsl(var(--border-default))]">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
            <h2 id="pricing-title" className="text-[26px] font-semibold tracking-tight">Pricing</h2>
            <p className="mt-2 text-[hsl(var(--text-secondary))]">Start for free. Upgrade when you need more.</p>
            <div className="mt-8 grid max-w-3xl gap-4 md:grid-cols-2">
              {[
                { name: 'Free', price: '$0', items: freeTierItems },
                { name: 'Pro', price: '$9', items: proTierItems },
              ].map(tier => (
                <div key={tier.name} className="grid content-start gap-5 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] p-6">
                  <div>
                    <h3 className="font-semibold">{tier.name}</h3>
                    <p className="mt-1 flex items-baseline gap-1">
                      <span className="num text-3xl">{tier.price}</span>
                      <span className="text-sm text-[hsl(var(--text-secondary))]">a month</span>
                    </p>
                  </div>
                  <ul className="grid gap-2.5">
                    {tier.items.map(item => (
                      <li key={item} className="flex items-start gap-2 text-sm text-[hsl(var(--text-secondary))]">
                        <Check className="mt-0.5 h-4 w-4 flex-none text-[hsl(var(--state-success))]" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {testMode ? (
              <p className="mt-4 text-sm text-[hsl(var(--text-muted))]">Payments run in Stripe test mode: no real charge is possible yet.</p>
            ) : null}
          </div>
        </section>
      </main>

      <footer className="border-t border-[hsl(var(--border-default))]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-[hsl(var(--text-secondary))] md:px-6">
          <span>
            <span className="font-semibold text-[hsl(var(--text-primary))]">JobPilot</span> · CVs and letters checked against your own CV
          </span>
          <span className="flex gap-4">
            <a href="https://github.com/Gninho-silue" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-[hsl(var(--text-primary))]">
              GitHub
            </a>
            <a href="https://www.linkedin.com/in/gninema-silue/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-[hsl(var(--text-primary))]">
              LinkedIn
            </a>
          </span>
        </div>
      </footer>
    </div>
  )
}
