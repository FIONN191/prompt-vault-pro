// Top navigation: brand, view tabs, global search, new-prompt button
import { THEMES } from '../utils/preferences.js'
const NAV_ITEMS = [
  { id: 'dashboard', label: '仪表盘' },
  { id: 'library', label: '提示词库' },
  { id: 'builder', label: '生成器' },
  { id: 'forge', label: '锻造工坊' },
  { id: 'io', label: '导入/导出' },
  { id: 'settings', label: '账号与设置' },
]

export default function Navbar({ view, onNavigate, query, onSearch, onNew, onToggleSidebar, theme, onTheme }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-void/85 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-3 px-4 lg:px-6 min-h-14 py-2">
        {/* mobile: sidebar toggle */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden btn-ghost rounded-md px-2.5 py-1.5 text-sm cursor-pointer"
          aria-label="打开分类栏"
        >
          ☰
        </button>

        {/* brand */}
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-baseline gap-2 shrink-0 cursor-pointer"
        >
          <span className="text-lg font-black tracking-widest text-neon glow-text-cyan">
            PROMPT VAULT
          </span>
          <span className="text-lg font-black tracking-widest text-magenta glow-text-magenta">
            PRO
          </span>
        </button>

        {/* view tabs */}
        <nav className="hidden md:flex items-center gap-1 ml-4">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`px-3 py-1.5 rounded-md text-sm transition-all cursor-pointer ${
                view === item.id
                  ? 'text-neon bg-neon/10 border border-neon/40'
                  : 'text-dim hover:text-ink border border-transparent'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex-1" />

        {/* global search */}
        <div className="relative w-36 sm:w-44 lg:w-52">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint text-sm pointer-events-none">⌕</span>
          <input
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="搜索标题 / 内容 / 标签…"
            className="input-cyber w-full pl-8 pr-3 py-1.5 text-sm"
          />
        </div>

        <select aria-label="界面主题" value={theme} onChange={e => onTheme(e.target.value)} className="input-cyber px-2 py-1.5 text-xs cursor-pointer" title="切换主题，所有窗口同步">
          {THEMES.map(item => <option key={item.id} value={item.id}>{item.name}{item.id === 'minimal' ? ' · 默认' : ''}</option>)}
        </select>
        <button
          onClick={onNew}
          className="btn-neon rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap cursor-pointer"
        >
          + 新建
        </button>
      </div>

      {/* mobile view tabs */}
      <nav className="md:hidden flex items-center gap-1 px-3 pb-2 overflow-x-auto">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`px-3 py-1 rounded-md text-xs whitespace-nowrap transition-all cursor-pointer ${
              view === item.id
                ? 'text-neon bg-neon/10 border border-neon/40'
                : 'text-dim border border-line'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </header>
  )
}
