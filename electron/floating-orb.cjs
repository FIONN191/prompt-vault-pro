const fs = require('fs')

const SIZE = 72
const DRAG_THRESHOLD = 5
const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max))
const validPoint = point => point && [point.x, point.y].every(value => Number.isFinite(value) && Math.abs(value) < 1_000_000)

// Coordinates are Electron screen DIPs, including on mixed-scale displays.
function createFloatingOrb({ orbWindow, panelWindow, screen, settingsPath, onClick }) {
  let locked = false, position = null, drag = null, persistenceError = false, panelSize = { width: 420, height: 720 }
  try {
    const saved = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
    locked = saved.locked === true
    if (Number.isFinite(saved.panelSize?.width) && Number.isFinite(saved.panelSize?.height)) panelSize = { width: Math.max(360, saved.panelSize.width), height: Math.max(480, saved.panelSize.height) }
    if (validPoint(saved.position)) position = saved.position
  } catch (error) {
    if (error.code !== 'ENOENT') console.warn('无法读取悬浮球设置，将使用默认位置', error.message)
  }

  const getState = () => ({ locked, persistenceError })
  const publish = () => orbWindow.webContents.send('desktop:orb-state', getState())
  function persist() {
    try {
      fs.writeFileSync(settingsPath + '.tmp', JSON.stringify({ version: 1, locked, position, panelSize }), 'utf8')
      fs.renameSync(settingsPath + '.tmp', settingsPath)
      persistenceError = false
    } catch (error) {
      persistenceError = true
      console.warn('无法保存悬浮球位置', error.message)
    }
    publish()
  }
  function bounded(point) {
    const area = screen.getDisplayNearestPoint({ x: Math.round(point.x + SIZE / 2), y: Math.round(point.y + SIZE / 2) }).workArea
    return {
      x: Math.round(clamp(point.x, area.x, area.x + area.width - SIZE)),
      y: Math.round(clamp(point.y, area.y, area.y + area.height - SIZE)),
    }
  }
  function place(point) {
    position = bounded(point)
    orbWindow.setBounds({ ...position, width: SIZE, height: SIZE }, false)
  }
  function positionPanel() {
    const orb = orbWindow.getBounds()
    const area = screen.getDisplayNearestPoint({ x: orb.x + SIZE / 2, y: orb.y + SIZE / 2 }).workArea
    const width = Math.min(panelSize.width, area.width - 24), height = Math.min(panelSize.height, area.height - 24)
    // Prefer the right side of the orb; flip left near the right screen edge.
    const right = orb.x + SIZE + 8
    const x = right + width <= area.x + area.width - 12 ? right : orb.x - width - 8
    panelWindow.setBounds({
      x: Math.round(clamp(x, area.x + 12, area.x + area.width - width - 12)),
      y: Math.round(clamp(orb.y + SIZE / 2 - height / 2, area.y + 12, area.y + area.height - height - 12)),
      width, height,
    }, false)
  }
  let resizeTimer
  panelWindow.on('resize', () => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      if (panelWindow.isDestroyed()) return
      const { width, height } = panelWindow.getBounds()
      panelSize = { width, height }
      persist()
    }, 250)
  })
  panelWindow.on('closed', () => clearTimeout(resizeTimer))
  function cancelDrag() {
    if (!drag) return
    const moved = drag.moved
    drag = null
    if (moved) persist()
  }
  function restore() {
    cancelDrag()
    if (!position) {
      const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea
      position = { x: area.x + area.width - 80, y: area.y + (area.height - SIZE) / 2 }
    }
    place(position)
    positionPanel()
    persist()
  }
  function startDrag(pointerId) {
    if (!Number.isInteger(pointerId) || !orbWindow.isVisible()) return
    drag = { pointerId, cursor: screen.getCursorScreenPoint(), origin: orbWindow.getBounds(), moved: false }
  }
  function moveDrag(pointerId) {
    if (!drag || drag.pointerId !== pointerId) return
    const cursor = screen.getCursorScreenPoint()
    const dx = cursor.x - drag.cursor.x, dy = cursor.y - drag.cursor.y
    if (Math.hypot(dx, dy) >= DRAG_THRESHOLD) drag.moved = true
    if (drag.moved && !locked) place({ x: drag.origin.x + dx, y: drag.origin.y + dy })
  }
  function endDrag(pointerId, cancelled = false) {
    if (!drag || drag.pointerId !== pointerId) return
    if (!cancelled) moveDrag(pointerId)
    const clicked = !drag.moved && !cancelled
    cancelDrag()
    if (clicked) onClick()
  }
  function setLocked(value) {
    cancelDrag()
    locked = value === true
    persist()
  }
  return { getState, restore, positionPanel, startDrag, moveDrag, endDrag, cancelDrag, setLocked }
}

module.exports = { createFloatingOrb }
