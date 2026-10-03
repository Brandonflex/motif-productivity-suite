import type { ActivityDay, WorkKind } from '@/lib/achievements'

/**
 * Grid maths for the rhythm graph, kept out of the component so the view stays
 * a view (and so hot reload keeps working on it).
 */

/** Monday-first row index for a calendar date. */
export function rowOf(date: string): number {
  const day = new Date(`${date}T12:00:00.000Z`).getUTCDay()
  return (day + 6) % 7
}

/** Turns the day list into Monday-first columns of seven, padded with nulls. */
export function graphColumns(history: ActivityDay[]): Array<Array<ActivityDay | null>> {
  if (history.length === 0) return []
  const first = history[0]!
  const padded: Array<ActivityDay | null> = [...Array(rowOf(first.date)).fill(null), ...history]
  while (padded.length % 7 !== 0) padded.push(null)

  const columns: Array<Array<ActivityDay | null>> = []
  for (let index = 0; index < padded.length; index += 7) {
    columns.push(padded.slice(index, index + 7))
  }
  return columns
}

/** Which flavour of work a day was mostly made of. */
export function dominantKind(day: ActivityDay): WorkKind | null {
  const entries = Object.entries(day.kinds) as Array<[WorkKind, number]>
  const best = entries.reduce((winner, entry) => (entry[1] > winner[1] ? entry : winner), entries[0]!)
  return best[1] === 0 ? null : best[0]
}

/** Four density steps per work kind, all built from design tokens. */
export const KIND_CLASS: Record<WorkKind, { 1: string; 2: string; 3: string; 4: string }> = {
  deep: { 1: 'bg-deep/25', 2: 'bg-deep/45', 3: 'bg-deep/70', 4: 'bg-deep' },
  admin: { 1: 'bg-admin/25', 2: 'bg-admin/45', 3: 'bg-admin/70', 4: 'bg-admin' },
  light: { 1: 'bg-primary/25', 2: 'bg-primary/45', 3: 'bg-primary/70', 4: 'bg-primary' },
}

export const KIND_LABEL: Record<WorkKind, string> = {
  deep: 'deep work',
  admin: 'admin work',
  light: 'lighter work',
}

/** Maps a day's weight (finished work plus focused time) onto the four steps. */
export function intensity(day: ActivityDay, max: number): 1 | 2 | 3 | 4 {
  const weight = day.completed + day.focusMinutes / 45
  if (max <= 0) return 1
  const ratio = weight / max
  if (ratio > 0.75) return 4
  if (ratio > 0.5) return 3
  if (ratio > 0.25) return 2
  return 1
}
