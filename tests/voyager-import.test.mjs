import test from 'node:test'
import assert from 'node:assert/strict'
import { parseImportDocument } from '../electron/import-format.mjs'
import { importWorkspace } from '../src/utils/workspace.js'
import { normalizePreferences } from '../src/utils/preferences.js'
const fixture = { format: 'gemini-voyager.prompts.v1', items: [
  { id: 'one', name: '测试标题', text: 'English 中文\n{subject}', tags: ['修脸'], createdAt: 1700000000000 },
  { id: 'two', text: '没有标题的内容', tags: [], createdAt: 1700000000000 },
] }
test('Voyager preserves exact content, tags, dates and generates missing titles', () => {
  const result = parseImportDocument('\uFEFF' + JSON.stringify(fixture))
  assert.equal(result.prompts[0].chinesePrompt, fixture.items[0].text)
  assert.deepEqual(result.prompts[0].tags, ['修脸'])
  assert.equal(result.prompts[0].id, 'gemini-voyager-one')
  assert.equal(result.prompts[0].createdAt, new Date(1700000000000).toISOString())
  assert.equal(result.prompts[1].title, fixture.items[1].text)
})
test('repeat raw or converted import merges and preserves newer local edits and favorites', () => {
  const text = JSON.stringify(fixture), prefs = normalizePreferences(null)
  const first = importWorkspace(text, [{id:'existing',title:'existing'}], prefs)
  assert.equal(first.added, 2)
  assert(first.preferences.categories.some(c => c.id === 'Gemini Voyager 导入'))
  const repeat = importWorkspace(text, first.prompts, first.preferences)
  assert.equal(repeat.prompts.length, 3); assert.equal(repeat.added, 0)
  repeat.prompts[1].isFavorite = true
  const changed = structuredClone(fixture)
  changed.items[0].text = 'new'; changed.items[0].updatedAt = 1800000000000
  const update = importWorkspace(JSON.stringify(changed), repeat.prompts, prefs)
  assert.equal(update.updated, 1); assert.equal(update.prompts[1].chinesePrompt, 'new')
  assert.equal(update.prompts[1].isFavorite, true)
  assert.equal(importWorkspace(text, update.prompts, prefs).prompts[1].chinesePrompt, 'new')
  assert.equal(importWorkspace(JSON.stringify(parseImportDocument(changed)), update.prompts, prefs).added, 0)
})
test('malformed and duplicate Voyager records fail as a whole; native format still works', () => {
  for (const items of [[{id:'x'}], [fixture.items[0],fixture.items[0]], [{...fixture.items[0],createdAt:'bad'}], [{...fixture.items[0],tags:[1]}]]) {
    assert.throws(() => parseImportDocument({...fixture,items}))
  }
  assert.throws(() => parseImportDocument({...fixture,items:null}))
  assert.deepEqual(parseImportDocument({prompts:[]}), {prompts:[]})
  assert.equal(importWorkspace(JSON.stringify([{title:'old format'}]), [], normalizePreferences(null)).added, 1)
})
