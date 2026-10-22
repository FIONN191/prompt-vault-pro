const fs = require('fs')

const DEFAULT_SIZE = 56, MIN_SIZE = 40, MAX_SIZE = 120, PADDING = 16
const DRAG_THRESHOLD = 5
const SNAP_DISTANCE = 24
const EDGES = ['left', 'right', 'top', 'bottom']
const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max))
const validPoint = point => point && [point.x, point.y].every(value => Number.isFinite(value) && Math.abs(value) < 1_000_000)

// Coordinates are Electron screen DIPs, including on mixed-scale displays.
function createFloatingOrb({ orbWindow, panelWindow, screen, settingsPath, onClick, onStateChange = () => {} }) {
  let size = DEFAULT_SIZE
  let resizeCenter = null
  let snapToEdge = false, dockedEdge = null
  const windowSize = () => size + PADDING
  let locked = false, position = null, drag = null, persistenceError = false, panelSize = { width: 420, height: 720 }
  try {
    const saved = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
    locked = saved.locked === true
    snapToEdge = saved.snapToEdge === true
    if (snapToEdge && EDGES.includes(saved.dockedEdge)) dockedEdge = saved.dockedEdge
    if (Number.isFinite(saved.size)) size = Math.round(clamp(saved.size, MIN_SIZE, MAX_SIZE))
    if (Number.isFinite(saved.panelSize?.width) && Number.isFinite(saved.panelSize?.height)) panelSize = { width: Math.max(360, saved.panelSize.width), height: Math.max(480, saved.panelSize.height) }
    if (validPoint(saved.position)) position = saved.position
  } catch (error) {
    if (error.code !== 'ENOENT') console.warn('无法读取悬浮球设置，将使用默认位置', error.message)
  }

  const getState = () => ({ locked, persistenceError, size, snapToEdge, minSize: MIN_SIZE, maxSize: MAX_SIZE, defaultSize: DEFAULT_SIZE })
  const publish = () => { orbWindow.webContents.send('desktop:orb-state', getState()); onStateChange(getState()) }
  function persist() {
    try {
      fs.writeFileSync(settingsPath + '.tmp', JSON.stringify({ version: 3, locked, position, panelSize, size, snapToEdge, dockedEdge }), 'utf8')
      fs.renameSync(settingsPath + '.tmp', settingsPath)
      persistenceError = false
    } catch (error) {
      persistenceError = true
      console.warn('无法保存悬浮球位置', error.message)
    }
    publish()
  }
  function bounded(point) {
    const SIZE = windowSize()
    const area = screen.getDisplayNearestPoint({ x: Math.round(point.x + SIZE / 2), y: Math.round(point.y + SIZE / 2) }).workArea
    return {
      x: Math.round(clamp(point.x, area.x, area.x + area.width - SIZE)),
      y: Math.round(clamp(point.y, area.y, area.y + area.height - SIZE)),
    }
  }
  function place(point, resizing = false) {
    if (!resizing) resizeCenter = null
    position = bounded(point)
    orbWindow.setBounds({ ...position, width: windowSize(), height: windowSize() }, false)
  }
  function areaFor(point, span = windowSize()) {
    return screen.getDisplayNearestPoint({ x: Math.round(point.x + span / 2), y: Math.round(point.y + span / 2) }).workArea
  }
  function edgePoint(point, edge, area) {
    if (edge === 'left') return { ...point, x: area.x }
    if (edge === 'right') return { ...point, x: area.x + area.width - windowSize() }
    if (edge === 'top') return { ...point, y: area.y }
    return { ...point, y: area.y + area.height - windowSize() }
  }
  function snapAfterDrag() {
    const area = areaFor(position), span = windowSize()
    const distances = [position.x - area.x, area.x + area.width - position.x - span, position.y - area.y, area.y + area.height - position.y - span]
    const nearest = Math.min(...distances)
    if (nearest > SNAP_DISTANCE) return
    dockedEdge = EDGES[distances.indexOf(nearest)]
    place(edgePoint(position, dockedEdge, area))
  }
  function positionPanel() {
    const SIZE = windowSize()
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
      position = { x: area.x + area.width - windowSize() - 8, y: area.y + (area.height - windowSize()) / 2 }
    }
    place(position)
    if (snapToEdge && dockedEdge) place(edgePoint(position, dockedEdge, areaFor(position)))
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
    if (drag.moved && !locked) {
      dockedEdge = null
      place({ x: drag.origin.x + dx, y: drag.origin.y + dy })
    }
  }
  function endDrag(pointerId, cancelled = false) {
    if (!drag || drag.pointerId !== pointerId) return
    if (!cancelled) moveDrag(pointerId)
    const clicked = !drag.moved && !cancelled
    if (drag.moved && !locked && !cancelled && snapToEdge) snapAfterDrag()
    cancelDrag()
    if (clicked) onClick()
  }
  function setLocked(value) {
    cancelDrag()
    locked = value === true
    persist()
  }
  function setSnapToEdge(value) {
    if (typeof value !== 'boolean') throw new Error('吸附屏幕边缘设置须为开或关')
    cancelDrag()
    snapToEdge = value
    resizeCenter = null
    if (!value) dockedEdge = null
    // Toggling is a preference change, not an instruction to move the orb.
    persist()
    return getState()
  }
  function setSize(value) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < MIN_SIZE || value > MAX_SIZE) {
      throw new Error(`悬浮球大小须为 ${MIN_SIZE}–${MAX_SIZE} px`)
    }
    cancelDrag()
    const before = orbWindow.getBounds()
    const area = areaFor(before, before.width)
    if (!resizeCenter) resizeCenter = { x: before.x + before.width / 2, y: before.y + before.height / 2 }
    size = Math.round(value)
    // Preserve the center unless a screen edge requires clamping.
    let target = { x: resizeCenter.x - windowSize() / 2, y: resizeCenter.y - windowSize() / 2 }
    if (snapToEdge && dockedEdge) target = edgePoint(target, dockedEdge, area)
    place(target, true)
    if (position.x !== Math.round(target.x) || position.y !== Math.round(target.y)) {
      resizeCenter = { x: position.x + windowSize() / 2, y: position.y + windowSize() / 2 }
    }
    if (panelWindow.isVisible()) positionPanel()
    persist()
    return getState()
  }
  return { getState, restore, positionPanel, startDrag, moveDrag, endDrag, cancelDrag, setLocked, setSize, setSnapToEdge }
}

module.exports = { createFloatingOrb }
