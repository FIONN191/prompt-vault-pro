import { useEffect, useRef, useState } from 'react'

export default function DesktopOrb() {
  const bridge = window.desktopPrompt
  const [settings, setSettings] = useState({ locked: false, persistenceError: false })
  const [dragging, setDragging] = useState(false)
  const pointer = useRef(null)
  const finish = (cancelled = false) => {
    const active = pointer.current
    if (!active) return
    pointer.current = null
    setDragging(false)
    bridge.endOrbDrag(active.id, cancelled)
    if (active.element.hasPointerCapture(active.id)) active.element.releasePointerCapture(active.id)
  }
  useEffect(() => {
    let mounted = true
    const unsubscribe = bridge.onOrbState(state => { if (mounted) setSettings(state) })
    bridge.getOrbState().then(state => { if (mounted && state) setSettings(state) })
    const blur = () => finish(true)
    window.addEventListener('blur', blur)
    return () => { mounted = false; unsubscribe(); window.removeEventListener('blur', blur) }
  }, [bridge])
  const hint = settings.locked ? '位置已固定 · 右键可解锁或调整大小' : '按住拖动 · 右键可固定位置或调整大小'
  return (
    <button className={`desktop-orb${settings.locked ? ' is-locked' : ''}${dragging ? ' is-dragging' : ''}`}
      data-locked={settings.locked} aria-label="打开快速提示词"
      title={`快速提示词 · ⌘/Ctrl+Shift+K\n${hint}${settings.persistenceError ? '\n悬浮球设置保存失败，下次启动可能无法恢复' : ''}`}
      onPointerDown={event => {
        if (event.button !== 0 || !event.isPrimary) return
        event.preventDefault()
        pointer.current = { id: event.pointerId, element: event.currentTarget }
        event.currentTarget.setPointerCapture(event.pointerId)
        bridge.startOrbDrag(event.pointerId)
      }}
      onPointerMove={event => {
        if (pointer.current?.id !== event.pointerId) return
        if (!settings.locked) setDragging(true)
        bridge.moveOrbDrag(event.pointerId)
      }}
      onPointerUp={event => { if (pointer.current?.id === event.pointerId) finish() }}
      onPointerCancel={() => finish(true)}
      onLostPointerCapture={() => finish(true)}
      onClick={event => { if (event.detail === 0) bridge.toggle() }}
      onContextMenu={event => { event.preventDefault(); finish(true); bridge.menu() }}>
      <svg width="50%" height="50%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-8l-6 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="M8 9h8M8 13h5"/></svg>
    </button>
  )
}
