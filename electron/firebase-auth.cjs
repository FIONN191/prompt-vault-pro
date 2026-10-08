const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const crypto = require('node:crypto')
const PROVIDERS = ['google.com', 'github.com', 'apple.com']
function normalizeConfig(raw) {
  if (!raw || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(raw.projectId || '') || !/^AIza[\w-]{30,}$/.test(raw.apiKey || '') || typeof raw.appId !== 'string' || !raw.appId.startsWith('1:')) throw new Error('请填写有效的 Firebase Web 应用配置（apiKey、projectId、appId）')
  const authDomain = raw.authDomain || `${raw.projectId}.firebaseapp.com`
  if (authDomain !== `${raw.projectId}.firebaseapp.com`) throw new Error('请使用项目默认的 projectId.firebaseapp.com 认证域名')
  return { apiKey: raw.apiKey, projectId: raw.projectId, appId: raw.appId, authDomain, providers: Array.isArray(raw.providers) ? PROVIDERS.filter(p => raw.providers.includes(p)) : ['google.com', 'github.com'] }
}
function createFirebaseAuth({ directory, assets, safeStorage, fetch, openExternal, changed = () => {}, bundledConfig = null, timeoutMs = 300000 }) {
  const configFile = path.join(directory, 'firebase-config.json'), sessionFile = path.join(directory, 'firebase-session.enc')
  let config = null, session = null, pending = null, notice = '', verification = 'signed-out', epoch = 0
  try { config = normalizeConfig(JSON.parse(fs.readFileSync(configFile, 'utf8'))) } catch { if (bundledConfig) config = normalizeConfig(bundledConfig) }
  try { session = JSON.parse(safeStorage.decryptString(fs.readFileSync(sessionFile))); verification = 'cached' } catch (e) { if (e.code !== 'ENOENT') notice = '保存的登录状态暂不可读取，请重新登录' }
  if (!config || session?.projectId !== config.projectId) session = null
  const state = () => ({ configured: !!config, config, user: session?.user || null, verification, pending: !!pending, provider: pending?.provider || null, message: notice })
  const emit = () => changed(state())
  function atomic(filename, value) {
    fs.mkdirSync(directory, { recursive: true })
    fs.writeFileSync(filename + '.tmp', value, { mode: 0o600 })
    fs.renameSync(filename + '.tmp', filename)
  }
  function stopPending() {
    if (!pending) return
    clearTimeout(pending.timer)
    pending.server.close()
    pending.server.closeIdleConnections?.()
    pending = null
  }
  function cancel() { epoch++; stopPending(); notice = ''; emit(); return state() }
  function logout() {
    fs.rmSync(sessionFile, { force: true })
    epoch++; stopPending(); session = null; verification = 'signed-out'; notice = ''; emit(); return state()
  }
  function configure(raw) {
    const next = normalizeConfig(raw)
    logout()
    atomic(configFile, JSON.stringify(next, null, 2))
    config = next; emit(); return state()
  }
  async function request(url, body, form = false) {
    let response
    try {
      response = await fetch(url, { method: 'POST', headers: { 'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json' }, body: form ? new URLSearchParams(body).toString() : JSON.stringify(body), signal: AbortSignal.timeout(15000) })
    } catch { throw new Error('无法连接 Firebase，请检查网络；本地提示词仍可使用') }
    const data = await response.json()
    if (!response.ok) {
      const code = data.error?.message || 'AUTH_FAILED'
      const error = new Error(['INVALID_ID_TOKEN', 'TOKEN_EXPIRED', 'USER_DISABLED', 'USER_NOT_FOUND', 'INVALID_REFRESH_TOKEN'].includes(code) ? '登录已失效，请重新登录' : 'Firebase 认证请求失败，请检查项目配置和登录提供商')
      error.invalidSession = ['INVALID_ID_TOKEN', 'TOKEN_EXPIRED', 'USER_DISABLED', 'USER_NOT_FOUND', 'INVALID_REFRESH_TOKEN'].includes(code)
      throw error
    }
    return data
  }
  async function verify(idToken, currentConfig) {
    let payload
    try { payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString()) } catch { throw new Error('无效的登录结果') }
    // This checks project binding, not signature. Signature/revocation validation is delegated to Google's accounts:lookup.
    if (payload.aud !== currentConfig.projectId || payload.iss !== `https://securetoken.google.com/${currentConfig.projectId}`) throw new Error('登录结果不属于此 Firebase 项目')
    const data = await request(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(currentConfig.apiKey)}`, { idToken })
    const user = data.users?.[0]
    if (!user || user.disabled || user.localId !== payload.sub) throw new Error('账号不可用，请重新登录')
    return { uid: user.localId, displayName: user.displayName || '', email: user.email || '', emailVerified: user.emailVerified === true, providers: (user.providerUserInfo || []).map(p => p.providerId).filter(p => PROVIDERS.includes(p)) }
  }
  function saveSession(next) {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('系统安全存储不可用，未保存登录凭据')
    atomic(sessionFile, safeStorage.encryptString(JSON.stringify(next)))
    session = next; verification = 'verified'; notice = ''
  }
  async function refresh() {
    if (!session || !config || pending) return state()
    const current = epoch, previous = session, currentConfig = config
    try {
      const tokens = await request(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(config.apiKey)}`, { grant_type: 'refresh_token', refresh_token: session.refreshToken }, true)
      const user = await verify(tokens.id_token, currentConfig)
      if (current !== epoch) return state()
      if (user.uid !== previous.user.uid) { const error = new Error('账号凭据不匹配，请重新登录'); error.invalidSession = true; throw error }
      saveSession({ projectId: currentConfig.projectId, refreshToken: tokens.refresh_token, user })
    } catch (e) {
      if (current !== epoch || session !== previous) return state()
      if (e.invalidSession) { logout(); notice = e.message }
      else { verification = 'offline'; notice = e.message }
    }
    emit(); return state()
  }
  async function login(provider) {
    if (!config) throw new Error('请先配置 Firebase 项目')
    if (!PROVIDERS.includes(provider)) throw new Error('不支持的登录方式')
    if (!config.providers.includes(provider)) throw new Error('此登录方式尚未配置启用')
    if (pending) throw new Error('已有登录正在进行，请先取消或完成')
    if (!safeStorage.isEncryptionAvailable()) throw new Error('系统安全存储不可用，无法安全保存登录凭据')
    if (!fs.existsSync(path.join(assets, 'index.html'))) throw new Error('登录页面缺失，请重新构建应用')
    const current = ++epoch, currentConfig = config
    const secret = crypto.randomBytes(32).toString('hex')
    let origin, completing = false
    const server = http.createServer(async (req, res) => {
      res.setHeader('Cache-Control', 'no-store')
      res.setHeader('Referrer-Policy', 'no-referrer')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('X-Frame-Options', 'DENY')
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
      const reply = (status, body) => { if (!res.writableEnded) { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)) } }
      try {
        if (req.headers.host !== new URL(origin).host || current !== epoch) return reply(403, { error: '本次登录已过期' })
        const route = new URL(req.url, origin).pathname
        if (req.method === 'GET' && (route === '/' || /^\/assets\/[a-zA-Z0-9_.-]+\.(js|css)$/.test(route))) {
          const file = path.join(assets, route === '/' ? 'index.html' : route.slice(1))
          const data = await fs.promises.readFile(file)
          res.writeHead(200, { 'Content-Type': file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html' }); return res.end(data)
        }
        if (req.method !== 'POST' || req.headers.origin !== origin || req.headers.authorization !== `Bearer ${secret}` || !['/config', '/complete'].includes(route)) return reply(403, { error: '无效的登录请求' })
        if (route === '/config') return reply(200, { config: currentConfig, provider })
        if (completing) return reply(409, { error: '正在确认登录结果' })
        completing = true
        try {
          let body = ''
          for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 32768) throw new Error('登录结果过大') }
          const data = JSON.parse(body)
          if (typeof data.idToken !== 'string' || typeof data.refreshToken !== 'string' || !data.refreshToken) throw new Error('登录结果不完整')
          const user = await verify(data.idToken, currentConfig)
          if (current !== epoch) throw new Error('本次登录已取消')
          if (!user.providers.includes(provider)) throw new Error('登录提供商不匹配')
          saveSession({ projectId: currentConfig.projectId, refreshToken: data.refreshToken, user })
          reply(200, { ok: true }); stopPending(); emit()
        } finally { completing = false }
      } catch (e) { reply(400, { error: e.code === 'ENOENT' ? '页面文件不存在' : e.message }) }
    })
    server.requestTimeout = 20000
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
    const timer = setTimeout(() => { if (current === epoch) { epoch++; stopPending(); notice = '登录已超时，请重试'; emit() } }, timeoutMs)
    timer.unref?.()
    pending = { server, timer, provider }; notice = ''; emit()
    try { await openExternal(`${origin}/#${secret}`) } catch { cancel(); throw new Error('无法打开系统浏览器，请检查默认浏览器设置') }
    return state()
  }
  return { state, configure, login, cancel, logout, refresh, stop: () => { epoch++; stopPending() } }
}
module.exports = { createFirebaseAuth, normalizeConfig }
