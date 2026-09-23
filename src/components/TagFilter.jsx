// Tag chips row: click to toggle filter tags
import { useState } from 'react'
export default function TagFilter({ allTags, selectedTags, onToggleTag, onClear }) {
  const [expanded, setExpanded] = useState(false)
  const visibleTags = expanded ? allTags : allTags.filter(({ tag }, index) => index < 10 || selectedTags.includes(tag))
  if (!allTags.length) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-faint mr-1 shrink-0">标签</span>
      {visibleTags.map(({ tag, count }) => {
        const active = selectedTags.includes(tag)
        return (
          <button
            key={tag}
            onClick={() => onToggleTag(tag)}
            className={`px-2.5 py-1 rounded-full text-xs border transition-all cursor-pointer ${
              active
                ? 'border-neon/70 text-neon bg-neon/10 shadow-[0_0_10px_rgba(0,229,255,0.25)]'
                : 'border-line text-dim hover:border-line-bright hover:text-ink'
            }`}
          >
            #{tag}
            <span className="ml-1 opacity-50">{count}</span>
          </button>
        )
      })}
      {allTags.length > 10 && <button className="text-xs text-dim px-2 py-1 hover:text-ink" onClick={() => setExpanded(value => !value)}>{expanded ? '收起标签' : `展开全部 ${allTags.length} 个标签`}</button>}
      {selectedTags.length > 0 && (
        <button
          onClick={onClear}
          className="px-2.5 py-1 rounded-full text-xs border border-magenta/50 text-magenta hover:bg-magenta/10 transition-all cursor-pointer"
        >
          清除标签 ✕
        </button>
      )}
    </div>
  )
}
