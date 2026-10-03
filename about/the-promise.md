# The promise

> **No account. No subscription. No analytics. Nothing leaves this browser.**

That sentence is the whole reason the project exists, so it seemed fair to spell out what it means, what it doesn't,
and how you can check it without taking my word for anything.

## What it means, concretely

- **No account** — there is no sign-up, no session, no user record anywhere. Opening the app creates a workspace in
  local storage; that's the entire onboarding.
- **No subscription** — every feature is in the one build. There's no tier, no trial, no "pro" flag in the code waiting
  to be switched on.
- **No analytics** — no tracker, no error reporter, no funnel events. The app makes no network requests after it loads.
- **Nothing leaves the browser** — your tasks, projects, focus sessions and settings are a JSON document in
  `localStorage` under `motif:workspace:v3`. There is no backend to send it to.

## How to check it yourself

1. **Watch the network.** Open DevTools → Network, use the app for a few minutes, and watch: the only requests are the
   files that loaded the app itself. Nothing is posted anywhere.
2. **Watch the storage.** DevTools → Application → Local Storage → your app's origin. Your workspace is right there,
   in plain JSON you can read — including the version field and the migration history.
3. **Take it offline.** Load the app, then put your machine in flight mode. Everything keeps working, because nothing
   was ever coming over the wire.
4. **Read the code.** `src/features/workspace/` holds the provider, `src/lib/storage.ts` holds the persistence, and
   there is no HTTP client anywhere in `src/`. `vercel.json` pins a strict Content-Security-Policy that would block
   third-party scripts and fonts even if someone added them later.
5. **Vercel's logs.** The deployment is on Vercel's free static hosting. The only thing it can see is that a browser
   asked for `index.html`.

## What it doesn't mean

- It is **not** a security guarantee. A local-first app is as private as the device it runs on; anyone with access to
  your browser profile can read your workspace, exactly as they could read your notes app.
- It is **not** a promise that your data is backed up. Nothing syncs, which is the point, but it also means an export
  is a real thing you should do occasionally — Settings → Export writes a JSON file you can keep.
- It is **not** an absolute claim about hosting. The static files are served by Vercel, so the host sees a request for
  a page. It never sees what's on the page.

## Why it's written down

Because "we take your privacy seriously" is a sentence every subscription tool writes, and none of them mean the same
thing by it. This one is checkable, and the checks are the four steps above. If a future change breaks any of them, the
promise in the [README](../README.md) is wrong and the change was wrong.

---

Next: [building it — the tools, and how to make it yours →](building-it.md)
