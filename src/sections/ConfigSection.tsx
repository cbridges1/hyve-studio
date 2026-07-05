import { useCallback, useEffect, useState } from 'react'
import { type RepoConfig, configApi } from '../lib/api'
import { CheckboxField } from '../components/Field'
import { buttonPrimary, heading, label as labelClass, panel, subtext } from '../components/theme'

export function ConfigSection() {
  const [config, setConfig] = useState<RepoConfig | null>(null)
  const [mode, setMode] = useState('local')
  const [strictDelete, setStrictDelete] = useState(false)
  const [strictResourceDelete, setStrictResourceDelete] = useState(false)
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
      })
      .catch((e: Error) => setError(e.message))
  }, [])
  useEffect(load, [load])

  const save = () => {
    setSaving(true)
    setSaved(false)
    setError(null)
    configApi
      .patch({ reconcile: { mode, strictDelete, strictResourceDelete } })
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

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
      <div className="flex items-center gap-3">
        <button className={buttonPrimary} disabled={saving} onClick={save}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saved && <span className="text-xs text-emerald-400">Saved</span>}
      </div>
    </div>
  )
}
