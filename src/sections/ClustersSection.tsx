import { useCallback, useEffect, useState } from 'react'
import {
  type ClusterDefinition,
  type ClusterResources,
  type Template,
  clustersApi,
  reconcileApi,
  templatesApi,
} from '../lib/api'
import { Badge } from '../components/Badge'
import { LogPane } from '../components/LogPane'
import { Modal } from '../components/Modal'
import { YamlPanel } from '../components/YamlPanel'
import { CheckboxField, TextField } from '../components/Field'
import { ParamsEditor, paramsToRecord, recordToParams, type ParamRow } from '../components/ParamsEditor'
import { useExecution } from '../components/useExecution'
import { buttonDanger, buttonPrimary, buttonSecondary, heading, panel, raisedRow, subtext } from '../components/theme'

function NewClusterForm({
  templates,
  onCreated,
}: {
  templates: Template[]
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [templateName, setTemplateName] = useState('')
  const [region, setRegion] = useState('')
  const [params, setParams] = useState<ParamRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = () => {
    if (!name || !templateName) {
      setError('Name and template are required.')
      return
    }
    setSubmitting(true)
    setError(null)
    clustersApi
      .create({ name, template: templateName, region: region || undefined, params: paramsToRecord(params) })
      .then(() => onCreated())
      .catch((e: Error) => setError(e.message))
      .finally(() => setSubmitting(false))
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <TextField label="Name" value={name} onChange={setName} placeholder="my-cluster" required />
        <label className="block">
          <span className="block text-xs font-medium text-ink-dim mb-1">
            Template <span className="text-accent">*</span>
          </span>
          <select
            className="w-full bg-base-bg border border-base-border rounded-md px-2.5 py-1.5 text-sm text-ink focus:outline-none focus:border-accent"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
          >
            <option value="" style={{ backgroundColor: '#15171e', color: '#f1f2f4' }}>
              Select a template…
            </option>
            {templates.map((t) => (
              <option key={t.metadata.name} value={t.metadata.name} style={{ backgroundColor: '#15171e', color: '#f1f2f4' }}>
                {t.metadata.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mb-3">
        <TextField label="Region override" value={region} onChange={setRegion} placeholder="(use template default)" />
      </div>
      <div className="mb-4">
        <ParamsEditor rows={params} onChange={setParams} label="Param overrides" />
      </div>
      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
      <button className={buttonPrimary} disabled={submitting} onClick={submit}>
        {submitting ? 'Creating…' : 'Create cluster'}
      </button>
    </div>
  )
}

function ClusterDetail({ cluster, onChanged }: { cluster: ClusterDefinition; onChanged: () => void }) {
  const [tab, setTab] = useState<'yaml' | 'resources' | 'kubeconfig' | 'patch'>('yaml')
  const [resources, setResources] = useState<ClusterResources | null>(null)
  const [kubeconfig, setKubeconfig] = useState<string | null>(null)
  const [kubeMethod, setKubeMethod] = useState('')
  const [kubeError, setKubeError] = useState<string | null>(null)
  const [kubeBusy, setKubeBusy] = useState(false)
  const [pause, setPause] = useState(!!cluster.spec.pause)
  const [expiresAt, setExpiresAt] = useState(cluster.spec.expiresAt ?? '')
  const [patchParams, setPatchParams] = useState<ParamRow[]>(recordToParams(cluster.spec.params))
  const [patchBusy, setPatchBusy] = useState(false)
  const [patchError, setPatchError] = useState<string | null>(null)
  const reconcile = useExecution()

  useEffect(() => {
    if (tab === 'resources' && !resources) {
      clustersApi.resources(cluster.metadata.name).then(setResources).catch(() => {})
    }
  }, [tab, resources, cluster.metadata.name])

  const runAuth = () => {
    setKubeBusy(true)
    setKubeError(null)
    clustersApi
      .authKubeconfig(cluster.metadata.name, kubeMethod || undefined)
      .then(setKubeconfig)
      .catch((e: Error) => setKubeError(e.message))
      .finally(() => setKubeBusy(false))
  }
  const runDeauth = () => {
    setKubeBusy(true)
    setKubeError(null)
    clustersApi
      .deauthKubeconfig(cluster.metadata.name)
      .then(() => setKubeconfig(null))
      .catch((e: Error) => setKubeError(e.message))
      .finally(() => setKubeBusy(false))
  }

  const savePatch = () => {
    setPatchBusy(true)
    setPatchError(null)
    clustersApi
      .patch(cluster.metadata.name, { pause, expiresAt: expiresAt || undefined, params: paramsToRecord(patchParams) })
      .then(() => onChanged())
      .catch((e: Error) => setPatchError(e.message))
      .finally(() => setPatchBusy(false))
  }

  const tabs: { id: typeof tab; label: string }[] = [
    { id: 'yaml', label: 'YAML' },
    { id: 'resources', label: 'Resources' },
    { id: 'kubeconfig', label: 'Kubeconfig' },
    { id: 'patch', label: 'Patch' },
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

      {tab === 'yaml' && <YamlPanel path={`/clusters/${encodeURIComponent(cluster.metadata.name)}`} />}

      {tab === 'resources' && (
        <div className="text-xs font-mono text-ink-dim">
          {!resources ? (
            <p className="text-ink-faint">Loading…</p>
          ) : (
            <>
              <p className="text-ink-dim mb-1">Declared (spec.resources):</p>
              <pre className="mb-3 whitespace-pre-wrap">{JSON.stringify(resources.resources ?? [], null, 2)}</pre>
              <p className="text-ink-dim mb-1">Tracked (spec.appliedResources):</p>
              <pre className="whitespace-pre-wrap">{JSON.stringify(resources.appliedResources ?? {}, null, 2)}</pre>
            </>
          )}
        </div>
      )}

      {tab === 'kubeconfig' && (
        <div>
          <div className="flex gap-2 items-end mb-3">
            <div className="flex-1">
              <TextField label="Auth method (optional)" value={kubeMethod} onChange={setKubeMethod} placeholder="default method" />
            </div>
            <button className={buttonPrimary} disabled={kubeBusy} onClick={runAuth}>
              Run auth
            </button>
            <button className={buttonSecondary} disabled={kubeBusy} onClick={runDeauth}>
              Deauth
            </button>
          </div>
          {kubeError && <p className="text-red-400 text-xs mb-2">{kubeError}</p>}
          {kubeconfig && (
            <div className="relative">
              <button
                className={`${buttonSecondary} absolute top-2 right-2`}
                onClick={() => navigator.clipboard.writeText(kubeconfig)}
              >
                Copy
              </button>
              <pre className="bg-black/40 border border-base-border rounded-lg p-4 text-xs text-ink-dim font-mono max-h-72 overflow-auto whitespace-pre-wrap">
                {kubeconfig}
              </pre>
            </div>
          )}
        </div>
      )}

      {tab === 'patch' && (
        <div className="space-y-3 max-w-md">
          <CheckboxField label="Paused" checked={pause} onChange={setPause} />
          <TextField label="Expires at (RFC3339)" value={expiresAt} onChange={setExpiresAt} placeholder="2026-08-01T00:00:00Z" />
          <ParamsEditor rows={patchParams} onChange={setPatchParams} label="Params" />
          {patchError && <p className="text-red-400 text-xs">{patchError}</p>}
          <button className={buttonPrimary} disabled={patchBusy} onClick={savePatch}>
            {patchBusy ? 'Saving…' : 'Save patch'}
          </button>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-base-border flex items-center gap-2">
        <button
          className={buttonSecondary}
          disabled={reconcile.running}
          onClick={() => reconcile.trigger(() => reconcileApi.cluster(cluster.metadata.name, false))}
        >
          {reconcile.running ? 'Reconciling…' : 'Reconcile this cluster'}
        </button>
      </div>
      {reconcile.error && <p className="text-red-400 text-xs mt-2">{reconcile.error}</p>}
      {reconcile.lines.length > 0 && <LogPane lines={reconcile.lines} />}
    </div>
  )
}

export function ClustersSection() {
  const [clusters, setClusters] = useState<ClusterDefinition[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showNew, setShowNew] = useState(false)
  const delete_ = useExecution()

  const load = useCallback(() => {
    clustersApi.list().then(setClusters).catch((e: Error) => setError(e.message))
    templatesApi.list().then(setTemplates).catch(() => {})
  }, [])

  useEffect(load, [load, refreshKey])

  const refresh = () => setRefreshKey((k) => k + 1)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`${heading} mb-0`}>Clusters</h2>
        <button className={buttonPrimary} onClick={() => setShowNew(true)}>
          + New cluster
        </button>
      </div>
      {showNew && (
        <Modal title="New cluster" onClose={() => setShowNew(false)}>
          <NewClusterForm
            templates={templates}
            onCreated={() => {
              setShowNew(false)
              refresh()
            }}
          />
        </Modal>
      )}

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
      {!error && clusters.length === 0 && <p className={subtext}>No clusters found.</p>}

      <div className="space-y-2">
        {clusters.map((c) => (
          <div key={c.metadata.name}>
            <div
              className={`${raisedRow} flex items-center justify-between cursor-pointer`}
              onClick={() => setSelected(selected === c.metadata.name ? null : c.metadata.name)}
            >
              <div>
                <p className="text-ink font-medium text-sm flex items-center gap-2">
                  {c.metadata.name}
                  {c.spec.pause && <Badge tone="neutral">paused</Badge>}
                  {c.spec.delete && <Badge tone="bad">pending delete</Badge>}
                </p>
                <p className="text-xs text-ink-faint mt-0.5">
                  {c.spec.driver.source}@{c.spec.driver.version} · {c.metadata.region}
                </p>
              </div>
              <button
                className={buttonDanger}
                onClick={(e) => {
                  e.stopPropagation()
                  delete_.trigger(() => clustersApi.delete(c.metadata.name))
                  refresh()
                }}
              >
                Delete
              </button>
            </div>
            {selected === c.metadata.name && <ClusterDetail cluster={c} onChanged={refresh} />}
          </div>
        ))}
      </div>
    </div>
  )
}
