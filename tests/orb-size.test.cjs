const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), os = require('node:os'), path = require('node:path')
const { createFloatingOrb } = require('../electron/floating-orb.cjs')
function setup(saved, displays = null) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pvp-orb-unit-')), 'floating-orb.json')
  if (saved) fs.writeFileSync(file, JSON.stringify(saved))
  let rect = { x: 500, y: 300, width: 72, height: 72 }, panelRect, cursor = { x: 400, y: 300 }, clicks = 0
  const area = { x: -1000, y: 0, width: 2000, height: 800 }
  const orbWindow = { webContents: { send() {} }, isVisible: () => true, getBounds: () => ({ ...rect }), setBounds: value => { rect = value } }
  const panelWindow = { on() {}, isVisible: () => true, getBounds: () => panelRect, setBounds: value => { panelRect = value } }
  const create = () => createFloatingOrb({ orbWindow, panelWindow, settingsPath: file, screen: { getDisplayNearestPoint: point => displays?.find(d => point.x >= d.workArea.x && point.x < d.workArea.x + d.workArea.width && point.y >= d.workArea.y && point.y < d.workArea.y + d.workArea.height) || { workArea: area }, getCursorScreenPoint: () => cursor }, onClick: () => clicks++ })
  const orb = create(); orb.restore()
  return { orb, create, file, area, rect: () => rect, panel: () => panelRect, cursor: value => { cursor = value }, clicks: () => clicks }
}
test('legacy position and lock survive; custom size persists and preserves center', () => {
  const c = setup({ locked: true, position: { x: 100, y: 200 } })
  assert.equal(c.orb.getState().size, 56)
  assert.deepEqual(c.rect(), { x: 100, y: 200, width: 72, height: 72 })
  c.orb.setSize(100)
  assert.deepEqual(c.rect(), { x: 78, y: 178, width: 116, height: 116 })
  assert.equal(c.orb.getState().locked, true)
  assert.equal(c.create().getState().size, 100)
})
test('resizing clamps screen edges and keeps quick panel visible', () => {
  const c = setup({ position: { x: 928, y: 728 } })
  c.orb.setSize(120)
  assert.deepEqual(c.rect(), { x: 864, y: 664, width: 136, height: 136 })
  assert.ok(c.panel().x + c.panel().width <= 1000)
  assert.ok(c.panel().y + c.panel().height <= 800)
  c.orb.setSize(40); assert.equal(c.rect().width, 56)
})
test('one-pixel slider changes never accumulate rounding drift', () => {
  const c = setup({ position: { x: 100, y: 200 } })
  for (let size = 57; size <= 120; size++) c.orb.setSize(size)
  for (let size = 119; size >= 40; size--) c.orb.setSize(size)
  c.orb.setSize(56)
  assert.deepEqual(c.rect(), { x: 100, y: 200, width: 72, height: 72 })
})
test('invalid sizes rejected, corrupted saved values fall back safely', () => {
  const c = setup()
  for (const value of [null, '80', NaN, Infinity, 0, 39, 121, {}]) assert.throws(() => c.orb.setSize(value))
  assert.equal(c.orb.getState().size, 56)
  assert.equal(setup({ size: -100 }).orb.getState().size, 40)
  assert.equal(setup({ size: '80' }).orb.getState().size, 56)
})
test('dragging, locking and clicking still work with custom sizes', () => {
  const c = setup({ position: { x: 100, y: 200 } })
  c.orb.setSize(80); const before = c.rect()
  c.orb.startDrag(1); c.cursor({ x: 500, y: 350 }); c.orb.endDrag(1)
  assert.equal(c.rect().x, before.x + 100); assert.equal(c.clicks(), 0)
  c.orb.setLocked(true); const locked = c.rect()
  c.orb.startDrag(2); c.cursor({ x: 600, y: 400 }); c.orb.endDrag(2)
  assert.deepEqual(c.rect(), locked)
  c.orb.startDrag(3); c.orb.setSize(56); c.orb.endDrag(3)
  assert.equal(c.clicks(), 0)
  c.orb.startDrag(4); c.orb.endDrag(4); assert.equal(c.clicks(), 1)
})
test('failed storage writes are reported and recover on retry', () => {
  const c = setup(); fs.mkdirSync(c.file + '.tmp')
  assert.equal(c.orb.setSize(90).persistenceError, true)
  fs.rmdirSync(c.file + '.tmp')
  assert.equal(c.orb.setSize(90).persistenceError, false)
  assert.equal(JSON.parse(fs.readFileSync(c.file)).size, 90)
})
function drop(c, x, y, cancelled = false) {
  const before = c.rect()
  c.cursor({ x: 0, y: 0 }); c.orb.startDrag(1)
  c.cursor({ x: x - before.x, y: y - before.y })
  c.orb.moveDrag(1); c.orb.endDrag(1, cancelled)
}
test('snap is opt-in; toggling never moves the orb and accepts only booleans', () => {
  const c = setup({ position: { x: 900, y: 200 } })
  assert.equal(c.orb.getState().snapToEdge, false)
  drop(c, 915, 210); assert.equal(c.rect().x, 915)
  c.orb.setSnapToEdge(true); assert.equal(c.rect().x, 915)
  for (const value of ['true', 1, null, {}]) assert.throws(() => c.orb.setSnapToEdge(value))
  drop(c, 916, 220); assert.equal(c.rect().x, 928)
  c.orb.setSnapToEdge(false); assert.equal(c.rect().x, 928)
  drop(c, 916, 230); assert.equal(c.rect().x, 916)
})
test('four edges, threshold boundary, corner tie, negative coordinates and far release', () => {
  for (const [x, y, edge, expectedX, expectedY] of [
    [-980, 300, 'left', -1000, 300], [910, 300, 'right', 928, 300],
    [300, 20, 'top', 300, 0], [300, 710, 'bottom', 300, 728],
    [-980, 20, 'left', -1000, 20], [904, 300, 'right', 928, 300],
    [903, 300, null, 903, 300], [100, 300, null, 100, 300],
  ]) {
    const c = setup(); c.orb.setSnapToEdge(true); drop(c, x, y)
    assert.equal(c.rect().x, expectedX); assert.equal(c.rect().y, expectedY)
    assert.equal(JSON.parse(fs.readFileSync(c.file)).dockedEdge, edge)
    assert.equal(c.clicks(), 0)
  }
})
test('locked, cancelled and click gestures never snap; drag away releases docking', () => {
  const c = setup({ position: { x: 910, y: 200 }, snapToEdge: true, locked: true })
  drop(c, 920, 300); assert.equal(c.rect().x, 910)
  c.orb.setLocked(false); drop(c, 920, 300, true); assert.equal(c.rect().x, 920)
  c.orb.startDrag(3); c.orb.endDrag(3)
  assert.equal(c.rect().x, 920); assert.equal(c.clicks(), 1)
  drop(c, 915, 310); assert.equal(c.rect().x, 928)
  drop(c, 500, 310); assert.equal(c.rect().x, 500)
  assert.equal(JSON.parse(fs.readFileSync(c.file)).dockedEdge, null)
})
test('docking survives resize, restart and changed work area; disabling frees center', () => {
  const c = setup(); c.orb.setSnapToEdge(true); drop(c, 915, 300)
  c.orb.setSize(120); assert.equal(c.rect().x + c.rect().width, 1000)
  const restored = c.create(); restored.restore()
  assert.equal(restored.getState().snapToEdge, true)
  assert.equal(c.rect().x + c.rect().width, 1000)
  c.area.width = 1600; restored.restore()
  assert.equal(c.rect().x + c.rect().width, 600)
  restored.setSnapToEdge(false)
  const oldCenter = c.rect().x + c.rect().width / 2
  restored.setSize(40)
  assert.equal(c.rect().x + c.rect().width / 2, oldCenter)
})
test('uses the destination display in DIPs; removed displays recover on-screen', () => {
  const displays = [{ scaleFactor: 2, workArea: { x: 2000, y: -200, width: 1200, height: 900 } }]
  const c = setup({ position: { x: 300, y: 300 }, snapToEdge: true }, displays)
  drop(c, 3110, 100)
  assert.equal(c.rect().x + c.rect().width, 3200)
  c.orb.setSize(100)
  assert.equal(c.rect().x + c.rect().width, 3200)
  displays.length = 0
  c.orb.restore()
  assert.equal(c.rect().x + c.rect().width, 1000)
  assert.ok(c.rect().y >= 0 && c.rect().y + c.rect().height <= 800)
})
