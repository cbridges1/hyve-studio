import { buttonSecondary, input, label as labelClass } from './theme'

export type ParamRow = { key: string; value: string }

/**
 * Repeatable key/value row editor for arbitrary param maps (cluster/template
 * spec.params, etc). Callers convert ParamRow[] <-> Record<string,string> at
 * the submit boundary via `paramsToRecord`.
 */
export function ParamsEditor({
  rows,
  onChange,
  label = 'Params',
}: {
  rows: ParamRow[]
  onChange: (rows: ParamRow[]) => void
  label?: string
}) {
  const update = (i: number, patch: Partial<ParamRow>) => {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i))
  const add = () => onChange([...rows, { key: '', value: '' }])

  return (
    <div>
      <span className={labelClass}>{label}</span>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-2">
            <input
              className={input}
              placeholder="key"
              value={row.key}
              onChange={(e) => update(i, { key: e.target.value })}
            />
            <input
              className={input}
              placeholder="value"
              value={row.value}
              onChange={(e) => update(i, { value: e.target.value })}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-ink-faint hover:text-red-400 px-2 text-sm"
              aria-label="Remove param"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={add} className={`${buttonSecondary} mt-2`}>
        + Add param
      </button>
    </div>
  )
}

export function paramsToRecord(rows: ParamRow[]): Record<string, string> | undefined {
  const out: Record<string, string> = {}
  for (const { key, value } of rows) {
    if (key.trim()) out[key.trim()] = value
  }
  return Object.keys(out).length > 0 ? out : undefined
}

export function recordToParams(record?: Record<string, string>): ParamRow[] {
  if (!record) return []
  return Object.entries(record).map(([key, value]) => ({ key, value }))
}
