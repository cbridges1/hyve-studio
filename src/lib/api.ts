const params = new URLSearchParams(window.location.search)
export const serverUrl = params.get('server') ?? 'http://localhost:8080'
const token = params.get('token') ?? ''

function authHeaders(extra?: HeadersInit): HeadersInit {
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${serverUrl}${path}`, {
    ...options,
    headers: authHeaders({ 'Content-Type': 'application/json', ...(options.headers ?? {}) }),
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

/** For endpoints that return raw text (YAML, or JSON-as-text callers don't need parsed). */
export async function apiFetchText(path: string, options: RequestInit = {}): Promise<string> {
  const res = await fetch(`${serverUrl}${path}`, {
    ...options,
    headers: authHeaders({ Accept: 'application/x-yaml', ...(options.headers ?? {}) }),
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.text()
}

/** PUT a raw YAML document (Content-Type: application/x-yaml), get the saved YAML back. */
export async function apiPutYaml(path: string, body: string): Promise<string> {
  const res = await fetch(`${serverUrl}${path}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/x-yaml', Accept: 'application/x-yaml' }),
    body,
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.text()
}

export function streamExecution(
  executionId: string,
  onLine: (line: string) => void,
  onDone: () => void,
): () => void {
  const wsUrl = serverUrl.replace(/^http/, 'ws')
  const ws = new WebSocket(`${wsUrl}/executions/${executionId}/stream`)
  ws.onmessage = (e) => {
    try {
      const { line } = JSON.parse(e.data) as { line: string }
      onLine(line)
    } catch {
      // ignore malformed frames
    }
  }
  ws.onclose = onDone
  ws.onerror = onDone
  return () => ws.close()
}

// ── Shared response shapes (field names copied verbatim from the Go handlers
// in internal/server/handler/*.go — see json: tags there) ─────────────────

export type ExecutionRef = { executionId: string }
export type ValidationResult = { errors: string[]; warnings: string[]; valid: boolean }
export type ExecutionSummary = {
  id: string
  kind: string
  status: 'running' | 'succeeded' | 'failed'
  startedAt: string
  endedAt?: string
  error?: string
}
export type LogLine = { seq: number; line: string; capturedAt: string }

// ── Clusters ─────────────────────────────────────────────────────────────

export type DriverRef = { source: string; version: string }
export type WorkflowRef = { name?: string; source?: string; path?: string }
export type WorkflowsSpec = {
  beforeCreate?: WorkflowRef[]
  onCreate?: WorkflowRef[]
  afterCreate?: WorkflowRef[]
  onDelete?: WorkflowRef[]
  afterDelete?: WorkflowRef[]
  preReconcile?: WorkflowRef[]
}
export type ResourceRef = {
  name: string
  source?: string
  namespace?: string
  delete?: boolean
  helm?: { chart: string; repo?: string; version?: string; namespace?: string; values?: Record<string, string> }
}
export type AppliedResource = {
  sourceSHA256: string
  helm?: boolean
  namespace?: string
  appliedAt: string
  objects?: { apiVersion: string; kind: string; namespace?: string; name: string }[]
}

export type ClusterDefinition = {
  apiVersion: string
  kind: string
  metadata: { name: string; region: string }
  spec: {
    driver: DriverRef
    params?: Record<string, string>
    driverOutputs?: Record<string, string>
    workflows: WorkflowsSpec
    resources?: ResourceRef[]
    appliedResources?: Record<string, AppliedResource>
    delete?: boolean
    pause?: boolean
    expiresAt?: string
  }
}

export type CreateClusterRequest = {
  name: string
  template: string
  region?: string
  params?: Record<string, string>
}
export type CreateClusterResponse = ClusterDefinition & { executionId?: string; commitWarning?: string }
export type PatchClusterRequest = {
  pause?: boolean
  delete?: boolean
  params?: Record<string, string>
  expiresAt?: string
}
export type ClusterResources = {
  resources: ResourceRef[] | null
  appliedResources: Record<string, AppliedResource> | null
}

export const clustersApi = {
  list: () => apiFetch<ClusterDefinition[]>('/clusters'),
  get: (name: string) => apiFetch<ClusterDefinition>(`/clusters/${encodeURIComponent(name)}`),
  create: (body: CreateClusterRequest) =>
    apiFetch<CreateClusterResponse>('/clusters', { method: 'POST', body: JSON.stringify(body) }),
  patch: (name: string, body: PatchClusterRequest) =>
    apiFetch<ClusterDefinition>(`/clusters/${encodeURIComponent(name)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  delete: (name: string) =>
    apiFetch<ExecutionRef>(`/clusters/${encodeURIComponent(name)}`, { method: 'DELETE' }),
  resources: (name: string) => apiFetch<ClusterResources>(`/clusters/${encodeURIComponent(name)}/resources`),
  authKubeconfig: (name: string, method?: string) =>
    apiFetchText(`/clusters/${encodeURIComponent(name)}/kubeconfig`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(method ? { method } : {}),
    }),
  deauthKubeconfig: (name: string) =>
    apiFetch<void>(`/clusters/${encodeURIComponent(name)}/kubeconfig`, { method: 'DELETE' }),
}

// ── Templates ────────────────────────────────────────────────────────────

export type Template = {
  apiVersion: string
  kind: string
  metadata: { name: string; description?: string }
  spec: {
    driver: DriverRef
    runner?: { image?: string }
    params?: Record<string, string>
    region?: string
    workflows: {
      beforeCreate?: WorkflowRef[]
      onCreate?: WorkflowRef[]
      afterCreate?: WorkflowRef[]
      onDelete?: WorkflowRef[]
      afterDelete?: WorkflowRef[]
    }
    resources?: ResourceRef[]
    schedule?: string
    lockParams?: boolean
  }
  filename?: string
}

export type CreateTemplateRequest = {
  apiVersion: string
  kind: string
  metadata: { name: string; description?: string }
  spec: { driver: DriverRef; region?: string; params?: Record<string, string> }
}

export const templatesApi = {
  list: () => apiFetch<Template[]>('/templates'),
  get: (name: string) => apiFetch<Template>(`/templates/${encodeURIComponent(name)}`),
  create: (body: CreateTemplateRequest) =>
    apiFetch<Template>('/templates', { method: 'POST', body: JSON.stringify(body) }),
  delete: (name: string) => apiFetch<void>(`/templates/${encodeURIComponent(name)}`, { method: 'DELETE' }),
  validate: (name: string) =>
    apiFetch<ValidationResult>(`/templates/${encodeURIComponent(name)}/validate`, { method: 'POST' }),
}

// ── Workflows ────────────────────────────────────────────────────────────

export type WorkflowJob = { name: string; steps: { name: string; command?: string; script?: string; action?: string }[] }
export type Workflow = {
  apiVersion: string
  kind: string
  metadata: { name: string; description?: string; labels?: Record<string, string> }
  spec: { jobs: WorkflowJob[]; inputs?: { name: string; description?: string; default?: string }[] }
}
export type CreateWorkflowRequest = {
  apiVersion: string
  kind: string
  metadata: { name: string; description?: string }
  spec: { jobs: WorkflowJob[] }
}
export type RunWorkflowRequest = { cluster?: string; inputs?: Record<string, string> }

export type LockedRef = { canonicalSource: string; rawVersion: string; name: string; sha256: string }
export type NameCollision = { name: string; firstSource: string; collidedSource: string }
export type VerifyResult = { key: string; name: string; ok: boolean; reason?: string }

export const workflowsApi = {
  list: () => apiFetch<Workflow[]>('/workflows'),
  get: (name: string) => apiFetch<Workflow>(`/workflows/${encodeURIComponent(name)}`),
  create: (body: CreateWorkflowRequest) =>
    apiFetch<Workflow>('/workflows', { method: 'POST', body: JSON.stringify(body) }),
  delete: (name: string) => apiFetch<void>(`/workflows/${encodeURIComponent(name)}`, { method: 'DELETE' }),
  run: (name: string, body: RunWorkflowRequest) =>
    apiFetch<ExecutionRef>(`/workflows/${encodeURIComponent(name)}/run`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  validate: (name: string) =>
    apiFetch<ValidationResult>(`/workflows/${encodeURIComponent(name)}/validate`, { method: 'POST' }),
  installRefs: () => apiFetch<ExecutionRef>('/workflows/install', { method: 'POST' }),
  updateRef: (source: string, path?: string) =>
    apiFetch<LockedRef[]>('/workflows/refs/update', {
      method: 'POST',
      body: JSON.stringify({ source, path }),
    }),
  verifyRefs: () =>
    apiFetch<{ results: VerifyResult[]; failed: number; ok: boolean }>('/workflows/refs/verify'),
}

// ── Modules ──────────────────────────────────────────────────────────────

export type LockedModule = { source: string; resolved: string; sha256: string; runner?: { image?: string; digest?: string } }
export type LockFile = {
  version: number
  modules: Record<string, LockedModule>
  workflows?: Record<string, { name: string; source: string; resolved: string; sha256: string }>
}
export type ModuleManifest = {
  apiVersion: string
  kind: string
  metadata: { name: string; version: string; description?: string; author?: string; license?: string }
  spec: { params?: { name: string; description?: string; default?: string; required?: boolean }[] }
}

export const modulesApi = {
  list: () => apiFetch<Record<string, LockedModule>>('/modules'),
  lock: () => apiFetch<LockFile>('/lock'),
  info: (source: string, version = 'latest') =>
    apiFetch<{ manifest: ModuleManifest; path: string }>(
      `/modules/${encodeURIComponent(source)}?version=${encodeURIComponent(version)}`,
    ),
  add: (source: string, version?: string) =>
    apiFetch<{ source: string; version: string; module: LockedModule; alreadyLocked: boolean; commitWarning?: string }>(
      '/modules',
      { method: 'POST', body: JSON.stringify({ source, version }) },
    ),
  update: (source: string, version: string) =>
    apiFetch<LockedModule>('/modules/update', { method: 'POST', body: JSON.stringify({ source, version }) }),
  remove: (source: string, version: string) =>
    apiFetch<void>('/modules/remove', { method: 'POST', body: JSON.stringify({ source, version }) }),
  validate: (source: string, version: string) =>
    apiFetch<{ errors: string[]; valid: boolean }>('/modules/validate', {
      method: 'POST',
      body: JSON.stringify({ source, version }),
    }),
  install: () => apiFetch<ExecutionRef>('/modules/install', { method: 'POST' }),
  init: (name: string) => apiFetch<{ path: string }>('/modules/init', { method: 'POST', body: JSON.stringify({ name }) }),
}

// ── Git ──────────────────────────────────────────────────────────────────

export type GitStatus = { connected: boolean; error?: string }
export type SyncReport = {
  branch: string
  pullWarning?: string
  hadChanges: boolean
  statusSummary?: string
  committed: boolean
  pushed: boolean
}

export const gitApi = {
  status: () => apiFetch<GitStatus>('/git/status'),
  sync: (message?: string) => apiFetch<SyncReport>('/git/sync', { method: 'POST', body: JSON.stringify({ message }) }),
}

// ── Config ───────────────────────────────────────────────────────────────

export type RepoConfig = {
  reconcile: { mode: string; strictDelete: boolean; strictResourceDelete: boolean }
  server?: {
    port?: number
    frontendUrl?: string
    auth?: { mode?: string; forward?: { validateUrl?: string; timeout?: string } }
  }
  env?: { file?: string }
}
export type PatchConfigRequest = {
  reconcile?: { mode?: string; strictDelete?: boolean; strictResourceDelete?: boolean }
  server?: {
    port?: number
    frontendUrl?: string
    auth?: { mode?: string; forward?: { validateUrl?: string; timeout?: string } }
  }
  env?: { file?: string }
}

export const configApi = {
  get: () => apiFetch<RepoConfig>('/config'),
  patch: (body: PatchConfigRequest) =>
    apiFetch<RepoConfig>('/config', { method: 'PATCH', body: JSON.stringify(body) }),
}

// ── Env (contents of the file named by config.env.file, not hyve.yaml itself) ──

export const envApi = {
  list: () => apiFetch<Record<string, string>>('/env'),
  set: (key: string, value: string) =>
    apiFetch<Record<string, string>>(`/env/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    }),
  unset: (key: string) => apiFetch<void>(`/env/${encodeURIComponent(key)}`, { method: 'DELETE' }),
}

// ── Reconcile ────────────────────────────────────────────────────────────

export const reconcileApi = {
  all: (dryRun: boolean) => apiFetch<ExecutionRef>('/reconcile', { method: 'POST', body: JSON.stringify({ dryRun }) }),
  cluster: (name: string, dryRun: boolean) =>
    apiFetch<ExecutionRef>(`/reconcile/clusters/${encodeURIComponent(name)}`, {
      method: 'POST',
      body: JSON.stringify({ dryRun }),
    }),
}

// ── Executions ───────────────────────────────────────────────────────────

export const executionsApi = {
  list: () => apiFetch<ExecutionSummary[]>('/executions'),
  get: (id: string) => apiFetch<ExecutionSummary>(`/executions/${encodeURIComponent(id)}`),
  logs: (id: string, since?: number) =>
    apiFetch<{ lines: LogLine[] }>(
      `/executions/${encodeURIComponent(id)}/logs${since ? `?since=${since}` : ''}`,
    ),
}

// ── Health ───────────────────────────────────────────────────────────────

export const healthApi = {
  check: () => apiFetch<{ status: string; version: string }>('/health'),
}
