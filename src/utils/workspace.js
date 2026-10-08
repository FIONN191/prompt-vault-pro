import { parseImportDocument } from '../../electron/import-format.mjs'
import { mergeImportedPrompts, parseImportedJson, persistPrompts } from './storage.js'
import { ensurePromptCategories, normalizePreferences, persistPreferences, PREFERENCES_KEY } from './preferences.js'

// Commit both keys before updating React. Roll back settings if prompt storage fails.
export function persistWorkspace(prompts, preferences) {
  const previous = localStorage.getItem(PREFERENCES_KEY)
  persistPreferences(preferences)
  try { persistPrompts(prompts) }
  catch (error) {
    if (previous === null) localStorage.removeItem(PREFERENCES_KEY)
    else localStorage.setItem(PREFERENCES_KEY, previous)
    throw error
  }
}
export function importWorkspace(text, currentPrompts, preferences, restoreSettings = false) {
  const raw = parseImportDocument(text)
  const imported = parseImportedJson(text)
  const incoming = raw?.preferences && typeof raw.preferences === 'object' ? normalizePreferences(raw.preferences) : null
  const categories = restoreSettings && incoming ? [...incoming.categories, ...preferences.categories.filter(c => !incoming.categories.some(item => item.id === c.id))] : [...preferences.categories]
  if (incoming) for (const category of incoming.categories) {
    const index = categories.findIndex(c => c.id === category.id)
    if (index === -1) categories.push(category)
    else if (restoreSettings) categories[index] = category
  }
  const result = mergeImportedPrompts(currentPrompts, imported)
  const nextPreferences = ensurePromptCategories({
    ...preferences, categories,
    ...(restoreSettings && incoming ? { theme: incoming.theme, sidebar: incoming.sidebar } : {}),
  }, result.prompts)
  return { ...result, preferences: nextPreferences }
}
