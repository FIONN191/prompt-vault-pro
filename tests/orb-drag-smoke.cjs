// macOS native drag, lock, restart and off-screen recovery. Uses an isolated profile.
const { _electron: electron } = require('playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
async function until(check) {
  for (let i = 0; i < 70; i++) {
    if (await check()) return
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error('Timed out waiting for orb state')
}
;(async () => {
  assert.equal(process.platform, 'darwin', 'Native mouse driver requires macOS')
  const root = path.resolve(__dirname, '..')
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-vault-drag-'))
  const driver = path.join(profile, 'native-mouse')
  execFileSync('swiftc', [path.join(__dirname, 'native-orb-drag.swift'), '-o', driver])
  const executable = process.env.PROMPT_VAULT_TEST_EXECUTABLE
  const launch = () => electron.launch({ executablePath: executable || require('electron'), args: [...(executable ? [] : [root]), '--user-data-dir=' + profile], env: { ...process.env, VITE_DEV_SERVER_URL: '' } })
  let desktop, cursorBefore
  const errors = []
  const pages = async () => {
    await desktop.firstWindow()
    await until(() => desktop.windows().length === 3 && desktop.windows().every(win => win.url().startsWith('file:')))
    for (const win of desktop.windows()) win.on('pageerror', error => errors.push(error.message))
    const orb = desktop.windows().find(win => win.url().includes('desktop-orb'))
    const panel = desktop.windows().find(win => win.url().includes('desktop-panel'))
    await orb.getByRole('button', { name: '打开快速提示词', exact: true }).waitFor()
    return { orb, panel }
  }
  const bounds = () => desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(win => win.webContents.getURL().includes('desktop-orb')).getBounds())
  const panelVisible = () => desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(win => win.webContents.getURL().includes('desktop-panel')).isVisible())
  const flipLock = () => desktop.evaluate(({ Menu }) => Menu.getApplicationMenu().getMenuItemById('orb-locked').click())
  const mouse = (from, to = from) => execFileSync(driver, ['drag', from.x, from.y, to.x, to.y].map(String))
  const center = rect => ({ x: rect.x + 36, y: rect.y + 36 })
  try {
    desktop = await launch()
    let { orb, panel } = await pages()
    cursorBefore = await desktop.evaluate(({ screen }) => screen.getCursorScreenPoint())
    const before = await bounds()
    const area = await desktop.evaluate(({ screen }, point) => screen.getDisplayNearestPoint(point).workArea, center(before))
    await desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(win => !win.webContents.getURL().includes('desktop-')).close())
    const destination = { x: area.x + 180, y: area.y + 220 }
    mouse(center(before), destination)
    await until(async () => (await bounds()).x !== before.x)
    const moved = await bounds()
    assert(Math.abs(moved.x + 36 - destination.x) <= 2, 'orb must follow mouse horizontally')
    assert(Math.abs(moved.y + 36 - destination.y) <= 2, 'orb must follow mouse vertically')
    assert.equal(await panelVisible(), false, 'drag release must not open panel')
    await orb.screenshot({ path: path.join(profile, 'orb-unlocked.png') })
    mouse(center(moved))
    await until(panelVisible)
    await panel.getByLabel('搜索提示词或标签').waitFor()
    const panelBounds = await desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(win => win.webContents.getURL().includes('desktop-panel')).getBounds())
    assert(panelBounds.x >= area.x && panelBounds.x + panelBounds.width <= area.x + area.width)
    assert(panelBounds.y >= area.y && panelBounds.y + panelBounds.height <= area.y + area.height)
    assert.equal(panelBounds.x, moved.x + 80, 'panel should open beside orb when space permits')
    await panel.keyboard.press('Escape')
    await until(async () => !(await panelVisible()))
    assert.deepEqual(await bounds(), moved, 'opening and closing must preserve position')
    await flipLock()
    await until(async () => await orb.locator('button').getAttribute('data-locked') === 'true')
    mouse(center(moved), { x: destination.x + 160, y: destination.y + 80 })
    assert.deepEqual(await bounds(), moved, 'locked orb must not move')
    assert.equal(await panelVisible(), false, 'locked drag must not trigger a click')
    await orb.screenshot({ path: path.join(profile, 'orb-locked.png') })
    mouse(center(moved))
    await until(panelVisible)
    await panel.keyboard.press('Escape')
    await until(async () => !(await panelVisible()))
    await flipLock()
    await until(async () => await orb.locator('button').getAttribute('data-locked') === 'false')
    mouse(center(moved), { x: destination.x + 120, y: destination.y + 100 })
    await until(async () => (await bounds()).x !== moved.x)
    const finalPosition = await bounds()
    await flipLock()
    await until(async () => await orb.locator('button').getAttribute('data-locked') === 'true')
    const settingsFile = path.join(profile, 'floating-orb.json')
    const saved = JSON.parse(fs.readFileSync(settingsFile, 'utf8'))
    assert.deepEqual(saved.position, { x: finalPosition.x, y: finalPosition.y })
    assert(saved.locked)
    await desktop.close()
    desktop = await launch()
    ;({ orb, panel } = await pages())
    await until(async () => await orb.locator('button').getAttribute('data-locked') === 'true')
    assert.deepEqual(await bounds(), finalPosition, 'relaunch must restore position')
    assert.equal(await desktop.evaluate(({ Menu }) => Menu.getApplicationMenu().getMenuItemById('orb-locked').checked), true)
    // Inspect the real context menu, including its checked state, then dismiss it.
    await desktop.evaluate(({ Menu }) => {
      const original = Menu.prototype.popup
      Menu.prototype.popup = function (options) {
        globalThis.orbContextChecked = this.getMenuItemById('orb-locked')?.checked
        return original.call(this, options)
      }
    })
    await orb.getByRole('button', { name: '打开快速提示词', exact: true }).click({ button: 'right' })
    await until(async () => await desktop.evaluate(() => globalThis.orbContextChecked) === true)
    execFileSync('osascript', ['-e', 'tell application "System Events" to key code 53'])
    await desktop.close()
    // Simulate a remembered position on a monitor that is no longer connected.
    fs.writeFileSync(settingsFile, JSON.stringify({ ...saved, position: { x: 90000, y: -90000 } }))
    desktop = await launch()
    await pages()
    const recovered = await bounds()
    const recoveredArea = await desktop.evaluate(({ screen }, point) => screen.getDisplayNearestPoint(point).workArea, center(recovered))
    assert(recovered.x >= recoveredArea.x && recovered.x + 72 <= recoveredArea.x + recoveredArea.width)
    assert(recovered.y >= recoveredArea.y && recovered.y + 72 <= recoveredArea.y + recoveredArea.height)
    assert.deepEqual(errors, [])
    console.log(JSON.stringify({ passed: true, profile, moved, finalPosition, recovered, checks: ['native drag', 'no accidental click', 'panel placement', 'lock and unlock', 'click while locked', 'restart persistence', 'context menu checkmark', 'off-screen recovery'] }, null, 2))
  } finally {
    if (cursorBefore) execFileSync(driver, ['move', cursorBefore.x, cursorBefore.y].map(String))
    if (desktop) await desktop.close().catch(() => {})
  }
})().catch(error => { console.error(error); process.exitCode = 1 })
