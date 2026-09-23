// 提示词工坊(Prompt Forge):一句话需求 → 锻造 System Prompt
// 双引擎:本地模板(免费秒出) / AI 增强(OpenAI 兼容 API,调用前确认)
import { useMemo, useRef, useState } from 'react'
import { BRAIN_MODELS, DOWNSTREAM_TASKS, DOWNSTREAM_MODELS, TASK_LABEL } from '../data/forgeModels.js'
import {
  loadForgeSettings,
  saveForgeSettings,
  isConfirmMutedToday,
  muteConfirmToday,
  loadForgeHistory,
  addForgeRecord,
  deleteForgeRecord,
  deriveTitle,
  buildLocalSystemPrompt,
  callForgeApi,
  attachmentKind,
} from '../utils/forgeEngine.js'
import { formatRelativeTime } from '../utils/storage.js'

const MAX_ATTACH_MB = 20
const KIND_ICON = { image: '🖼', audio: '🎵', video: '🎬', text: '📄', other: '📎' }

function readFileForAttachment(file) {
  return new Promise((resolve, reject) => {
    const kind = attachmentKind(file.type)
    const base = {
      id: 'att-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: file.name,
      mime: file.type || 'application/octet-stream',
      size: file.size,
      kind,
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error(`读取 ${file.name} 失败`))
    if (kind === 'text') {
      reader.onload = () => resolve({ ...base, textContent: String(reader.result || '') })
      reader.readAsText(file)
    } else {
      reader.onload = () => resolve({ ...base, dataUrl: String(reader.result || '') })
      reader.readAsDataURL(file)
    }
  })
}

export default function PromptForge({ onToast, onCopy, onSaveToLibrary }) {
  const [requirement, setRequirement] = useState('')
  const [isVision, setIsVision] = useState(false)
  const [brainFilter, setBrainFilter] = useState('all') // all | closed | open
  const [brainId, setBrainId] = useState('qwen3.5-27b')
  const [taskId, setTaskId] = useState('t2i')
  const [downstreamId, setDownstreamId] = useState('z-image')
  const [settings, setSettings] = useState(() => loadForgeSettings())
  const [showApiConfig, setShowApiConfig] = useState(false)
  const [result, setResult] = useState(null) // { text, mode, title }
  const [loading, setLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [muteChecked, setMuteChecked] = useState(false)
  const [history, setHistory] = useState(() => loadForgeHistory())
  const [attachments, setAttachments] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef(null)

  const brainModel = BRAIN_MODELS.find((m) => m.id === brainId) || BRAIN_MODELS[1]
  const downstreamList = DOWNSTREAM_MODELS[taskId] || []
  const downstreamModel =
    taskId === 'none' ? null : downstreamList.find((m) => m.id === downstreamId) || downstreamList[0]

  const filteredBrains = useMemo(
    () =>
      BRAIN_MODELS.filter((m) =>
        brainFilter === 'all' ? true : brainFilter === 'open' ? m.open : !m.open,
      ),
    [brainFilter],
  )

  const updateSettings = (patch) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveForgeSettings(next)
  }

  const selectTask = (id) => {
    setTaskId(id)
    const list = DOWNSTREAM_MODELS[id]
    if (list?.length) setDownstreamId(list[0].id)
  }

  /* ---------- 素材附件 ---------- */
  const addFiles = async (fileList) => {
    const files = [...(fileList || [])]
    if (!files.length) return
    const tooBig = files.filter((f) => f.size > MAX_ATTACH_MB * 1024 * 1024)
    if (tooBig.length) {
      onToast(`${tooBig.map((f) => f.name).join('、')} 超过 ${MAX_ATTACH_MB}MB,已跳过`, 'error')
    }
    const ok = files.filter((f) => f.size <= MAX_ATTACH_MB * 1024 * 1024)
    try {
      const parsed = await Promise.all(ok.map(readFileForAttachment))
      if (!parsed.length) return
      setAttachments((prev) => [...prev, ...parsed])
      // 附了图片/视频时,自动切到「图像识别」并提示
      if (!isVision && parsed.some((a) => a.kind === 'image' || a.kind === 'video')) {
        setIsVision(true)
        onToast('已附带图片/视频,大脑能力自动切到「图像识别」')
      } else {
        onToast(`已添加 ${parsed.length} 个素材`)
      }
    } catch (e) {
      onToast(e.message, 'error')
    }
  }

  const removeAttachment = (id) => setAttachments((prev) => prev.filter((a) => a.id !== id))

  /* ---------- 锻造 ---------- */
  const requestForge = () => {
    if (!requirement.trim()) {
      onToast('先写一句话需求,再锻造', 'error')
      return
    }
    if (settings.mode === 'api' && !isConfirmMutedToday()) {
      setMuteChecked(false)
      setConfirmOpen(true)
      return
    }
    runForge()
  }

  const runForge = async () => {
    setConfirmOpen(false)
    const params = { requirement: requirement.trim(), brainModel, isVision, taskId, downstreamModel, attachments }
    const title = deriveTitle(requirement, taskId)
    if (settings.mode === 'local') {
      setResult({ text: buildLocalSystemPrompt(params), mode: 'local', title })
      onToast('锻造完成(本地模板引擎)')
      return
    }
    setLoading(true)
    try {
      const text = await callForgeApi(settings, params)
      setResult({ text, mode: 'api', title })
      onToast('锻造完成(AI 增强)')
    } catch (e) {
      onToast(`锻造失败:${e.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const confirmAndForge = () => {
    if (muteChecked) muteConfirmToday()
    runForge()
  }

  /* ---------- 历史 ---------- */
  const saveToHistory = () => {
    if (!result) return
    const record = {
      id: 'forge-' + Date.now().toString(36),
      createdAt: new Date().toISOString(),
      title: result.title,
      requirement: requirement.trim(),
      brainId,
      isVision,
      taskId,
      downstreamId: downstreamModel?.id || null,
      mode: result.mode,
      text: result.text,
      // 只存素材的轻量元信息(不存 dataUrl,避免撑爆 localStorage)
      attachmentsMeta: attachments.map((a) => ({ name: a.name, kind: a.kind, size: a.size })),
    }
    setHistory(addForgeRecord(record))
    onToast('已存入锻造记录')
  }

  const loadRecord = (r) => {
    setRequirement(r.requirement)
    setBrainId(r.brainId)
    setIsVision(Boolean(r.isVision))
    setTaskId(r.taskId)
    if (r.downstreamId) setDownstreamId(r.downstreamId)
    setResult({ text: r.text, mode: r.mode, title: r.title })
    onToast('已回填该条记录')
  }

  const removeRecord = (id) => setHistory(deleteForgeRecord(id))

  const saveResultToLibrary = () => {
    if (!result) return
    onSaveToLibrary({
      title: result.title,
      category: 'System Prompt',
      platform: 'ChatGPT / Claude / Fable',
      tags: ['system prompt', '锻造', TASK_LABEL[taskId]].filter(Boolean),
      description: `一句话需求:${requirement.trim()}`,
      chinesePrompt: result.text,
      englishPrompt: '',
      shortPrompt: '',
      strongPrompt: '',
      negativePrompt: '',
      usageNotes: `由提示词工坊锻造(${result.mode === 'local' ? '本地模板引擎' : 'AI 增强'});大脑:${brainModel.name};下游:${taskId === 'none' ? '不下发' : `${TASK_LABEL[taskId]} · ${downstreamModel?.name}`}`,
      isFavorite: false,
    })
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* hero */}
      <div className="text-center mb-5">
        <h1 className="text-xl lg:text-2xl font-black tracking-wider">
          <span className="text-ink">一句话需求,</span>
          <span className="text-magenta glow-text-magenta">锻造</span>
          <span className="text-ink">出给 AI 的系统提示词</span>
        </h1>
        <p className="text-xs text-dim mt-2">
          选择大脑模型、告诉它接不接图片、要不要驱动下游生图/视频,一句话就产出一段专业的 System Prompt,拷走即用。
        </p>
        <div className="flex flex-wrap justify-center gap-1.5 mt-3">
          <span className={`px-2.5 py-1 rounded-full text-[10px] border ${settings.mode === 'api' ? 'border-violet/60 text-violet bg-violet/10' : 'border-neon/50 text-neon bg-neon/10'}`}>
            {settings.mode === 'api' ? '⛃ AI 增强 · 按 token 计费 · 点生成前会确认' : '⚡ 本地模板引擎 · 免费 · 离线可用'}
          </span>
          {['文本 LLM', '多模态 VLM', '文/图生图', '图像编辑', '文/图生视频'].map((t) => (
            <span key={t} className="px-2.5 py-1 rounded-full text-[10px] border border-line text-dim">{t}</span>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        {/* ============ 左:参数配置 ============ */}
        <div className="neon-panel p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-widest text-ink">⚙ 参数配置</h2>
            <span className="text-[10px] text-faint tracking-widest">// CONFIG.TERMINAL</span>
          </div>
          <p className="text-[11px] text-dim -mt-2">告诉 Forge 要炼什么,它给你锤出 System Prompt。</p>

          {/* 需求 */}
          <div>
            <div className="text-xs text-magenta mb-1.5">● 需求 / 使用场景</div>
            <textarea
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              rows={4}
              placeholder="例:给我生成一个赛博朋克游戏宣传图的系统提示词"
              className="input-cyber w-full px-3 py-2.5 text-sm leading-relaxed resize-y"
            />
            <div className="flex justify-between text-[10px] text-faint mt-1">
              <span>写清角色、任务、输出风格、限制,提示词更贴。</span>
              <span>{requirement.length} chars</span>
            </div>

            {/* 素材附件 */}
            <div className="mt-2.5">
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragOver(false)
                  addFiles(e.dataTransfer.files)
                }}
                className={`rounded-lg border border-dashed px-3 py-2.5 text-center text-[11px] cursor-pointer transition-all ${
                  dragOver
                    ? 'border-neon/70 bg-neon/5 text-neon'
                    : 'border-line text-faint hover:border-line-bright hover:text-dim'
                }`}
              >
                📎 添加素材(图片 / 音频 / 视频 / 文本)· 点击或拖拽 · 单个 ≤ {MAX_ATTACH_MB}MB
              </div>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/*,audio/*,video/*,text/*,.md,.json,.txt"
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files)
                  e.target.value = ''
                }}
              />
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {attachments.map((a) => (
                    <div
                      key={a.id}
                      className="group relative flex items-center gap-1.5 rounded-lg border border-line bg-panel-2 pl-1.5 pr-1 py-1 max-w-[10rem]"
                      title={`${a.name} · ${(a.size / 1024).toFixed(0)}KB`}
                    >
                      {a.kind === 'image' ? (
                        <img src={a.dataUrl} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
                      ) : (
                        <span className="w-6 h-6 rounded bg-void flex items-center justify-center text-xs shrink-0">
                          {KIND_ICON[a.kind] || '📎'}
                        </span>
                      )}
                      <span className="text-[10px] text-dim truncate">{a.name}</span>
                      <button
                        onClick={() => removeAttachment(a.id)}
                        className="text-faint hover:text-magenta text-xs px-0.5 cursor-pointer shrink-0"
                        title="移除"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {attachments.some((a) => a.kind !== 'image' && a.kind !== 'text') && (
                <p className="text-[10px] text-faint mt-1.5">
                  ⓘ 音频/视频以文件名带入需求上下文;AI 增强模式下仅图片会作为多模态输入直接发给模型。
                </p>
              )}
            </div>
          </div>

          {/* 大脑能力 */}
          <div>
            <div className="text-xs text-neon mb-1.5">● 大脑模型能力</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setIsVision(false)}
                className={`px-3 py-2.5 rounded-lg text-left border transition-all cursor-pointer ${!isVision ? 'border-neon/60 bg-neon/10' : 'border-line hover:border-line-bright'}`}
              >
                <div className={`text-xs font-bold ${!isVision ? 'text-neon' : 'text-dim'}`}>🚫👁 纯文本</div>
                <div className="text-[10px] text-dim mt-0.5">LLM 不看图/视频,只能读文字</div>
              </button>
              <button
                onClick={() => setIsVision(true)}
                className={`px-3 py-2.5 rounded-lg text-left border transition-all cursor-pointer ${isVision ? 'border-neon/60 bg-neon/10' : 'border-line hover:border-line-bright'}`}
              >
                <div className={`text-xs font-bold ${isVision ? 'text-neon' : 'text-dim'}`}>◉ 图像识别</div>
                <div className="text-[10px] text-dim mt-0.5">VLM 会接收图片/视频输入,需明确读图规则</div>
              </button>
            </div>
          </div>

          {/* 大脑模型 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-violet">● 大脑模型 · {filteredBrains.length} 可选</span>
              <div className="flex gap-1">
                {[
                  { id: 'all', label: '全部' },
                  { id: 'closed', label: '闭源' },
                  { id: 'open', label: '开源' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setBrainFilter(f.id)}
                    className={`px-2 py-0.5 rounded-full text-[10px] border transition-all cursor-pointer ${brainFilter === f.id ? 'border-magenta/60 text-magenta bg-magenta/10' : 'border-line text-dim'}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
              {filteredBrains.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setBrainId(m.id)}
                  className={`px-3 py-2 rounded-lg text-left border transition-all cursor-pointer ${brainId === m.id ? 'border-magenta/60 bg-magenta/10 shadow-[0_0_12px_rgba(255,46,196,0.15)]' : 'border-line hover:border-line-bright'}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-bold truncate ${brainId === m.id ? 'text-magenta' : 'text-ink'}`}>{m.name}</span>
                    <span className={`px-1.5 py-px rounded text-[9px] shrink-0 ${m.open ? 'bg-neon/10 text-neon' : 'bg-violet/10 text-violet'}`}>{m.tag}</span>
                  </div>
                  <div className="text-[9px] text-faint tracking-wider mt-0.5">{m.vendor}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 下游任务 */}
          <div>
            <div className="text-xs text-neon mb-1.5">
              ● 下游生成任务 <span className="text-faint">(选「不下发生成」即只写大脑 Prompt)</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {DOWNSTREAM_TASKS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectTask(t.id)}
                  title={t.desc}
                  className={`px-2 py-2.5 rounded-lg text-center border transition-all cursor-pointer ${taskId === t.id ? 'border-violet/60 bg-violet/10 text-violet' : 'border-line text-dim hover:border-line-bright hover:text-ink'}`}
                >
                  <div className="text-sm">{t.icon}</div>
                  <div className="text-[11px] mt-0.5">{t.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 下游具体模型 */}
          {taskId !== 'none' && (
            <div className="rounded-lg border border-neon/25 bg-neon/[0.03] p-3">
              <div className="text-xs text-neon mb-0.5">{TASK_LABEL[taskId]} · 选一个具体模型</div>
              <div className="text-[10px] text-faint mb-2">
                VLM/LLM 按该模型的固定 schema 输出 prompt(主体/风格/光线/构图/负面词)
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {downstreamList.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setDownstreamId(m.id)}
                    className={`px-3 py-2 rounded-lg text-left border transition-all cursor-pointer ${downstreamModel?.id === m.id ? 'border-neon/60 bg-neon/10' : 'border-line hover:border-line-bright'}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold truncate ${downstreamModel?.id === m.id ? 'text-neon' : 'text-ink'}`}>{m.name}</span>
                      <span className="px-1.5 py-px rounded text-[9px] bg-panel-3 text-dim shrink-0">{m.tag}</span>
                    </div>
                    <div className="text-[9px] text-faint tracking-wider mt-0.5">{m.vendor}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 锻造引擎设置 */}
          <div className="rounded-lg border border-line p-3">
            <button
              onClick={() => setShowApiConfig((s) => !s)}
              className="w-full flex items-center justify-between text-xs text-dim hover:text-ink transition-colors cursor-pointer"
            >
              <span>⛭ 锻造引擎:{settings.mode === 'local' ? '本地模板(免费)' : 'AI 增强(OpenAI 兼容 API)'}</span>
              <span>{showApiConfig ? '▲' : '▼'}</span>
            </button>
            {showApiConfig && (
              <div className="mt-3 space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => updateSettings({ mode: 'local' })}
                    className={`px-3 py-2 rounded-lg text-xs border transition-all cursor-pointer ${settings.mode === 'local' ? 'border-neon/60 text-neon bg-neon/10' : 'border-line text-dim'}`}
                  >
                    ⚡ 本地模板引擎<div className="text-[9px] opacity-70 mt-0.5">免费 · 离线 · 秒出</div>
                  </button>
                  <button
                    onClick={() => updateSettings({ mode: 'api' })}
                    className={`px-3 py-2 rounded-lg text-xs border transition-all cursor-pointer ${settings.mode === 'api' ? 'border-violet/60 text-violet bg-violet/10' : 'border-line text-dim'}`}
                  >
                    ⛃ AI 增强<div className="text-[9px] opacity-70 mt-0.5">OpenAI 兼容 · 按 token 计费</div>
                  </button>
                </div>
                {settings.mode === 'api' && (
                  <>
                    <label className="block">
                      <span className="text-[10px] text-dim">API Base URL(OpenAI 兼容,如 https://api.deepseek.com/v1)</span>
                      <input
                        value={settings.baseUrl}
                        onChange={(e) => updateSettings({ baseUrl: e.target.value })}
                        className="input-cyber w-full mt-1 px-2.5 py-1.5 text-xs font-mono"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] text-dim">API Key(仅存本机 localStorage)</span>
                      <input
                        type="password"
                        value={settings.apiKey}
                        onChange={(e) => updateSettings({ apiKey: e.target.value })}
                        placeholder="sk-…"
                        className="input-cyber w-full mt-1 px-2.5 py-1.5 text-xs font-mono"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] text-dim">模型名(如 deepseek-chat / qwen-plus)</span>
                      <input
                        value={settings.model}
                        onChange={(e) => updateSettings({ model: e.target.value })}
                        className="input-cyber w-full mt-1 px-2.5 py-1.5 text-xs font-mono"
                      />
                    </label>
                  </>
                )}
              </div>
            )}
          </div>

          {/* 锻造按钮 */}
          <button
            onClick={requestForge}
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-bold tracking-wider text-white transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait"
            style={{
              background: 'linear-gradient(90deg, #7c3aed, #ff2ec4)',
              boxShadow: '0 0 24px rgba(255,46,196,0.35)',
            }}
          >
            {loading ? '⏳ 锻造中…' : '✨ 锻造 System Prompt →'}
          </button>
        </div>

        {/* ============ 右:生成结果 ============ */}
        <div className="space-y-4">
          <div className="neon-panel p-4">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-bold tracking-widest text-ink">⚡ 生成结果</h2>
              <div className="flex gap-1.5">
                <button
                  onClick={() => result && onCopy(result.text, 'System Prompt')}
                  disabled={!result}
                  title="复制"
                  className="btn-ghost rounded-md px-2.5 py-1.5 text-xs cursor-pointer disabled:opacity-40"
                >
                  ⧉
                </button>
                <button
                  onClick={requestForge}
                  disabled={loading}
                  title="重新生成"
                  className="btn-ghost rounded-md px-2.5 py-1.5 text-xs cursor-pointer disabled:opacity-40"
                >
                  ↻
                </button>
              </div>
            </div>
            <p className="text-[11px] text-dim mb-3">拷走使用,或存到历史记录以后复用。</p>

            {/* mac window */}
            <div className="rounded-lg border border-line bg-void/70 overflow-hidden">
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-line bg-panel-2/60">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-2 text-[10px] tracking-widest text-faint">SYSTEM-PROMPT.MD</span>
                {result && (
                  <span className={`ml-auto px-1.5 py-px rounded text-[9px] ${result.mode === 'local' ? 'bg-neon/10 text-neon' : 'bg-violet/10 text-violet'}`}>
                    {result.mode === 'local' ? '本地模板' : 'AI 增强'}
                  </span>
                )}
              </div>
              <div className="p-3.5 max-h-[26rem] overflow-y-auto">
                {loading ? (
                  <div className="py-14 text-center text-sm text-violet animate-pulse">⛃ 大模型锻造中,稍等几秒…</div>
                ) : result ? (
                  <pre className="prompt-block text-ink/90">{result.text}</pre>
                ) : (
                  <div className="py-14 text-center text-xs text-faint">
                    左侧配置好参数,点「锻造 System Prompt」
                    <br />
                    成品会出现在这里
                  </div>
                )}
              </div>
            </div>

            {result && (
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="text-[10px] text-faint flex-1 min-w-40">
                  AI 生成仅供骨架,建议人工复核关键约束与 few-shot 示例再上线。
                </span>
                <button onClick={saveToHistory} className="btn-ghost rounded-lg px-3 py-1.5 text-xs cursor-pointer">
                  🖫 存到历史
                </button>
                <button onClick={saveResultToLibrary} className="btn-neon rounded-lg px-3 py-1.5 text-xs cursor-pointer">
                  ⊕ 保存到素材库
                </button>
              </div>
            )}
          </div>

          {/* 锻造记录 */}
          <div className="neon-panel p-4">
            <h2 className="text-sm font-bold tracking-widest text-ink mb-1">🗂 锻造记录</h2>
            <p className="text-[11px] text-dim mb-3">已保存的提示词,点一条即可回填复用。</p>
            {history.length === 0 ? (
              <p className="text-xs text-faint py-6 text-center">还没有记录 —— 锻造出满意的结果后点「存到历史」</p>
            ) : (
              <ul className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {history.map((r) => (
                  <li key={r.id} className="flex items-center gap-2">
                    <button
                      onClick={() => loadRecord(r)}
                      className="flex-1 min-w-0 text-left px-3 py-2 rounded-md border border-line hover:border-neon/40 hover:bg-panel-2 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-ink truncate">{r.title}</span>
                        <span className={`px-1.5 py-px rounded text-[9px] shrink-0 ${r.mode === 'local' ? 'bg-neon/10 text-neon' : 'bg-violet/10 text-violet'}`}>
                          {r.mode === 'local' ? '本地' : 'AI'}
                        </span>
                        <span className="px-1.5 py-px rounded text-[9px] bg-panel-3 text-dim shrink-0">{TASK_LABEL[r.taskId]}</span>
                      </div>
                      <div className="text-[10px] text-faint truncate mt-0.5">
                        {r.requirement} · {formatRelativeTime(r.createdAt)}
                      </div>
                    </button>
                    <button
                      onClick={() => removeRecord(r.id)}
                      title="删除记录"
                      className="btn-ghost rounded-md px-2 py-1.5 text-xs hover:!text-magenta hover:!border-magenta/50 cursor-pointer shrink-0"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* ============ 确认弹窗(AI 模式) ============ */}
      {confirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setConfirmOpen(false)} />
          <div className="modal-card relative neon-panel w-full max-w-md p-5 border-violet/40">
            <div className="w-10 h-10 rounded-full bg-violet/15 border border-violet/40 flex items-center justify-center text-violet mb-3">⛃</div>
            <h3 className="text-base font-bold text-ink mb-2">即将调用 AI 能力</h3>
            <p className="text-sm text-dim leading-relaxed mb-3">
              点击「确认生成」后会向 <span className="text-violet font-mono text-xs">{settings.baseUrl}</span> 提交一次
              AI 请求来锻造 System Prompt,将按你所用服务商的 token 消耗计费。
            </p>
            <div className="rounded-lg border border-violet/25 bg-violet/5 px-3 py-2.5 text-xs text-dim mb-3">
              ⚠ 本次将使用大模型 <span className="text-violet font-mono">{settings.model}</span> 生成 System
              Prompt,实际扣费取决于输出长度与所选模型。
            </div>
            <label className="flex items-center gap-2 text-xs text-dim cursor-pointer select-none mb-4">
              <input type="checkbox" checked={muteChecked} onChange={(e) => setMuteChecked(e.target.checked)} className="accent-[#a78bfa]" />
              今天内在本项目不再提醒
            </label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmOpen(false)} className="btn-ghost rounded-lg px-4 py-2 text-sm cursor-pointer">取消</button>
              <button
                onClick={confirmAndForge}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white cursor-pointer"
                style={{ background: 'linear-gradient(90deg, #7c3aed, #a78bfa)' }}
              >
                ✨ 确认生成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
