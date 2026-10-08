const fs = require('node:fs/promises')
const { parsePayload, mergePayload } = require('./prompt-data.cjs')
const FILE = 'prompt-vault-pro.json'
function createGistBackup({ settingsPath, safeStorage, fetch }) {
  let settings = null
  async function load() {
    if (settings) return settings
    try { settings = JSON.parse(await fs.readFile(settingsPath, 'utf8')) }
    catch (e) { if (e.code !== 'ENOENT') throw new Error('无法读取 Gist 设置'); settings = {} }
    return settings
  }
  async function persist(value) {
    await fs.writeFile(settingsPath + '.tmp', JSON.stringify(value), { mode: 0o600 })
    await fs.rename(settingsPath + '.tmp', settingsPath)
    settings = value
  }
  async function status() { const s = await load(); return { configured: !!s.token, gistId: s.gistId || '' } }
  async function configure({ token, gistId }) {
    const s = await load()
    const id = String(gistId || '').trim()
    if (id && !/^[a-f0-9]{5,64}$/i.test(id)) throw new Error('请输入 Gist ID，不是完整网址')
    const next = { ...s, gistId: id }
    if (token?.trim()) {
      if (!safeStorage.isEncryptionAvailable()) throw new Error('系统加密存储不可用，暂时不能保存令牌')
      next.token = safeStorage.encryptString(token.trim()).toString('base64')
    }
    await persist(next)
    return status()
  }
  async function request(route, method = 'GET', body) {
    const s = await load()
    if (!s.token) throw new Error('请先配置 GitHub 访问令牌（Gists 读写权限）')
    const token = safeStorage.decryptString(Buffer.from(s.token, 'base64'))
    const res = await fetch('https://api.github.com' + route, { method, headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000) })
    if (!res.ok) throw new Error(`GitHub 请求失败 (${res.status})${res.status === 401 || res.status === 403 ? '，请检查令牌权限或限流状态' : ''}`)
    return res.json()
  }
  async function read(gistId) {
    const gist = await request(`/gists/${gistId}`)
    if (gist.public !== false) throw new Error('请使用 Secret Gist，不能将备份上传到公开 Gist')
    const file = gist.files?.[FILE]
    if (!file) throw new Error(`Gist 中没有 ${FILE}，不会覆盖此 Gist`)
    if (file.truncated) throw new Error('Gist 内容过大，无法安全合并；请使用本地 JSON 导入/导出')
    return parsePayload(file.content)
  }
  async function pull() {
    const s = await load()
    if (!s.gistId) throw new Error('尚未设置 Gist ID，请先上传创建备份，或填写已有 ID')
    return read(s.gistId)
  }
  async function upload(payload) {
    const s = await load()
    const merged = s.gistId ? mergePayload(payload, await read(s.gistId)) : parsePayload(payload)
    const files = { [FILE]: { content: JSON.stringify(merged, null, 2) } }
    const gist = s.gistId ? await request(`/gists/${s.gistId}`, 'PATCH', { files }) : await request('/gists', 'POST', { description: 'Prompt Vault Pro backup', public: false, files })
    if (!s.gistId) {
      if (typeof gist.id !== 'string' || !/^[a-f0-9]{5,64}$/i.test(gist.id)) throw new Error('GitHub 未返回有效 Gist ID')
      settings = { ...s, gistId: gist.id }
      try { await persist(settings) }
      catch { throw new Error(`备份已创建，但设置保存失败。请记下 Gist ID：${gist.id}`) }
    }
    return { ...(await status()), count: merged.prompts.length }
  }
  return { status, configure, pull, upload }
}
module.exports = { createGistBackup }
