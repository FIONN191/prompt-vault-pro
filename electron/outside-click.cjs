const { spawn } = require('node:child_process')
const path = require('node:path')
const readline = require('node:readline')
function createOutsideClick({ nativeDir, panel, screen, enabled, suspended, close }) {
  let child, lines, shownAt = 0
  // The click that opens the panel can arrive after the renderer's IPC.
  const shown = () => { shownAt = Date.now() }
  panel.on('show', shown)
  const command = process.platform === 'darwin' ? path.join(nativeDir, 'prompt-insert-mac') : 'powershell.exe'
  const args = process.platform === 'darwin' ? ['--watch-clicks'] : ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(nativeDir, 'outside-click.ps1')]
  function stop() { panel.removeListener('show', shown); lines?.close(); child?.kill(); child = null; lines = null }
  if (!['darwin', 'win32'].includes(process.platform)) return { stop }
  child = spawn(command, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] })
  child.on('error', error => console.error('Outside-click watcher:', error.message))
  lines = readline.createInterface({ input: child.stdout })
  lines.on('line', line => {
    if (Date.now() - shownAt < 150 || !enabled() || suspended() || panel.isDestroyed() || !panel.isVisible()) return
    try {
      const event = JSON.parse(line)
      if (!Number.isFinite(event.x) || !Number.isFinite(event.y)) return
      const point = process.platform === 'win32' ? screen.screenToDipPoint(event) : event
      const b = panel.getBounds()
      // Include the native resize border. Focus changes alone must never dismiss it.
      if (point.x < b.x-5 || point.x > b.x+b.width+5 || point.y < b.y-5 || point.y > b.y+b.height+5) close()
    } catch {}
  })
  return { stop }
}
module.exports = { createOutsideClick }
