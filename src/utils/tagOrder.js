export const TAG_ORDER_KEY = 'prompt_vault_quick_tag_order_v1'
export function normalizeTagOrder(value) {
  return { mode: value?.mode === 'custom' ? 'custom' : 'frequency', order: [...new Set(Array.isArray(value?.order) ? value.order.filter(t => typeof t === 'string') : [])] }
}
export function rankTags(prompts, settings) {
  const counts = new Map()
  for (const prompt of prompts) {
    const count = Number.isSafeInteger(prompt.useCount) && prompt.useCount >= 0 ? prompt.useCount : prompt.lastUsedAt ? 1 : 0
    for (const tag of new Set(prompt.tags || [])) counts.set(tag, (counts.get(tag) || 0) + count)
  }
  const frequency = [...counts.keys()].sort((a,b) => counts.get(b)-counts.get(a) || a.localeCompare(b,'zh-CN'))
  if (settings.mode !== 'custom') return frequency
  const saved = settings.order.filter(t => counts.has(t))
  return [...saved, ...frequency.filter(t => !saved.includes(t))]
}
export function moveTag(tags, source, target) {
  if (source === target || !tags.includes(source) || !tags.includes(target)) return tags
  const next = tags.filter(t => t !== source)
  next.splice(tags.indexOf(target), 0, source)
  return next
}
