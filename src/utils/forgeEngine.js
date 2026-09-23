// 提示词工坊引擎:本地模板锻造 + OpenAI 兼容 API 锻造 + 设置/历史/确认弹窗记忆
import { TASK_LABEL } from '../data/forgeModels.js'

const SETTINGS_KEY = 'prompt_vault_pro_forge_settings_v1'
const HISTORY_KEY = 'prompt_vault_pro_forge_history_v1'
const CONFIRM_MUTE_KEY = 'prompt_vault_pro_forge_confirm_mute'
const HISTORY_LIMIT = 50

/* ============ 设置(锻造模式 + API 配置) ============ */

const DEFAULT_SETTINGS = {
  mode: 'local', // 'local' 本地模板引擎 | 'api' AI 增强(OpenAI 兼容)
  baseUrl: 'https://api.deepseek.com/v1',
  apiKey: '',
  model: 'deepseek-chat',
}

export function loadForgeSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveForgeSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

/* ============ 「今天内不再提醒」 ============ */

export function isConfirmMutedToday() {
  return localStorage.getItem(CONFIRM_MUTE_KEY) === new Date().toDateString()
}

export function muteConfirmToday() {
  localStorage.setItem(CONFIRM_MUTE_KEY, new Date().toDateString())
}

/* ============ 锻造记录 ============ */

export function loadForgeHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function addForgeRecord(record) {
  const list = [record, ...loadForgeHistory()].slice(0, HISTORY_LIMIT)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list))
  return list
}

export function deleteForgeRecord(id) {
  const list = loadForgeHistory().filter((r) => r.id !== id)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list))
  return list
}

/* ============ 标题推导:从一句话需求提炼角色名 ============ */

/** 从一句话需求中提炼主题词(去掉「给我生成…的系统提示词」这类壳) */
export function deriveTopic(requirement) {
  let t = (requirement || '').trim()
  t = t.replace(/^(请|帮我|给我|我要|我想要?|我需要)/, '')
  t = t.replace(/(生成|写|做|来|设计)(一个|一份|一段|个)?/, '')
  t = t.replace(/的?(系统提示词|system\s*prompt|提示词|prompt)[。.!！]?$/i, '')
  t = t.trim() || '通用需求'
  if (t.length > 24) t = t.slice(0, 24)
  return t
}

export function deriveTitle(requirement, taskId) {
  const t = deriveTopic(requirement).slice(0, 16)
  return taskId === 'none' ? `${t}智能助手` : `${t}提示词策划师`
}

/* ============ 素材附件 ============ */

const KIND_LABEL = { image: '图片', audio: '音频', video: '视频', other: '文件' }

/** 从 MIME 推断素材类别 */
export function attachmentKind(mime = '') {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('text/') || mime.includes('json')) return 'text'
  return 'other'
}

/** "2 个图片、1 个音频" 形式的汇总 */
export function summarizeAttachments(attachments = []) {
  if (!attachments.length) return null
  const counts = {}
  for (const a of attachments) counts[a.kind] = (counts[a.kind] || 0) + 1
  return Object.entries(counts)
    .map(([k, n]) => `${n} 个${KIND_LABEL[k] || '文件'}`)
    .join('、')
}

/* ============ 本地模板引擎 ============ */

const TASK_GOALS = {
  none: (req) =>
    `围绕「${req}」为用户提供专业、准确、可执行的回答与产出。不驱动任何下游生成模型,输出即是最终交付物。`,
  t2i: (req, m) =>
    `根据用户需求生成一份安全、审美高级、可直接粘贴使用的 ${m} 文生图提示词,围绕「${req}」突出:主体清晰、风格统一、光线与构图专业、画面质感电影级。避免违规、低俗化、侵权与未成年化表达。`,
  i2i: (req, m) =>
    `根据用户的参考图描述与变化需求,生成 ${m} 图生图提示词:先锁定参考图中需要继承的特征,再精确描述变化项,围绕「${req}」保证变化可控、结果可预期。`,
  edit: (req, m) =>
    `将用户的修改意图转化为 ${m} 可精确执行的图像编辑指令,围绕「${req}」做到:改动项明确、保持项穷举、编辑痕迹不可见。`,
  t2v: (req, m) =>
    `根据用户需求生成 ${m} 文生视频提示词,围绕「${req}」输出包含镜头语言、动作节奏、时长与氛围的完整视频描述,保证画面稳定、动作连贯、叙事清晰。`,
  i2v: (req, m) =>
    `基于用户上传的首帧图,生成 ${m} 图生视频提示词,围绕「${req}」让静态画面自然动起来:主体动作、镜头运动与环境动态分层描述,严守身份一致性。`,
}

const TASK_INPUTS = {
  none: ['任务目标与背景资料', '目标读者 / 使用场景', '输出语气与格式偏好', '篇幅与结构要求', '需要规避的内容'],
  t2i: ['人物/主体设定:年龄段、气质、发型、服饰、表情、姿态', '场景:室内外、时间、天气、道具', '风格:写实摄影、日系胶片、韩系写真、油画感、商业人像等', '画幅、镜头、光线、负面词要求', '参考作品或艺术家风格(仅作气质参考,不直接模仿在世艺术家)'],
  i2i: ['参考图内容描述(构图/主体/风格)', '希望保留的特征(哪些必须像原图)', '希望改变的部分(风格迁移/局部重绘/元素增删)', '变化强度偏好(微调 / 大改)'],
  edit: ['要修改的目标(位置 + 内容)', '修改成什么样', '必须保持不变的部分(面部/光照/背景/构图/色调)', '是否有选区/红色标记等保护区域'],
  t2v: ['画面主体与动作', '镜头运动偏好(推/拉/摇/移/跟/固定)', '时长、画幅、节奏(舒缓/卡点)', '氛围:光线、天气、色调、音效期望', '首帧/尾帧的特殊要求'],
  i2v: ['首帧图内容描述', '希望主体做什么动作(幅度、方向、节拍)', '镜头运动偏好', '环境动态(风、光影、雾气、粒子)', '必须保持不变的元素(五官/服装/背景)'],
}

const COMMON_CONSTRAINTS = [
  '安全红线:拒绝一切涉及未成年人的性化表达、真实人物的侵权仿冒、露骨色情与血腥暴力;涉边缘需求时,自动转化为安全、高级、含蓄的美学表达。',
  '只输出成品,不解释、不寒暄、不复述需求;用户追问时才给出修改建议。',
  '不确定的要素按「默认设定」补全,不向用户连环提问;一次最多问一个最关键的澄清问题。',
]

/** 附件 → 写进 Prompt 的素材清单文本 */
function attachmentLines(attachments = []) {
  if (!attachments.length) return []
  const kindLabel = { image: '图片', audio: '音频', video: '视频', text: '文本', other: '文件' }
  return attachments.map((a) => `- 参考素材(${kindLabel[a.kind] || '文件'}):${a.name}${a.kind === 'text' && a.textContent ? ' —— 内容摘录见需求上下文' : ''}`)
}

function capabilityBlock(isVision) {
  return isVision
    ? '你可以接收并理解用户上传的图片/视频帧:先客观描述可见内容(主体、构图、光线、风格),再基于视觉证据进行创作,严禁臆造画面中不存在的元素;若图片模糊或信息不足,明确说明后再按文字需求推断。'
    : '你只处理文本信息;若输入包含图片、视频或「参考图」等媒体描述,只能基于用户提供的文字说明进行推断,不进行视觉识别,并在必要时提醒用户补充文字描述。'
}

function outputBlock(taskId, model) {
  if (taskId === 'none' || !model) {
    return ['以 Markdown 输出,结构清晰(标题/分点/表格按内容需要选用)', '结论先行,一段话说清核心答案,再展开细节', '中文回答;涉及代码/命令/专业术语保留英文原文']
  }
  const langLine =
    model.schema.lang === 'en'
      ? '最终 Prompt 一律输出英文(用户输入中文时先在内部翻译再组装)'
      : model.schema.lang === 'zh'
        ? '最终 Prompt 以中文输出(该模型中文语义理解好)'
        : '最终 Prompt 中英文皆可,按用户输入语言就近选择'
  return [langLine, ...model.schema.rules]
}

function defaultsBlock(taskId, requirement) {
  const base = {
    none: '语气专业友好,篇幅适中(300-600 字),Markdown 结构化输出。',
    t2i: '写实摄影质感,自然光,竖版 3:4,85mm 浅景深,高级干净的色调;人像默认成年人、着装得体、气质优雅。',
    i2i: '变化强度中等(保留原图构图与主体身份),风格与原图气质连续。',
    edit: '最小改动原则:只动用户点名的部分,其余逐像素保持;输出分辨率与原图一致。',
    t2v: '5-10 秒单镜头,横版 16:9,缓慢推近运镜,自然光,动作幅度自然;人物默认成年人。',
    i2v: '5 秒,固定或缓慢运镜二选一,动作幅度小而自然,严格保持首帧身份特征。',
  }
  return `若用户需求模糊,默认设定为:围绕「${requirement}」,${base[taskId] || base.none}`
}

/**
 * 本地模板引擎:根据配置组装一份专业 System Prompt(Markdown)
 * params: { requirement, brainModel, isVision, taskId, downstreamModel }
 */
export function buildLocalSystemPrompt(params) {
  const { requirement, brainModel, isVision, taskId, downstreamModel, attachments = [] } = params
  const req = deriveTopic(requirement)
  const title = deriveTitle(requirement, taskId)
  const taskName = TASK_LABEL[taskId] || '生成'
  const modelName = downstreamModel?.name || ''
  const goal = TASK_GOALS[taskId](req, modelName)

  const lines = []
  lines.push(`# ${title}`)
  lines.push('')
  lines.push('## 角色与身份(Role)')
  if (taskId === 'none') {
    lines.push(`你是运行在 ${brainModel.name} 上的${isVision ? '多模态' : '纯文本'}专家助手,专注处理用户关于「${req}」的需求,直接产出高质量结果。${capabilityBlock(isVision)}`)
  } else {
    lines.push(`你是运行在 ${brainModel.name} 上的${isVision ? '多模态视觉' : '纯文本'}提示词策划师,专注将用户关于「${req}」的创意需求,转化为可直接用于 ${modelName} ${taskName}模型的结构化画面 Prompt。${capabilityBlock(isVision)}`)
  }
  lines.push('')
  lines.push('## 核心任务(Goal)')
  lines.push(goal)
  lines.push('')
  lines.push('## 输入说明(Inputs)')
  lines.push('用户可能提供:')
  for (const item of TASK_INPUTS[taskId]) lines.push(`- ${item}`)
  const attLines = attachmentLines(params.attachments)
  if (attLines.length) {
    lines.push('')
    lines.push('本次已附带的参考素材(创作时须作为风格/内容参照):')
    for (const l of attLines) lines.push(l)
    if (!isVision && params.attachments.some((a) => a.kind === 'image' || a.kind === 'video')) {
      lines.push('- 注意:当前大脑模型为纯文本,无法直接查看以上媒体,请依据用户的文字描述使用这些素材。')
    }
  }
  lines.push('')
  lines.push('## 输出规范(Output)')
  for (const item of outputBlock(taskId, downstreamModel)) lines.push(`- ${item}`)
  lines.push('')
  lines.push('## 约束与安全(Constraints)')
  for (const item of COMMON_CONSTRAINTS) lines.push(`- ${item}`)
  lines.push('')
  lines.push('## 默认设定(Defaults)')
  lines.push(`> ${defaultsBlock(taskId, req)}`)
  lines.push('')
  lines.push('## 工作流程(Workflow)')
  lines.push('1. 解析用户输入,提取本次需求的关键要素;')
  lines.push('2. 缺失的维度按「默认设定」补全,不打断用户;')
  lines.push('3. 按「输出规范」组装成品;')
  lines.push('4. 自检:安全合规 ✓ 要素完整 ✓ 与用户需求一致 ✓;')
  lines.push('5. 只输出成品。')
  return lines.join('\n')
}

/* ============ AI 增强模式(OpenAI 兼容 API) ============ */

/** 给远端 LLM 的元提示词:让它替我们写 System Prompt */
export function buildMetaPrompt(params) {
  const { brainModel, isVision, taskId, downstreamModel, attachments = [] } = params
  const taskName = TASK_LABEL[taskId]
  const media = summarizeAttachments(attachments)
  const schemaNote = downstreamModel
    ? `下游模型为 ${downstreamModel.name}(${downstreamModel.vendor}),其 Prompt 规范:\n${downstreamModel.schema.rules.map((r) => `- ${r}`).join('\n')}\n输出语言要求:${downstreamModel.schema.lang === 'en' ? '英文 Prompt' : downstreamModel.schema.lang === 'zh' ? '中文 Prompt' : '中英皆可'}`
    : '不驱动下游生成模型,System Prompt 的目标是让大脑模型直接产出高质量文本结果。'
  return [
    '你是资深提示词系统架构师。请根据下面的配置,为用户锻造一份专业的中文 System Prompt(Markdown 格式)。',
    '',
    `## 配置`,
    `- 大脑模型:${brainModel.name}(${isVision ? '多模态,可接收图片/视频' : '纯文本,不能看图'})`,
    `- 下游任务:${taskName}`,
    `- ${schemaNote}`,
    media ? `- 用户附带素材:${media}${isVision ? '(图片会随本条消息一起发送,请结合画面创作)' : '(纯文本模型看不到媒体,依据文字描述创作)'}` : '- 用户未附带素材',
    '',
    '## 要求',
    '1. 结构必须包含:# 标题、## 角色与身份(Role)、## 核心任务(Goal)、## 输入说明(Inputs)、## 输出规范(Output)、## 约束与安全(Constraints)、## 默认设定(Defaults)、## 工作流程(Workflow);',
    '2. 「角色与身份」开头用「你是运行在 ' + brainModel.name + ' 上的…」句式,并说明能否处理图片;',
    '3. 「输出规范」必须落实上面给出的下游模型 Prompt 规范;',
    '4. 「约束与安全」必须包含:拒绝未成年性化/真实人物侵权/露骨内容,边缘需求转化为安全高级的表达;只输出成品不解释;',
    '5. 「默认设定」针对用户需求给出一行具体的兜底设定(用 > 引用格式);',
    '6. 只输出这份 System Prompt 本身,不要任何额外说明。',
    '',
    '用户的一句话需求会作为 user 消息发给你。',
  ].join('\n')
}

/**
 * 组装发给远端 LLM 的 user 消息:
 * - 视觉模型 + 有图片 → OpenAI 多模态数组(文本 + image_url)
 * - 其余 → 纯文本(非图片素材以文件名附注)
 */
export function buildApiUserMessage(params) {
  const { requirement, isVision, attachments = [] } = params
  const images = attachments.filter((a) => a.kind === 'image' && a.dataUrl)
  const others = attachments.filter((a) => a.kind !== 'image')
  const textFiles = others.filter((a) => a.kind === 'text' && a.textContent)

  let text = requirement
  if (textFiles.length) {
    text +=
      '\n\n【附带文本素材】\n' +
      textFiles.map((a) => `— ${a.name}:\n${(a.textContent || '').slice(0, 2000)}`).join('\n\n')
  }
  const media = others.filter((a) => a.kind !== 'text')
  if (media.length) {
    text += `\n\n(用户还附带了:${media.map((a) => `${a.name}(${a.kind})`).join('、')};这些媒体无法通过文本接口传输,请依据上述文字需求推断。)`
  }

  if (isVision && images.length) {
    return [
      { type: 'text', text },
      ...images.map((a) => ({ type: 'image_url', image_url: { url: a.dataUrl } })),
    ]
  }
  return text
}

/** 调用 OpenAI 兼容 chat/completions;失败抛出带说明的 Error */
export async function callForgeApi(settings, params) {
  const base = (settings.baseUrl || '').trim().replace(/\/+$/, '')
  if (!base) throw new Error('未配置 API Base URL')
  if (!settings.apiKey) throw new Error('未配置 API Key')
  if (!settings.model) throw new Error('未配置模型名称')

  let res
  try {
    res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [
          { role: 'system', content: buildMetaPrompt(params) },
          { role: 'user', content: buildApiUserMessage(params) },
        ],
        temperature: 0.7,
      }),
    })
  } catch (e) {
    throw new Error(`网络请求失败(${e.message})。若在浏览器预览中使用,可能是该 API 不允许跨域;打包后的桌面版或换用支持 CORS 的服务(如 DeepSeek / OpenRouter)可解决。`)
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API 返回 ${res.status}:${text.slice(0, 200) || '无详情'}`)
  }
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('API 返回内容为空')
  return content.trim()
}
