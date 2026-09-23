// Home view: stats, quick search, quick actions, recent prompts, category breakdown
import { useRef, useState } from 'react'
import { usePreferences } from '../PreferencesContext.jsx'
import { formatRelativeTime } from '../utils/storage.js'

function StatCard({ label, value, accent, glow }) {
  return (
    <div className="neon-panel p-4 flex flex-col gap-1">
      <span className="text-[11px] tracking-[0.15em] text-faint uppercase">{label}</span>
      <span className={`text-3xl font-black ${accent}`} style={glow ? { textShadow: glow } : undefined}>
        {value}
      </span>
    </div>
  )
}

export default function Dashboard({
  prompts,
  onQuickSearch,
  onNew,
  onImportFile,
  onExportAll,
  onOpenPrompt,
  onSelectCategory,
}) {
  const [q, setQ] = useState('')
  const { categories, preferences } = usePreferences()
  const fileRef = useRef(null)

  const favCount = prompts.filter((p) => p.isFavorite).length
  const usedCategories = new Set(prompts.map((p) => p.category)).size
  const recentlyUsed = prompts
    .filter((p) => p.lastUsedAt)
    .sort((a, b) => new Date(b.lastUsedAt) - new Date(a.lastUsedAt))
    .slice(0, 6)

  const catStats = categories.map((c) => ({
    ...c,
    count: prompts.filter((p) => p.category === c.id).length,
  })).filter((c) => c.count > 0)
  const maxCount = Math.max(1, ...catStats.map((c) => c.count))

  const submitSearch = () => onQuickSearch(q)

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-6xl mx-auto">
      {/* hero + quick search */}
      <div className="neon-panel p-5 lg:p-6 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-neon/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-magenta/8 blur-3xl pointer-events-none" />
        <h1 className="text-xl lg:text-2xl font-black tracking-wider">
          <span className="text-neon glow-text-cyan">{preferences.theme === 'neon' ? '指挥台' : '你的提示词工作台'}</span>
          <span className="text-dim font-normal text-sm ml-3">收集、整理，随时调用</span>
        </h1>
        <div className="mt-4 flex gap-2 max-w-xl">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
            placeholder="快速搜索提示词…（回车跳转）"
            className="input-cyber flex-1 px-3.5 py-2.5 text-sm"
          />
          <button onClick={submitSearch} className="btn-neon rounded-lg px-4 py-2 text-sm font-medium cursor-pointer">
            搜索
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={onNew} className="btn-magenta rounded-lg px-3.5 py-2 text-sm cursor-pointer">
            + 新建提示词
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="btn-ghost rounded-lg px-3.5 py-2 text-sm cursor-pointer"
          >
            ⇪ 导入 JSON
          </button>
          <button onClick={onExportAll} className="btn-ghost rounded-lg px-3.5 py-2 text-sm cursor-pointer">
            ⇩ 导出全部
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onImportFile(f)
              e.target.value = ''
            }}
          />
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Prompts · 总数" value={prompts.length} accent="text-neon" glow="0 0 16px rgba(0,229,255,0.4)" />
        <StatCard label="Favorites · 收藏" value={favCount} accent="text-amber" glow="0 0 16px rgba(250,204,21,0.35)" />
        <StatCard label="Categories · 分类" value={usedCategories} accent="text-magenta" glow="0 0 16px rgba(255,46,196,0.35)" />
        <StatCard label="Recently Used · 最近使用" value={recentlyUsed.length} accent="text-violet" glow="0 0 16px rgba(167,139,250,0.35)" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* recently used */}
        <div className="neon-panel p-4">
          <h2 className="text-sm font-bold tracking-widest text-dim mb-3">// 最近使用 RECENT</h2>
          {recentlyUsed.length === 0 ? (
            <p className="text-xs text-faint py-6 text-center">
              还没有使用记录 —— 复制任意提示词后会出现在这里
            </p>
          ) : (
            <ul className="space-y-1.5">
              {recentlyUsed.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => onOpenPrompt(p)}
                    className="w-full text-left px-3 py-2 rounded-md border border-transparent hover:border-neon/30 hover:bg-panel-2 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span className="text-neon text-xs">▸</span>
                    <span className="flex-1 text-sm text-ink truncate">{p.title}</span>
                    <span className="text-[10px] text-faint shrink-0">{formatRelativeTime(p.lastUsedAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* category stats */}
        <div className="neon-panel p-4">
          <h2 className="text-sm font-bold tracking-widest text-dim mb-3">// 分类统计 CATEGORIES</h2>
          <ul className="space-y-2">
            {catStats.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => onSelectCategory(c.id)}
                  className="w-full group cursor-pointer"
                  title={`查看 ${c.zh}`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-dim group-hover:text-ink transition-colors">{c.zh}</span>
                    <span className="text-faint">{c.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-panel-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(c.count / maxCount) * 100}%`,
                        backgroundColor: c.color,
                        boxShadow: `0 0 8px ${c.color}80`,
                      }}
                    />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
