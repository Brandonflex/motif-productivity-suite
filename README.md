# Motif Productivity Suite

[![Quality Pipeline](https://github.com/Brandonflex/motif-productivity-suite/actions/workflows/ci.yml/badge.svg)](https://github.com/Brandonflex/motif-productivity-suite/actions/workflows/ci.yml)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-8-purple?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss)

> A local-first productivity suite for planning projects, tracking tasks and understanding your workload.
> Fast, keyboard-friendly, accessible, and private by default — your data never leaves the browser.

[**Live demo**](https://motif-productivity-suite.vercel.app/) · [**Report an issue**](https://github.com/Brandonflex/motif-productivity-suite/issues)

---

## What it does

| Area | Capability |
| :--- | :--- |
| **Dashboard** | Live workload stats (active projects, open/completed work, due today, overdue), an "up next" queue sorted by real due dates, a task-pipeline breakdown and per-project progress. |
| **Tasks** | Create, edit, complete and delete tasks; search plus status/priority filters; four sort modes; inline status changes; undo toast for deletions; keyboard- and screen-reader-friendly table. |
| **Projects** | Group related tasks, drag progress with a real slider (keyboard accessible), change status inline, see task load per project, and get warned before deleting a project (its tasks are reassigned, never lost). |
| **Settings** | Light/dark/system theme, JSON export **and** import with validation, workspace reset behind a confirmation dialog, and local-storage health reporting. |
| **Data** | Versioned `localStorage` persistence, schema validation on every read, automatic migration of legacy data, corruption recovery, cross-tab sync, and download/restore backups. |

Everything is client-side. There is no backend, no account, and no analytics — the app works offline and survives a
reload.

---

## Tech stack

| Layer | Choice |
| :--- | :--- |
| **Framework** | React 19 + React Router 7 (SPA, route-level code splitting) |
| **Build** | Vite 8 (rolldown) · TypeScript in strict mode |
| **Styling** | Tailwind CSS 3.4 + a CSS-variable design-token layer (`src/styles/tokens.css`) |
| **Components** | [`@blinkdotnew/ui`](https://www.npmjs.com/package/@blinkdotnew/ui) (Radix primitives) + a few local compositions |
| **Forms & validation** | react-hook-form + zod (one schema per entity, reused for storage validation) |
| **Dates** | date-fns (UTC-safe, calendar-date semantics) |
| **Feedback** | react-hot-toast (including an undo action on destructive operations) |
| **Icons** | lucide-react |
| **Testing** | Vitest + Testing Library (jsdom) — 77 tests covering storage, dates, theme, the store, the sidebar, shortcuts and all four views |
| **Quality** | ESLint 9 (flat config, `jsx-a11y`), Stylelint, `tsc --noEmit`, a design-token/contrast checker, GitHub Actions |

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
│   ├── app-shell/              # Shell, sidebar rail, theme switch
│   ├── feedback/               # Error boundary, suspense skeleton
│   └── ui/                     # ConfirmDialog, pills, pill tones, undo toast
├── features/
│   ├── workspace/              # Store: provider, context contract, useWorkspace hook
│   ├── dashboard/              # Workload overview
│   ├── tasks/                  # Task list + create/edit dialog
│   ├── projects/               # Project grid + create/edit dialog
│   └── settings/               # Appearance, data management, storage health
│                               # (each view ships its own *.test.tsx)
├── hooks/                      # useDocumentTitle, useHotkeys
├── lib/                        # storage, dates, ids, theme, sidebar, cn
├── routes/                     # NotFoundPage
├── test/                       # Vitest setup + render helpers/fixtures
└── types/workspace.ts          # zod schemas → inferred Task/Project/backup types
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
└── motif:workspace:v2     { tasks: Task[], projects: Project[] }
    motif:theme            'light' | 'dark'      (absent = follow system)
    motif:sidebar-collapsed
```

- **Schemas** live in `src/types/workspace.ts` (zod). Types are *inferred* from them, so runtime validation and
  compile-time types can never drift apart.
- **Reads are defensive.** Corrupted JSON, missing keys, wrong field types and out-of-range values are repaired or
  defaulted per field; a single bad row can never blank the workspace. Repairs are surfaced to the user instead of
  failing silently.
- **Migration.** Pre-v2 data stored under `motif_tasks_v1` / `motif_projects_v1` is migrated on first load, including
  `"Mar 4"`-style due dates, and the legacy keys are removed.
- **Writes are guarded.** Quota and private-mode failures are caught, reported in Settings, and no longer throw
  during render.
- **Backups** are validated before they replace anything: importing a file that merely *looks* like JSON is refused.
- **Cross-tab sync.** A `storage` event listener keeps multiple open tabs consistent.

Date values are calendar dates (`YYYY-MM-DD`) handled in UTC, so a task never moves because a user is behind or ahead
of UTC.

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

| Command | What it does |
| :--- | :--- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build + static finalisation/verification |
| `npm run preview` | Serve the built output locally |
| `npm run typecheck` | `tsc` for the app and for the Vite/Vitest config projects (strict) |
| `npm run lint:js` / `lint:js:fix` | ESLint 9 (typescript-eslint, react-hooks, jsx-a11y) |
| `npm run lint:css` / `lint:css:fix` | Stylelint (design-system CSS) |
| `npm run check:tokens` | Design-token + contrast guardrail |
| `npm test` / `npm run test:watch` | Vitest (jsdom) |
| `npm run lint` | Types + ESLint + Stylelint + tokens |
| `npm run verify` | Lint + tests + build — the full gate |

`.github/workflows/ci.yml` runs `npm run lint`, `npm test` and `npm run build` on every push and pull request to
`main`, then uploads the `dist/` artifact. (Note: GitHub only reads workflows from `.github/workflows/` — an earlier
copy of this pipeline lived at `.github/ci.yml` and therefore never ran.)

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

| Key | Where | Action |
| :--- | :--- | :--- |
| `/` | Tasks | Focus search |
| `N` | Dashboard, Tasks, Projects | Create a task/project |
| `Tab` / `Shift+Tab` | Everywhere | Move through the page; dialogs trap focus and return it on close |
| `Esc` | Dialogs, menus, selects | Close without saving |
| `Space` / `Enter` | Checkboxes, sliders, buttons | Toggle or activate the focused control |

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

- Backend sync or auth (everything is local-only today, by design).
- Kanban board and drag-to-reorder (the repo previously depended on `@dnd-kit`; re-add it when the feature lands).
- Charts and richer analytics (previous dependency on `recharts` was dropped until it is actually used).
- Recurring tasks, reminders, tags/labels, bulk actions.
- Test-time coverage reporting and visual regression tests.

---

## License

No license file is currently included; all rights reserved by the author. Add a license before accepting external
contributions.
