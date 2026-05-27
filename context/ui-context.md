# UI Context

## Theme

Dark mode by default, with light mode toggle. The design language is a clean, technical productivity tool — near-black backgrounds, subtle layered surfaces, and **amber** as the primary accent color. NOT the typical AI startup indigo/blue. Inspired by Linear (dark), GitHub dark, and the JetBrains IDE aesthetic. **No gradients. No glow. No blur on interactive elements.**

## Font

**JetBrains Mono** for ALL text — headings, body, labels, buttons, everything. This gives JobPilot a unique developer-tool feel that stands out from generic SaaS.

| Role        | Font           | Variable      |
| ----------- | -------------- | ------------- |
| All UI text | JetBrains Mono | `--font-mono` |
| Code blocks | JetBrains Mono | `--font-mono` |

## Colors

All components must use CSS custom property tokens only. No hardcoded hex values anywhere.

| Role               | CSS Variable            | Dark value        | Light value |
| ------------------ | ----------------------- | ----------------- | ----------- |
| Page background    | `--bg-base`             | `#0D1117`         | `#FFFFFF`   |
| Surface (cards)    | `--bg-surface`          | `#111827`         | `#F8FAFC`   |
| Surface raised     | `--bg-surface-raised`   | `#1A2236`         | `#F1F5F9`   |
| Border default     | `--border-default`      | `#1E2D40`         | `#E2E8F0`   |
| Border strong      | `--border-strong`       | `#2D3F55`         | `#CBD5E1`   |
| Primary text       | `--text-primary`        | `#F0F6FC`         | `#0F172A`   |
| Secondary text     | `--text-secondary`      | `#8B949E`         | `#475569`   |
| Muted text         | `--text-muted`          | `#484F58`         | `#94A3B8`   |
| **Accent primary** | `--accent-primary`      | `#F59E0B` (amber) | `#F59E0B`   |
| Accent hover       | `--accent-hover`        | `#D97706`         | `#D97706`   |
| Accent light       | `--accent-light`        | `#2D1F00`         | `#FEF3C7`   |
| Success            | `--state-success`       | `#3FB950`         | `#10B981`   |
| Success light      | `--state-success-light` | `#0D2818`         | `#D1FAE5`   |
| Warning            | `--state-warning`       | `#F59E0B`         | `#F59E0B`   |
| Error              | `--state-error`         | `#F85149`         | `#EF4444`   |
| Error light        | `--state-error-light`   | `#2D0E0E`         | `#FEE2E2`   |

## Kanban Column Colors

| Column       | Dark bg   | Dark text | Light bg  | Light text |
| ------------ | --------- | --------- | --------- | ---------- |
| Applied      | `#1A1F35` | `#818CF8` | `#EEF2FF` | `#4F46E5`  |
| Phone Screen | `#1F1A00` | `#F59E0B` | `#FEF3C7` | `#D97706`  |
| Technical    | `#001A2D` | `#38BDF8` | `#E0F2FE` | `#0284C7`  |
| Offer        | `#001A10` | `#3FB950` | `#D1FAE5` | `#059669`  |
| Rejected     | `#2D0E0E` | `#F85149` | `#FEE2E2` | `#DC2626`  |

## Border Radius

| Context                 | Class                |
| ----------------------- | -------------------- |
| Buttons, inputs, badges | `rounded-lg` (8px)   |
| Cards, panels           | `rounded-xl` (12px)  |
| Modals, sheets          | `rounded-2xl` (16px) |
| Avatars                 | `rounded-full`       |

## Buttons — CRITICAL RULE

**NO gradient. NO glow. NO box-shadow on hover. NO blur. FLAT ONLY.**

- **Primary**: `bg-amber-500 text-black hover:bg-amber-400 rounded-lg font-medium`
- **Secondary**: `border border-[--border-default] bg-transparent hover:bg-[--bg-surface-raised] rounded-lg`
- **Destructive**: `bg-red-600 hover:bg-red-500 text-white rounded-lg`
- **Ghost**: `hover:bg-[--bg-surface-raised] rounded-lg`

## Component Library

shadcn/ui on top of Tailwind CSS. Components in `components/ui/`. Use shadcn CLI only. Never modify `components/ui/` manually.

## Layout Patterns

- **App shell**: Top navbar (64px) + left sidebar (240px fixed) + main content area
- **Navbar**: dark surface, bottom border, logo left — search + bell + theme toggle + avatar right
- **Theme toggle**: Sun/Moon icon in navbar, switches dark (default) ↔ light
- **Sidebar**: dark surface, right border, active item uses `--accent-light` bg + amber text
- **Kanban**: horizontal scroll, 280px fixed columns, draggable cards
- **Modals**: centered, max-width 540px, `rounded-2xl`
- **AI panel**: right slide-over 480px, streaming text with blinking cursor animation

## Icons

Lucide React. Stroke-based only.

`h-4 w-4` inline · `h-5 w-5` buttons · `h-6 w-6` feature icons

## Key UI Moments

- **Free tier banner**: amber left border, amber progress bar, dark surface bg
- **Upgrade button**: amber bg, black text, flat, bottom of sidebar
- **AI streaming**: blinking cursor `|` animation, no spinner
- **Language badge**: small `EN` or `FR` pill, monochrome border on cards
- **Empty states**: simple icon + JetBrains Mono message + CTA
