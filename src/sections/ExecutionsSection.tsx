import { useEffect, useState } from 'react'
import { type ExecutionSummary, executionsApi, streamExecution } from '../lib/api'
import { Badge, executionTone } from '../components/Badge'
import { LogPane } from '../components/LogPane'
import { heading, panel, raisedRow, subtext } from '../components/theme'

const POLL_MS = 3000

function ExecutionDetail({ summary }: { summary: ExecutionSummary }) {
  const [lines, setLines] = useState<string[]>([])

  useEffect(() => {
    setLines([])
    if (summary.status === 'running') {
      const stop = streamExecution(summary.id, (l) => setLines((prev) => [...prev, l]), () => {})
      return stop
    }
    executionsApi
      .logs(summary.id)
      .then((r) => setLines(r.lines.map((l) => l.line)))
      .catch(() => {})
    return undefined
  }, [summary.id, summary.status])

  return (
    <div className={`${panel} p-4 mt-2`}>
      <div className="text-xs text-ink-dim space-y-1 mb-3">
        <p>
          <span className="text-ink-faint">kind:</span> {summary.kind}
        </p>
        <p>
          <span className="text-ink-faint">started:</span> {new Date(summary.startedAt).toLocaleString()}
        </p>
        {summary.endedAt && (
          <p>
            <span className="text-ink-faint">ended:</span> {new Date(summary.endedAt).toLocaleString()}
          </p>
        )}
        {summary.error && <p className="text-red-400">error: {summary.error}</p>}
      </div>
      <LogPane lines={lines} />
    </div>
  )
}

export function ExecutionsSection() {
  const [executions, setExecutions] = useState<ExecutionSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const poll = () => {
      executionsApi
        .list()
        .then((r) => {
          if (!cancelled) setExecutions(r)
        })
        .catch((e: Error) => {
          if (!cancelled) setError(e.message)
        })
    }
    poll()
    const id = setInterval(poll, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return (
    <div>
      <h2 className={heading}>Executions</h2>
      <p className={`${subtext} mb-4`}>Every reconcile, workflow run, and module/workflow install triggered from this UI (or any other client).</p>
      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
      {!error && executions.length === 0 && <p className={subtext}>No executions yet.</p>}
      <div className="space-y-2">
        {executions.map((e) => (
          <div key={e.id}>
            <div
              className={`${raisedRow} flex items-center justify-between cursor-pointer`}
              onClick={() => setSelected(selected === e.id ? null : e.id)}
            >
              <div className="flex items-center gap-3">
                <Badge tone={executionTone(e.status)}>{e.status}</Badge>
                <div>
                  <p className="text-ink font-medium text-sm">{e.kind}</p>
                  <p className="text-xs text-ink-faint">{e.id}</p>
                </div>
              </div>
              <p className="text-xs text-ink-faint">{new Date(e.startedAt).toLocaleTimeString()}</p>
            </div>
            {selected === e.id && <ExecutionDetail summary={e} />}
          </div>
        ))}
      </div>
    </div>
  )
}
