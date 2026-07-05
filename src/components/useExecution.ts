import { useCallback, useRef, useState } from 'react'
import { streamExecution } from '../lib/api'

/**
 * Shared hook for every "trigger an async server action, stream its log"
 * flow (reconcile, workflow run, module/workflow install). `trigger` takes a
 * function that POSTs and resolves with `{executionId}` — everything else
 * (subscribing to the WebSocket, buffering lines, clearing on re-trigger) is
 * handled here so sections don't each re-implement it.
 */
export function useExecution() {
  const [running, setRunning] = useState(false)
  const [lines, setLines] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const stopRef = useRef<(() => void) | null>(null)

  const trigger = useCallback((fn: () => Promise<{ executionId: string }>) => {
    stopRef.current?.()
    setRunning(true)
    setLines([])
    setError(null)
    fn()
      .then(({ executionId }) => {
        stopRef.current = streamExecution(
          executionId,
          (line) => setLines((prev) => [...prev, line]),
          () => setRunning(false),
        )
      })
      .catch((e: Error) => {
        setError(e.message)
        setRunning(false)
      })
  }, [])

  return { running, lines, error, trigger }
}
