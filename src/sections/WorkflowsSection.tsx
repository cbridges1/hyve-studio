import { useCallback, useEffect, useState } from 'react'
import { type ValidationResult, type VerifyResult, type Workflow, workflowsApi } from '../lib/api'
import { Badge } from '../components/Badge'
import { LogPane } from '../components/LogPane'
import { Modal } from '../components/Modal'
import { YamlPanel } from '../components/YamlPanel'
import { TextField } from '../components/Field'
import { ParamsEditor, paramsToRecord, type ParamRow } from '../components/ParamsEditor'
import { useExecution } from '../components/useExecution'
import { buttonDanger, buttonPrimary, buttonSecondary, heading, panel, raisedRow, subtext } from '../components/theme'

function NewWorkflowForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = () => {
    if (!name) {
      setError('Name is required.')
      return
    }
    setSubmitting(true)
    setError(null)
    workflowsApi
      .create({
        apiVersion: 'v1',
        kind: 'Workflow',
        metadata: { name, description: description || undefined },
        spec: { jobs: [{ name: 'job1', steps: [{ name: 'step1', command: 'echo hello' }] }] },
      })
      .then(() => onCreated())
      .catch((e: Error) => setError(e.message))
      .finally(() => setSubmitting(false))
  }

  return (
    <div>
      <p className={`${subtext} mb-3`}>
        Creates a one-job starter workflow — edit jobs/steps via the YAML panel after creation.
      </p>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <TextField label="Name" value={name} onChange={setName} placeholder="deploy-app" required />
        <TextField label="Description" value={description} onChange={setDescription} placeholder="optional" />
      </div>
      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
      <button className={buttonPrimary} disabled={submitting} onClick={submit}>
        {submitting ? 'Creating…' : 'Create workflow'}
      </button>
    </div>
  )
}

function WorkflowDetail({ workflow }: { workflow: Workflow }) {
  const [tab, setTab] = useState<'yaml' | 'run' | 'validate'>('yaml')
  const [cluster, setCluster] = useState('')
  const [inputs, setInputs] = useState<ParamRow[]>([])
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [validating, setValidating] = useState(false)
  const run = useExecution()

  const runValidate = () => {
    setValidating(true)
    workflowsApi
      .validate(workflow.metadata.name)
      .then(setResult)
      .finally(() => setValidating(false))
  }

  const tabs: { id: typeof tab; label: string }[] = [
    { id: 'yaml', label: 'YAML' },
    { id: 'run', label: 'Run' },
    { id: 'validate', label: 'Validate' },
  ]

  return (
    <div className={`${panel} p-4 mt-2`}>
      <div className="flex gap-1 mb-4 border-b border-base-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id ? 'border-accent text-ink' : 'border-transparent text-ink-dim hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'yaml' && <YamlPanel path={`/workflows/${encodeURIComponent(workflow.metadata.name)}`} />}

      {tab === 'run' && (
        <div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <TextField label="Target cluster (optional)" value={cluster} onChange={setCluster} placeholder="my-cluster" />
          </div>
          <div className="mb-3">
            <ParamsEditor rows={inputs} onChange={setInputs} label="Inputs (--set KEY=VALUE)" />
          </div>
          <button
            className={buttonPrimary}
            disabled={run.running}
            onClick={() =>
              run.trigger(() =>
                workflowsApi.run(workflow.metadata.name, {
                  cluster: cluster || undefined,
                  inputs: paramsToRecord(inputs),
                }),
              )
            }
          >
            {run.running ? 'Running…' : 'Run workflow'}
          </button>
          {run.error && <p className="text-red-400 text-xs mt-2">{run.error}</p>}
          {run.lines.length > 0 && <LogPane lines={run.lines} />}
        </div>
      )}

      {tab === 'validate' && (
        <div>
          <button className={buttonSecondary} disabled={validating} onClick={runValidate}>
            {validating ? 'Validating…' : 'Run validation'}
          </button>
          {result && (
            <div className="mt-3 text-sm space-y-2">
              <Badge tone={result.valid ? 'good' : 'bad'}>{result.valid ? 'Valid' : 'Invalid'}</Badge>
              {result.errors.length > 0 && (
                <ul className="text-red-400 text-xs list-disc pl-4">
                  {result.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
              {result.warnings.length > 0 && (
                <ul className="text-amber-400 text-xs list-disc pl-4">
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RemoteRefsPanel() {
  const [source, setSource] = useState('')
  const [path, setPath] = useState('')
  const [updateResult, setUpdateResult] = useState<string | null>(null)
  const [verifyResults, setVerifyResults] = useState<VerifyResult[] | null>(null)
  const [busy, setBusy] = useState(false)
  const install = useExecution()

  const updateRef = () => {
    if (!source) return
    setBusy(true)
    workflowsApi
      .updateRef(source, path || undefined)
      .then((refs) => setUpdateResult(`Updated ${refs.length} file(s).`))
      .catch((e: Error) => setUpdateResult(`Error: ${e.message}`))
      .finally(() => setBusy(false))
  }

  const verifyAll = () => {
    setBusy(true)
    workflowsApi
      .verifyRefs()
      .then((r) => setVerifyResults(r.results))
      .finally(() => setBusy(false))
  }

  return (
    <div className={`${panel} p-4 mt-6`}>
      <p className="text-sm font-medium text-ink mb-1">Remote workflow references</p>
      <p className={`${subtext} mb-3`}>Resolve/verify workflow files referenced by source URL (github.com/org/repo//path@version).</p>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          className={buttonSecondary}
          disabled={install.running}
          onClick={() => install.trigger(() => workflowsApi.installRefs())}
        >
          {install.running ? 'Installing…' : 'Install all referenced'}
        </button>
        <button className={buttonSecondary} disabled={busy} onClick={verifyAll}>
          Verify all locked
        </button>
      </div>
      {install.lines.length > 0 && <LogPane lines={install.lines} />}

      <div className="flex gap-2 items-end mt-4 mb-2">
        <div className="flex-1">
          <TextField label="Source" value={source} onChange={setSource} placeholder="github.com/org/repo//workflows/deploy.yaml@v1" />
        </div>
        <div className="w-40">
          <TextField label="Path override" value={path} onChange={setPath} placeholder="optional" />
        </div>
        <button className={buttonSecondary} disabled={busy} onClick={updateRef}>
          Update ref
        </button>
      </div>
      {updateResult && <p className="text-xs text-ink-dim">{updateResult}</p>}

      {verifyResults && (
        <div className="mt-3 space-y-1">
          {verifyResults.map((r) => (
            <div key={r.key} className="flex items-center gap-2 text-xs">
              <Badge tone={r.ok ? 'good' : 'bad'}>{r.ok ? 'OK' : 'FAIL'}</Badge>
              <span className="text-ink-dim">{r.key}</span>
              {r.reason && <span className="text-red-400">— {r.reason}</span>}
            </div>
          ))}
          {verifyResults.length === 0 && <p className="text-ink-faint text-xs">No locked workflow refs.</p>}
        </div>
      )}
    </div>
  )
}

export function WorkflowsSection() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)

  const load = useCallback(() => {
    workflowsApi.list().then(setWorkflows).catch((e: Error) => setError(e.message))
  }, [])
  useEffect(load, [load])

  const remove = (name: string) => {
    workflowsApi.delete(name).then(load).catch((e: Error) => setError(e.message))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`${heading} mb-0`}>Workflows</h2>
        <button className={buttonPrimary} onClick={() => setShowNew(true)}>
          + New workflow
        </button>
      </div>
      {showNew && (
        <Modal title="New workflow" onClose={() => setShowNew(false)}>
          <NewWorkflowForm
            onCreated={() => {
              setShowNew(false)
              load()
            }}
          />
        </Modal>
      )}
      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
      {!error && workflows.length === 0 && <p className={subtext}>No workflows found.</p>}
      <div className="space-y-2">
        {workflows.map((w) => (
          <div key={w.metadata.name}>
            <div
              className={`${raisedRow} flex items-center justify-between cursor-pointer`}
              onClick={() => setSelected(selected === w.metadata.name ? null : w.metadata.name)}
            >
              <div>
                <p className="text-ink font-medium text-sm">{w.metadata.name}</p>
                {w.metadata.description && (
                  <p className="text-xs text-ink-faint mt-0.5 max-w-sm truncate">{w.metadata.description}</p>
                )}
              </div>
              <button
                className={buttonDanger}
                onClick={(e) => {
                  e.stopPropagation()
                  remove(w.metadata.name)
                }}
              >
                Delete
              </button>
            </div>
            {selected === w.metadata.name && <WorkflowDetail workflow={w} />}
          </div>
        ))}
      </div>

      <RemoteRefsPanel />
    </div>
  )
}
