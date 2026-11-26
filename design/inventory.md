# 6.1 — Inventory before the redesign (26/11/2026)

Screenshots in `design/before/`, taken from the demo workspace (fictional data), at
**1440 px and 390 px**, **dark and light** themes: `<screen>-<width>-<theme>.png`
(92 files). To capture them again: `CAPTURE=1 npm run test:e2e -- capture.spec.ts`
(`e2e/capture.spec.ts`). The script blocks every AI and Stripe call.

The round "N" badge at the bottom left and the "Compiling…" pill are the Next.js dev
indicator: they are not in production.

## Screens captured

| # | Screen | Files |
|---|---|---|
| 01 | Home page (full) | `01-home-*` |
| 02 | Home page with the "too many demos" message | `02-home-demo-limit-message-*` |
| 03–04 | Sign in, sign up (Clerk) | `03-sign-in-*`, `04-sign-up-*` |
| 05 | Dashboard (full page, then first screen) | `05-dashboard-*`, `05b-dashboard-first-screen-*` |
| 06 | Applications, kanban | `06-applications-kanban-*` |
| 07–10 | Detail panel: Overview, Resume (fact-check panel), Cover Letter, Interview (empty) | `07`…`10` |
| 11 | Confirmation dialog ("Regenerate the adapted CV?") | `11-confirm-dialog-*` |
| 12 | Detail panel: Interview with questions | `12-detail-interview-questions-*` |
| 13 | New application modal | `13-new-application-modal-*` |
| 14 | My CV | `14-my-cv-*` |
| 15–16 | Interview Prep, mock interview | `15-interview-prep-*`, `16-mock-interview-*` |
| 17 | Settings | `17-settings-*` |
| 18–19 | Kanban loading and error states | `18-applications-loading-*`, `19-applications-error-*` |
| 20–22 | Empty states: dashboard, kanban, Interview Prep | `20`…`22` |

Not captured:
- **Upgrade modal**: there is none. "Upgrade" goes straight to Stripe Checkout, and I
  did not click it so that no Stripe test customer was created.
- **Demo banner**: shown on every screenshot from 05 onwards, so it has no file of its own.

## What the screenshots show

### Whole application
- **Font**: `--font-sans` is JetBrains Mono (`globals.css`, lines 12–13 and 152–156), so
  all the text is monospaced. Long sentences become hard to read, especially on mobile.
- **Colours**:
  - 166 Tailwind `amber-*` classes and 71 other palette classes (indigo, violet, sky,
    emerald, rose…), plus 19 hex values in `.tsx` files.
  - Amber is used for main actions, links, the active menu item, badges and icons.
  - The stats cards have coloured icons (indigo, emerald, sky, amber), and company
    avatars get a random colour.
- **"Upgrade" appears three times on the dashboard**: the sidebar card ("Upgrade —
  $9/mo"), the free-plan banner ("Upgrade to Pro →") and, in Settings, the plan card.
  Plan rule: one at a time.
- **Light theme**: works, but the sidebar card and the banner stay amber on white, with
  low contrast for the small grey text (`text-muted` at 10–11 px).
- **Mock interview** (`16-*`): a full-screen overlay **without `role="dialog"`** or a
  focus trap.

### Mobile (390 px) — every screen in the app
- **The page is wider than the screen** (510 px wide on the dashboard): there is
  horizontal scrolling on every page in the app.
- The sidebar stays open and takes half the width (240 px); the content is squeezed
  into the remaining ~150 px.
- **Dashboard** (`05-dashboard-390-*`):
  - Stats cards are crushed, with icons on top of the labels.
  - "New Application" spills off the screen.
  - The free-plan banner is one word per line.
- **Demo banner**: 9 lines.
- **Kanban** (`06-*-390-*`): a single column is visible and cut off; the filters wrap onto
  three lines.
- **Detail panel** (`07`–`12`, 390):
  - Almost full width, but not full screen.
  - The tabs spill over: "Interview" is hidden.
  - The "Regenerate" button is cut off.
- **Recent Applications table**: only the first column is visible.

### Screen by screen (desktop)
- **Home page** (`01-*`):
  - Generic promise ("Land your dream job faster with AI") and an "AI-Powered Job
    Search" pill.
  - **Invented figures**: "500+ applications tracked", "1,200+ CVs adapted", "4.9 / 5
    average rating". Nothing backs them up; to remove (README rule: every statement must
    be true).
  - **A domain that is not the app's**: "jobpilot.app" in the mock window.
  - The product screenshots are blurry miniatures.
  - "Try the demo" is a secondary button.
- **Dashboard** (`05-*`): readable at 1440 px. The figures have been accurate since step 5.
  The coloured stats icons and the three upgrade calls compete with each other.
- **Kanban** (`06-*-1440-*`): **the fifth column (Rejected) is cut off on the right** at
  1440 px, and you have to scroll inside the board to see it.
- **Detail panel**: the fact-check panel is clear. Labels and buttons are tested by E2E
  at 1440, 1175 and 390 px.
- **My CV** (`14-*`): **in the demo, the page offers an upload zone** ("Drop your CV
  here") even though uploading is refused (403) and the demo already has a fictional CV.
  The visitor never sees that CV.
- **Interview Prep / mock interview**: clean, but the timer is amber and the "Next" button
  sits at the bottom of a mostly empty screen.
- **Settings** (`17-*`): the plan card has its "Upgrade to Pro" button and the sidebar
  card has its own as well (two at once). Stripe test mode is not mentioned outside the
  demo banner.
- **Loading / error / empty states**:
  - The kanban has a skeleton (`18-*`).
  - **The error state (`19-*`) is misleading**: when the server fails, the page shows
    "0 applications across 5 stages · No applications yet" as if the board were empty.
  - The empty states (`20`–`22`) have a message and a call to action.

## Decisions left to Gninho (not taken)
1. Remove the home page's invented figures (500+, 1,200+, 4.9/5): recommended. They are
   product copy, so you decide.
2. My CV in the demo: show the fictional CV as read-only instead of the upload zone (my
   proposal for 6.5, "My CV" area).
3. The kanban error state: an error message with a "Retry" button instead of "No
   applications yet" (6.5, "kanban" area).
