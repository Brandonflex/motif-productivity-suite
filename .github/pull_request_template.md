<!--
Keep pull requests open until the work is finished. Motif is a local-first app with
no migrations to run, so there is nothing that benefits from merging mid-stream.
-->

## What changed

<!-- One paragraph. Why, not just what. Link the issue if there is one. -->

## Preview

Vercel builds every branch automatically. The **branch alias** below always serves
the newest deployment of this branch; the per-deployment URL in the Vercel bot
comment is pinned to one commit.

- ✅ Preview: https://motif-productivity-suite-git-<branch-slug>-brandonflex108-4814.vercel.app
- Production (updates only when this PR is merged): https://motif-productivity-suite.vercel.app

## Verification

- [ ] `npm run verify` passes locally (types · ESLint · Stylelint · design tokens · tests · build)
- [ ] New behaviour is covered by tests where it is testable
- [ ] Accessibility: new interactive elements have accessible names and keyboard support
- [ ] No secrets, keys or credentials added; the app still makes no runtime network requests
- [ ] Storage changes stay backwards compatible (or ship a migration in `src/lib/storage.ts`)
- [ ] README / `.env.example` updated if commands, env vars or behaviour changed

## Data & privacy

- [ ] Nothing leaves the browser; exports stay explicit and user-initiated
- [ ] Imported data is validated with the zod schemas in `src/types/workspace.ts`
