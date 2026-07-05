import { useState } from 'react'
import { type GitStatus, type SyncReport, gitApi } from '../lib/api'
import { Badge } from '../components/Badge'
import { TextField } from '../components/Field'
import { buttonPrimary, buttonSecondary, heading, panel, subtext } from '../components/theme'

export function GitSection() {
  const [status, setStatus] = useState<GitStatus | null>(null)
  const [statusBusy, setStatusBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [report, setReport] = useState<SyncReport | null>(null)
  const [syncBusy, setSyncBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkStatus = () => {
    setStatusBusy(true)
    setError(null)
    gitApi
      .status()
      .then(setStatus)
      .catch((e: Error) => setError(e.message))
      .finally(() => setStatusBusy(false))
  }

  const sync = () => {
    setSyncBusy(true)
    setError(null)
    gitApi
      .sync(message || undefined)
      .then(setReport)
      .catch((e: Error) => setError(e.message))
      .finally(() => setSyncBusy(false))
  }

  return (
    <div>
      <h2 className={heading}>Git</h2>
      <p className={`${subtext} mb-6`}>
        Status and sync for the single repository this server is bound to. This is not the CLI's multi-repo
        management surface — just the repo hyve serve was started against.
      </p>

      <div className={`${panel} p-4 mb-6`}>
        <div className="flex items-center gap-3 mb-3">
          <p className="text-sm font-medium text-ink">Connection</p>
          <button className={buttonSecondary} disabled={statusBusy} onClick={checkStatus}>
            {statusBusy ? 'Checking…' : 'Check status'}
          </button>
        </div>
        {status && (
          <Badge tone={status.connected ? 'good' : 'bad'}>{status.connected ? 'Connected' : 'Unreachable'}</Badge>
        )}
        {status?.error && <p className="text-red-400 text-xs mt-2">{status.error}</p>}
      </div>

      <div className={`${panel} p-4`}>
        <p className="text-sm font-medium text-ink mb-3">Sync</p>
        <div className="flex gap-2 items-end mb-3">
          <div className="flex-1">
            <TextField label="Commit message (optional)" value={message} onChange={setMessage} placeholder="Update repository state" />
          </div>
          <button className={buttonPrimary} disabled={syncBusy} onClick={sync}>
            {syncBusy ? 'Syncing…' : 'Sync now'}
          </button>
        </div>
        {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
        {report && (
          <div className="text-xs text-ink-dim space-y-1">
            <p>
              <span className="text-ink-faint">branch:</span> {report.branch}
            </p>
            {report.pullWarning && <p className="text-amber-400">pull warning: {report.pullWarning}</p>}
            <p>
              <span className="text-ink-faint">had changes:</span> {String(report.hadChanges)}
            </p>
            {report.statusSummary && (
              <p>
                <span className="text-ink-faint">summary:</span> {report.statusSummary}
              </p>
            )}
            {report.hadChanges && (
              <p>
                <span className="text-ink-faint">committed:</span> {String(report.committed)} ·{' '}
                <span className="text-ink-faint">pushed:</span> {String(report.pushed)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
