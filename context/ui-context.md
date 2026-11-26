# UI Context

Direction validated on 26/11/2026 (JOBPILOT_PLAN.md step 6.2; proposal and mockups in
`design/proposal/`). A quiet, precise tool rather than an "AI" product: what needs checking
stands out, everything else steps back.

## Theme

Dark mode by default, light mode toggle (stored in `localStorage.theme`). Graphite dark,
warm white light. **No gradients, no glow, no drop shadows**: separation comes from 1 px
hairlines and the `bg-surface` / `bg-surface-raised` difference.

## Fonts

| Use | Font | Token |
| --- | --- | --- |
| All text (headings, body, labels, buttons) | Geist Sans (`next/font/google`, `app/layout.tsx`) | `--font-sans` |
| Figures, code, technical badges (`Kubernetes`, `EN`/`FR`) | JetBrains Mono (`@fontsource`) | `--font-mono`, utility `num` (tabular figures) |

Type scale (px): 12 · 13 · 14 · 16 · 20 · 26 (page titles) · 28–30 (figures). Sentence case
everywhere, no all-caps labels. Text blocks: 80 characters per line at most.

## Colors

Tokens are HSL triplets in `app/globals.css`, used as `hsl(var(--token))`. **No hex values
or Tailwind palette classes in components.** Contrast measured in
`design/proposal/README.md` (AA everywhere).

| Token | Dark | Light | Use |
| --- | --- | --- | --- |
| `--bg-base` | `#15171c` | `#f6f6f3` | page background |
| `--bg-surface` | `#1b1e24` | `#ffffff` | panels, cards, tables |
| `--bg-surface-raised` | `#252932` | `#eeeeea` | active item, selected filter, badges |
| `--border-default` | `#2f333c` | `#deded8` | hairlines (decorative) |
| `--border-strong` | `#4d525d` | `#8a8f98` | input and secondary button borders (≥ 3:1) |
| `--text-primary` | `#ecebe7` | `#1a1c21` | main text |
| `--text-secondary` | `#b6bac2` | `#464b55` | secondary text |
| `--text-muted` | `#8f95a0` | `#5f6570` | notes, dates |
| `--accent-primary` / `--accent-hover` | `#f0a63a` | `#f0a63a` | **primary action only** (fill) |
| `--accent-on` | `#1a1408` | `#1a1408` | text on the amber fill |
| `--accent-light` | `#3a2c14` | `#f8ecd6` | drop target highlight |
| `--state-success` | `#5fbca2` | `#26745f` | rise, offer, verified |
| `--state-error` | `#ee7a66` | `#b4432d` | fall, claim not found in the CV |
| `--state-warning` | `#f0a63a` | `#9a5b00` | warnings (amber text that stays readable on white) |
| `--focus` | `#9db8f2` | `#2f5fc4` | keyboard focus ring |

## Stages

Neutral: a dot and a word, never colour alone. Only **Offer** (success green) and
**Rejected** (dimmed) stand out. Tokens `--kanban-*` follow these rules.

## Rules

- **One amber button per screen**: the page's main action ("New application", "Download
  PDF", "Try the demo"). Repeated actions (one per row) are outlined buttons.
- **One upgrade call**: the plan meter (sidebar on desktop, "More" on mobile). No upgrade
  banner or card elsewhere.
- Secondary actions: underlined text or outlined buttons. No `→` appended to links.
- Company initials on a neutral tile; icons monochrome (`--text-muted`).
- Every icon-only button has an `aria-label`; overlays are labelled dialogs; a visible focus
  ring (`--focus`) on every interactive element; `prefers-reduced-motion` honoured.
- Every sentence must be true: no invented figures, ratings or features.

## Border Radius

| Context | Class |
| --- | --- |
| Buttons, inputs, menu items, badges | `rounded-lg` (8px) |
| Panels, cards | `rounded-xl` (12px) |
| Bottom sheets | `rounded-t-2xl` |

## Component Library

shadcn/ui on top of Tailwind CSS. Components in `components/ui/`. Use shadcn CLI only. Never
modify `components/ui/` manually (override with `className` from the caller).

## Layout Patterns

- **Desktop (768 px and up)**: fixed sidebar 240 px (brand, navigation, plan meter, account,
  theme toggle); content max 1320 px, gutter 32 px. No top navbar.
- **Mobile (under 768 px)**: top bar (brand, theme, amber "New application" icon button),
  bottom bar (Dashboard, Applications, Interview, More) and a "More" bottom sheet (My CV,
  Settings, plan meter, account). Gutter 16 px. **No horizontal page scroll at any width**
  (E2E `e2e/mobile-journey.spec.ts`).
- **Demo banner**: one line ("Demo · resets daily · test card …") with "Details".
- **Kanban**: five columns from 1280 px; between 768 and 1280 px the board scrolls; under
  768 px one stage at a time, swiped, with stage tabs.
- **Detail panel**: right sheet 480 px; full screen under 640 px; tabs scroll, never cut.
- **Dashboard**: figures panel (four cells), pipeline bar, "To check" (stored fact-check
  results), recent applications (table on desktop, list on mobile).

## Icons

Lucide React, stroke-based. `h-4 w-4` inline · `h-5 w-5` navigation.

## Key UI Moments

- **AI streaming**: blinking cursor `|` animation, no spinner.
- **Fact-check panel**: amber outline, one item per claim with its entry and a Remove button.
- **Empty states**: one sentence that says what to do, and the action.
- **Errors**: say what failed and offer "Retry"; never show an error as an empty state.
