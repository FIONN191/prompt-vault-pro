import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizePreferences, ensurePromptCategories, PREFERENCES_KEY } from '../src/utils/preferences.js'
import { createExportPayload, normalizePrompt } from '../src/utils/storage.js'
import { importWorkspace, persistWorkspace } from '../src/utils/workspace.js'

test('default theme is minimal and legacy category IDs stay stable', () => {
  const prefs = normalizePreferences(null)
  assert.equal(prefs.theme, 'minimal')
  assert.equal(prefs.categories[0].id, 'Image Editing')
  const upgraded = ensurePromptCategories(prefs, [{ category: 'Legacy writing' }])
  assert.equal(upgraded.categories.at(-1).id, 'Legacy writing')
  assert.equal(ensurePromptCategories(upgraded, [{ category: 'Legacy writing' }]), upgraded)
})
test('backup restores category names, colors, order, theme and sidebar without losing prompts', () => {
  const saved = normalizePreferences({ theme: 'light', categories: [{ id: 'cat-writing', zh: '写作', color: '#556677', description: '脚本与文案' }], sidebar: { title: '项目分类', allLabel: '全部素材', favoritesLabel: '常用', showCounts: false } })
  const prompt = normalizePrompt({ title: '测试', category: 'cat-writing', chinesePrompt: '内容' })
  const result = importWorkspace(JSON.stringify(createExportPayload([prompt], saved)), [], normalizePreferences(null), true)
  assert.equal(result.prompts[0].category, 'cat-writing')
  assert.deepEqual(result.preferences.categories.find(c => c.id === 'cat-writing'), saved.categories[0])
  assert.deepEqual(result.preferences.sidebar, saved.sidebar)
  assert.equal(result.preferences.theme, 'light')
  assert.equal(result.preferences.categories[0].id, 'cat-writing')
  const legacy = importWorkspace(JSON.stringify([{ title: '旧格式', category: '我的旧分类' }]), result.prompts, result.preferences)
  assert.equal(legacy.prompts.length, 2)
  assert(legacy.preferences.categories.some(c => c.id === '我的旧分类'))
})
test('import does not override existing appearance unless selected', () => {
  const prefs = normalizePreferences(null)
  prefs.categories[0].zh = '我的修图'
  const incoming = normalizePreferences({ theme: 'neon' })
  const result = importWorkspace(JSON.stringify(createExportPayload([], incoming)), [], prefs)
  assert.equal(result.preferences.theme, 'minimal')
  assert.equal(result.preferences.categories[0].zh, '我的修图')
})
test('failed prompt commit rolls back category settings', () => {
  const old = JSON.stringify(normalizePreferences(null))
  const values = new Map([[PREFERENCES_KEY, old]])
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { if (key === 'prompt_vault_pro_prompts_v1') throw new Error('quota'); values.set(key, value) },
    removeItem: key => values.delete(key),
  }
  assert.throws(() => persistWorkspace([], normalizePreferences({ theme: 'neon' })), /quota/)
  assert.equal(values.get(PREFERENCES_KEY), old)
  delete globalThis.localStorage
})
