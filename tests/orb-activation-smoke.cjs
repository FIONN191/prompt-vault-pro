// Native clicks must focus the utility panel without activating all application windows.
const { _electron } = require('playwright')
const { execFileSync, spawn } = require('node:child_process')
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), assert = require('node:assert/strict')
const root = path.resolve(__dirname, '..'), profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pvp-activation-'))
const delay = ms => new Promise(r => setTimeout(r, ms))
const driver = path.join(profile, 'mouse'), targetBinary = path.join(profile, 'target'), stateFile = path.join(profile, 'target.json')
execFileSync('swiftc', [path.join(__dirname, 'native-orb-drag.swift'), '-o', driver])
execFileSync('swiftc', [path.join(__dirname, 'insert-target.swift'), '-o', targetBinary])
;(async () => {
 let app, target, cursor
 try {
 const executable = process.env.PROMPT_VAULT_TEST_EXECUTABLE
 app = await _electron.launch({ executablePath: executable || require(path.join(root, 'node_modules/electron')), args: [...(executable ? [] : [root]), '--user-data-dir=' + profile], env: {...process.env, VITE_DEV_SERVER_URL: ''} })
 await app.firstWindow()
 for (let i=0;i<100 && (app.windows().length!==3 || app.windows().some(p=>!p.url().startsWith('file:')));i++) await delay(100)
 const main = app.windows().find(p=>!p.url().includes('desktop-'))
 const panel = app.windows().find(p=>p.url().includes('desktop-panel'))
 await main.getByLabel('界面主题').waitFor()
 await app.evaluate(({app,BrowserWindow})=>{global.windowEvents=[];app.on('activate',()=>global.windowEvents.push('activate'));app.on('did-become-active',()=>global.windowEvents.push('did-become-active'));for(const w of BrowserWindow.getAllWindows())for(const e of ['focus','show','blur'])w.on(e,()=>global.windowEvents.push(w.webContents.getURL().split('#')[1]+':'+e))})
 await app.evaluate(({BrowserWindow})=>{const orb=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('desktop-orb'));orb.setPosition(850,80);orb.showInactive()})
 cursor = await app.evaluate(({screen})=>screen.getCursorScreenPoint())
 for (const mode of ['background', 'hidden', 'minimized']) {
 await app.evaluate(({BrowserWindow}, mode)=>{
   const main=BrowserWindow.getAllWindows().find(w=>!w.webContents.getURL().includes('desktop-'))
   if(mode==='hidden') main.hide()
   if(mode==='minimized') main.minimize()
 },mode)
 target=spawn(targetBinary,[stateFile],{stdio:'ignore'})
 for(let i=0;i<100;i++){if(fs.existsSync(stateFile)&&JSON.parse(fs.readFileSync(stateFile)).frontmostPID===target.pid)break;await delay(100)}
 assert.equal(JSON.parse(fs.readFileSync(stateFile)).frontmostPID,target.pid)
 await app.windows().find(p=>p.url().includes('desktop-orb')).getByLabel('打开快速提示词').waitFor()
 await delay(1500)
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('desktop-orb')).setPosition(850,80))
 await delay(300)
 const b=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('desktop-orb')).getBounds())

 execFileSync(driver,['drag',b.x+36,b.y+36,b.x+36,b.y+36].map(String))
 await delay(1000)
 const order=JSON.parse(fs.readFileSync(stateFile)).windowOrder
 if(mode==='background') assert(order.indexOf(target.pid)<order.indexOf(app.process().pid), 'main window must remain behind external app')
 assert(!(await app.evaluate(()=>global.windowEvents)).includes('did-become-active'), 'orb must not activate all application windows')
 await app.evaluate(()=>{global.windowEvents=[]})
 if(mode==='hidden') assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>!w.webContents.getURL().includes('desktop-')).isVisible()),false)
 if(mode==='minimized') assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>!w.webContents.getURL().includes('desktop-')).isMinimized()),true)
 assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>!w.webContents.getURL().includes('desktop-')).isFocused()),false)
 const search=panel.getByLabel('搜索提示词或标签')
 await search.waitFor();await search.fill('keyboard check');assert.equal(await search.inputValue(),'keyboard check');await search.fill('')
 await panel.evaluate(()=>window.desktopPrompt.close())
 target.kill();target=null;await delay(200)
 }
 // Explicit navigation must still show the full library.
 await main.evaluate(()=>window.desktopPrompt.toggle())
 await panel.evaluate(()=>window.desktopPrompt.openMain())
 await delay(300)
 assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>!w.webContents.getURL().includes('desktop-')).isFocused()),true)
 console.log(JSON.stringify({passed:true,profile,checks:['background main stays behind','hidden main stays hidden','minimized main stays minimized','panel input works','explicit library navigation']}))
 } finally {target?.kill();if(cursor)execFileSync(driver,['move',cursor.x,cursor.y].map(String));await app?.close()}
})().catch(e=>{console.error(e);process.exitCode=1})
