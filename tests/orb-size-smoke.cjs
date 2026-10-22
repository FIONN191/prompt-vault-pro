const { _electron } = require('playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs'), os = require('node:os'), path = require('node:path')
const root = path.resolve(__dirname, '..'), profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pvp-orb-size-'))
const executable = process.env.PROMPT_VAULT_TEST_EXECUTABLE
const launch = () => _electron.launch({ executablePath: executable || require('electron'), args: [...(executable ? [] : [root]), '--user-data-dir=' + profile], env: { ...process.env, VITE_DEV_SERVER_URL: '' } })
async function pages(app) {
  await app.firstWindow()
  for (let i = 0; i < 100 && (app.windows().length < 3 || app.windows().some(p => !p.url().startsWith('file:'))); i++) await new Promise(r => setTimeout(r, 100))
  const main = app.windows().find(p => !p.url().includes('desktop-'))
  const orb = app.windows().find(p => p.url().includes('desktop-orb'))
  const panel = app.windows().find(p => p.url().includes('desktop-panel'))
  await main.getByRole('button', { name: '账号与设置', exact: true }).first().waitFor()
  await orb.locator('.desktop-orb').waitFor()
  return { main, orb, panel }
}
;(async () => {
  let app = await launch()
  const errors = []
  try {
    let { main, orb, panel } = await pages(app)
    for (const page of app.windows()) page.on('pageerror', e => errors.push(e.message))
    await app.evaluate(({ Menu }) => Menu.getApplicationMenu().getMenuItemById('orb-size').click())
    const slider = main.getByLabel('悬浮球直径', { exact: true })
    await slider.waitFor()
    await main.waitForFunction(() => !document.querySelector('#orb-size-range').disabled)
    assert.equal(await slider.inputValue(), '56')
    const snap = main.getByRole('checkbox', { name: '吸附屏幕边缘', exact: true })
    assert.equal(await snap.isChecked(), false)
    await snap.check()
    assert.equal(await app.evaluate(({ Menu }) => Menu.getApplicationMenu().getMenuItemById('orb-snap').checked), true)
    await app.evaluate(({ Menu }) => Menu.getApplicationMenu().getMenuItemById('orb-snap').click())
    await main.waitForFunction(() => !document.querySelector('input[aria-label="吸附屏幕边缘"]').checked)
    await snap.check()
    assert.equal((await panel.evaluate(() => window.desktopPrompt.setOrbSnap(false))).ok, false)
    assert.equal((await main.evaluate(() => window.desktopPrompt.setOrbSnap('yes'))).ok, false)
    // Drive the native drag IPC against real windows with a deterministic cursor.
    const area = await app.evaluate(({ BrowserWindow, screen }) => {
      const win = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().includes('desktop-orb'))
      const b = win.getBounds()
      global.originalCursor = screen.getCursorScreenPoint
      global.testCursor = { x: b.x + b.width / 2, y: b.y + b.height / 2 }
      screen.getCursorScreenPoint = () => global.testCursor
      return screen.getDisplayNearestPoint(global.testCursor).workArea
    })
    await orb.evaluate(() => window.desktopPrompt.startOrbDrag(7))
    await app.evaluate(({ BrowserWindow }, area) => {
      const b = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().includes('desktop-orb')).getBounds()
      global.testCursor = { x: area.x + area.width - 12 - b.width / 2, y: area.y + 160 + b.height / 2 }
    }, area)
    await orb.evaluate(() => { window.desktopPrompt.moveOrbDrag(7); window.desktopPrompt.endOrbDrag(7) })
    await orb.waitForFunction(async () => {
      const state = await window.desktopPrompt.getOrbState()
      return state.snapToEdge && window.screenX + window.innerWidth === window.screen.availLeft + window.screen.availWidth
    })
    const docked = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(w => w.webContents.getURL().includes('desktop-orb')).getBounds())
    assert.equal(docked.x + docked.width, area.x + area.width)
    await app.evaluate(({ screen }) => { screen.getCursorScreenPoint = global.originalCursor; delete global.originalCursor; delete global.testCursor })
    assert.equal(await orb.locator('.desktop-sparkle').count(), 0)
    assert.equal(await orb.locator('.desktop-orb svg').count(), 1)
    await slider.focus(); await slider.press('End')
    await orb.waitForFunction(() => window.innerWidth === 136)
    const enlarged = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(w => w.webContents.getURL().includes('desktop-orb')).getBounds())
    assert.equal(enlarged.x + enlarged.width, area.x + area.width)
    assert.equal((await orb.locator('.desktop-orb').boundingBox()).width, 120)
    await slider.press('Home')
    await orb.waitForFunction(() => window.innerWidth === 56)
    assert.equal((await orb.locator('.desktop-orb').boundingBox()).width, 40)
    assert.equal((await panel.evaluate(() => window.desktopPrompt.setOrbSize(90))).ok, false)
    assert.equal((await orb.evaluate(() => window.desktopPrompt.setOrbSize(90))).ok, false)
    assert.equal((await main.evaluate(() => window.desktopPrompt.setOrbSize(999))).ok, false)
    await main.getByRole('button', { name: '恢复默认大小' }).click()
    await orb.waitForFunction(() => window.innerWidth === 72)
    await slider.focus(); await slider.press('End'); await slider.press('ArrowLeft')
    await orb.waitForFunction(() => window.innerWidth === 135)
    await app.evaluate(({ Menu }) => Menu.getApplicationMenu().getMenuItemById('orb-locked').click())
    await orb.waitForFunction(() => document.querySelector('button').dataset.locked === 'true')
    await main.screenshot({ path: path.join(profile, 'orb-size-settings.png') })
    await orb.screenshot({ path: path.join(profile, 'orb-no-badge.png'), omitBackground: true })
    await app.close(); app = await launch()
    ;({ main, orb, panel } = await pages(app))
    await orb.waitForFunction(() => window.innerWidth === 135)
    assert.equal((await orb.evaluate(() => window.desktopPrompt.getOrbState())).size, 119)
    assert.equal((await orb.evaluate(() => window.desktopPrompt.getOrbState())).snapToEdge, true)
    assert.equal(await app.evaluate(({ Menu }) => Menu.getApplicationMenu().getMenuItemById('orb-snap').checked), true)
    assert.equal(await orb.locator('button').getAttribute('data-locked'), 'true')
    await orb.locator('button').focus(); await orb.keyboard.press('Enter')
    await panel.getByLabel('搜索提示词或标签').waitFor()
    await panel.keyboard.press('Escape')
    assert.deepEqual(errors, [])
    console.log(JSON.stringify({ passed: true, profile, checks: ['menu entry', 'snap checkbox/menu sync', 'native window edge geometry', 'docked resize', 'no badge', 'slider min/max', 'restricted IPC', 'reset', 'custom 119px', 'snap/lock restart persistence', 'open panel while locked'] }, null, 2))
  } finally { await app.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
