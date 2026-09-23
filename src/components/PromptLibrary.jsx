// Library view: filter toolbar + tag filter + card grid + empty states
import { PLATFORMS } from '../data/defaultPrompts.js'
import PromptCard from './PromptCard.jsx'
import TagFilter from './TagFilter.jsx'

const SORT_OPTIONS = [
  { id: 'updated', label: '最近更新' },
  { id: 'recent', label: '最近使用' },
  { id: 'created', label: '最新创建' },
  { id: 'title', label: '标题 A-Z' },
]

export default function PromptLibrary({
  filtered,
  total,
  query,
  onSearch,
  platform,
  onPlatform,
  sortBy,
  onSortBy,
  favOnly,
  onToggleFav,
  allTags,
  selectedTags,
  onToggleTag,
  onClearTags,
  hasActiveFilters,
  onClearAllFilters,
  onOpen,
  onCopy,
  onEdit,
  onDelete,
  onToggleFavPrompt,
  onNew,
}) {
  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* toolbar */}
      <div className="neon-panel p-3.5 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="搜索标题 / 内容 / 标签…"
            className="input-cyber flex-1 min-w-44 px-3 py-2 text-sm"
          />
          <select
            value={platform}
            onChange={(e) => onPlatform(e.target.value)}
            className="input-cyber px-2.5 py-2 text-sm cursor-pointer"
            title="按平台筛选"
          >
            <option value="all">全部平台</option>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => onSortBy(e.target.value)}
            className="input-cyber px-2.5 py-2 text-sm cursor-pointer"
            title="排序方式"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          <button
            onClick={onToggleFav}
            className={`rounded-lg px-3 py-2 text-sm border transition-all cursor-pointer ${
              favOnly
                ? 'border-amber/60 text-amber bg-amber/10 shadow-[0_0_12px_rgba(250,204,21,0.2)]'
                : 'border-line text-dim hover:text-amber hover:border-amber/40'
            }`}
            title="仅显示收藏"
          >
            ★ 收藏
          </button>
        </div>
        <TagFilter
          allTags={allTags}
          selectedTags={selectedTags}
          onToggleTag={onToggleTag}
          onClear={onClearTags}
        />
      </div>

      {/* result meta */}
      <div className="flex items-center justify-between text-xs text-faint px-1">
        <span>
          {filtered.length} / {total} 条提示词
        </span>
        {hasActiveFilters && (
          <button onClick={onClearAllFilters} className="text-magenta hover:underline cursor-pointer">
            清空全部筛选 ✕
          </button>
        )}
      </div>

      {/* grid / empty states */}
      {total === 0 ? (
        <div className="neon-panel py-20 text-center space-y-4">
          <div className="text-5xl opacity-40">⌀</div>
          <p className="text-dim text-sm">素材库是空的</p>
          <button onClick={onNew} className="btn-neon rounded-lg px-4 py-2 text-sm cursor-pointer">
            + 新建第一条提示词
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="neon-panel py-20 text-center space-y-4">
          <div className="text-5xl opacity-40">⌕</div>
          <p className="text-dim text-sm">没有匹配当前筛选条件的提示词</p>
          <button onClick={onClearAllFilters} className="btn-ghost rounded-lg px-4 py-2 text-sm cursor-pointer">
            清空筛选条件
          </button>
        </div>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <PromptCard
              key={p.id}
              prompt={p}
              onOpen={onOpen}
              onCopy={onCopy}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleFav={onToggleFavPrompt}
            />
          ))}
        </div>
      )}
    </div>
  )
}
