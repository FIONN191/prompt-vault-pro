const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), os = require('node:os'), path = require('node:path')
const { createFloatingOrb } = require('../electron/floating-orb.cjs')
function setup(saved) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pvp-orb-unit-')), 'floating-orb.json')
  if (saved) fs.writeFileSync(file, JSON.stringify(saved))
  let rect = { x: 500, y: 300, width: 72, height: 72 }, panelRect, cursor = { x: 400, y: 300 }, clicks = 0
  const area = { x: -1000, y: 0, width: 2000, height: 800 }
  const orbWindow = { webContents: { send() {} }, isVisible: () => true, getBounds: () => ({ ...rect }), setBounds: value => { rect = value } }
  const panelWindow = { on() {}, isVisible: () => true, getBounds: () => panelRect, setBounds: value => { panelRect = value } }
  const create = () => createFloatingOrb({ orbWindow, panelWindow, settingsPath: file, screen: { getDisplayNearestPoint: () => ({ workArea: area }), getCursorScreenPoint: () => cursor }, onClick: () => clicks++ })
  const orb = create(); orb.restore()
  return { orb, create, file, rect: () => rect, panel: () => panelRect, cursor: value => { cursor = value }, clicks: () => clicks }
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
