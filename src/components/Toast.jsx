// Bottom-right toast stack; toasts auto-expire in App state
const TYPE_STYLES = {
  success: 'border-neon/60 text-neon shadow-[0_0_18px_rgba(0,229,255,0.25)]',
  error: 'border-magenta/60 text-magenta shadow-[0_0_18px_rgba(255,46,196,0.25)]',
  info: 'border-violet/60 text-violet shadow-[0_0_18px_rgba(167,139,250,0.25)]',
}

const TYPE_ICONS = { success: '✓', error: '✕', info: 'ℹ' }

export default function Toast({ toasts }) {
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast-item pointer-events-auto flex items-center gap-2.5 rounded-lg border bg-panel/95 px-4 py-2.5 text-sm backdrop-blur ${TYPE_STYLES[t.type] || TYPE_STYLES.success}`}
        >
          <span className="font-bold">{TYPE_ICONS[t.type] || TYPE_ICONS.success}</span>
          <span className="text-ink">{t.message}</span>
        </div>
      ))}
    </div>
  )
}
