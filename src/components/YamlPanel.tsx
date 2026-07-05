import { useEffect, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { yaml } from '@codemirror/lang-yaml'
import { vscodeDark } from '@uiw/codemirror-theme-vscode'
import { apiFetchText, apiPutYaml } from '../lib/api'
import { buttonPrimary, buttonSecondary, panel } from './theme'

const yamlExtensions = [yaml()]

/**
 * Full-fidelity view/edit panel for one resource's YAML — the universal
 * fallback editor covering every field the REST API exposes (nested job/step
 * lists, lifecycle-hook workflow refs, resources, etc.) without needing a
 * bespoke form per field. Round-trips exact bytes via the server's
 * Accept/Content-Type: application/x-yaml content negotiation.
 */
export function YamlPanel({ path, refreshKey }: { path: string; refreshKey?: unknown }) {
  const [original, setOriginal] = useState('')
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    apiFetchText(path)
      .then((text) => {
        setOriginal(text)
        setDraft(text)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, refreshKey])

  const dirty = draft !== original
  const save = () => {
    setSaving(true)
    setError(null)
    apiPutYaml(path, draft)
      .then((text) => {
        setOriginal(text)
        setDraft(text)
        setSavedAt(Date.now())
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setSaving(false))
  }

  return (
    <div className={`${panel} p-4`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-ink-dim">Raw YAML</p>
        <div className="flex items-center gap-2">
          {savedAt && !dirty && <span className="text-xs text-emerald-400">Saved</span>}
          <button className={buttonSecondary} disabled={!dirty || saving} onClick={() => setDraft(original)}>
            Revert
          </button>
          <button className={buttonPrimary} disabled={!dirty || saving} onClick={save}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
      {loading ? (
        <p className="text-ink-faint text-xs">Loading…</p>
      ) : (
        <div className="rounded-md overflow-hidden border border-base-border">
          <CodeMirror
            value={draft}
            height="400px"
            theme={vscodeDark}
            extensions={yamlExtensions}
            onChange={setDraft}
            basicSetup={{ foldGutter: true, lineNumbers: true }}
          />
        </div>
      )}
    </div>
  )
}
