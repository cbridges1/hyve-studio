import { useEffect, useRef } from 'react'

export function LogPane({ lines }: { lines: string[] }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' })
  }, [lines])
  return (
    <div
      ref={ref}
      className="mt-4 bg-black/40 rounded-lg border border-base-border p-4 h-56 overflow-y-auto font-mono text-xs text-ink-dim leading-5"
    >
      {lines.length === 0 ? (
        <p className="text-ink-faint">Waiting for output…</p>
      ) : (
        lines.map((l, i) => <div key={i}>{l || ' '}</div>)
      )}
    </div>
  )
}
