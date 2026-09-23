// Detail view modal: version tabs, one-click copies, live variable filling
import { useMemo, useState } from 'react'
import { usePreferences } from '../PreferencesContext.jsx'
import { applyVariables, collectPromptVariables } from '../utils/promptBuilder.js'
import { formatRelativeTime } from '../utils/storage.js'

const VERSIONS = [
  { key: 'chinesePrompt', label: '中文版' },
  { key: 'englishPrompt', label: '英文版' },
  { key: 'shortPrompt', label: '短版' },
  { key: 'strongPrompt', label: '强执行版' },
  { key: 'negativePrompt', label: '负面提示词' },
]

/** Render prompt text with {var} tokens highlighted (green when filled). */
function HighlightedText({ text, values }) {
  const parts = useMemo(() => {
    const out = []
    let last = 0
    const re = /\{([a-zA-Z][a-zA-Z0-9_]*)\}/g
    let m
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) out.push({ t: 'text', v: text.slice(last, m.index) })
      out.push({ t: 'var', v: m[0], name: m[1] })
      last = m.index + m[0].length
    }
    if (last < text.length) out.push({ t: 'text', v: text.slice(last) })
    return out
  }, [text])

  return (
    <>
      {parts.map((p, i) =>
        p.t === 'text' ? (
          <span key={i}>{p.v}</span>
        ) : (
          <span key={i} className={`var-token ${values[p.name]?.trim() ? 'filled' : ''}`}>
            {values[p.name]?.trim() ? values[p.name].trim() : p.v}
          </span>
        ),
      )}
    </>
  )
}

export default function PromptDetailModal({ prompt, onClose, onEdit, onToggleFav, onCopy }) {
  const { categories } = usePreferences()
  const availableVersions = VERSIONS.filter((v) => (prompt[v.key] || '').trim() !== '')
  const [tab, setTab] = useState(availableVersions[0]?.key || 'chinesePrompt')
  const [varValues, setVarValues] = useState({})

  const variables = useMemo(() => collectPromptVariables(prompt), [prompt])
  const cat = categories.find((c) => c.id === prompt.category)
  const activeVersion = VERSIONS.find((v) => v.key === tab)
  const rawText = prompt[tab] || ''
  const finalText = applyVariables(rawText, varValues)

  const copyVersion = (key, label) => {
    const text = applyVariables(prompt[key] || '', varValues)
    if (text.trim()) onCopy(prompt, text, label)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-card relative neon-panel w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border-neon/30">
        {/* header */}
        <div className="flex items-start gap-3 p-4 sm:p-5 border-b border-line">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span
                className="px-2 py-0.5 rounded text-[10px] border"
                style={{ color: cat?.color, borderColor: `${cat?.color}66` }}
              >
                {cat?.zh || prompt.category}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] border border-violet/40 text-violet">
                {prompt.platform}
              </span>
              {prompt.tags.map((t) => (
                <span key={t} className="text-[10px] text-faint">#{t}</span>
              ))}
            </div>
            <h2 className="text-lg font-bold text-ink leading-snug">{prompt.title}</h2>
            {prompt.description && <p className="text-xs text-dim mt-1">{prompt.description}</p>}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onToggleFav(prompt.id)}
              className={`text-xl px-1.5 cursor-pointer ${prompt.isFavorite ? 'text-amber drop-shadow-[0_0_6px_rgba(250,204,21,0.6)]' : 'text-faint hover:text-amber'}`}
              title="收藏"
            >
              {prompt.isFavorite ? '★' : '☆'}
            </button>
            <button onClick={() => onEdit(prompt)} className="btn-ghost rounded-md px-2.5 py-1.5 text-xs cursor-pointer">
              编辑
            </button>
            <button onClick={onClose} className="btn-ghost rounded-md px-2.5 py-1.5 text-xs cursor-pointer">
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* variables */}
          {variables.length > 0 && (
            <div className="rounded-lg border border-amber/25 bg-amber/5 p-3.5">
              <div className="text-xs font-bold text-amber mb-2.5 tracking-wider">
                ⚙ 变量填充（实时生成最终提示词）
              </div>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {variables.map((name) => (
                  <label key={name} className="block">
                    <span className="text-[11px] text-dim font-mono">{'{' + name + '}'}</span>
                    <input
                      value={varValues[name] || ''}
                      onChange={(e) => setVarValues((v) => ({ ...v, [name]: e.target.value }))}
                      placeholder={`填写 ${name}…`}
                      className="input-cyber w-full mt-1 px-2.5 py-1.5 text-xs"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* version tabs */}
          <div>
            <div className="flex gap-1 flex-wrap mb-2">
              {availableVersions.map((v) => (
                <button
                  key={v.key}
                  onClick={() => setTab(v.key)}
                  className={`px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer ${
                    tab === v.key
                      ? 'bg-neon/10 text-neon border border-neon/50'
                      : 'text-dim border border-line hover:text-ink'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <div className="relative rounded-lg border border-line bg-void/60 p-3.5 pr-12">
              <p className="prompt-block text-ink/90">
                <HighlightedText text={rawText} values={varValues} />
              </p>
              <button
                onClick={() => copyVersion(tab, activeVersion?.label || '提示词')}
                className="absolute top-2.5 right-2.5 btn-neon rounded-md px-2 py-1 text-xs cursor-pointer"
                title={`复制${activeVersion?.label || ''}`}
              >
                ⧉
              </button>
            </div>
          </div>

          {/* one-click copy row */}
          <div className="flex flex-wrap gap-2">
            {availableVersions.map((v) => (
              <button
                key={v.key}
                onClick={() => copyVersion(v.key, v.label)}
                className={`rounded-md px-3 py-1.5 text-xs cursor-pointer ${
                  v.key === 'negativePrompt' ? 'btn-magenta' : 'btn-neon'
                }`}
              >
                ⧉ 复制{v.label}
              </button>
            ))}
          </div>

          {/* usage notes */}
          {prompt.usageNotes && (
            <div className="rounded-lg border border-violet/25 bg-violet/5 p-3.5">
              <div className="text-xs font-bold text-violet mb-1.5 tracking-wider">✎ 使用备注</div>
              <p className="text-xs text-dim leading-relaxed whitespace-pre-wrap">{prompt.usageNotes}</p>
            </div>
          )}

          {/* final composed preview when variables filled */}
          {variables.length > 0 && finalText !== rawText && (
            <div className="rounded-lg border border-mint/25 bg-mint/5 p-3.5">
              <div className="text-xs font-bold text-mint mb-1.5 tracking-wider">▶ 最终提示词（变量已代入）</div>
              <p className="prompt-block text-ink/90">{finalText}</p>
            </div>
          )}
        </div>

        {/* footer meta */}
        <div className="px-4 sm:px-5 py-2.5 border-t border-line flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-faint">
          <span>创建：{new Date(prompt.createdAt).toLocaleString('zh-CN')}</span>
          <span>更新：{new Date(prompt.updatedAt).toLocaleString('zh-CN')}</span>
          <span>最近使用：{formatRelativeTime(prompt.lastUsedAt)}</span>
        </div>
      </div>
    </div>
  )
}
