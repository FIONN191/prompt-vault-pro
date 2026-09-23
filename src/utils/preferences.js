import { CATEGORIES } from '../data/defaultPrompts.js'

export const PREFERENCES_KEY = 'prompt_vault_pro_preferences_v1'
export const THEMES = [
  { id: 'minimal', name: '简洁', description: '深色灰阶 · 无网格与发光' },
  { id: 'light', name: '浅色', description: '柔和白底 · 清晰易读' },
  { id: 'neon', name: '霓虹', description: '经典配色 · 网格与光效' },
]
export const DEFAULT_SIDEBAR = { title: '我的分类', allLabel: '全部提示词', favoritesLabel: '我的收藏', showCounts: true }
const label = (value, fallback, limit = 40) => typeof value === 'string' && value.trim() ? value.trim().slice(0, limit) : fallback
export function normalizePreferences(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const ids = new Set()
  const categories = (Array.isArray(source.categories) ? source.categories : CATEGORIES).flatMap(item => {
    if (!item || typeof item.id !== 'string' || !item.id.trim() || item.id === 'all' || ids.has(item.id)) return []
    ids.add(item.id)
    return [{ id: item.id, zh: label(item.zh, item.id), color: /^#[0-9a-f]{6}$/i.test(item.color) ? item.color : '#a3a3a3', description: typeof item.description === 'string' ? item.description.trim().slice(0, 160) : '' }]
  })
  return {
    theme: THEMES.some(theme => theme.id === source.theme) ? source.theme : 'minimal',
    categories: categories.length ? categories : CATEGORIES.map(item => ({ ...item, description: '' })),
    sidebar: {
      title: label(source.sidebar?.title, DEFAULT_SIDEBAR.title),
      allLabel: label(source.sidebar?.allLabel, DEFAULT_SIDEBAR.allLabel),
      favoritesLabel: label(source.sidebar?.favoritesLabel, DEFAULT_SIDEBAR.favoritesLabel),
      showCounts: source.sidebar?.showCounts !== false,
    },
  }
}
export function loadPreferences() {
  try { return normalizePreferences(JSON.parse(localStorage.getItem(PREFERENCES_KEY) || 'null')) }
  catch { return normalizePreferences(null) }
}
export function persistPreferences(preferences) {
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences))
}
export function ensurePromptCategories(preferences, prompts) {
  const known = new Set(preferences.categories.map(c => c.id))
  const missing = []
  for (const prompt of prompts) {
    if (known.has(prompt.category)) continue
    known.add(prompt.category)
    missing.push({ ...(CATEGORIES.find(c => c.id === prompt.category) || { id: prompt.category, zh: prompt.category, color: '#a3a3a3' }), description: '' })
  }
  return missing.length ? { ...preferences, categories: [...preferences.categories, ...missing] } : preferences
}
export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme === 'light' ? 'light' : 'dark'
}
