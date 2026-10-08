// Data exchanged with Gist and local JSON files; never includes API settings.
function parsePayload(text) {
  const raw = typeof text === 'string' ? JSON.parse(text) : text
  const prompts = Array.isArray(raw) ? raw : raw?.prompts
  if (!Array.isArray(prompts) || prompts.some(p => !p || typeof p !== 'object' || typeof p.id !== 'string' || !p.id || typeof p.title !== 'string')) throw new Error('JSON 必须包含带 id 和标题的提示词数组')
  return { app: 'prompt-vault-pro', version: 2, prompts, preferences: raw.preferences }
}
function mergePayload(local, remote) {
  local = parsePayload(local); remote = parsePayload(remote)
  const map = new Map(remote.prompts.map(p => [p.id, p]))
  const time = p => Date.parse(p.updatedAt) || 0
  for (const p of local.prompts) {
    const other = map.get(p.id)
    if (!other || time(p) >= time(other)) map.set(p.id, p)
  }
  const categories = new Map((remote.preferences?.categories || []).map(c => [c.id, c]))
  for (const c of local.preferences?.categories || []) categories.set(c.id, c)
  return { app: 'prompt-vault-pro', version: 2, exportedAt: new Date().toISOString(), prompts: [...map.values()], preferences: { ...remote.preferences, ...local.preferences, categories: [...categories.values()] }, count: map.size }
}
module.exports = { parsePayload, mergePayload }
