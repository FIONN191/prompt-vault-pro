const fs = require('node:fs')
const path = require('node:path')
const { spawn } = require('node:child_process')
const { createInterface } = require('node:readline')
function createDirectInsert({ settingsPath, nativeDir, clipboard, hide, restore, platform = process.platform }) {
 let enabled = false, child = null, busy = false, sequence = 0, stopped = false
 const pending = new Map()
 try { enabled = JSON.parse(fs.readFileSync(settingsPath, 'utf8')).enabled === true } catch {}
 function start() {
  if (child || stopped || !['darwin','win32'].includes(platform)) return
  child = platform === 'darwin' ? spawn(path.join(nativeDir, 'prompt-insert-mac'), [String(process.pid)], { stdio: ['pipe','pipe','pipe'] }) : spawn('powershell.exe', ['-NoProfile','-NonInteractive','-STA','-ExecutionPolicy','Bypass','-File',path.join(nativeDir,'prompt-insert-win.ps1'),'-OwnerPid',String(process.pid)], { windowsHide: true, stdio: ['pipe','pipe','pipe'] })
  const processChild = child
  const lines = createInterface({ input: child.stdout })
  lines.on('line', line => {
   try { const result=JSON.parse(line); const task=pending.get(result.id); if(task){clearTimeout(task.timer);pending.delete(result.id);task.resolve(result)} } catch {}
  })
  // Do not forward stdout/stderr from native automation to the renderer.
  child.stderr.on('data', () => {})
  let disconnectedOnce = false
  const disconnected = () => {
   if(disconnectedOnce)return
   disconnectedOnce=true
   if(child===processChild)child=null
   lines.close()
   for(const task of pending.values()){clearTimeout(task.timer);task.resolve({ok:false,error:'插入助手不可用；提示词已复制，请手动粘贴'})}pending.clear()
  }
  child.on('error',disconnected);child.on('exit',disconnected)
  child.stdin.on('error',()=>{})
  child.stdin.write(JSON.stringify({ id: 'initial', action:'enable', enabled })+'\n')
 }
 async function request(action, extra={}) {
  start()
  if(!child)return {ok:false,error:'当前系统不支持直接插入'}
  return new Promise(resolve=>{
   const id=String(++sequence)
   const timer=setTimeout(()=>{pending.delete(id);resolve({ok:false,error:'插入助手响应超时；提示词已复制，请手动粘贴'});child?.kill()},8000)
   pending.set(id,{resolve,timer})
   child.stdin.write(JSON.stringify({id,action,...extra})+'\n')
  })
 }
 async function status() { return {enabled,...await request('status')} }
 async function configure(value) {
  if(busy)throw new Error('正在插入，请稍候')
  fs.writeFileSync(settingsPath+'.tmp',JSON.stringify({enabled:value===true}));fs.renameSync(settingsPath+'.tmp',settingsPath)
  enabled=value===true
  await request('enable',{enabled})
  const result=enabled?await request('permission'):await request('status')
  return {...result,enabled}
 }
 async function insert(text) {
  if(!enabled)return {ok:false,error:'直接插入未开启'}
  if(busy)return {ok:false,error:'正在插入，请勿重复点击'}
  busy=true
  try {
   const state=await request('status')
   if(!state.ok || !state.permitted || !state.target) return {ok:false,error:!state.permitted?'请开启系统辅助功能权限；提示词已复制':'请先点击目标输入框，再打开快速面板；提示词已复制'}
   clipboard.writeText(text)
   hide()
   const result=await request('insert')
   if(!result.ok)restore()
   return result
  } finally { busy=false }
 }
 function stop(){stopped=true;child?.kill()}
 start()
 return {status,configure,insert,stop}
}
module.exports={createDirectInsert}
