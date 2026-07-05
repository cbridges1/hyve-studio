import { useEffect, useState } from 'react'
import { healthApi, serverUrl } from './lib/api'
import { StatusDot } from './components/StatusDot'
import { ClustersSection } from './sections/ClustersSection'
import { TemplatesSection } from './sections/TemplatesSection'
import { WorkflowsSection } from './sections/WorkflowsSection'
import { ModulesSection } from './sections/ModulesSection'
import { GitSection } from './sections/GitSection'
import { ConfigSection } from './sections/ConfigSection'
import { ReconcileSection } from './sections/ReconcileSection'
import { ExecutionsSection } from './sections/ExecutionsSection'

type Section =
  | 'clusters'
  | 'templates'
  | 'workflows'
  | 'modules'
  | 'git'
  | 'config'
  | 'reconcile'
  | 'executions'

const NAV: { id: Section; label: string }[] = [
  { id: 'clusters', label: 'Clusters' },
  { id: 'templates', label: 'Templates' },
  { id: 'workflows', label: 'Workflows' },
  { id: 'modules', label: 'Modules' },
  { id: 'git', label: 'Git' },
  { id: 'reconcile', label: 'Reconcile' },
  { id: 'executions', label: 'Executions' },
  { id: 'config', label: 'Config' },
]

function useServerHealth() {
  const [healthy, setHealthy] = useState<boolean | null>(null)
  useEffect(() => {
    healthApi
      .check()
      .then(() => setHealthy(true))
      .catch(() => setHealthy(false))
  }, [])
  return healthy
}

export default function App() {
  const [section, setSection] = useState<Section>('clusters')
  const healthy = useServerHealth()

  return (
    <div className="flex h-full bg-base-bg text-sm antialiased">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-base-border flex flex-col">
        <div className="px-4 py-4 border-b border-base-border">
          <p className="text-ink font-semibold tracking-tight">Hyve Studio</p>
          <div className="mt-1.5">
            <StatusDot healthy={healthy} />
          </div>
          <p className="text-xs text-ink-faint mt-1 truncate">{serverUrl.replace(/^https?:\/\//, '')}</p>
        </div>
        <nav className="flex-1 py-2 px-2 space-y-0.5">
          {NAV.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                section === id
                  ? 'bg-base-raised text-ink'
                  : 'text-ink-dim hover:text-ink hover:bg-base-raised/60'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-base-border">
          <a
            href={`${serverUrl}/openapi.json`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-ink-faint hover:text-ink-dim transition-colors"
          >
            API reference ↗
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-8">
        {section === 'clusters' && <ClustersSection />}
        {section === 'templates' && <TemplatesSection />}
        {section === 'workflows' && <WorkflowsSection />}
        {section === 'modules' && <ModulesSection />}
        {section === 'git' && <GitSection />}
        {section === 'reconcile' && <ReconcileSection />}
        {section === 'executions' && <ExecutionsSection />}
        {section === 'config' && <ConfigSection />}
      </main>
    </div>
  )
}
