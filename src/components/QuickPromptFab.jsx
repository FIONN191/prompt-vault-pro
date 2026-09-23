// Global floating action button (pinned to the right edge, like a browser-extension
// dock). Click / ⌘K to pop out a panel that does two things:
//   1. quick-capture a brand-new prompt into the vault without leaving the current view
//   2. search existing prompts and copy one with a single click
import { useEffect, useMemo, useRef, useState } from 'react'
import { usePreferences } from '../PreferencesContext.jsx'
import { formatRelativeTime } from '../utils/storage.js'

const hasCJK = (s) => /[㐀-鿿]/.test(s)
const mainTextOf = (p) => p.englishPrompt || p.chinesePrompt || p.shortPrompt || p.strongPrompt || ''

/* small 4-point sparkle, echoes the reference button's badge */
function Sparkle({ className }) {
  return (
    <svg viewBox="0 0 12 12" className={className} aria-hidden="true">
      <path
        d="M6 0c.45 2.7 1.5 3.75 4.2 4.2-2.7.45-3.75 1.5-4.2 4.2-.45-2.7-1.5-3.75-4.2-4.2C4.5 3.75 5.55 2.7 6 0Z"
        fill="currentColor"
      />
    </svg>
  )
}

/* prompt / chat-bubble glyph */
function PromptGlyph({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M4 6.2A2.6 2.6 0 0 1 6.6 3.6h10.8A2.6 2.6 0 0 1 20 6.2v6.6a2.6 2.6 0 0 1-2.6 2.6H10l-4.2 3.4v-3.4h-.2A2.6 2.6 0 0 1 4 12.8V6.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M8 8.6h8M8 11.2h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export default function QuickPromptFab({ prompts, onQuickAdd, onCopy, onOpenPrompt, desktop = false }) {
  const { categories } = usePreferences()
  const [open, setOpen] = useState(desktop)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [category, setCategory] = useState(categories[0].id)
  useEffect(() => {
    if (!categories.some(c => c.id === category)) setCategory(categories[0].id)
  }, [categories, category])
  const [q, setQ] = useState('')
  const textRef = useRef(null)
  const savingRef = useRef(false)
  const close = () => desktop ? window.desktopPrompt.close() : setOpen(false)
  useEffect(() => {
    if (desktop) return window.desktopPrompt.onFocus(() => textRef.current?.focus())
  }, [desktop])

  // global shortcut: ⌘/Ctrl+K toggles the panel, Esc closes it
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        if (!desktop && window.desktopPrompt) window.desktopPrompt.toggle()
        else if (!desktop) setOpen((o) => !o)
      } else if (e.key === 'Escape') {
        if (desktop) window.desktopPrompt.close()
        else setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [desktop])

  // focus the capture box when the panel opens
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => textRef.current?.focus(), 60)
    return () => clearTimeout(t)
  }, [open])

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const time = (iso) => (iso ? new Date(iso).getTime() : 0)
    let list = prompts
    if (needle) {
      list = prompts.filter((p) =>
        [
          p.title,
          p.description,
          p.chinesePrompt,
          p.englishPrompt,
          p.shortPrompt,
          p.strongPrompt,
          p.tags.join(' '),
          p.platform,
          p.category,
          categories.find(c => c.id === p.category)?.zh,
        ]
          .join('\n')
          .toLowerCase()
          .includes(needle),
      )
    }
    // favorites first, then most-recently used / updated
    const recency = (p) => Math.max(time(p.lastUsedAt), time(p.updatedAt))
    return [...list]
      .sort((a, b) => {
        if (!!b.isFavorite !== !!a.isFavorite) return (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0)
        return recency(b) - recency(a)
      })
      .slice(0, 40)
  }, [prompts, q, categories])

  const submit = async () => {
    if (savingRef.current) return
    const body = text.trim()
    if (!body) {
      textRef.current?.focus()
      return
    }
    const derived = title.trim() || body.replace(/\s+/g, ' ').slice(0, 24) || '未命名快速提示词'
    const cjk = hasCJK(body)
    savingRef.current = true
    setSaving(true)
    setSaveError('')
    try {
    const ok = await onQuickAdd({
      title: derived,
      category,
      platform: '通用',
      tags: ['快速录入'],
      description: '',
      chinesePrompt: cjk ? body : '',
      englishPrompt: cjk ? '' : body,
      shortPrompt: '',
      strongPrompt: '',
      negativePrompt: '',
      variables: [],
      usageNotes: '',
      isFavorite: false,
    })
    if (ok !== false) {
      setTitle('')
      setText('')
      textRef.current?.focus()
    }
    } catch {
      setSaveError('保存失败，输入已保留。请检查可用存储空间后重试。')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const stop = (fn) => (e) => {
    e.stopPropagation()
    fn()
  }
  const copyRow = (p) => onCopy(p, mainTextOf(p), '提示词')

  return (
    <>
      {/* floating button — hidden while the panel is open (panel covers this edge) */}
      {!open && (
        <button
          onClick={() => window.desktopPrompt ? window.desktopPrompt.toggle() : setOpen(true)}
          aria-label="快速提示词面板"
          title="快速提示词 (⌘K)"
          className="fab-dock fixed right-3 top-1/2 z-50 grid h-14 w-14 place-items-center rounded-full border border-neon/50 bg-panel/90 text-neon backdrop-blur-md shadow-[0_0_20px_rgba(0,229,255,0.25)] transition-[box-shadow,border-color] hover:border-neon hover:shadow-[0_0_30px_rgba(0,229,255,0.55)] cursor-pointer"
        >
          <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center text-magenta drop-shadow-[0_0_6px_rgba(255,46,196,0.7)]">
            <Sparkle className="h-3 w-3" />
          </span>
          <PromptGlyph className="h-6 w-6" />
        </button>
      )}

      {open && (
        <>
          {/* click-away catcher (below the panel, above the app) */}
          <div className="fixed inset-0 z-40" onClick={close} />

          <aside className={`panel-slide-in fixed right-0 top-0 bottom-0 z-50 flex ${desktop ? 'w-full' : 'w-[92vw]'} max-w-[384px] flex-col border-l border-line bg-panel/95 backdrop-blur-md shadow-[-8px_0_44px_rgba(0,0,0,0.55)]`}>
            {/* header */}
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
              <div className="flex items-center gap-2 text-neon">
                <PromptGlyph className="h-5 w-5" />
                <span className="text-sm font-bold tracking-widest glow-text-cyan">快速提示词</span>
              </div>
              <button
                onClick={close}
                className="btn-ghost cursor-pointer rounded-md px-2 py-1 text-sm"
                aria-label="关闭"
              >
                ✕
              </button>
            </div>

            {/* quick capture */}
            <div className="shrink-0 space-y-2 border-b border-line p-4">
              <div className="text-[11px] tracking-[0.2em] text-faint">// 快速录入 NEW</div>
              {saveError && <p role="alert" className="text-xs text-magenta">{saveError}</p>}
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="标题（可留空，自动生成）"
                className="input-cyber w-full px-3 py-2 text-sm"
              />
              <textarea
                ref={textRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault()
                    submit()
                  }
                }}
                rows={4}
                placeholder="在这里快速输入提示词…（⌘↵ 直接存入）"
                className="input-cyber prompt-block w-full resize-none px-3 py-2 text-sm"
              />
              <div className="flex items-center gap-2">
                <select
                  aria-label="快速录入分类"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input-cyber min-w-0 flex-1 cursor-pointer px-2 py-2 text-xs"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.zh}
                    </option>
                  ))}
                </select>
                <button
                  onClick={submit}
                  disabled={saving}
                  className="btn-neon shrink-0 cursor-pointer whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium"
                >
                  {saving ? '正在保存…' : '存入素材库'}
                </button>
              </div>
            </div>

            {/* search + list */}
            <div className="shrink-0 px-4 pb-2 pt-3">
              <div className="text-[11px] tracking-[0.2em] text-faint mb-2">// 调用已有 LIBRARY</div>
              <div className="relative">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-faint">
                  ⌕
                </span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="搜索标题 / 内容 / 标签，一键复制…"
                  className="input-cyber w-full py-2 pl-8 pr-3 text-sm"
                />
              </div>
            </div>

            <div className="flex-1 space-y-1.5 overflow-y-auto px-3 pb-3">
              {results.length === 0 ? (
                <div className="px-2 py-10 text-center text-xs text-faint">
                  {q.trim() ? '没有匹配的提示词' : '素材库还是空的'}
                </div>
              ) : (
                results.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => copyRow(p)}
                    className="neon-card group flex cursor-pointer items-start gap-2 p-3"
                    title="点击复制主提示词"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {p.isFavorite && <span className="text-xs text-amber">★</span>}
                        <h4 className="truncate text-sm font-medium text-ink transition-colors group-hover:text-neon">
                          {p.title}
                        </h4>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-dim">
                        {p.description || mainTextOf(p)}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="rounded border border-violet/40 px-1.5 py-0.5 text-[10px] text-violet">
                          {p.platform}
                        </span>
                        {p.lastUsedAt && (
                          <span className="text-[10px] text-faint">用于 {formatRelativeTime(p.lastUsedAt)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <button
                        onClick={stop(() => copyRow(p))}
                        className="btn-neon cursor-pointer rounded px-2 py-1 text-[11px]"
                        title="复制"
                      >
                        ⧉
                      </button>
                      {onOpenPrompt && (
                        <button
                          onClick={stop(() => {
                            onOpenPrompt(p)
                            close()
                          })}
                          className="btn-ghost cursor-pointer rounded px-2 py-1 text-[11px]"
                          title="查看详情"
                        >
                          ↗
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* footer hint */}
            <div className="flex shrink-0 items-center justify-between border-t border-line px-4 py-2 text-[10px] text-faint">
              <span>{desktop ? '⌘/Ctrl+Shift+K · Esc 收起' : '⌘K 打开 · Esc 关闭'}</span>
              <span>⌘↵ 存入素材库</span>
            </div>
          </aside>
        </>
      )}
    </>
  )
}
