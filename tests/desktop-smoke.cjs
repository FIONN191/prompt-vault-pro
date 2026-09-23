// Run with NODE_PATH pointing to an installation of playwright.
const { _electron: electron } = require('playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
async function until(check) {
  for (let i = 0; i < 50; i++) {
    if (await check()) return
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error('Timed out waiting for native window state')
}

;(async () => {
  const root = path.resolve(__dirname, '..')
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-vault-smoke-'))
  const packagedExecutable = process.env.PROMPT_VAULT_TEST_EXECUTABLE
  const desktop = await electron.launch({ executablePath: packagedExecutable || require('electron'), args: [...(packagedExecutable ? [] : [root]), '--user-data-dir=' + profile], env: { ...process.env, VITE_DEV_SERVER_URL: '' } })
  const errors = []
  let clipboardBefore
  try {
    assert.equal(fs.realpathSync(await desktop.evaluate(({ app }) => app.getPath('userData'))), fs.realpathSync(profile))
    clipboardBefore = await desktop.evaluate(({ clipboard }) => clipboard.readText())
    await desktop.firstWindow()
    for (let attempt = 0; desktop.windows().length < 3 && attempt < 100; attempt++) await new Promise(resolve => setTimeout(resolve, 100))
    assert.equal(desktop.windows().length, 3)
    const main = desktop.windows().find(win => !win.url().includes('desktop-'))
    const orb = desktop.windows().find(win => win.url().includes('desktop-orb'))
    const panel = desktop.windows().find(win => win.url().includes('desktop-panel'))
    for (const win of desktop.windows()) win.on('pageerror', error => errors.push(error.message))
    await orb.getByRole('button', { name: '打开快速提示词', exact: true }).click()
    await panel.getByPlaceholder('标题（可留空，自动生成）').waitFor()
    const state = await desktop.evaluate(({ BrowserWindow, globalShortcut }) => ({
      windows: BrowserWindow.getAllWindows().map(win => ({ title: win.getTitle(), top: win.isAlwaysOnTop(), visible: win.isVisible() })),
      shortcut: globalShortcut.isRegistered('CommandOrControl+Shift+K'),
    }))
    assert(state.shortcut)
    assert.equal(state.windows.filter(win => win.top).length, 2)
    if (process.platform === 'darwin') {
      await panel.keyboard.press('Escape')
      const panelVisible = () => desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(win => win.webContents.getURL().includes('desktop-panel')).isVisible())
      await until(async () => !(await panelVisible()))
      execFileSync('osascript', ['-e', 'tell application "Finder" to activate'])
      await until(() => execFileSync('osascript', ['-e', 'tell application "System Events" to get name of first application process whose frontmost is true'], { encoding: 'utf8' }).trim() === 'Finder')
      execFileSync('osascript', ['-e', 'tell application "System Events" to keystroke "k" using {command down, shift down}'])
      await until(panelVisible)
      await panel.locator('textarea').waitFor({ state: 'visible' })
      assert.equal(await desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(win => win.webContents.getURL().includes('desktop-panel')).isVisible()), true)
    }
    await desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(win => !win.webContents.getURL().includes('desktop-')).close())
    assert.equal(await desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(win => !win.webContents.getURL().includes('desktop-')).isVisible()), false)
    await panel.getByPlaceholder('标题（可留空，自动生成）').fill('Desktop smoke test')
    await panel.locator('textarea').fill('桌面悬浮球测试：隐藏主窗口也能保存。')
    await panel.getByRole('button', { name: '存入素材库', exact: true }).click()
    await panel.getByText('已存入素材库', { exact: true }).waitFor()
    await panel.getByPlaceholder('搜索标题 / 内容 / 标签，一键复制…').fill('Desktop smoke test')
    await panel.getByRole('heading', { name: 'Desktop smoke test' }).waitFor()
    await panel.getByTitle('复制', { exact: true }).click()
    await panel.getByText('已复制，切回目标应用粘贴即可', { exact: true }).waitFor()
    assert.equal(await desktop.evaluate(({ clipboard }) => clipboard.readText()), '桌面悬浮球测试：隐藏主窗口也能保存。')
    const stored = await main.evaluate(() => JSON.parse(localStorage.getItem('prompt_vault_pro_prompts_v1')))
    assert(stored.find(prompt => prompt.title === 'Desktop smoke test').lastUsedAt)
    await panel.locator('textarea').fill('未保存的草稿')
    await panel.keyboard.press('Escape')
    await orb.getByRole('button', { name: '打开快速提示词', exact: true }).click()
    assert.equal(await panel.locator('textarea').inputValue(), '未保存的草稿')
    await panel.getByTitle('查看详情', { exact: true }).click()
    await main.getByRole('heading', { name: 'Desktop smoke test', exact: true }).waitFor()
    assert.equal(await desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(win => !win.webContents.getURL().includes('desktop-')).isVisible()), true)
    // Reload the authoritative renderer to verify persistence and panel resync.
    await main.reload()
    await main.getByRole('button', { name: '仪表盘', exact: true }).first().waitFor()
    assert((await main.evaluate(() => JSON.parse(localStorage.getItem('prompt_vault_pro_prompts_v1')))).some(prompt => prompt.title === 'Desktop smoke test'))
    await orb.getByRole('button', { name: '打开快速提示词', exact: true }).click()
    await panel.getByRole('heading', { name: 'Desktop smoke test' }).waitFor()
    // A failed write must not clear the draft or publish a phantom prompt.
    await main.evaluate(() => { window.originalStorageSet = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new DOMException('test quota', 'QuotaExceededError') } })
    await panel.locator('textarea').fill('保存失败应保留草稿')
    await panel.getByRole('button', { name: '存入素材库', exact: true }).click()
    await panel.getByText('操作未完成，请打开主窗口检查；输入已保留', { exact: true }).waitFor()
    assert.equal(await panel.locator('textarea').inputValue(), '保存失败应保留草稿')
    await main.evaluate(() => { Storage.prototype.setItem = window.originalStorageSet; delete window.originalStorageSet })
    await panel.screenshot({ path: path.join(profile, 'desktop-panel.png') })
    assert.deepEqual(errors, [])
    console.log(JSON.stringify({ passed: true, profile, state, screenshot: path.join(profile, 'desktop-panel.png') }, null, 2))
  } finally {
    if (clipboardBefore !== undefined) await desktop.evaluate(({ clipboard }, text) => clipboard.writeText(text), clipboardBefore)
    await desktop.close()
  }
})().catch(error => { console.error(error); process.exitCode = 1 })
