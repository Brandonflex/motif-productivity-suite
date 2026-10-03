/**
 * Why Motif exists.
 *
 * This file is the one place the product's reason for being is written down, so
 * the README, the welcome card, the About dialog and the Settings card all tell
 * the same story instead of three paraphrases of it.
 *
 * It is deliberately personal: Motif was built by one person to solve his own
 * week, and pretending otherwise would make it just another generic tracker.
 */

export const MAKER = {
  name: 'Brandon',
  github: 'Brandonflex',
  repo: 'https://github.com/Brandonflex/motif-productivity-suite',
  live: 'https://motif-productivity-suite.vercel.app',
} as const

export const ETHOS = {
  eyebrow: 'Why Motif exists',
  headline: 'Every tool I needed was already invented. The problem was the door.',
  lede: 'Motif started as a fix for my own week — not a business plan.',
  paragraphs: [
    'I built this because I got tired of renting my own productivity. Almost everything I lean on — quick capture, a daily plan, a focus timer, a weekly review, a rule that files things for me — already exists, done beautifully, in half a dozen apps. Each one does a piece of the job and then puts the useful half behind a subscription. Paying five times over to trust five different companies with the same eight features stopped feeling reasonable, so I stopped.',
    'Motif is my one roof. Capture, plan, focus, review and automate live in a single workspace that opens instantly and asks for nothing: no account, no trial, no tier, no “upgrade to unlock”. The parts that matter most to me — the review, the automations, the streak — are not the parts I have to pay to reach.',
    'It is encoded to me on purpose. It runs on my habits: my working window, my idea of a good day, a streak that forgives weekends because rest is part of the rhythm, badges that reward the work instead of the app-opening. And because I built it, a feature I want costs an evening rather than a plan upgrade — that flexibility is what I was actually paying for all along.',
    'It stays yours, too. Everything lives in your browser; your workspace is a file you can export, and if you stop using Motif, nothing of yours is trapped here. Fork it, change the copy, delete what you do not use. A tool you own is a tool you can trust.',
  ],
  principles: [
    {
      title: 'Free, and yours',
      body: 'No account, no trial, no tier that unlocks the useful half. The workspace is a JSON file you can export, and the whole suite is one repository and a build command.',
    },
    {
      title: 'One roof',
      body: 'The apps I would otherwise open in a day, folded together: capture like Todoist, planning like Things, focus like TickTick, triage like Linear, rituals like Sunsama, rules like Butler.',
    },
    {
      title: 'Built to be lived in',
      body: 'A productivity app should be worth opening on a bad Wednesday. The rhythm graph, the ranks and the small celebrations exist because showing up is the hard part — not the todo list.',
    },
  ],
  promise: ['No account.', 'No subscription.', 'No analytics.', 'Nothing leaves this browser.'],
  /** What the mark means, read outwards from the centre. */
  mark: [
    {
      part: 'The rosette',
      meaning:
        'one petal, repeated six times — a motif is a figure that repeats, which is also exactly what a habit is',
    },
    {
      part: 'The braid',
      meaning:
        'two ribbons crossing, warm and cool: effort and recovery, productivity and play, balanced rather than opposed',
    },
    { part: 'The beat', meaning: 'a pulsing core — a metronome for the day, the tempo a ritual gives a week' },
    { part: 'The spark', meaning: 'an orbiting dot: the next capture, the next small start' },
  ],
  credit: 'Designed, built and maintained by Brandon.',
  fork: 'Want it to feel like yours? Fork it and change the copy — that is the point.',
} as const

/** One-line version, for the sidebar and other tight spots. */
export const ETHOS_SHORT = `Built by ${MAKER.name} — no accounts, no subscriptions, nothing leaves your browser.`

/**
 * Where to start, shown once on a fresh workspace.
 *
 * Kept as data so the welcome card, the About dialog and the README cannot
 * drift apart on what the three first moves actually are.
 */
export const START_HERE = [
  {
    id: 'plan',
    title: 'Plan the day',
    body: 'One click picks a realistic set of work, checks it against your capacity, and lays it out inside your working window.',
    to: '/today',
    action: 'Open Today',
  },
  {
    id: 'capture',
    title: 'Capture anything',
    body: 'One line, plain language: “Pay the invoice tomorrow 2pm #finance ~45m every month”. It lands in the Inbox until you decide.',
    action: 'Capture something',
  },
  {
    id: 'rhythm',
    title: 'Watch the rhythm',
    body: 'Every day you move something forward fills a cell. Streaks, ranks and badges are there for the days the list is not enough.',
    to: '/insights',
    action: 'See Insights',
  },
] as const
