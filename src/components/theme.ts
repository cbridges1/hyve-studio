// Shared style tokens. Colors themselves live in tailwind.config.js
// (base.bg/panel/raised/border, ink/ink-dim/ink-faint, accent) — this file
// only holds reusable class-name fragments so every section composes the
// same look instead of re-deriving contrast decisions per component.

export const panel = 'bg-base-panel border border-base-border rounded-lg'
export const raisedRow =
  'bg-base-raised border border-base-border rounded-lg px-4 py-3'

export const heading = 'text-base font-semibold text-ink mb-4'
export const subtext = 'text-ink-dim text-sm'
export const label = 'block text-xs font-medium text-ink-dim mb-1'

export const input =
  'w-full bg-base-bg border border-base-border rounded-md px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors'

export const textarea = `${input} font-mono text-xs leading-5 resize-y`

export const buttonBase =
  'text-xs px-3 py-1.5 rounded-md font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed'

export const buttonPrimary = `${buttonBase} bg-accent text-black hover:bg-accent-hover`
export const buttonSecondary = `${buttonBase} bg-base-raised text-ink border border-base-border hover:border-ink-faint`
export const buttonDanger = `${buttonBase} bg-transparent text-red-400 border border-red-900/50 hover:bg-red-950/40`

export function badgeClasses(tone: 'neutral' | 'good' | 'bad' | 'active'): string {
  const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium'
  switch (tone) {
    case 'good':
      return `${base} bg-emerald-950 text-emerald-300 border border-emerald-800/60`
    case 'bad':
      return `${base} bg-red-950 text-red-300 border border-red-800/60`
    case 'active':
      return `${base} bg-accent-soft text-accent border border-accent/30`
    default:
      return `${base} bg-base-raised text-ink-dim border border-base-border`
  }
}
