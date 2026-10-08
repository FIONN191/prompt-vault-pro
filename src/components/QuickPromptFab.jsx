// Global floating action button (pinned to the right edge, like a browser-extension
// dock). Click / ⌘K to pop out a panel that does two things:
//   1. quick-capture a brand-new prompt into the vault without leaving the current view
//   2. search existing prompts and copy one with a single click
import { useEffect, useMemo, useRef, useState } from 'react'
import { usePreferences } from '../PreferencesContext.jsx'
import './QuickPromptFab.css'

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
  const { categories, preferences, savePreferences } = usePreferences()
  const [captureOpen, setCaptureOpen] = useState(false)
  const [activeTag, setActiveTag] = useState(null)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [grid, setGrid] = useState(false)
  const [locked, setLocked] = useState(false)
  const searchRef = useRef(null)
  const tags = useMemo(() => [...new Set(prompts.flatMap(p => p.tags || []))].sort((a, b) => a.localeCompare(b, 'zh-CN')), [prompts])
  useEffect(() => { if (activeTag && !tags.includes(activeTag)) setActiveTag(null) }, [tags, activeTag])
  const changeTheme = () => {
    const theme = preferences.theme === 'light' ? 'minimal' : 'light'
    if (desktop) window.desktopPrompt.requestTheme(theme)
    else savePreferences({ ...preferences, theme })
  }
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
    if (desktop) return window.desktopPrompt.onFocus(() => searchRef.current?.focus())
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
    const t = setTimeout(() => (captureOpen ? textRef : searchRef).current?.focus(), 60)
    return () => clearTimeout(t)
  }, [open, captureOpen])

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
    list = list.filter(p => (!favoritesOnly || p.isFavorite) && (!activeTag || p.tags.includes(activeTag)))
    return [...list]
      .sort((a, b) => {
        if (!!b.isFavorite !== !!a.isFavorite) return (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0)
        return recency(b) - recency(a)
      })

  }, [prompts, q, categories, favoritesOnly, activeTag])

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

          <aside className={`quick-vault-panel fixed z-50 flex flex-col ${desktop ? 'quick-vault-desktop inset-0' : 'quick-vault-web right-3 top-3 bottom-3'}`} aria-label="快速提示词">
            <header className={`quick-vault-header ${desktop && !locked ? 'quick-prompt-drag-handle' : ''}`} title={desktop && !locked ? '按住标题栏拖动面板' : undefined}>
              <span className="quick-vault-grip" aria-hidden="true">⠿</span>
              <div className="quick-vault-brand"><strong>Prompt Vault<span>PRO</span></strong><small>快速提示词</small></div>
              <button className="qv-icon qv-theme" onClick={changeTheme} aria-label={preferences.theme === 'light' ? '切换到深色模式' : '切换到浅色模式'} title="切换明暗主题">{preferences.theme === 'light' ? '☾' : '☀'}</button>
              <button className="qv-primary qv-add" onClick={() => setCaptureOpen(v => !v)} aria-expanded={captureOpen}>{captureOpen ? '收起' : '+ 新增'}</button>
              {desktop && <button className={`qv-icon ${locked ? 'is-active' : ''}`} onClick={() => setLocked(v => !v)} aria-label={locked ? '解锁面板位置' : '固定面板位置'} aria-pressed={locked} title={locked ? '解锁后可拖动' : '固定面板位置'}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3"/><path d={locked ? 'M8 10V7a4 4 0 0 1 8 0v3' : 'M8 10V7a4 4 0 0 1 8 0'}/></svg>
              </button>}
              <button onClick={close} className="qv-icon qv-close" aria-label="关闭" title="收起面板 (Esc)">×</button>
            </header>

            {captureOpen && <section className="qv-capture" aria-label="快速录入">
              <div className="qv-section-heading"><span>快速录入</span><small>⌘ / Ctrl + Enter 保存</small></div>
              {saveError && <p role="alert" className="text-xs text-magenta">{saveError}</p>}
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="标题（可留空，自动生成）" className="qv-input" />
              <textarea ref={textRef} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); submit() } }} rows={3} placeholder="在这里快速输入提示词…（⌘↵ 直接存入）" className="qv-input qv-textarea" />
              <div className="qv-capture-actions"><select aria-label="快速录入分类" value={category} onChange={e => setCategory(e.target.value)} className="qv-input">{categories.map(c => <option key={c.id} value={c.id}>{c.zh}</option>)}</select><button onClick={submit} disabled={saving} className="qv-primary">{saving ? '正在保存…' : '存入素材库'}</button></div>
            </section>}

            <div className="qv-search-area">
              <div className="qv-search-row">
                <div className="qv-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg><input ref={searchRef} value={q} onChange={e => setQ(e.target.value)} placeholder="搜索提示词或标签…" aria-label="搜索提示词或标签" />{q && <button onClick={() => { setQ(''); searchRef.current?.focus() }} aria-label="清空搜索">×</button>}</div>
                <button className={`qv-icon qv-layout ${grid ? 'is-active' : ''}`} onClick={() => setGrid(v => !v)} aria-label={grid ? '切换列表视图' : '切换网格视图'} aria-pressed={grid} title={grid ? '列表视图' : '网格视图'}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">{grid ? <path d="M4 6h16M4 12h16M4 18h16"/> : <><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></>}</svg></button>
              </div>
              <div className="qv-tags" aria-label="标签筛选"><button className={`qv-tag ${!activeTag ? 'is-active' : ''}`} onClick={() => setActiveTag(null)} aria-pressed={!activeTag}>全部</button>{tags.map(tag => <button key={tag} className={`qv-tag ${activeTag === tag ? 'is-active' : ''}`} onClick={() => setActiveTag(current => current === tag ? null : tag)} aria-pressed={activeTag === tag}>{tag}</button>)}</div>
            </div>

            <div className="qv-list-heading"><span>{favoritesOnly ? '我的收藏' : activeTag || '全部提示词'}<b>{results.length}</b></span><small>点击卡片即可复制</small></div>
            <div className={`qv-results ${grid ? 'is-grid' : ''}`}>
              {results.length === 0 ? <div className="qv-empty"><span>⌕</span><strong>{prompts.length ? '没有匹配的提示词' : '收藏你的第一条灵感'}</strong><p>{prompts.length ? '换个关键词，或调整标签和收藏筛选。' : '点击顶部「新增」，把常用提示词放在手边。'}</p>{prompts.length > 0 && <button className="qv-tag" onClick={() => { setQ(''); setActiveTag(null); setFavoritesOnly(false) }}>清空筛选</button>}</div> : results.map(p => <article className="qv-card" key={p.id}>
                <button className="qv-card-copy" onClick={() => copyRow(p)} title="点击复制主提示词" aria-label={`复制 ${p.title}`}><span className="qv-card-title">{p.isFavorite && <span className="qv-star">☆</span>}{p.title}</span><span className="qv-card-meta">{(p.tags.length ? p.tags.slice(0, 2) : [categories.find(c => c.id === p.category)?.zh || p.category]).map(tag => <span className="qv-badge" key={tag}>{tag}</span>)}</span>{grid && <span className="qv-card-description">{p.description || mainTextOf(p)}</span>}</button>
                {onOpenPrompt && <button className="qv-detail" onClick={() => { onOpenPrompt(p); close() }} title="查看详情" aria-label={`查看详情 ${p.title}`}>↗</button>}
              </article>)}
            </div>

            <footer className="qv-footer"><button className={`qv-favorites ${favoritesOnly ? 'is-active' : ''}`} onClick={() => setFavoritesOnly(v => !v)} aria-pressed={favoritesOnly}><span>{favoritesOnly ? '★' : '☆'}</span> 收藏库 <small>{prompts.filter(p => p.isFavorite).length}</small></button><div className="qv-footer-meta"><span>{desktop ? '⌘/Ctrl + Shift + K' : '⌘/Ctrl + K'}<span className="qv-dot">·</span>Esc 收起</span><span>本地保存</span></div></footer>
          </aside>
        </>
      )}
    </>
  )
}
