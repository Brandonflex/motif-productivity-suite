# Building it

A note on how this is put together, mostly so that the next person who opens the repository — or the version of me who
comes back in six months — knows what was deliberate.

## The tools I love, kept

I built it with the stack I already reach for, because a personal project is a bad place to learn ten new things at
once: **React 19**, **TypeScript** in strict mode, **Vite**, **Tailwind** on a token-based design system, and
**local-first storage** with an explicit migration path. Tests run in **Vitest**, the gate is one command, and CI runs
the same gate on every push.

The list matters less than the shape: one folder per feature (`src/features/*`), pure logic in `src/lib/*`, and a
workspace that is a plain JSON document in the browser. Anything I want to change later — a screen, a rule, the entire
design language — is a file I can open, not a setting I have to request.

Two habits from the rebuild worth keeping:

- **Every colour is a token with a contrast test.** `npm run check:tokens` walks the palette in light and dark and
  fails the build on a contrast regression, so "make it look nicer" can't quietly make it unreadable.
- **The design system is honest about the device.** Touch targets, safe areas and reduced-motion behaviour are part of
  the components rather than patches applied to a phone later.

## Why the code and the look are mine

This repository was built to be read by one person: me. That's why the README explains rejected trade-offs instead of
selling a feature list, why the logo is drawn from a single repeated stroke, and why commit messages here say *why*
something exists before what it does.

It also means the aesthetic isn't a theme on top of a template. The palette, the type scale, the way the sidebar
narrows to a rail, the mark in the corner — all of it was chosen here, for this app, and it's all editable in the same
place as the logic.

## A feature is an evening, not a plan upgrade

The real advantage of owning the thing: when my week changes, the app can change with it. I wanted a shutdown that
carries leftovers into tomorrow, so I wrote one. I wanted a streak that forgives weekends, so I changed the rule
instead of asking support. There's no backlog to lobby.

## Make it yours

You don't need permission. It's a public repository written to be read, and the README says plainly what this is for:

1. **Fork it.** Then change the copy, the palette and the name in your own repo — the fastest way to feel like a tool
   is yours is to see your own words in it.
2. **Run it locally.** `npm install`, `npm run dev`, and you're at `http://localhost:5173` with a workspace of your own.
3. **Change one thing.** Add the field your week needs, delete the screen you never open, or replace the streak rule
   with one that matches your calendar. Every feature folder is self-contained on purpose.
4. **Keep the promise.** If you build on this, the parts worth keeping are the ones that keep it honest: no accounts,
   no analytics, no server holding someone's week.

If you want to know what the app itself does, the [README](../README.md) is the guided tour — the concepts it borrows,
the rhythm graph, the rings, the keyboard map and the quality gate.

---

Back to [the index](README.md), or the [repository README](../README.md).
