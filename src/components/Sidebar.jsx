import packageInfo from '../../package.json'
// Left rail: category filter, favorites toggle, quick stats
import { useId, useRef, useState } from 'react'
import { usePreferences } from '../PreferencesContext.jsx'

// Each responsive sidebar owns its form, so focusing the mobile input never
// targets the hidden desktop copy.
function QuickAddCategory({ onAdd }) {
  const [expanded, setExpanded] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const trigger = useRef(null)
  const composing = useRef(false)
  const errorId = useId()
  const close = () => {
    setExpanded(false)
    setName('')
    setError('')
    composing.current = false
    requestAnimationFrame(() => trigger.current?.focus())
  }

  return (
    <div className="mx-2 mb-3">
      <button ref={trigger} type="button" aria-expanded={expanded}
        onClick={() => setExpanded(value => !value)}
        className="w-full px-3 py-2 rounded-md text-sm text-left text-dim hover:text-ink hover:bg-panel-2 border border-dashed border-line hover:border-line-bright transition-colors cursor-pointer">
        + 新增分类
      </button>
      {expanded && (
        <form aria-label="快速新增分类" className="mt-2 p-2 rounded-md border border-line bg-panel-2"
          onSubmit={event => {
            event.preventDefault()
            if (composing.current) return
            try { onAdd(name); close() }
            catch (err) { setError(err.message || '保存失败，请稍后重试') }
          }}>
          <input autoFocus aria-label="新分类名称" placeholder="输入分类名称" maxLength={40}
            value={name} aria-invalid={!!error} aria-describedby={error ? errorId : undefined}
            onChange={event => { setName(event.target.value); setError('') }}
            onCompositionStart={() => { composing.current = true }}
            onCompositionEnd={() => { composing.current = false }}
            onKeyDown={event => {
              if (composing.current || event.nativeEvent.isComposing || event.keyCode === 229) {
                if (event.key === 'Enter') event.preventDefault()
                return
              }
              if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() }
            }}
            className="input-cyber w-full min-w-0 px-2.5 py-2 text-sm" />
          {error && <p id={errorId} role="alert" className="mt-2 text-xs text-ink">{error}</p>}
          <div className="mt-2 flex gap-2">
            <button type="submit" className="btn-neon flex-1 rounded-md px-2 py-1.5 text-xs cursor-pointer">创建</button>
            <button type="button" onClick={close} className="btn-ghost rounded-md px-2 py-1.5 text-xs cursor-pointer">取消</button>
          </div>
        </form>
      )}
    </div>
  )
}

export default function Sidebar({
  prompts,
  activeCategory,
  onSelectCategory,
  favOnly,
  onToggleFav,
  open,
  onClose,
  onManage,
  onAddCategory,
}) {
  const { preferences, categories } = usePreferences()
  const { sidebar } = preferences
  const countBy = (catId) => prompts.filter((p) => p.category === catId).length
  const favCount = prompts.filter((p) => p.isFavorite).length

  const content = (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-5 pb-3 flex items-center justify-between gap-2"><span className="text-xs text-dim truncate" title={sidebar.title}>{sidebar.title}</span><button onClick={onManage} className="text-xs text-dim hover:text-ink shrink-0" title="新增、重命名和排序分类">管理分类</button></div>

      <button
        onClick={() => onSelectCategory('all')}
        className={`mx-2 px-3 py-2 rounded-md text-sm text-left flex items-center justify-between transition-all cursor-pointer ${
          activeCategory === 'all' && !favOnly
            ? 'bg-neon/10 text-neon border border-neon/40'
            : 'text-dim hover:text-ink hover:bg-panel-2 border border-transparent'
        }`}
      >
        <span className="truncate" title={sidebar.allLabel}>{sidebar.allLabel}</span>
        {sidebar.showCounts && <span className="text-xs opacity-60">{prompts.length}</span>}
      </button>

      <button
        onClick={onToggleFav}
        className={`mx-2 mt-1 px-3 py-2 rounded-md text-sm text-left flex items-center justify-between transition-all cursor-pointer ${
          favOnly
            ? 'bg-amber/10 text-amber border border-amber/40'
            : 'text-dim hover:text-ink hover:bg-panel-2 border border-transparent'
        }`}
      >
        <span className="truncate" title={sidebar.favoritesLabel}>★ {sidebar.favoritesLabel}</span>
        {sidebar.showCounts && <span className="text-xs opacity-60">{favCount}</span>}
      </button>

      <div className="mx-4 my-3 border-t border-line" />
      <QuickAddCategory onAdd={onAddCategory} />

      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
        {categories.map((cat) => {
          const active = activeCategory === cat.id
          return (
            <button
              key={cat.id}
              title={cat.description || cat.zh}
              onClick={() => onSelectCategory(cat.id)}
              className={`w-full px-3 py-2 rounded-md text-sm text-left flex items-center gap-2 transition-all cursor-pointer ${
                active
                  ? 'bg-panel-3 text-ink border border-line-bright'
                  : 'text-dim hover:text-ink hover:bg-panel-2 border border-transparent'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: cat.color, boxShadow: active ? `0 0 8px ${cat.color}` : 'none' }}
              />
              <span className="flex-1 truncate">{cat.zh}</span>
              {sidebar.showCounts && <span className="text-xs opacity-50">{countBy(cat.id)}</span>}
            </button>
          )
        })}
      </div>

      <div className="px-4 py-3 border-t border-line text-[11px] text-faint leading-relaxed">
        <div>本地保存 · 随时导出备份</div>
        <div>Prompt Vault Pro · v{packageInfo.version}</div>
      </div>
    </div>
  )

  return (
    <>
      {/* desktop */}
      <aside className="hidden lg:block w-60 shrink-0 border-r border-line bg-panel/60 backdrop-blur-sm">
        {content}
      </aside>

      {/* mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/70" onClick={onClose} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-panel border-r border-line">
            <div className="flex justify-end p-2">
              <button onClick={onClose} className="btn-ghost rounded-md px-2.5 py-1 text-sm cursor-pointer">
                ✕
              </button>
            </div>
            {content}
          </aside>
        </div>
      )}
    </>
  )
}
