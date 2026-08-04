import { useCallback, useEffect, useState } from 'react'
import { type RepoConfig, configApi, envApi } from '../lib/api'
import { CheckboxField } from '../components/Field'
import { buttonDanger, buttonPrimary, buttonSecondary, heading, input, label as labelClass, panel, subtext } from '../components/theme'

export function ConfigSection() {
  const [config, setConfig] = useState<RepoConfig | null>(null)
  const [mode, setMode] = useState('local')
  const [strictDelete, setStrictDelete] = useState(false)
  const [strictResourceDelete, setStrictResourceDelete] = useState(false)
  const [envFile, setEnvFile] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(() => {
    configApi
      .get()
      .then((c) => {
        setConfig(c)
        setMode(c.reconcile.mode)
        setStrictDelete(c.reconcile.strictDelete)
        setStrictResourceDelete(c.reconcile.strictResourceDelete)
        setEnvFile(c.env?.file ?? '')
      })
      .catch((e: Error) => setError(e.message))
  }, [])
  useEffect(load, [load])

  const save = () => {
    setSaving(true)
    setSaved(false)
    setError(null)
    configApi
      .patch({ reconcile: { mode, strictDelete, strictResourceDelete }, env: { file: envFile } })
      .then((c) => {
        setConfig(c)
        setSaved(true)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setSaving(false))
  }

  if (!config) {
    return (
      <div>
        <h2 className={heading}>Configuration</h2>
        {error ? <p className="text-red-400 text-sm">{error}</p> : <p className={subtext}>Loading…</p>}
      </div>
    )
  }

  return (
    <div>
      <h2 className={heading}>Configuration</h2>
      <p className={`${subtext} mb-6`}>Writes through to hyve.yaml and commits.</p>

      <div className={`${panel} p-4 mb-6 max-w-lg`}>
        <p className="text-sm font-medium text-ink mb-3">Reconcile</p>
        <div className="space-y-3">
          <label className="block">
            <span className={labelClass}>Mode</span>
            <select
              className="w-full bg-base-bg border border-base-border rounded-md px-2.5 py-1.5 text-sm text-ink focus:outline-none focus:border-accent"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="local" style={{ backgroundColor: '#15171e', color: '#f1f2f4' }}>
                local
              </option>
              <option value="cicd" style={{ backgroundColor: '#15171e', color: '#f1f2f4' }}>
                cicd
              </option>
            </select>
          </label>
          <CheckboxField label="Strict delete" checked={strictDelete} onChange={setStrictDelete} />
          <CheckboxField label="Strict resource delete" checked={strictResourceDelete} onChange={setStrictResourceDelete} />
        </div>
      </div>

      <div className={`${panel} p-4 mb-6 max-w-lg`}>
        <p className="text-sm font-medium text-ink mb-3">Local env file</p>
        <label className="block">
          <span className={labelClass}>
            Path relative to the repo root, loaded before reconciles/workflows. Automatically added to
            .gitignore.
          </span>
          <input
            className="w-full bg-base-bg border border-base-border rounded-md px-2.5 py-1.5 text-sm text-ink focus:outline-none focus:border-accent"
            placeholder="local.env"
            value={envFile}
            onChange={(e) => setEnvFile(e.target.value)}
          />
        </label>
      </div>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
      <div className="flex items-center gap-3 mb-6">
        <button className={buttonPrimary} disabled={saving} onClick={save}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saved && <span className="text-xs text-emerald-400">Saved</span>}
      </div>

      {config.env?.file ? (
        <EnvVarsEditor file={config.env.file} />
      ) : (
        <p className={`${subtext} max-w-lg`}>Set a local env file above and save to manage its variables here.</p>
      )}
    </div>
  )
}

function EnvVarsEditor({ file }: { file: string }) {
  const [vars, setVars] = useState<Record<string, string> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [adding, setAdding] = useState(false)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const load = useCallback(() => {
    envApi
      .list()
      .then(setVars)
      .catch((e: Error) => setError(e.message))
  }, [])
  useEffect(load, [load])

  const updateValue = (key: string, value: string) => {
    setVars((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const commitValue = (key: string, value: string) => {
    setBusyKey(key)
    setError(null)
    envApi
      .set(key, value)
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusyKey(null))
  }

  const removeVar = (key: string) => {
    setBusyKey(key)
    setError(null)
    envApi
      .unset(key)
      .then(() => setVars((prev) => (prev ? Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key)) : prev)))
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusyKey(null))
  }

  const addVar = () => {
    if (!newKey.trim()) return
    setAdding(true)
    setError(null)
    envApi
      .set(newKey.trim(), newValue)
      .then((updated) => {
        setVars((prev) => ({ ...prev, ...updated }))
        setNewKey('')
        setNewValue('')
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setAdding(false))
  }

  return (
    <div className={`${panel} p-4 max-w-lg`}>
      <p className="text-sm font-medium text-ink mb-1">Variables in {file}</p>
      <p className={`${subtext} mb-3`}>
        Each change writes to {file} immediately — never committed, this file stays local and gitignored.
      </p>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      {vars === null ? (
        <p className={subtext}>Loading…</p>
      ) : (
        <div className="space-y-2 mb-4">
          {Object.keys(vars).length === 0 && <p className={subtext}>No variables set.</p>}
          {Object.entries(vars)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-xs font-mono text-ink-dim w-1/3 truncate" title={key}>
                  {key}
                </span>
                <input
                  className={`${input} flex-1`}
                  value={value}
                  disabled={busyKey === key}
                  onChange={(e) => updateValue(key, e.target.value)}
                  onBlur={(e) => commitValue(key, e.target.value)}
                />
                <button className={buttonDanger} disabled={busyKey === key} onClick={() => removeVar(key)}>
                  Remove
                </button>
              </div>
            ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-3 border-t border-base-border">
        <input
          className={`${input} w-1/3`}
          placeholder="KEY"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
        />
        <input
          className={`${input} flex-1`}
          placeholder="value"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
        />
        <button className={buttonSecondary} disabled={adding || !newKey.trim()} onClick={addVar}>
          {adding ? 'Adding…' : 'Add'}
        </button>
      </div>
    </div>
  )
}
