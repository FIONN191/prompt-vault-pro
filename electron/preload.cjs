const { contextBridge, ipcRenderer } = require('electron')
const listen = (channel, callback) => {
  const handler = (_event, value) => callback(value)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}
contextBridge.exposeInMainWorld('desktopPrompt', {
  toggle: () => ipcRenderer.send('desktop:toggle'),
  close: () => ipcRenderer.send('desktop:close'),
  openMain: id => ipcRenderer.send('desktop:main', id),
  menu: () => ipcRenderer.send('desktop:menu'),
  getOrbState: () => ipcRenderer.invoke('desktop:orb-state'),
  onOrbState: cb => listen('desktop:orb-state', cb),
  startOrbDrag: id => ipcRenderer.send('desktop:orb-drag-start', id),
  moveOrbDrag: id => ipcRenderer.send('desktop:orb-drag-move', id),
  endOrbDrag: (id, cancelled = false) => ipcRenderer.send('desktop:orb-drag-end', id, cancelled),
  copyText: text => ipcRenderer.invoke('desktop:copy', text),
  ready: () => ipcRenderer.send('desktop:ready'),
  requestTheme: theme => ipcRenderer.send('desktop:theme-request', theme),
  onThemeRequest: cb => listen('desktop:theme-request', cb),
  publishPreferences: value => ipcRenderer.send('desktop:preferences', value),
  onPreferences: cb => listen('desktop:preferences', cb),
  preferencesReady: () => ipcRenderer.send('desktop:preferences-ready'),
  publish: prompts => ipcRenderer.send('desktop:snapshot', prompts),
  command: command => ipcRenderer.send('desktop:command', command),
  result: result => ipcRenderer.send('desktop:result', result),
  onSnapshot: cb => listen('desktop:snapshot', cb),
  onCommand: cb => listen('desktop:command', cb),
  onResult: cb => listen('desktop:result', cb),
  onDetail: cb => listen('desktop:detail', cb),
  onFocus: cb => listen('desktop:focus', cb),
})
