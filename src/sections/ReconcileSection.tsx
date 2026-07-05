import { useState } from 'react'
import { reconcileApi } from '../lib/api'
import { LogPane } from '../components/LogPane'
import { CheckboxField } from '../components/Field'
import { useExecution } from '../components/useExecution'
import { buttonPrimary, heading, subtext } from '../components/theme'

export function ReconcileSection() {
  const [dryRun, setDryRun] = useState(false)
  const exec = useExecution()

  return (
    <div>
      <h2 className={heading}>Reconcile All</h2>
      <p className={`${subtext} mb-4`}>Trigger a full reconcile across all clusters in this repository.</p>
      <div className="mb-4">
        <CheckboxField label="Dry run (preview only, nothing changes)" checked={dryRun} onChange={setDryRun} />
      </div>
      <button className={buttonPrimary} disabled={exec.running} onClick={() => exec.trigger(() => reconcileApi.all(dryRun))}>
        {exec.running ? 'Reconciling…' : 'Run reconcile'}
      </button>
      {exec.error && <p className="text-red-400 text-xs mt-2">{exec.error}</p>}
      {exec.lines.length > 0 && <LogPane lines={exec.lines} />}
    </div>
  )
}
