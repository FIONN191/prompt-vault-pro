const fs = require('node:fs')
const path = require('node:path')
function createAppSettings({ app, settingsPath, platform = process.platform, isolated = false }) {
  let saved = {}
  try { saved = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) } catch (e) { if (e.code !== 'ENOENT') saved = { startupInitialized: true } }
  const supported = app.isPackaged && !isolated && ['darwin', 'win32'].includes(platform)
  let error = ''
  const options = { path: process.execPath, args: ['--startup'] }
  function write(next) {
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true })
    fs.writeFileSync(settingsPath + '.tmp', JSON.stringify(next), { mode: 0o600 })
    fs.renameSync(settingsPath + '.tmp', settingsPath)
    saved = next
  }
  function effectiveStartup() {
    const value = app.getLoginItemSettings(options)
    return value.openAtLogin && (platform !== 'win32' || value.executableWillLaunchAtLogin !== false)
  }
  function status() {
    return { version: app.getVersion(), platform, startupSupported: supported,
      openAtLogin: supported ? effectiveStartup() : false,
      startupError: error }
  }
  function setStartup(enabled) {
    if (!supported) throw new Error('请在安装后的桌面应用中设置开机自启；开发与测试环境不会修改系统登录项')
    app.setLoginItemSettings({ ...options, openAtLogin: enabled, ...(platform === 'win32' ? { enabled } : {}) })
    const actual = effectiveStartup()
    if (actual !== enabled) throw new Error('系统未应用登录项设置，请检查系统的登录项或启动应用设置')
    write({ ...saved, startupInitialized: true, openAtLogin: enabled })
    error = ''
    return status()
  }
  // Only the first installed launch opts in. Later OS-level changes remain respected.
  if (supported && !saved.startupInitialized) {
    try { setStartup(true) } catch (e) { error = e.message }
  }
  return { status, setStartup }
}
module.exports = { createAppSettings }
