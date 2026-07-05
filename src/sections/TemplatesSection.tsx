import { useCallback, useEffect, useState } from 'react'
import { type Template, type ValidationResult, templatesApi } from '../lib/api'
import { Badge } from '../components/Badge'
import { Modal } from '../components/Modal'
import { YamlPanel } from '../components/YamlPanel'
import { TextField } from '../components/Field'
import { ParamsEditor, paramsToRecord, type ParamRow } from '../components/ParamsEditor'
import { buttonDanger, buttonPrimary, buttonSecondary, heading, panel, raisedRow, subtext } from '../components/theme'

function NewTemplateForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [driverSource, setDriverSource] = useState('')
  const [driverVersion, setDriverVersion] = useState('latest')
  const [region, setRegion] = useState('')
  const [params, setParams] = useState<ParamRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = () => {
    if (!name || !driverSource) {
      setError('Name and driver source are required.')
      return
    }
    setSubmitting(true)
    setError(null)
    templatesApi
      .create({
        apiVersion: 'v1',
        kind: 'Template',
        metadata: { name, description: description || undefined },
        spec: {
          driver: { source: driverSource, version: driverVersion },
          region: region || undefined,
          params: paramsToRecord(params),
        },
      })
      .then(() => onCreated())
      .catch((e: Error) => setError(e.message))
      .finally(() => setSubmitting(false))
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <TextField label="Name" value={name} onChange={setName} placeholder="prod-eks" required />
        <TextField label="Description" value={description} onChange={setDescription} placeholder="optional" />
        <TextField
          label="Driver source"
          value={driverSource}
          onChange={setDriverSource}
          placeholder="github.com/hyve-modules/aws-eks"
          required
        />
        <TextField label="Driver version" value={driverVersion} onChange={setDriverVersion} placeholder="latest" />
        <TextField label="Region" value={region} onChange={setRegion} placeholder="us-east-1" />
      </div>
      <div className="mb-4">
        <ParamsEditor rows={params} onChange={setParams} label="Default params" />
      </div>
      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
      <button className={buttonPrimary} disabled={submitting} onClick={submit}>
        {submitting ? 'Creating…' : 'Create template'}
      </button>
    </div>
  )
}

function TemplateDetail({ template }: { template: Template }) {
  const [tab, setTab] = useState<'yaml' | 'validate'>('yaml')
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [busy, setBusy] = useState(false)

  const runValidate = () => {
    setBusy(true)
    templatesApi
      .validate(template.metadata.name)
      .then(setResult)
      .finally(() => setBusy(false))
  }

  return (
    <div className={`${panel} p-4 mt-2`}>
      <div className="flex gap-1 mb-4 border-b border-base-border">
        {(['yaml', 'validate'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 -mb-px capitalize transition-colors ${
              tab === t ? 'border-accent text-ink' : 'border-transparent text-ink-dim hover:text-ink'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'yaml' && <YamlPanel path={`/templates/${encodeURIComponent(template.metadata.name)}`} />}
      {tab === 'validate' && (
        <div>
          <button className={buttonSecondary} disabled={busy} onClick={runValidate}>
            {busy ? 'Validating…' : 'Run validation'}
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

export function TemplatesSection() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)

  const load = useCallback(() => {
    templatesApi.list().then(setTemplates).catch((e: Error) => setError(e.message))
  }, [])
  useEffect(load, [load])

  const remove = (name: string) => {
    templatesApi.delete(name).then(load).catch((e: Error) => setError(e.message))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`${heading} mb-0`}>Templates</h2>
        <button className={buttonPrimary} onClick={() => setShowNew(true)}>
          + New template
        </button>
      </div>
      {showNew && (
        <Modal title="New template" onClose={() => setShowNew(false)}>
          <NewTemplateForm
            onCreated={() => {
              setShowNew(false)
              load()
            }}
          />
        </Modal>
      )}
      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
      {!error && templates.length === 0 && <p className={subtext}>No templates found.</p>}
      <div className="space-y-2">
        {templates.map((t) => (
          <div key={t.metadata.name}>
            <div
              className={`${raisedRow} flex items-center justify-between cursor-pointer`}
              onClick={() => setSelected(selected === t.metadata.name ? null : t.metadata.name)}
            >
              <div>
                <p className="text-ink font-medium text-sm">{t.metadata.name}</p>
                <p className="text-xs text-ink-faint mt-0.5">
                  {t.spec.driver.source}@{t.spec.driver.version}
                  {t.spec.region ? ` · ${t.spec.region}` : ''}
                </p>
                {t.metadata.description && <p className="text-xs text-ink-dim mt-1">{t.metadata.description}</p>}
              </div>
              <button
                className={buttonDanger}
                onClick={(e) => {
                  e.stopPropagation()
                  remove(t.metadata.name)
                }}
              >
                Delete
              </button>
            </div>
            {selected === t.metadata.name && <TemplateDetail template={t} />}
          </div>
        ))}
      </div>
    </div>
  )
}
