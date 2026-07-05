import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/80 p-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg border border-base-border rounded-lg shadow-2xl mt-8"
        style={{ backgroundColor: '#15171e' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-base-border">
          <p className="text-sm font-medium text-ink">{title}</p>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-ink-faint hover:text-ink text-lg leading-none px-1"
          >
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
