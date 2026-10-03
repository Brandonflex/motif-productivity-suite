# The mark

The logo is one drawing that has to say two things at once: **the name** and **the balance**.

<img src="mark.svg" alt="The Motif mark: a six-petal rosette braided with two ribbons, a pulsing core and an orbiting spark" width="140">

`public/favicon.svg` and `src/components/brand/MotifMark.tsx` are the same geometry — the browser tab and the app header
show the same figure.

## The name half — repetition

A *motif* is a figure that repeats. The mark is built from one petal, rotated six times around the centre: a single
repeated stroke, coming back around, which is also exactly what a habit is. Nothing in the rosette is drawn twice —
the repetition *is* the shape. That's the app in one sentence: the same small piece of work, returned to often enough
to become a pattern.

## The balance half — two traditions, braided

Through the middle run two ribbons, one warm and one cool, drawn as a single looping path. They stand for the two
schools of productivity software the suite borrows from and refuses to choose between:

- **The disciplined systems** — the ones that give you statuses, dependencies, capacity, automation and cycles.
  Structure that holds a week together.
- **The humane ones** — the ones that protect a morning, forgive a missed day and remind you that rest is part of the
  rhythm. Permission to be a person.

Every borrowed idea in the README traces back to one of those two, and the braid is the promise that they're tied
together rather than ranked. Effort **and** recovery. Focus **and** play.

## Beat and spark

- **The beat** — a pulsing core in the centre of the rosette: the tempo a ritual gives a week. It's the only part that
  moves on its own.
- **The spark** — a small dot orbiting the outside: the next capture, the next small start. The thing you're about to
  write down, circling until you do.

## How it moves

The lockup animates rather than being a static image: the rosette draws itself, the braid settles, the core keeps a
slow beat and the spark drifts. It's CSS and inline SVG only — the Content-Security-Policy forbids external scripts and
fonts, and a logo that needs a network request is a logo that isn't there when you open the app offline.

Two rules keep it from becoming decoration:

- **Motion is an invitation, not a toll.** It runs on the sidebar mark and the lockup, never in front of the work, and
  it costs nothing to ignore.
- **`prefers-reduced-motion` switches it off.** The mark keeps its shape and its colours; only the movement stops.

---

Next: [the promise, and how to check it →](the-promise.md)
