import { useCallback, useEffect, useState } from 'react'
import { type LockFile, type LockedModule, type ModuleManifest, modulesApi } from '../lib/api'
import { Badge } from '../components/Badge'
import { LogPane } from '../components/LogPane'
import { Modal } from '../components/Modal'
import { TextField } from '../components/Field'
import { useExecution } from '../components/useExecution'
import { buttonDanger, buttonPrimary, buttonSecondary, heading, panel, raisedRow, subtext } from '../components/theme'

function AddModuleForm({ onAdded }: { onAdded: () => void }) {
  const [source, setSource] = useState('')
  const [version, setVersion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = () => {
    if (!source) {
      setError('Source is required.')
      return
    }
    setSubmitting(true)
    setError(null)
    modulesApi
      .add(source, version || undefined)
      .then(() => onAdded())
      .catch((e: Error) => setError(e.message))
      .finally(() => setSubmitting(false))
  }

  return (
    <div>
      <div className="flex gap-2 items-end mb-3">
        <div className="flex-1">
          <TextField label="Source" value={source} onChange={setSource} placeholder="github.com/hyve-modules/aws-eks" required />
        </div>
        <div className="w-40">
          <TextField label="Version" value={version} onChange={setVersion} placeholder="latest" />
        </div>
        <button className={buttonPrimary} disabled={submitting} onClick={submit}>
          {submitting ? 'Adding…' : 'Add'}
        </button>
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  )
}

function ModuleRow({
  entryKey,
  module,
  onChanged,
}: {
  entryKey: string
  module: LockedModule
  onChanged: () => void
}) {
  const [source, version] = splitKey(entryKey, module.source)
  const [open, setOpen] = useState(false)
  const [manifest, setManifest] = useState<ModuleManifest | null>(null)
  const [errors, setErrors] = useState<string[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const loadInfo = () => {
    setBusy(true)
    modulesApi
      .info(source, version)
      .then((r) => setManifest(r.manifest))
      .catch((e: Error) => setMsg(e.message))
      .finally(() => setBusy(false))
  }

  const validate = () => {
    setBusy(true)
    modulesApi
      .validate(source, version)
      .then((r) => setErrors(r.errors))
      .catch((e: Error) => setMsg(e.message))
      .finally(() => setBusy(false))
  }

  const update = () => {
    setBusy(true)
    modulesApi
      .update(source, version)
      .then(() => {
        setMsg('Updated.')
        onChanged()
      })
      .catch((e: Error) => setMsg(e.message))
      .finally(() => setBusy(false))
  }

  const remove = () => {
    modulesApi
      .remove(source, version)
      .then(onChanged)
      .catch((e: Error) => setMsg(e.message))
  }

  return (
    <div>
      <div className={`${raisedRow} flex items-center justify-between cursor-pointer`} onClick={() => setOpen(!open)}>
        <div>
          <p className="text-ink font-medium text-sm">{source}</p>
          <p className="text-xs text-ink-faint mt-0.5">
            v{version} · sha256 {module.sha256 ? module.sha256.slice(0, 12) : '(local)'}
          </p>
        </div>
        <button
          className={buttonDanger}
          onClick={(e) => {
            e.stopPropagation()
            remove()
          }}
        >
          Remove
        </button>
      </div>
      {open && (
        <div className={`${panel} p-4 mt-2`}>
          <div className="flex flex-wrap gap-2 mb-3">
            <button className={buttonSecondary} disabled={busy} onClick={loadInfo}>
              Load info
            </button>
            <button className={buttonSecondary} disabled={busy} onClick={validate}>
              Validate
            </button>
            <button className={buttonSecondary} disabled={busy} onClick={update}>
              Re-resolve (update)
            </button>
          </div>
          {msg && <p className="text-xs text-ink-dim mb-2">{msg}</p>}
          {errors && (
            <div className="mb-3">
              <Badge tone={errors.length === 0 ? 'good' : 'bad'}>{errors.length === 0 ? 'Valid' : 'Invalid'}</Badge>
              {errors.length > 0 && (
                <ul className="text-red-400 text-xs list-disc pl-4 mt-1">
                  {errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {manifest && (
            <div className="text-xs text-ink-dim space-y-1">
              <p>
                <span className="text-ink-faint">name:</span> {manifest.metadata.name}
              </p>
              <p>
                <span className="text-ink-faint">version:</span> {manifest.metadata.version}
              </p>
              {manifest.metadata.description && (
                <p>
                  <span className="text-ink-faint">description:</span> {manifest.metadata.description}
                </p>
              )}
              {manifest.spec.params && manifest.spec.params.length > 0 && (
                <div>
                  <span className="text-ink-faint">params:</span>
                  <ul className="list-disc pl-4">
                    {manifest.spec.params.map((p) => (
                      <li key={p.name}>
                        {p.name}
                        {p.required ? ' (required)' : ''}
                        {p.default ? ` — default: ${p.default}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function splitKey(key: string, fallbackSource: string): [string, string] {
  const at = key.lastIndexOf('@')
  if (at > 0) return [key.slice(0, at), key.slice(at + 1)]
  return [fallbackSource, '']
}

function LockFileView({ lock }: { lock: LockFile }) {
  return (
    <pre className="bg-black/40 border border-base-border rounded-lg p-4 text-xs text-ink-dim font-mono max-h-96 overflow-auto whitespace-pre-wrap">
      {JSON.stringify(lock, null, 2)}
    </pre>
  )
}

export function ModulesSection() {
  const [modules, setModules] = useState<Record<string, LockedModule>>({})
  const [lock, setLock] = useState<LockFile | null>(null)
  const [showLock, setShowLock] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const install = useExecution()

  const load = useCallback(() => {
    modulesApi.list().then(setModules).catch((e: Error) => setError(e.message))
  }, [])
  useEffect(load, [load])

  const toggleLock = () => {
    if (!showLock && !lock) {
      modulesApi.lock().then(setLock).catch((e: Error) => setError(e.message))
    }
    setShowLock(!showLock)
  }

  const entries = Object.entries(modules)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`${heading} mb-0`}>Modules</h2>
        <button className={buttonPrimary} onClick={() => setShowNew(true)}>
          + Add module
        </button>
      </div>
      {showNew && (
        <Modal title="Add module" onClose={() => setShowNew(false)}>
          <AddModuleForm
            onAdded={() => {
              setShowNew(false)
              load()
            }}
          />
        </Modal>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        <button className={buttonSecondary} disabled={install.running} onClick={() => install.trigger(() => modulesApi.install())}>
          {install.running ? 'Installing…' : 'Install all referenced'}
        </button>
        <button className={buttonSecondary} onClick={toggleLock}>
          {showLock ? 'Hide' : 'View'} hyve.lock
        </button>
      </div>
      {install.lines.length > 0 && <LogPane lines={install.lines} />}
      {showLock && lock && <div className="mb-6">{<LockFileView lock={lock} />}</div>}

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
      {!error && entries.length === 0 && <p className={subtext}>No modules locked.</p>}
      <div className="space-y-2">
        {entries.map(([key, mod]) => (
          <ModuleRow key={key} entryKey={key} module={mod} onChanged={load} />
        ))}
      </div>
    </div>
  )
}
