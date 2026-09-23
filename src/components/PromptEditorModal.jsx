// Create / edit modal; variables are auto-detected from prompt texts on save
import { useMemo, useState } from 'react'
import { PLATFORMS } from '../data/defaultPrompts.js'
import { usePreferences } from '../PreferencesContext.jsx'
import { extractVariables } from '../utils/promptBuilder.js'

const TEXTAREAS = [
  { key: 'chinesePrompt', label: '中文提示词', rows: 4 },
  { key: 'englishPrompt', label: '英文提示词', rows: 4 },
  { key: 'shortPrompt', label: '短版（一句话）', rows: 2 },
  { key: 'strongPrompt', label: '强执行版（规则化）', rows: 4 },
  { key: 'negativePrompt', label: '负面提示词', rows: 2 },
]

export default function PromptEditorModal({ initial, isNew, onSave, onClose }) {
  const { categories } = usePreferences()
  const [form, setForm] = useState(() => ({
    title: initial?.title || '',
    category: categories.some(c => c.id === initial?.category) ? initial.category : categories[0].id,
    platform: initial?.platform || PLATFORMS[0],
    tags: (initial?.tags || []).join(', '),
    description: initial?.description || '',
    chinesePrompt: initial?.chinesePrompt || '',
    englishPrompt: initial?.englishPrompt || '',
    shortPrompt: initial?.shortPrompt || '',
    strongPrompt: initial?.strongPrompt || '',
    negativePrompt: initial?.negativePrompt || '',
    usageNotes: initial?.usageNotes || '',
    isFavorite: Boolean(initial?.isFavorite),
  }))
  const [error, setError] = useState('')

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const detectedVars = useMemo(() => {
    const found = new Set()
    for (const { key } of TEXTAREAS) {
      for (const v of extractVariables(form[key])) found.add(v)
    }
    return [...found]
  }, [form])

  const handleSave = () => {
    if (!form.title.trim()) {
      setError('标题不能为空')
      return
    }
    const hasAnyPrompt = TEXTAREAS.some(({ key }) => form[key].trim() !== '')
    if (!hasAnyPrompt) {
      setError('至少填写一个提示词版本（中文 / 英文 / 短版 / 强执行版 / 负面）')
      return
    }
    onSave({
      ...form,
      title: form.title.trim(),
      tags: form.tags
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean),
      variables: detectedVars,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-card relative neon-panel w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border-magenta/30">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-line">
          <h2 className="text-base font-bold tracking-wider">
            <span className="text-magenta glow-text-magenta">{isNew ? '新建提示词' : '编辑提示词'}</span>
          </h2>
          <button onClick={onClose} className="btn-ghost rounded-md px-2.5 py-1.5 text-xs cursor-pointer">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
          <label className="block">
            <span className="text-xs text-dim">标题 *</span>
            <input
              value={form.title}
              onChange={set('title')}
              placeholder="例如：换装（脸和背景锁定）"
              className="input-cyber w-full mt-1 px-3 py-2 text-sm"
              autoFocus
            />
          </label>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-dim">分类</span>
              <select aria-label="分类" value={form.category} onChange={set('category')} className="input-cyber w-full mt-1 px-2.5 py-2 text-sm cursor-pointer">
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.zh}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-dim">适用平台</span>
              <select value={form.platform} onChange={set('platform')} className="input-cyber w-full mt-1 px-2.5 py-2 text-sm cursor-pointer">
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-xs text-dim">标签（逗号分隔）</span>
            <input
              value={form.tags}
              onChange={set('tags')}
              placeholder="去水印, logo, 修图"
              className="input-cyber w-full mt-1 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-xs text-dim">简短说明</span>
            <input
              value={form.description}
              onChange={set('description')}
              placeholder="一句话说明这个提示词是干什么的"
              className="input-cyber w-full mt-1 px-3 py-2 text-sm"
            />
          </label>

          {TEXTAREAS.map(({ key, label, rows }) => (
            <label key={key} className="block">
              <span className="text-xs text-dim">{label}</span>
              <textarea
                value={form[key]}
                onChange={set(key)}
                rows={rows}
                placeholder={`可使用变量：{subject} {object} {background} {style} …`}
                className="input-cyber w-full mt-1 px-3 py-2 text-xs font-mono leading-relaxed resize-y"
              />
            </label>
          ))}

          {detectedVars.length > 0 && (
            <div className="rounded-lg border border-amber/25 bg-amber/5 px-3 py-2 text-xs">
              <span className="text-amber font-bold mr-2">检测到变量：</span>
              {detectedVars.map((v) => (
                <span key={v} className="var-token mr-1.5 font-mono">{'{' + v + '}'}</span>
              ))}
            </div>
          )}

          <label className="block">
            <span className="text-xs text-dim">使用备注</span>
            <textarea
              value={form.usageNotes}
              onChange={set('usageNotes')}
              rows={2}
              placeholder="使用技巧、参数建议、踩坑记录…"
              className="input-cyber w-full mt-1 px-3 py-2 text-xs leading-relaxed resize-y"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-dim cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.isFavorite}
              onChange={(e) => setForm((f) => ({ ...f, isFavorite: e.target.checked }))}
              className="accent-[#facc15]"
            />
            <span className={form.isFavorite ? 'text-amber' : ''}>★ 加入收藏</span>
          </label>

          {error && (
            <div className="rounded-lg border border-magenta/40 bg-magenta/10 px-3 py-2 text-xs text-magenta">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-line">
          <button onClick={onClose} className="btn-ghost rounded-lg px-4 py-2 text-sm cursor-pointer">取消</button>
          <button onClick={handleSave} className="btn-magenta rounded-lg px-5 py-2 text-sm font-medium cursor-pointer">
            {isNew ? '创建' : '保存修改'}
          </button>
        </div>
      </div>
    </div>
  )
}
