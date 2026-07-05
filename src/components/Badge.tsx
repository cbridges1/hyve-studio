import { badgeClasses } from './theme'

export type BadgeTone = 'neutral' | 'good' | 'bad' | 'active'

export function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return <span className={badgeClasses(tone)}>{children}</span>
}

/** Maps an execution status string to a Badge tone. */
export function executionTone(status: string): BadgeTone {
  if (status === 'succeeded') return 'good'
  if (status === 'failed') return 'bad'
  if (status === 'running') return 'active'
  return 'neutral'
}
