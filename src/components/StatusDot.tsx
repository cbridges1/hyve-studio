export function StatusDot({ healthy }: { healthy: boolean | null }) {
  const color =
    healthy === null ? 'bg-accent' : healthy ? 'bg-emerald-400' : 'bg-red-500'
  const label = healthy === null ? 'Connecting' : healthy ? 'Connected' : 'Unreachable'
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
      <span className="text-xs text-ink-dim">{label}</span>
    </span>
  )
}
