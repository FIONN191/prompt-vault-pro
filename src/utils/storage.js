// localStorage persistence + import/export + misc shared helpers
import { DEFAULT_PROMPTS } from '../data/defaultPrompts.js'

const STORAGE_KEY = 'prompt_vault_pro_prompts_v1'

export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}

/** Fill in any missing field so old/partial data never crashes the UI. */
export function normalizePrompt(raw) {
  const nowIso = new Date().toISOString()
  const p = typeof raw === 'object' && raw !== null ? raw : {}
  return {
    id: typeof p.id === 'string' && p.id ? p.id : generateId(),
    title: typeof p.title === 'string' ? p.title : '未命名提示词',
    category: typeof p.category === 'string' && p.category ? p.category : 'Image Editing',
    platform: typeof p.platform === 'string' && p.platform ? p.platform : '通用',
    tags: Array.isArray(p.tags) ? p.tags.filter((t) => typeof t === 'string') : [],
    description: typeof p.description === 'string' ? p.description : '',
    chinesePrompt: typeof p.chinesePrompt === 'string' ? p.chinesePrompt : '',
    englishPrompt: typeof p.englishPrompt === 'string' ? p.englishPrompt : '',
    shortPrompt: typeof p.shortPrompt === 'string' ? p.shortPrompt : '',
    strongPrompt: typeof p.strongPrompt === 'string' ? p.strongPrompt : '',
    negativePrompt: typeof p.negativePrompt === 'string' ? p.negativePrompt : '',
    variables: Array.isArray(p.variables) ? p.variables.filter((v) => typeof v === 'string') : [],
    usageNotes: typeof p.usageNotes === 'string' ? p.usageNotes : '',
    isFavorite: Boolean(p.isFavorite),
    createdAt: typeof p.createdAt === 'string' ? p.createdAt : nowIso,
    updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : nowIso,
    lastUsedAt: typeof p.lastUsedAt === 'string' ? p.lastUsedAt : null,
  }
}

function cloneDefaults() {
  return DEFAULT_PROMPTS.map((p) => normalizePrompt(JSON.parse(JSON.stringify(p))))
}

export function persistPrompts(prompts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts))
  } catch (e) {
    console.error('保存到 localStorage 失败：', e)
    throw e
  }
}

/** Load from localStorage; first run (or corrupted data) seeds the default templates. */
export function loadPrompts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const seeded = cloneDefaults()
      persistPrompts(seeded)
      return seeded
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('stored data is not an array')
    return parsed.map(normalizePrompt)
  } catch (e) {
    console.warn('读取本地数据失败，已重置为默认模板：', e)
    const seeded = cloneDefaults()
    persistPrompts(seeded)
    return seeded
  }
}

/** Overwrite everything with a fresh copy of the built-in templates. */
export function restoreDefaults() {
  const seeded = cloneDefaults()
  persistPrompts(seeded)
  return seeded
}

/** Download all prompts as a JSON file. */
export function createExportPayload(prompts, preferences) {
  return { app: 'prompt-vault-pro', version: 2, exportedAt: new Date().toISOString(), count: prompts.length, prompts, preferences }
}
export function exportPromptsToFile(prompts, preferences) {
  const payload = createExportPayload(prompts, preferences)
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `prompt-vault-export-${stamp}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Accepts either a bare array or the { prompts: [...] } export envelope. */
export function parseImportedJson(text) {
  const data = JSON.parse(text)
  const list = Array.isArray(data) ? data : data?.prompts
  if (!Array.isArray(list)) {
    throw new Error('JSON 结构不对：需要提示词数组，或包含 prompts 字段的对象')
  }
  return list.map(normalizePrompt)
}

/** Merge imported prompts; colliding ids get a fresh id instead of overwriting. */
export function mergeImportedPrompts(existing, imported) {
  const ids = new Set(existing.map((p) => p.id))
  const merged = [...existing]
  let added = 0
  let reassigned = 0
  for (const item of imported) {
    const next = { ...item }
    if (ids.has(next.id)) {
      next.id = generateId()
      reassigned += 1
    }
    ids.add(next.id)
    merged.push(next)
    added += 1
  }
  return { prompts: merged, added, reassigned }
}

/** Clipboard write with a fallback for non-secure contexts. */
export async function copyToClipboard(text) {
  try {
    if (window.desktopPrompt) return await window.desktopPrompt.copyText(text)
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}

/** "3 分钟前" style relative time; falls back to a date string. */
export function formatRelativeTime(iso) {
  if (!iso) return '从未'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '未知'
  const diff = Date.now() - then
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 小时前`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} 天前`
  return new Date(iso).toLocaleDateString('zh-CN')
}
