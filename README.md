# Motif Productivity Suite

[![Quality Pipeline](https://github.com/Brandonflex/motif-productivity-suite/actions/workflows/ci.yml/badge.svg)](https://github.com/Brandonflex/motif-productivity-suite/actions/workflows/ci.yml)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-8-purple?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss)
![License](https://img.shields.io/badge/license-MIT-green)

> **Every tool I needed to run my week already existed. The problem was the door.**
>
> Each of them did one piece of the job beautifully, then put the useful half behind a subscription — five apps, five
> logins, five bills, to trust five companies with the same eight features. So I built my own roof instead: capture,
> plan, focus, review and automate in one workspace that opens instantly, works offline, and asks for nothing.
>
> Motif is a local-first productivity suite. It is also a personal tool, encoded to the way I actually work — and
> because it is one repository and a build command, a feature I want costs an evening rather than a plan upgrade.

[**Live demo**](https://motif-productivity-suite.vercel.app/) · [**Source**](https://github.com/Brandonflex/motif-productivity-suite) · [**Report an issue**](https://github.com/Brandonflex/motif-productivity-suite/issues)

**The story behind it:** [Why Motif exists](about/why-motif-exists.md) · [The mark](about/the-mark.md) ·
[The promise](about/the-promise.md) · [Building it](about/building-it.md) — the part of the repository that is about the
reason rather than the code. Built by me, **Brandon** ([@Brandonflex](https://github.com/Brandonflex)), as a personal
project kept in the open.

**Free, and yours:** no account, no trial, no tier that unlocks the useful half, no analytics. Your workspace is a JSON
file you own — export it whenever you like, and nothing of yours is trapped here.

---

---

## What it does

| Area            | Capability                                                                                                                                                                                                                                                                                                                                  |
| :-------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Dashboard**   | Momentum score, workload against capacity, due-today focus, an "up next" queue sorted by real due dates, a task-pipeline breakdown and per-project rollups.                                                                                                                                                                                 |
| **Today**       | A morning planning ritual (pick what today is actually for, with an over-capacity warning), auto-scheduled blocks inside your working window, three rings that answer the day at a glance, a pomodoro-style focus timer, an evening shutdown that rolls unfinished work into tomorrow, and a one-click `.ics` export of the committed plan. |
| **Inbox**       | Linear-style triage: capture first, decide later. Each item can be dated, assigned, promoted to the task list, or parked on the Someday shelf.                                                                                                                                                                                              |
| **Upcoming**    | The next three weeks, day by day, with overdue work at the top, a Someday shelf for undated work, recurrence badges and one-click reschedule.                                                                                                                                                                                               |
| **Tasks**       | **Four views of one dataset** — list, board (with WIP limits), Eisenhower matrix and a seven-day schedule canvas. Natural-language quick add, saved views, due-date filters, five sorts, multi-select bulk actions, dependencies, tags, energy and estimates.                                                                               |
| **Task detail** | A side inspector for everything about one task: dates, times, recurrence, tags, notes, dependencies, real focus time against the estimate, complete/delete with undo.                                                                                                                                                                       |
| **Projects**    | Group related tasks, drag progress or derive it automatically from completed work, set a target date, pause or archive, and see remaining effort against the deadline.                                                                                                                                                                      |
| **Insights**    | Four weeks of momentum, a completion heatmap, focus split by task, capacity and project rollups, a weekly review summary, plus the rhythm graph and the badge shelf.                                                                                                                                                                        |
| **Moments**     | A weekend-safe streak, ten ranks and sixteen badges across four tiers, a rhythm graph tinted by the kind of work each day was made of, and a celebration that fires exactly once per unlock.                                                                                                                                                |
| **Reminders**   | Derived from the tasks themselves: a nudge shortly before a pinned time, an optional desktop notification, and one daily check-in that is silent once the day is already planned.                                                                                                                                                           |
| **Automations** | No-code rules (Trello/Butler style): when a task is created, completed or moved, then set its priority, status, energy, tags, project or schedule it a few days out. Starter presets included.                                                                                                                                              |
| **Settings**    | Light/dark/system theme, focus and capacity defaults, working hours, reminder lead time and check-in hour, chime and rollover preferences, JSON export **and** import with validation, workspace reset behind a confirmation dialog, and local-storage health reporting.                                                                    |
| **Data**        | Versioned `localStorage` persistence, per-row revision clocks for conflict-free merges, tombstones, automatic migration of v1/v2 data, corruption recovery, cross-tab merge, and download/restore backups.                                                                                                                                  |

Everything is client-side. There is no backend, no account, and no analytics — the app works offline and survives a
reload.

---

## Why Motif exists

Motif is a personal answer to rented productivity. Almost everything I lean on — quick capture, a daily plan, a focus
timer, a weekly review, a rule that files things for me — is done beautifully somewhere, and almost all of it is behind
a paywall. Five apps meant five logins, five bills and five copies of the same eight features, and the switching itself
was eating the focus the tools were supposed to protect. So I built one roof instead: the parts that matter most to me
are not the parts I have to pay to reach.

> **The full story lives in [`about/`](about/README.md)** — [why I stopped renting my week](about/why-motif-exists.md)
> (including the trade I refused to make, and the two warnings I gave myself), [what the mark means](about/the-mark.md),
> [the promise and how to check it](about/the-promise.md), and
> [how to make it yours](about/building-it.md).

### Encoded to the maker

This is not a generic tracker with a logo on it. It runs on my habits:

- **My working window and my idea of a good day** — a morning plan, a focus goal, an evening shutdown. Capacity is checked
  before the day is committed, not after it collapses.
- **A streak that forgives weekends**, because rest is part of the rhythm rather than a gap in the record, and shields
  for the days when life happens anyway.
- **Badges for the work, never for the app-opening** — completions, focused minutes, days actually planned, shutdowns
  honoured. The reward is a good week, not a login streak.
- **Plain language capture** because I think in sentences: _"Pay the invoice tomorrow 2pm #finance ~45m every month"_.
- **Keyboard first, touch first, and no dead ends** — the same actions are reachable with ⌘K, with a thumb on a phone,
  and with a screen reader.

### The mark, and what it means

One drawing, two claims: a **rosette** (a single petal repeated six times — a _motif_ is a figure that repeats, which is
also what a habit is) braided with the **two traditions** the suite borrows from — the disciplined systems and the humane
ones — plus a **beat** and a **spark**. The name half and the balance half read from the same mark, which is the point:
[the full reading is here](about/the-mark.md).

### The promise

> **No account. No subscription. No analytics. Nothing leaves this browser.**

[How to verify that](about/the-promise.md) — the four checks, and the three things it doesn't mean. If you want this to
feel like yours, fork it and change the copy: that is not a licence footnote, it is the design goal.

---

## Concepts borrowed from proven platforms

Motif is not built in a vacuum: every mechanic below was taken from a product that has already proven it works, then
implemented here.

| Platform                                         | What was borrowed                                                                                                                              | Where it lives                                                                                     |
| :----------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------- |
| **Todoist**                                      | Natural-language quick add (`Pay invoice tomorrow 2pm #finance @admin !p1 ~45m every month`), recurrence phrases, a momentum/karma-style score | `src/lib/quick-add.ts`, `src/lib/recurrence.ts`, `src/lib/analytics.ts`                            |
| **Things 3**                                     | Start date _vs_ deadline, Today/Upcoming/Someday buckets, drag-to-insert rescheduling                                                          | `src/types/workspace.ts`, `src/features/upcoming/`, `views/ScheduleView.tsx`                       |
| **TickTick**                                     | Eisenhower matrix view, per-task focus sessions, energy and time estimates                                                                     | `views/MatrixView.tsx`, `src/features/focus/FocusTimer.tsx`                                        |
| **Linear**                                       | ⌘K command palette, single-key capture (`Q`), inbox-first triage, a side-panel task inspector, a sub-100 ms optimistic UI                      | `src/components/command-palette/`, `src/features/inbox/`, `src/features/tasks/TaskDetailPanel.tsx` |
| **Notion**                                       | Saved views (filter sets you can name and reuse), project rollups that derive progress from work done                                          | `src/features/tasks/TasksPage.tsx`, `src/lib/analytics.ts`                                         |
| **Asana**                                        | Task dependencies (`blocked by`), capacity/workload modelling against a working window                                                         | `src/lib/plan.ts`, `src/lib/analytics.ts`                                                          |
| **Trello / Butler**                              | Trigger → action automation rules, WIP limits with a visible warning on the board                                                              | `src/lib/rules.ts`, `src/features/settings/AutomationsCard.tsx`, `views/BoardView.tsx`             |
| **ClickUp / monday.com**                         | Dashboard widgets and roll-ups (completion heatmap, focus split, per-project effort)                                                           | `src/features/insights/InsightsPage.tsx`                                                           |
| **Motion**                                       | Auto-scheduling into free slots inside the workday, with fixed-time tasks pinned where you put them                                            | `src/lib/plan.ts`, `views/ScheduleView.tsx`                                                        |
| **Sunsama**                                      | A daily planning ritual with an over-commitment warning, an evening shutdown ritual, focus mode, weekly review                                 | `src/features/today/TodayPage.tsx`, `src/features/focus/`                                          |
| **Reclaim.ai** _(bonus)_                         | A daily focus goal, per-day capacity, a workday window, and deadline-aware scheduling                                                          | `src/types/workspace.ts` (`DEFAULT_SETTINGS`), `src/lib/plan.ts`                                   |
| **Local-first / CRDT practice** _(architecture)_ | Per-row `rev` + `updatedAt` merge clock, tombstones so deletions survive a merge, idempotent storage writes                                    | `src/lib/storage.ts`                                                                               |

Everything is client-side. There is no backend, no account, and no analytics — the app works offline and survives a
reload.

---

## Momentum you can feel

Tracking is the easy half of a productivity app; the hard half is being worth opening on a Wednesday. Motif answers that
with a streak layer whose heritage is GitHub's contribution graph, and whose execution is deliberately not a wall of
green squares.

### The rhythm graph, not a heatmap

The graph keeps what makes a contribution calendar work — one cell per day, a year at a glance — and changes what a cell
means:

- **Colour is the kind of work, not the volume.** Each day is filled with the flavour it was mostly made of: `deep`,
  `admin` or `light`, three tokens that exist in both themes. A month of deep work and a month of admin read
  differently at a glance, which is the question that actually changes behaviour.
- **Density is how much**, in four token-driven steps scaled to the busiest day in view.
- **Rest days are drawn, not blank.** A day you chose not to work is a hollow ring; an ordinary quiet day is a faint
  one. The graph never implies that stillness is a gap in your record.
- **Today is alive.** The current cell is ringed and breathes while the day is still open — a nudge, not a verdict.
- **Every cell is a button with a sentence.** Hover or focus reads "2026-03-05 · 3 finished · mostly deep work · 2h
  focus". Colour is never the only signal, and `prefers-reduced-motion` stills the reveals.

### Streaks that survive a real life

- Weekends never break a run; the streak counts _active_ days, and a Saturday off is not a failure.
- Every seven active days bank a **shield** (up to three). A shield absorbs one missed weekday without the count
  advancing — a budget for being ill, busy or human.
- Milestones (3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365) drive the next-badge copy, so there is always a number
  worth reaching that is not "more".

### Ranks, badges and one party each

Ten ranks run from **Sketchbook** to **Motif Master**, awarded for the work itself — completions, focused minutes,
days you actually planned, shutdowns, on-time delivery — never for opening the app. Sixteen badges sit across bronze,
silver, gold and legendary tiers; each one flips when tapped to show exactly what it takes and how far along it is.
Unlocks are replayed day by day from your own history, so they land on the date the work happened, and the celebration
(confetti, then a toast that names the badge) fires **exactly once** — the first run after installing records a silent
baseline instead of a confetti storm for work already done.

### Where the rings are, and why

A ring answers "how far along" faster than a bar when several sit together, and it survives being shrunk. Three
placements, each earning its space:

| Ring                              | Lives on               | Question it answers                                                    |
| :-------------------------------- | :--------------------- | :--------------------------------------------------------------------- |
| Focus goal / capacity / streak    | Today, side by side    | "Have I done enough, is the plan realistic, am I on a run?"            |
| Interval progress                 | Focus timer            | "How much of this interval is left?" — a sweeping arc around the clock |
| Rank, badge progress, streak chip | Sidebar footer, badges | "Where am I overall?" without leaving the page                         |

Measured comparisons stay as bars (capacity, completion, project rollups) — a ring is a gauge, not a replacement for a
chart.

### Motion and depth, with an off switch

Depth comes from four cheap tricks that never touch the network: a fixed aurora backdrop behind the app, pointer-tilt
stat cards (a real transform driven by CSS custom properties, plus a gradient glare), flip cards for badges, and
canvas confetti on unlocks. Everything animated is CSS, SVG or a single `requestAnimationFrame` burst — no 3D library,
no CDN, no per-frame React re-render, and nothing that violates the strict CSP in `vercel.json`.

The contract is simple: **decoration never blocks work, and reduced motion wins.** One global media query stills every
keyframe, and the JavaScript effects ask `useReducedMotion()` before they run, so a user who has asked their system for
calm gets a calm, fully functional app.

### Motion around the mark

The mark itself is explained under [why Motif exists](#the-mark-and-what-it-means): one petal repeated, two braided
ribbons, a beat and a spark. It animates — slow rosette rotation, counter-rotating ticks, a drawn braid, a heartbeat —
and accepts `animated={false}` for dense lists, print and favicons.

### Reminders without a scheduler

Reminders are **derived**, not stored: a task with a pinned time knows when it needs attention, so there is no second
object to keep in sync and nothing to clean up when work is completed or deleted. One 30-second interval covers the
whole app and announces a task inside its lead window (5–60 minutes, configurable) or up to half an hour after the
time, so a reminder that arrived while the tab was closed is still useful when it opens. Each announcement is recorded
once. Desktop notifications are strictly opt-in and asked for in context, in Settings; the in-app toast is the default
and needs no permission at all.

---

## Tech stack

| Layer                  | Choice                                                                                                                                                                                                    |
| :--------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Framework**          | React 19 + React Router 7 (SPA, route-level code splitting)                                                                                                                                               |
| **Build**              | Vite 8 (rolldown) · TypeScript in strict mode                                                                                                                                                             |
| **Styling**            | Tailwind CSS 3.4 + a CSS-variable design-token layer (`src/styles/tokens.css`)                                                                                                                            |
| **Components**         | [`@blinkdotnew/ui`](https://www.npmjs.com/package/@blinkdotnew/ui) (Radix primitives) + a few local compositions                                                                                          |
| **Forms & validation** | react-hook-form + zod (one schema per entity, reused for storage validation)                                                                                                                              |
| **Dates**              | date-fns (UTC-safe, calendar-date semantics)                                                                                                                                                              |
| **Feedback**           | react-hot-toast (including an undo action on destructive operations)                                                                                                                                      |
| **Icons**              | lucide-react                                                                                                                                                                                              |
| **Testing**            | Vitest + Testing Library (jsdom) — the suite in [Quality pipeline](#quality-pipeline) covers planning, recurrence, automations, storage v3 merges and migration, the store, rituals, the focus timer, routing, keyboard shortcuts and every view |
| **Quality**            | ESLint 9 (flat config, `jsx-a11y`), Stylelint, `tsc --noEmit`, a design-token/contrast checker, GitHub Actions                                                                                            |

---

## Getting started

### Prerequisites

- **Node.js** ≥ 20.19 (CI runs 22)
- **npm** ≥ 10

### Install & run

```bash
git clone https://github.com/Brandonflex/motif-productivity-suite.git
cd motif-productivity-suite
npm install
npm run dev          # http://localhost:5173
```

### Environment

Copy `.env.example` to `.env.local` if you want to change the canonical origin baked into
`<link rel="canonical">`, `og:url`, `robots.txt` and `sitemap.xml` at build time:

```bash
VITE_SITE_URL=https://your-domain.example   # optional, defaults to the Vercel deployment
```

> Only `VITE_`-prefixed variables reach the browser, and everything that does is public by definition.
> Never put secrets in them — this app ships as static files.

---

## Project structure

```
src/
├── app.tsx                     # Route table, layout wiring, lazy-loaded views
├── main.tsx                    # Entry point: theme bootstrap, router, toaster, error boundary
├── index.css                   # Tailwind layers + base styles
├── styles/tokens.css           # Design tokens (light, dark + prefers-color-scheme)
├── components/
│   ├── app-shell/              # Shell, sidebar rail, theme switch, header actions
│   ├── brand/                  # The Motif mark (animated lockup + favicon geometry)
│   ├── command-palette/        # ⌘K palette + global shortcut wiring
│   ├── feedback/               # Error boundary, suspense skeleton
│   ├── fx/                     # Canvas confetti (reduced-motion aware)
│   ├── quick-add/              # Natural-language capture field + dialog
│   └── ui/                     # ConfirmDialog, pills, ProgressRing, TiltCard, undo toast
├── features/
│   ├── workspace/              # Store: provider, context contract, useWorkspace hook
│   ├── dashboard/              # Workload overview
│   ├── today/                  # Morning plan, focus, evening shutdown
│   ├── inbox/                  # Capture triage
│   ├── upcoming/               # Three-week schedule + Someday shelf
│   ├── tasks/                  # Views (list/board/matrix/schedule), dialog, inspector
│   ├── projects/               # Project grid + create/edit dialog
│   ├── focus/                  # Focus timer (ring-driven interval)
│   ├── achievements/           # Streak, rank, badge shelf, rhythm graph
│   ├── reminders/              # Reminder loop (tests; logic lives in lib/reminders)
│   ├── insights/               # Momentum, heatmap, rhythm, badges, rollups
│   └── settings/               # Appearance, planning, reminders, automations, data, health
│                               # (each view ships its own *.test.tsx)
├── hooks/                      # useDocumentTitle, useHotkeys, useReducedMotion, useReminders
├── lib/                        # storage, dates, ids, theme, sidebar, cn, quick-add,
│                               # recurrence, plan, rules, analytics, filters, achievements,
│                               # rhythm, reminders, ics
├── routes/                     # NotFoundPage
├── test/                       # Vitest setup + render helpers/fixtures
└── types/workspace.ts          # zod schemas → inferred Task/Project/backup types
about/                          # The human half of the repository: why it exists, the mark,
                                # the promise, and how to fork it (GitHub-readable markdown)
scripts/
├── finalize-static-build.mjs   # Post-build verification + canonical URL rewriting
└── check-design-tokens.mjs     # Fails CI when tokens or contrast contracts break
```

**Where to add a feature:** put domain logic in `src/lib` or `src/features/<name>`, keep components
presentational, and never import `localStorage` directly — go through `src/lib/storage.ts`.

---

## Data model & persistence

```
localStorage
├── motif:workspace:v3     the whole workspace (tasks, projects, focus, logs, rules, views)
├── motif:tasks-view       last used task view (list | board | matrix | schedule)
├── motif:theme            'light' | 'dark'      (absent = follow system)
└── motif:sidebar-collapsed
```

- **Schemas** live in `src/types/workspace.ts` (zod). Types are _inferred_ from them, so runtime validation and
  compile-time types can never drift apart.
- **Reads are defensive.** Corrupted JSON, missing keys, wrong field types and out-of-range values are repaired or
  defaulted per field; a single bad row can never blank the workspace. Repairs are surfaced to the user instead of
  failing silently.
- **Migration.** v2 workspaces and pre-v2 data stored under `motif_tasks_v1` / `motif_projects_v1` are migrated on
  first load, including `"Mar 4"`-style due dates, and the legacy keys are removed.
- **Writes are guarded.** Quota and private-mode failures are caught, reported in Settings, and no longer throw
  during render.
- **Backups** are validated before they replace anything: importing a file that merely _looks_ like JSON is refused.
- **Cross-tab sync.** A `storage` event listener keeps multiple open tabs consistent.

Date values are calendar dates (`YYYY-MM-DD`) handled in UTC, so a task never moves because a user is behind or ahead
of UTC.

### The workspace file (v3)

```
motif:workspace:v3   {
  tasks, projects, focusSessions, dailyLogs, rules, savedViews,
  tombstones, settings
}
```

Every task and project carries a `rev` and an `updatedAt`, so two tabs (or an imported backup) can be merged without
losing either side: the newer revision wins per row, deletions leave a tombstone and beat any older edit. Focus
sessions, day logs, rules and saved views merge by id. On save the snapshot is pruned (the newest 2 000 focus sessions,
one log per day, tombstones older than 90 days) so a long-lived workspace cannot creep past the storage quota.

---

## Design system

Colours, radii, fonts and motion are defined once in `src/styles/tokens.css` as HSL triplets and mapped onto Tailwind
utilities in `tailwind.config.js`:

```css
:root        { --background: 40 43% 97%; --foreground: 24 10% 10%; /* parchment + espresso */ }
@media (prefers-color-scheme: dark) { :root:not(.light) { … } }    /* pre-paint dark mode */
.dark        { … }                                                 /* explicit choice */
```

Use semantic utilities (`bg-card`, `text-muted-foreground`, `border-border`, `text-primary`) rather than raw palette
colours, so light and dark stay in sync automatically.

`npm run check:tokens` enforces the contract:

1. every token mapped in Tailwind exists in both themes,
2. the `prefers-color-scheme` and `.dark` blocks are identical (no drift),
3. **WCAG contrast** for every text/background pair (4.5:1) and control/background pair (3:1).

The selected theme is applied through `src/lib/theme.ts`; because the dark tokens also exist behind a media query, a
dark-mode user sees the right colours on the very first paint — before any JavaScript runs.

---

## Quality pipeline

| Command                             | What it does                                                       |
| :---------------------------------- | :----------------------------------------------------------------- |
| `npm run dev`                       | Vite dev server                                                    |
| `npm run build`                     | Production build + static finalisation/verification                |
| `npm run preview`                   | Serve the built output locally                                     |
| `npm run typecheck`                 | `tsc` for the app and for the Vite/Vitest config projects (strict) |
| `npm run lint:js` / `lint:js:fix`   | ESLint 9 (typescript-eslint, react-hooks, jsx-a11y)                |
| `npm run lint:css` / `lint:css:fix` | Stylelint (design-system CSS)                                      |
| `npm run check:tokens`              | Design-token + contrast guardrail                                  |
| `npm test` / `npm run test:watch`   | Vitest (jsdom)                                                     |
| `npm run test:coverage`             | The same suite with a v8 coverage report                           |
| `npm run format`                    | Prettier with the repo's pinned config (opt-in, not a gate)        |
| `npm run lint`                      | Types + ESLint + Stylelint + tokens                                |
| `npm run verify`                    | Lint + tests + build — the full gate                               |

The suite is **30 files / 275 tests** and covers **83.8 % of statements**, 76 % of branches and 85.8 % of lines —
concentrated where the logic is (`src/lib/**`), with the views covered through the routes users actually take.

`.github/workflows/ci.yml` runs `npm run lint`, `npm test` and `npm run build` on every push and pull request to
`main`, then uploads the `dist/` artifact. (Note: GitHub only reads workflows from `.github/workflows/` — an earlier
copy of this pipeline lived at `.github/ci.yml` and therefore never ran.)

Formatting is prettier, pinned in `.prettierrc.json` — **120 columns, single quotes, no semicolons, trailing commas**.
It is a convention rather than a gate: `npm run format` is opt-in because a handful of long expressions are wrapped by
hand where a formatter would rather run them off the right edge, and reformatting the whole tree to satisfy a checker
would produce a diff nobody asked to review.

---

## One app, every device

Motif is built for the same workspace on a phone, a tablet, a laptop and a desktop — with the same features, not a
"lite" version of them. The interesting part is that size and input device are different questions: a tablet is wide
_and_ finger-driven, and a desktop window can be narrow. So the layout is responsive, and the _interaction_ adapts to
the pointer.

```js
// tailwind.config.js — device tiers, not size guesses
addVariant('coarse', '@media (pointer: coarse)') // fingers: ≥44px targets
addVariant('fine', '@media (pointer: fine)') // mice: density
addVariant('hoverable', '@media (hover: hover)') // only where hover exists
```

- **Touch parity for every shortcut.** ⌘K and `Q` open the palette and capture on a keyboard; the mobile header carries
  the same two actions as buttons, next to the drawer trigger. A phone has no keyboard, so a keyboard-only feature is a
  missing feature.
- **Thumbs, not mice.** Rows, checkboxes, view switchers, triage buttons and the rhythm-graph cells grow to ~44px under
  `pointer: coarse` and stay dense under `pointer: fine`. No guessing from screen width.
- **The drawer behaves like a drawer.** Tapping the scrim, pressing Escape, or navigating from inside it closes the
  mobile menu — and the scrim makes the page behind it unmistakably inert.
- **Notches and home indicators are layout, not afterthoughts.** The shell insets itself for `safe-area-inset-*`, and
  toasts sit above the home indicator and never exceed the viewport width.
- **Browser chrome is a variable.** Overlays use `dvh` (not `vh`) and cap their width relative to the viewport, so the
  on-screen keyboard cannot push the last command result or the "Save task" button out of reach.
- **Motion respects the device and the person.** Tilt, parallax and glow are pointer-driven and skip touch entirely;
  every animation is stilled by `prefers-reduced-motion`.
- **No horizontal scrollbars, anywhere.** Wide content (the task table, the seven-day schedule canvas, the rhythm graph)
  scrolls inside its own container while the page itself stays put.

Parity is asserted in the test suite, not just claimed: `src/components/app-shell/devices.test.tsx` checks that the
touch header carries the keyboard's actions, that the drawer closes on scrim click, Escape and navigation, that the
shell applies its safe-area inset, and that dialogs stay inside a small viewport.

---

## Accessibility

- Every interactive control is a real button, link, checkbox or slider with an accessible name; icon-only buttons
  carry `aria-label`s and tooltips.
- Dialogs and confirmations use Radix primitives: focus trapping, escape-to-close, `aria-modal`, and focus return.
- The task table is a semantic `<table>` with a caption and column scopes; status is never communicated by colour
  alone.
- A "Skip to content" link, visible focus rings, `aria-live` regions for result counts, and
  `prefers-reduced-motion` support are built in.

---

## Keyboard shortcuts

| Key                 | Where                        | Action                                                                |
| :------------------ | :--------------------------- | :-------------------------------------------------------------------- |
| `Q`                 | Everywhere                   | Capture a task from anywhere (natural language)                       |
| `⌘K` / `Ctrl+K`     | Everywhere                   | Command palette — jump to any view, create a task, run a daily ritual |
| `/`                 | Tasks                        | Focus search                                                          |
| `N`                 | Dashboard, Tasks, Projects   | Create a task/project                                                 |
| `Tab` / `Shift+Tab` | Everywhere                   | Move through the page; dialogs trap focus and return it on close      |
| `Esc`               | Dialogs, menus, selects      | Close without saving                                                  |
| `Space` / `Enter`   | Checkboxes, sliders, buttons | Toggle or activate the focused control                                |

Shortcuts never fire while you are typing, while a modifier key is held, or while a dialog is open, and every one of
them is mirrored by a visible control — they are an accelerator, not a hidden requirement.

---

## Security & privacy

- **No secrets in the bundle.** The app makes no network requests at runtime; the design tokens, fonts and icons are
  all self-hosted. (A previously committed third-party publishable key was removed — put credentials in the hosting
  provider's environment, never in source.)
- **Hardened response headers** in `vercel.json`: a content-security policy with `default-src 'self'` and
  `script-src 'self'` (no inline or third-party scripts), plus `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy`, COOP and HSTS. `'unsafe-inline'` is allowed for styles only, because React
  and Radix set inline `style` attributes; `font-src` no longer whitelists a font CDN either, since the typeface is
  self-hosted.
- **No editor hooks in the bundle.** The scaffold's picker plugin (`blink-tagger.plugin.mjs`), which injected a
  design-editor runtime that posted messages to `window.parent`, has been deleted — it was not referenced by the Vite
  config, but it did not belong in a shipped app.
- **Input handling.** All rendering goes through React (no `dangerouslySetInnerHTML` anywhere), user text is length
  limited at the schema level, and every field that reaches storage is re-validated on the way back in.
- **Data ownership.** The workspace stays in the browser; exports are explicit, user-initiated downloads.

---

## Deployment

The app builds to plain static files in `dist/`.

- **Vercel** — `vercel.json` already contains SPAs all-routes rewrites, cache headers for hashed assets and the
  security headers above. Import the repo and deploy; no build settings to change.
- **Netlify / Cloudflare Pages / any static host** — publish `dist/`, add a rewrite of `/*` to `/index.html` for
  client-side routing, and re-apply the headers (they are plain HTTP headers, not Vite config).
- **Branch previews.** Vercel builds every branch that is pushed, so review links never depend on a local dev server.
  `pull_request_template.md` records the current preview on each PR; the per-branch alias
  `motif-productivity-suite-git-<branch>-brandonflex108-4814.vercel.app` always points at that branch's newest
  deployment, while the production domain only moves when `main` does.
- Set `VITE_SITE_URL` in the host's environment so `robots.txt`, `sitemap.xml`, the canonical link and `og:url`
  point at your own domain instead of the demo deployment.

### Bundle size

The single biggest chunk is the component library: `@blinkdotnew/ui` ships one barrel module without an ESM
`sideEffects` flag, so bundlers keep the whole surface (Radix primitives, chart wrappers) even though Motif only uses
a fraction of it. The app compensates by keeping vendor code in separate, long-lived chunks and by code-splitting every
route, so repeat visits and in-app navigation stay cheap. Compressed transfer for a first load is ~250 kB (the React, forms and UI-library chunks), and every route after
that adds only a few kB.

---

## Roadmap

Deliberately not shipped yet — these are the natural next steps, and the store/schema layer is ready for them:

- Backend sync or auth — deliberately not started: an account is the door this project exists to avoid, so any
  sync would have to stay optional and self-hostable.
- Pointer-based drag-and-reorder inside the board (the schedule canvas already accepts drops; `@dnd-kit` is not needed
  for the HTML5 drag-and-drop MVP that shipped).
- Visual-regression tests (the suite runs in jsdom; there is no headless browser in the pipeline yet).
- A standalone habit tracker — the rhythm graph and streak layer cover the daily-habit case today, without a second
  list to maintain.
- Editing a task's pinned time by dragging the block on the schedule canvas (dragging between days already works).

---

## License

[MIT](LICENSE) © 2026 Brandon. In practice that means the ordinary thing: read it, run it, fork it, rename it, make it
yours. The only parts worth carrying over if you build on it are the ones that keep it honest — no accounts, no
analytics, no server holding somebody's week.
