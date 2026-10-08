const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), os = require('node:os'), path = require('node:path')
const { createAppSettings } = require('../electron/app-settings.cjs')
const { createFirebaseAuth } = require('../electron/firebase-auth.cjs')
const cfg = { projectId: 'prompt-vault-test', apiKey: 'AIza' + 'x'.repeat(35), appId: '1:123:web:123', providers: ['google.com','github.com','apple.com'] }
const jwt = project => `header.${Buffer.from(JSON.stringify({ aud: project, iss: `https://securetoken.google.com/${project}`, sub: 'test-user' })).toString('base64url')}.signature`
const safeStorage = { isEncryptionAvailable: () => true, encryptString: value => Buffer.from('sealed:' + Buffer.from(value).toString('base64')), decryptString: value => Buffer.from(value.toString().slice(7), 'base64').toString() }
const root = () => fs.mkdtempSync(path.join(os.tmpdir(), 'pvp-account-'))
test('startup defaults once; explicit disable and system changes survive relaunch; test profiles do not touch OS', () => {
  const dir = root(); let enabled = false, calls = 0
  const app = { isPackaged: true, getVersion: () => 'test', getLoginItemSettings: () => ({ openAtLogin: enabled }), setLoginItemSettings: value => { enabled = value.openAtLogin; calls++ } }
  const options = { app, settingsPath: path.join(dir, 'settings.json'), platform: 'darwin' }
  const settings = createAppSettings(options)
  assert.equal(settings.status().openAtLogin, true)
  settings.setStartup(false)
  createAppSettings(options)
  assert.equal(enabled, false); assert.equal(calls, 2)
  settings.setStartup(true); enabled = false
  createAppSettings(options); assert.equal(enabled, false); assert.equal(calls, 3)
  createAppSettings({ ...options, settingsPath: path.join(dir, 'isolated.json'), isolated: true }); assert.equal(calls, 3)
  fs.rmSync(dir, { recursive: true })
})
async function setup(t, options = {}) {
  const dir = root(); fs.mkdirSync(path.join(dir, 'assets')); fs.writeFileSync(path.join(dir, 'assets/index.html'), '<html>auth</html>')
  let opened, requestCount = 0
  const service = createFirebaseAuth({ directory: dir, assets: path.join(dir, 'assets'), safeStorage, openExternal: async url => { opened = new URL(url) }, fetch: async url => {
    requestCount++
    return { ok: true, json: async () => url.includes('securetoken') ? { id_token: jwt(cfg.projectId), refresh_token: 'refreshed-secret' } : { users: [{ localId: 'test-user', email: 'test@example.invalid', providerUserInfo: [{ providerId: 'google.com' }, { providerId: 'github.com' }, { providerId: 'apple.com' }] }] } }
  }, ...options })
  t.after(() => { service.stop(); fs.rmSync(dir, { recursive: true, force: true }) })
  service.configure(cfg)
  const start = async provider => { await service.login(provider); return opened }
  const post = (url, route, body, headers = {}) => fetch(url.origin + route, { method: 'POST', headers: { Origin: url.origin, Authorization: `Bearer ${url.hash.slice(1)}`, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })
  return { service, dir, start, post, requests: () => requestCount }
}
test('all providers use browser flow; callbacks require secret, origin, project and server-verified identity; tokens never reach UI', async t => {
  const { service, dir, start, post, requests } = await setup(t)
  for (const provider of ['google.com', 'github.com', 'apple.com']) {
    const url = await start(provider)
    assert.equal((await post(url, '/config', {}, { Origin: 'https://evil.invalid' })).status, 403)
    assert.equal((await post(url, '/config', {}, { Authorization: 'Bearer wrong' })).status, 403)
    assert.equal((await post(url, '/complete', { idToken: jwt('wrong-project'), refreshToken: 'secret' })).status, 400)
    assert.equal((await post(url, '/config', {})).status, 200)
    assert.equal((await post(url, '/complete', { idToken: jwt(cfg.projectId), refreshToken: 'private-refresh-secret' })).status, 200)
    assert.equal(service.state().user.uid, 'test-user'); assert.equal(service.state().pending, false)
    assert(!JSON.stringify(service.state()).includes('private-refresh-secret'))
    assert(!fs.readFileSync(path.join(dir, 'firebase-session.enc'), 'utf8').includes('private-refresh-secret'))
    service.logout(); assert.equal(fs.existsSync(path.join(dir, 'firebase-session.enc')), false)
  }
  assert.equal(requests(), 3)
})
test('cancellation, timeout, rejected backend verification and unavailable encryption cannot log in', async t => {
  const x = await setup(t, { timeoutMs: 30, fetch: async () => ({ ok: false, json: async () => ({ error: { message: 'INVALID_ID_TOKEN' } }) }) })
  let url = await x.start('google.com'); x.service.cancel()
  await assert.rejects(x.post(url, '/complete', {})); assert.equal(x.service.state().user, null)
  url = await x.start('google.com')
  assert.equal((await x.post(url, '/complete', { idToken: jwt(cfg.projectId), refreshToken: 'secret' })).status, 400)
  assert.equal(x.service.state().user, null)
  await new Promise(r => setTimeout(r, 60)); assert.equal(x.service.state().pending, false); assert.match(x.service.state().message, /超时/)
  const y = await setup(t, { safeStorage: { ...safeStorage, isEncryptionAvailable: () => false } })
  await assert.rejects(y.service.login('google.com'), /安全存储/)
})
test('encrypted session restores and refreshes; offline failure preserves local account', async t => {
  const x = await setup(t)
  const url = await x.start('google.com')
  await x.post(url, '/complete', { idToken: jwt(cfg.projectId), refreshToken: 'secret' })
  await x.service.refresh(); assert.equal(x.service.state().verification, 'verified')
  const restored = createFirebaseAuth({ directory: x.dir, assets: '', safeStorage, fetch: async () => { throw Error('offline') }, openExternal() {} })
  t.after(() => restored.stop())
  assert.equal(restored.state().user.uid, 'test-user')
  await restored.refresh(); assert.equal(restored.state().verification, 'offline'); assert.equal(restored.state().user.uid, 'test-user')
  restored.logout(); assert.equal(restored.state().user, null)
})
