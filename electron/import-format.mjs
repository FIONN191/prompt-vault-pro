// Shared by the browser and native file picker. Imported text is data only.
export function parseImportDocument(input) {
  const raw = typeof input === 'string' ? JSON.parse(input.replace(/^\uFEFF/, '')) : input
  if (raw?.format !== 'gemini-voyager.prompts.v1') return raw
  if (!Array.isArray(raw.items)) throw new Error('Voyager 文件缺少 items 数组')
  const ids = new Set()
  const timestamp = (value, fallback) => {
    if (value === undefined || value === null) return fallback
    const date = new Date(value)
    if (!Number.isFinite(date.getTime())) throw new Error('Voyager 提示词包含无效时间')
    return date.toISOString()
  }
  const prompts = raw.items.map((item, index) => {
    if (!item || typeof item.id !== 'string' || !item.id.trim() || typeof item.text !== 'string' || (item.name != null && typeof item.name !== 'string') || (item.tags != null && (!Array.isArray(item.tags) || item.tags.some(t => typeof t !== 'string')))) {
      throw new Error(`Voyager 第 ${index + 1} 条提示词格式不完整，需要 id 和 text`)
    }
    if (ids.has(item.id)) throw new Error(`Voyager 文件中存在重复 id：${item.id}`)
    ids.add(item.id)
    const createdAt = timestamp(item.createdAt, '1970-01-01T00:00:00.000Z')
    return {
      id: 'gemini-voyager-' + item.id,
      title: item.name?.trim() || item.text.replace(/\s+/g, ' ').trim().slice(0, 60) || '未命名提示词',
      category: 'Gemini Voyager 导入', platform: '通用', tags: item.tags || [],
      description: '', chinesePrompt: item.text, englishPrompt: '', shortPrompt: '',
      strongPrompt: '', negativePrompt: '', variables: [],
      usageNotes: '从 Gemini Voyager 导入；正文按原文保留。', isFavorite: false,
      createdAt, updatedAt: timestamp(item.updatedAt, createdAt), lastUsedAt: null,
    }
  })
  return { app: 'prompt-vault-pro', version: 2, prompts }
}
