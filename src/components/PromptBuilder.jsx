// Builder view: pick task type + constraints → generated zh/en prompt → copy / save
import { useMemo, useState } from 'react'
import { TASK_TYPES, CONSTRAINTS, buildPrompt } from '../utils/promptBuilder.js'

export default function PromptBuilder({ onCopy, onSaveToLibrary }) {
  const [taskId, setTaskId] = useState(TASK_TYPES[0].id)
  const [constraintIds, setConstraintIds] = useState([])
  const [extraNotes, setExtraNotes] = useState('')
  const [lang, setLang] = useState('en')

  const result = useMemo(
    () => buildPrompt({ taskId, constraintIds, extraNotes }),
    [taskId, constraintIds, extraNotes],
  )
  const activeText = lang === 'en' ? result.en : result.zh

  const toggleConstraint = (id) =>
    setConstraintIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))

  const handleSave = () => {
    onSaveToLibrary({
      title: result.title,
      category: result.category,
      platform: '通用',
      tags: ['生成器'],
      description: `由 Prompt Builder 生成：${TASK_TYPES.find((t) => t.id === taskId)?.zhLabel || ''}`,
      chinesePrompt: result.zh,
      englishPrompt: result.en,
      shortPrompt: '',
      strongPrompt: '',
      negativePrompt: '',
      usageNotes: extraNotes ? `生成时的补充说明：${extraNotes}` : '',
      isFavorite: false,
    })
  }

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      <div className="mb-4">
        <h1 className="text-lg font-black tracking-wider">
          <span className="text-violet" style={{ textShadow: '0 0 12px rgba(167,139,250,0.5)' }}>
            PROMPT BUILDER
          </span>
          <span className="text-dim font-normal text-sm ml-3">选任务 + 勾约束 = 组合出完整提示词</span>
        </h1>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* left: task + constraints */}
        <div className="space-y-4">
          <div className="neon-panel p-4">
            <h2 className="text-sm font-bold tracking-widest text-dim mb-3">01 · 任务类型</h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {TASK_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTaskId(t.id)}
                  className={`px-3 py-2.5 rounded-lg text-left text-xs border transition-all cursor-pointer ${
                    taskId === t.id
                      ? 'border-neon/60 bg-neon/10 text-neon shadow-[0_0_12px_rgba(0,229,255,0.15)]'
                      : 'border-line text-dim hover:border-line-bright hover:text-ink'
                  }`}
                >
                  <div className="font-medium">{t.zhLabel}</div>
                  <div className="opacity-60 mt-0.5 text-[10px]">{t.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="neon-panel p-4">
            <h2 className="text-sm font-bold tracking-widest text-dim mb-3">
              02 · 约束条件 <span className="text-faint font-normal">（可多选，已选 {constraintIds.length}）</span>
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {CONSTRAINTS.map((c) => {
                const active = constraintIds.includes(c.id)
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleConstraint(c.id)}
                    className={`px-2.5 py-1.5 rounded-full text-xs border transition-all cursor-pointer ${
                      active
                        ? 'border-magenta/60 text-magenta bg-magenta/10 shadow-[0_0_10px_rgba(255,46,196,0.2)]'
                        : 'border-line text-dim hover:border-line-bright hover:text-ink'
                    }`}
                    title={c.label}
                  >
                    {active ? '✓ ' : ''}{c.zhLabel}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="neon-panel p-4">
            <h2 className="text-sm font-bold tracking-widest text-dim mb-2">03 · 补充说明（可选）</h2>
            <textarea
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              rows={2}
              placeholder="例如：主体是穿黑色皮衣的女生，参考图已附上"
              className="input-cyber w-full px-3 py-2 text-xs leading-relaxed resize-y"
            />
          </div>
        </div>

        {/* right: result */}
        <div className="neon-panel p-4 flex flex-col lg:sticky lg:top-20 self-start w-full">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold tracking-widest text-dim">04 · 生成结果</h2>
            <div className="flex gap-1">
              {[
                { id: 'en', label: 'English' },
                { id: 'zh', label: '中文' },
              ].map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLang(l.id)}
                  className={`px-2.5 py-1 rounded text-xs border transition-all cursor-pointer ${
                    lang === l.id
                      ? 'border-neon/60 text-neon bg-neon/10'
                      : 'border-line text-dim hover:text-ink'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 rounded-lg border border-line bg-void/60 p-3.5 min-h-56 overflow-y-auto">
            <p className="prompt-block text-ink/90">{activeText}</p>
          </div>

          <p className="text-[10px] text-faint mt-2">
            带 {'{变量}'} 的部分保存到素材库后，可在详情页填值实时替换。
          </p>

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onCopy(activeText, lang === 'en' ? '英文提示词' : '中文提示词')}
              className="btn-neon rounded-lg px-4 py-2 text-sm flex-1 cursor-pointer"
            >
              ⧉ 一键复制
            </button>
            <button onClick={handleSave} className="btn-magenta rounded-lg px-4 py-2 text-sm flex-1 cursor-pointer">
              ⊕ 保存到素材库
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
