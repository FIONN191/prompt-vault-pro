// Prompt Builder logic (task types + constraints) and the {variable} template system

/* ============================================================
 * Template variable system
 * ============================================================ */

export const KNOWN_VARIABLES = [
  'subject',
  'object',
  'background',
  'style',
  'aspect_ratio',
  'reference_image',
  'target_area',
  'platform',
  'tone',
]

const VAR_REGEX = /\{([a-zA-Z][a-zA-Z0-9_]*)\}/g

/** Extract unique {variable} names from a piece of text. */
export function extractVariables(text) {
  if (!text) return []
  const found = new Set()
  for (const match of text.matchAll(VAR_REGEX)) found.add(match[1])
  return [...found]
}

/** Union of variables used across every prompt version of a prompt object. */
export function collectPromptVariables(prompt) {
  const fields = ['chinesePrompt', 'englishPrompt', 'shortPrompt', 'strongPrompt', 'negativePrompt']
  const found = new Set(Array.isArray(prompt.variables) ? prompt.variables : [])
  for (const f of fields) {
    for (const v of extractVariables(prompt[f])) found.add(v)
  }
  return [...found]
}

/** Replace {var} with the filled value; unfilled variables stay as-is. */
export function applyVariables(text, values = {}) {
  if (!text) return ''
  return text.replace(VAR_REGEX, (raw, name) => {
    const v = values[name]
    return typeof v === 'string' && v.trim() !== '' ? v.trim() : raw
  })
}

/* ============================================================
 * Builder: task types
 * ============================================================ */

export const TASK_TYPES = [
  {
    id: 'remove-logo',
    label: 'Remove logo / watermark',
    zhLabel: '去除 logo / 水印',
    category: 'Image Editing',
    en: 'Remove all logos, watermarks and overlay UI elements from this image. Reconstruct the covered pixels so the repaired area matches the surrounding texture, color and noise perfectly. Everything else in the image must stay exactly the same.',
    zh: '去除图片中的所有 logo、水印和叠加的界面元素。被遮挡的区域要根据周围的纹理、颜色和噪点自然补全，修复痕迹不可见。画面其余部分必须保持完全不变。',
  },
  {
    id: 'replace-screen',
    label: 'Replace phone screen',
    zhLabel: '替换手机屏幕内容',
    category: 'Image Editing',
    en: 'Replace the content shown on the phone screen in this image with {reference_image}. Match the original screen\'s perspective, corner radius, brightness, glare and reflections so the new content looks physically displayed on the device. Do not move the phone or the hands holding it.',
    zh: '把图中手机屏幕上显示的内容替换为 {reference_image}。新内容要匹配原屏幕的透视角度、圆角、亮度、反光和眩光，看起来像真实显示在设备上。不要移动手机和持机的手。',
  },
  {
    id: 'change-outfit',
    label: 'Change outfit',
    zhLabel: '换装',
    category: 'Image Editing',
    en: 'Change the outfit of {subject} to: {style}. The new clothing must follow the body pose naturally with realistic fabric folds, and match the scene lighting.',
    zh: '把 {subject} 的服装换成：{style}。新服装要自然贴合身体姿势，有真实的布料褶皱，并与场景光照匹配。',
  },
  {
    id: 'change-pose',
    label: 'Change pose',
    zhLabel: '换动作',
    category: 'Image Editing',
    en: 'Change the pose of {subject} to: {object}. Keep the same person — identical face, hairstyle, body proportions, outfit and styling. Only the pose changes.',
    zh: '把 {subject} 的动作改为：{object}。必须是同一个人——脸、发型、身材比例、服装和造型完全一致，只改变动作。',
  },
  {
    id: 'replace-background',
    label: 'Replace background',
    zhLabel: '替换背景',
    category: 'Image Editing',
    en: 'Replace the background with: {background}. Cut out the main subject cleanly including fine hair strands and semi-transparent edges, then relight the subject subtly so it sits naturally in the new environment.',
    zh: '把背景替换为：{background}。主体要干净抠出，包括发丝和半透明边缘，并对主体做轻微的重新打光，使其自然融入新环境。',
  },
  {
    id: 'remove-object',
    label: 'Remove object',
    zhLabel: '移除物体',
    category: 'Image Editing',
    en: 'Remove {object} from this image completely. Fill the removed area with a plausible continuation of the background, matching texture, perspective, lighting and grain so no trace of the removal remains.',
    zh: '把图中的 {object} 完全移除。移除后的区域要用合理的背景延伸补全，纹理、透视、光照和颗粒都要匹配，不能留下任何修改痕迹。',
  },
  {
    id: 'enhance-details',
    label: 'Enhance details',
    zhLabel: '细节增强 / 高清修复',
    category: 'Image Editing',
    en: 'Enhance this image to high resolution. Sharpen fine details, restore realistic skin texture, hair strands and fabric weave. Keep the original composition, colors and identity exactly the same. The result must look naturally sharp, not AI-smoothed.',
    zh: '把这张图增强为高分辨率。锐化细节，恢复真实的皮肤质感、发丝和布料纹理。构图、色彩和人物身份保持完全一致。结果要自然清晰，不能有 AI 磨皮塑料感。',
  },
  {
    id: 'blend-environment',
    label: 'Make subject blend into environment',
    zhLabel: '主体融入环境',
    category: 'Image Editing',
    en: 'Make {subject} blend seamlessly into the environment. Match the subject\'s color temperature, contrast, shadow direction, ambient light spill and film grain to the background so the composite looks like a single photograph.',
    zh: '让 {subject} 无缝融入环境。主体的色温、对比度、阴影方向、环境光溢色和颗粒感都要与背景一致，让合成结果看起来像同一张照片拍出来的。',
  },
  {
    id: 'tiktok-cover',
    label: 'Create TikTok cover',
    zhLabel: '制作 TikTok 封面',
    category: 'TikTok Covers',
    en: 'Create a high-impact vertical TikTok cover featuring {subject}. Bold visual contrast, dramatic expression or action frozen mid-moment, strong color pop against the background, and a clean area reserved at the top for title text. Designed to stop scrolling instantly.',
    zh: '为 {subject} 制作一张高冲击力的 TikTok 竖版封面。视觉对比强烈，表情或动作定格在最有张力的瞬间，主体颜色从背景中跳出来，顶部预留干净的标题文字区域。目标是让人瞬间停下滑动。',
  },
  {
    id: 'product-hero',
    label: 'Create product hero shot',
    zhLabel: '产品主视觉 hero shot',
    category: 'Product Ads',
    en: 'Create a premium product hero shot of {object}. Studio lighting with a strong key light and colored rim light, {background} backdrop, subtle reflections on the surface below, shallow depth of field, advertising-grade composition with space for headline copy.',
    zh: '为 {object} 制作高端产品主视觉。影棚布光：明确的主光加彩色轮廓光，背景为 {background}，底面有微妙倒影，浅景深，广告级构图并预留标题文案位置。',
  },
  {
    id: 'ue5-prototype',
    label: 'Create UE5 game prototype prompt',
    zhLabel: 'UE5 游戏原型提示词',
    category: 'UE5 Game Dev',
    en: 'Act as a senior Unreal Engine 5 technical designer. Design a playable prototype: {subject}. Deliver: (1) core gameplay loop, (2) required UE5 systems (Blueprints, Niagara, Lumen/Nanite usage), (3) a minimal asset list, (4) step-by-step implementation order for a solo developer, (5) the first three Blueprints to build with their key nodes.',
    zh: '你是一名资深 UE5 技术策划。为我设计一个可玩原型：{subject}。请输出：(1) 核心玩法循环；(2) 需要用到的 UE5 系统（Blueprint、Niagara、Lumen/Nanite）；(3) 最小资产清单；(4) 适合单人开发者的分步实现顺序；(5) 最先要搭的三个 Blueprint 及其关键节点。',
  },
  {
    id: 'reverse-json',
    label: 'Reverse engineer image into JSON',
    zhLabel: '图片反推 JSON',
    category: 'JSON Reverse Engineering',
    en: 'Analyze the attached image and reverse-engineer it into a structured JSON object with these keys: subject (age_range, gender, expression, gaze), outfit (garments with color/material/fit), hair (color, length, texture, styling), pose, lighting (type, direction, mood), camera (angle, focal_length_estimate, depth_of_field), environment, color_palette (hex values), style_keywords, suggested_prompt. Output only valid JSON, no commentary.',
    zh: '分析这张图片，把它反推成结构化 JSON，包含以下字段：subject（年龄段、性别、表情、视线）、outfit（每件衣物的颜色/材质/版型）、hair（颜色、长度、质感、造型）、pose、lighting（类型、方向、氛围）、camera（角度、焦段估计、景深）、environment、color_palette（十六进制色值）、style_keywords、suggested_prompt。只输出合法 JSON，不要任何解释文字。',
  },
]

/* ============================================================
 * Builder: constraints
 * ============================================================ */

export const CONSTRAINTS = [
  { id: 'keep-face', label: 'Keep face unchanged', zhLabel: '保持面部不变', en: 'The face must remain 100% identical to the original — do not alter facial features, expression, skin texture or makeup.', zh: '面部必须与原图 100% 一致——五官、表情、皮肤质感和妆容都不能改变。' },
  { id: 'keep-lighting', label: 'Keep lighting unchanged', zhLabel: '保持光照不变', en: 'Keep the original lighting exactly: same light direction, intensity, color temperature and shadows.', zh: '完全保持原图光照：光线方向、强度、色温和阴影都不变。' },
  { id: 'keep-darkness', label: 'Keep darkness unchanged', zhLabel: '保持暗度不变', en: 'Do NOT brighten the image. Keep the original exposure, black levels and dark moody atmosphere untouched.', zh: '禁止提亮画面。原图的曝光、黑位和暗调氛围必须原样保留。' },
  { id: 'keep-background', label: 'Keep background unchanged', zhLabel: '保持背景不变', en: 'The background must stay pixel-identical to the original.', zh: '背景必须与原图逐像素保持一致。' },
  { id: 'keep-composition', label: 'Keep composition unchanged', zhLabel: '保持构图不变', en: 'Keep the original composition: same framing, crop, subject position and camera angle.', zh: '保持原构图：取景、裁切、主体位置和相机角度都不变。' },
  { id: 'protect-red-area', label: 'Do not change red marked area', zhLabel: '红色标记区域不动', en: 'The area marked in red ({target_area}) must remain completely untouched — treat it as a protected mask.', zh: '红色标记的区域（{target_area}）必须完全保持原样——视为受保护的蒙版。' },
  { id: 'no-extra-text', label: 'Do not add extra text', zhLabel: '不要添加文字', en: 'Do not add any text, captions, logos or watermarks to the result.', zh: '结果中不要添加任何文字、字幕、logo 或水印。' },
  { id: 'preserve-identity', label: 'Preserve original identity', zhLabel: '保持人物身份一致', en: 'Preserve the subject\'s identity completely: same face, hairstyle, body type and overall look — clearly the same person.', zh: '完整保留人物身份：同样的脸、发型、体型和整体形象——一眼看上去就是同一个人。' },
  { id: 'out-en', label: 'Output in English', zhLabel: '输出英文', en: 'Respond in English only.', zh: '最终输出使用英文。' },
  { id: 'out-zh', label: 'Output in Chinese', zhLabel: '输出中文', en: 'Respond in Simplified Chinese only.', zh: '最终输出使用简体中文。' },
  { id: 'out-json', label: 'Output as JSON', zhLabel: '输出 JSON', en: 'Output the result as valid JSON only — no markdown, no commentary.', zh: '结果只输出合法 JSON——不要 markdown，不要解释文字。' },
  { id: 'ar-916', label: 'Aspect ratio 9:16', zhLabel: '比例 9:16', en: 'Output aspect ratio: 9:16 vertical.', zh: '输出比例：9:16 竖版。' },
  { id: 'ar-34', label: 'Aspect ratio 3:4', zhLabel: '比例 3:4', en: 'Output aspect ratio: 3:4 portrait.', zh: '输出比例：3:4 竖幅。' },
  { id: 'ar-11', label: 'Aspect ratio 1:1', zhLabel: '比例 1:1', en: 'Output aspect ratio: 1:1 square.', zh: '输出比例：1:1 方形。' },
]

/* ============================================================
 * Builder: assemble the final prompt
 * ============================================================ */

/**
 * Build zh + en prompt text from a task type, selected constraints
 * and optional extra free-form notes.
 */
export function buildPrompt({ taskId, constraintIds = [], extraNotes = '' }) {
  const task = TASK_TYPES.find((t) => t.id === taskId)
  if (!task) return { en: '', zh: '', title: '', category: 'Image Editing' }

  const picked = CONSTRAINTS.filter((c) => constraintIds.includes(c.id))
  const notes = extraNotes.trim()

  const enParts = [task.en]
  const zhParts = [task.zh]
  if (notes) {
    enParts.push(`Additional details: ${notes}`)
    zhParts.push(`补充说明：${notes}`)
  }
  if (picked.length > 0) {
    enParts.push('Hard constraints:\n' + picked.map((c) => `- ${c.en}`).join('\n'))
    zhParts.push('硬性约束：\n' + picked.map((c) => `- ${c.zh}`).join('\n'))
  }

  return {
    en: enParts.join('\n\n'),
    zh: zhParts.join('\n\n'),
    title: `${task.zhLabel}（生成器）`,
    category: task.category,
  }
}
