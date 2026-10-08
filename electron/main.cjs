const { app, BrowserWindow, shell, ipcMain, screen, globalShortcut, Menu, clipboard, dialog, safeStorage, net } = require('electron')
const path = require('path')
const fsp = require('node:fs/promises')
const { createGistBackup } = require('./gist-backup.cjs')
const { parsePayload } = require('./prompt-data.cjs')
const { createDirectInsert } = require('./direct-insert.cjs')
const { createFloatingOrb } = require('./floating-orb.cjs')
const DEV_URL = process.env.VITE_DEV_SERVER_URL
let mainWindow, orbWindow, panelWindow, floatingOrb, quitting = false, snapshot = null
let preferences = null, directInsert = null
const webPreferences = { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false }
function load(win, hash = '') {
  if (DEV_URL) win.loadURL(DEV_URL + '#' + hash)
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), { hash })
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', event => event.preventDefault())
}
function floatWindow(options) {
  const win = new BrowserWindow({ ...options, show: false, frame: false, resizable: options.resizable === true, minimizable: false, maximizable: false, skipTaskbar: true, alwaysOnTop: true, webPreferences })
  win.setAlwaysOnTop(true, 'floating')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  return win
}
function closePanel() { panelWindow.hide(); orbWindow.showInactive() }
function togglePanel() {
  if (panelWindow.isVisible()) return closePanel()
  floatingOrb.cancelDrag()
  floatingOrb.positionPanel()
  orbWindow.hide()
  panelWindow.show()
  panelWindow.focus()
  panelWindow.webContents.send('desktop:focus')
}
function showMain(id) {
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
  if (id) mainWindow.webContents.send('desktop:detail', id)
}
function trusted(event, win) { return win && !win.isDestroyed() && event.sender === win.webContents }
if (!app.requestSingleInstanceLock()) app.quit()
else {
  app.on('second-instance', () => mainWindow && showMain())
  app.whenReady().then(() => {
    mainWindow = new BrowserWindow({ width: 1360, height: 860, minWidth: 900, minHeight: 600, backgroundColor: '#05060c', title: 'Prompt Vault Pro', autoHideMenuBar: true, webPreferences })
    orbWindow = floatWindow({ width: 72, height: 72, transparent: true, hasShadow: false, title: 'Prompt Vault 悬浮球' })
    panelWindow = floatWindow({ width: 420, height: 720, minWidth: 360, minHeight: 480, resizable: true, backgroundColor: '#0a0e1a', title: '快速提示词' })
    directInsert = createDirectInsert({
      settingsPath: path.join(app.getPath('userData'), 'direct-insert.json'),
      nativeDir: path.join(__dirname.replace('app.asar', 'app.asar.unpacked'), 'native'),
      clipboard,
      hide: closePanel,
      restore: () => { orbWindow.hide(); panelWindow.show(); panelWindow.focus() },
    })
    ipcMain.handle('desktop:insertion', async (event, action, value) => {
      if (!trusted(event, panelWindow)) return { ok: false, error: '无权操作' }
      try {
        if (action === 'status') return await directInsert.status()
        if (action === 'configure') return await directInsert.configure(value === true)
        if (action === 'insert') {
          const prompt = snapshot?.find(p => p.id === value)
          const text = prompt && (prompt.englishPrompt || prompt.chinesePrompt || prompt.shortPrompt || prompt.strongPrompt)
          if (!text) return { ok: false, error: '提示词不存在或内容为空' }
          return await directInsert.insert(text)
        }
        return { ok: false, error: '未知操作' }
      } catch (error) { return { ok: false, error: error.message } }
    })
    const gist = createGistBackup({ settingsPath: path.join(app.getPath('userData'), 'gist-backup.json'), safeStorage, fetch: (...args) => net.fetch(...args) })
    let dataBusy = false
    ipcMain.handle('desktop:data', async (event, action, value) => {
      if (!trusted(event, panelWindow)) return { ok: false, error: '无权操作' }
      if (dataBusy) return { ok: false, error: '正在处理上一个数据操作，请稍候' }
      dataBusy = true
      try {
        let data
        const payload = () => ({ app: 'prompt-vault-pro', version: 2, exportedAt: new Date().toISOString(), prompts: snapshot || [], preferences })
        if (action === 'status') data = await gist.status()
        else if (action === 'configure') data = await gist.configure(value || {})
        else if (action === 'pull') data = await gist.pull()
        else if (action === 'upload') {
          if (!snapshot || !preferences) throw new Error('提示词库尚未连接')
          data = await gist.upload(payload())
        } else if (action === 'export') {
          if (!snapshot || !preferences) throw new Error('提示词库尚未连接')
          const result = await dialog.showSaveDialog(panelWindow, { defaultPath: `prompt-vault-${new Date().toISOString().slice(0, 10)}.json`, filters: [{ name: 'JSON', extensions: ['json'] }] })
          if (result.canceled) return { ok: true, cancelled: true }
          await fsp.writeFile(result.filePath, JSON.stringify(payload(), null, 2), 'utf8')
        } else if (action === 'import') {
          const result = await dialog.showOpenDialog(panelWindow, { properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }] })
          if (result.canceled) return { ok: true, cancelled: true }
          const filename = result.filePaths[0]
          if ((await fsp.stat(filename)).size > 20 * 1024 * 1024) throw new Error('文件超过 20 MB')
          const { parseImportDocument } = await import('./import-format.mjs')
          data = parsePayload(parseImportDocument(await fsp.readFile(filename, 'utf8')))
        } else throw new Error('未知操作')
        return { ok: true, data }
      } catch (error) { return { ok: false, error: error.message || '操作失败' } }
      finally { dataBusy = false }
    })
    floatingOrb = createFloatingOrb({ orbWindow, panelWindow, screen, settingsPath: path.join(app.getPath('userData'), 'floating-orb.json'), onClick: togglePanel })
    floatingOrb.restore()
    mainWindow.on('close', event => { if (!quitting) { event.preventDefault(); mainWindow.hide() } })
    panelWindow.on('close', event => { if (!quitting) { event.preventDefault(); closePanel() } })
    orbWindow.on('close', event => { if (!quitting) { event.preventDefault(); orbWindow.hide() } })
    orbWindow.once('ready-to-show', () => orbWindow.showInactive())
    screen.on('display-removed', floatingOrb.restore)
    screen.on('display-metrics-changed', floatingOrb.restore)
    orbWindow.on('blur', floatingOrb.cancelDrag)
    orbWindow.on('hide', floatingOrb.cancelDrag)
    ipcMain.handle('desktop:orb-state', event => trusted(event, orbWindow) ? floatingOrb.getState() : null)
    ipcMain.on('desktop:orb-drag-start', (event, id) => { if (trusted(event, orbWindow)) floatingOrb.startDrag(id) })
    ipcMain.on('desktop:orb-drag-move', (event, id) => { if (trusted(event, orbWindow)) floatingOrb.moveDrag(id) })
    ipcMain.on('desktop:orb-drag-end', (event, id, cancelled) => { if (trusted(event, orbWindow)) floatingOrb.endDrag(id, cancelled === true) })
    ipcMain.on('desktop:toggle', event => { if (trusted(event, orbWindow) || trusted(event, mainWindow)) togglePanel() })
    ipcMain.on('desktop:close', event => { if (trusted(event, panelWindow)) closePanel() })
    ipcMain.on('desktop:main', (event, id) => { if (trusted(event, panelWindow) || trusted(event, orbWindow)) { closePanel(); showMain(typeof id === 'string' ? id : undefined) } })
    ipcMain.on('desktop:snapshot', (event, value) => {
      if (!trusted(event, mainWindow) || !Array.isArray(value)) return
      snapshot = value
      panelWindow.webContents.send('desktop:snapshot', snapshot)
    })
    ipcMain.on('desktop:ready', event => { if (trusted(event, panelWindow) && snapshot) event.sender.send('desktop:snapshot', snapshot) })
    ipcMain.on('desktop:preferences', (event, value) => {
      if (!trusted(event, mainWindow) || !value || !Array.isArray(value.categories) || !['minimal', 'light', 'neon'].includes(value.theme)) return
      preferences = value
      const background = value.theme === 'light' ? '#f6f6f4' : value.theme === 'neon' ? '#0a0e1a' : '#141414'
      mainWindow.setBackgroundColor(background)
      panelWindow.setBackgroundColor(background)
      for (const win of [orbWindow, panelWindow]) win.webContents.send('desktop:preferences', value)
    })
    ipcMain.on('desktop:theme-request', (event, theme) => {
      if (trusted(event, panelWindow) && ['minimal', 'light', 'neon'].includes(theme)) mainWindow.webContents.send('desktop:theme-request', theme)
    })
    ipcMain.on('desktop:preferences-ready', event => {
      if ((trusted(event, panelWindow) || trusted(event, orbWindow)) && preferences) event.sender.send('desktop:preferences', preferences)
    })
    ipcMain.on('desktop:command', (event, command) => {
      if (trusted(event, panelWindow) && command && ['add', 'copy', 'category', 'import'].includes(command.type)) mainWindow.webContents.send('desktop:command', command)
    })
    ipcMain.on('desktop:result', (event, result) => { if (trusted(event, mainWindow)) panelWindow.webContents.send('desktop:result', result) })
    ipcMain.handle('desktop:copy', (event, text) => {
      if (!trusted(event, mainWindow) || typeof text !== 'string') return false
      clipboard.writeText(text)
      return true
    })
    let floatingMenu
    function changeLocked(value) {
      floatingOrb.setLocked(value)
      for (const menu of [floatingMenu, Menu.getApplicationMenu()]) {
        const item = menu?.getMenuItemById('orb-locked')
        if (item) item.checked = floatingOrb.getState().locked
      }
    }
    const floatingItems = () => [
      { label: '打开提示词库', click: () => showMain() },
      { label: '打开 / 收起快速面板', click: togglePanel },
      { id: 'orb-locked', label: '固定位置', type: 'checkbox', checked: floatingOrb.getState().locked, click: item => changeLocked(item.checked) },
      { label: '显示悬浮球', click: () => { floatingOrb.restore(); closePanel() } },
      { label: '隐藏悬浮球', click: () => { orbWindow.hide(); panelWindow.hide() } },
      { type: 'separator' },
      { label: '退出 Prompt Vault Pro', click: () => app.quit() },
    ]
    floatingMenu = Menu.buildFromTemplate(floatingItems())
    ipcMain.on('desktop:menu', event => {
      if (trusted(event, orbWindow)) {
        floatingOrb.cancelDrag()
        floatingMenu.popup({ window: orbWindow })
      }
    })
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      ...(process.platform === 'darwin' ? [{ label: app.name, submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'quit' }] }] : []),
      { label: '悬浮球', submenu: floatingItems() },
      { label: '编辑', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    ]))
    if (!globalShortcut.register('CommandOrControl+Shift+K', togglePanel)) console.warn('全局快捷键被占用，可通过悬浮球打开面板')
    load(mainWindow)
    load(orbWindow, 'desktop-orb')
    load(panelWindow, 'desktop-panel')
    app.on('activate', () => showMain())
  })
}
app.on('before-quit', () => { quitting = true; floatingOrb?.cancelDrag(); directInsert?.stop() })
app.on('will-quit', () => globalShortcut.unregisterAll())
