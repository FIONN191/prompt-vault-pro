// Grid card for one prompt: meta, tags, favorite / copy / edit / delete actions
import { usePreferences } from '../PreferencesContext.jsx'
import { formatRelativeTime } from '../utils/storage.js'

export default function PromptCard({ prompt, onOpen, onCopy, onEdit, onDelete, onToggleFav }) {
  const { categories } = usePreferences()
  const cat = categories.find((c) => c.id === prompt.category)
  const catColor = cat?.color || '#8b93b5'
  const mainText =
    prompt.englishPrompt || prompt.chinesePrompt || prompt.shortPrompt || prompt.strongPrompt

  const stop = (fn) => (e) => {
    e.stopPropagation()
    fn()
  }

  return (
    <div
      onClick={() => onOpen(prompt)}
      className="neon-card p-4 flex flex-col gap-2.5 cursor-pointer group"
    >
      {/* category + favorite */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] tracking-wide" style={{ color: catColor }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: catColor }} />
          {cat?.zh || prompt.category}
        </span>
        <button
          onClick={stop(() => onToggleFav(prompt.id))}
          className={`text-lg leading-none transition-all cursor-pointer ${
            prompt.isFavorite ? 'text-amber drop-shadow-[0_0_6px_rgba(250,204,21,0.6)]' : 'text-faint hover:text-amber'
          }`}
          title={prompt.isFavorite ? '取消收藏' : '收藏'}
        >
          {prompt.isFavorite ? '★' : '☆'}
        </button>
      </div>

      {/* title */}
      <h3 className="font-semibold text-ink leading-snug group-hover:text-neon transition-colors">
        {prompt.title}
      </h3>

      {/* description */}
      <p className="text-xs text-dim leading-relaxed line-clamp-2 min-h-[2rem]">
        {prompt.description || mainText}
      </p>

      {/* tags + platform */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="px-2 py-0.5 rounded text-[10px] border border-violet/40 text-violet">
          {prompt.platform}
        </span>
        {prompt.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] border border-line text-dim">
            #{tag}
          </span>
        ))}
        {prompt.tags.length > 3 && (
          <span className="text-[10px] text-faint">+{prompt.tags.length - 3}</span>
        )}
      </div>

      {/* footer actions */}
      <div className="flex items-center gap-1.5 pt-1 mt-auto border-t border-line/60">
        <button
          onClick={stop(() => onCopy(prompt, mainText, '提示词'))}
          className="btn-neon rounded px-2.5 py-1 text-xs mt-2 cursor-pointer"
          title="复制主提示词"
        >
          ⧉ 复制
        </button>
        <button
          onClick={stop(() => onEdit(prompt))}
          className="btn-ghost rounded px-2.5 py-1 text-xs mt-2 cursor-pointer"
        >
          编辑
        </button>
        <button
          onClick={stop(() => onDelete(prompt))}
          className="btn-ghost rounded px-2.5 py-1 text-xs mt-2 hover:!text-magenta hover:!border-magenta/50 cursor-pointer"
        >
          删除
        </button>
        <span className="ml-auto mt-2 text-[10px] text-faint" title="最近使用">
          {prompt.lastUsedAt ? `用于 ${formatRelativeTime(prompt.lastUsedAt)}` : ''}
        </span>
      </div>
    </div>
  )
}
