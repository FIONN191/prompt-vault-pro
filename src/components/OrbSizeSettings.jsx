import { useEffect, useState } from 'react'

export default function OrbSizeSettings() {
  const bridge = window.desktopPrompt
  const [state, setState] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    const unsubscribe = bridge.onOrbState(value => { if (alive) setState(value) })
    bridge.getOrbState().then(value => { if (alive) setState(value) })
      .catch(() => { if (alive) setError('无法读取悬浮球设置，请重新打开设置页') })
    return () => { alive = false; unsubscribe() }
  }, [bridge])
  async function change(value, action = 'size') {
    setError('')
    try {
      const result = await (action === 'snap' ? bridge.setOrbSnap(value) : bridge.setOrbSize(value))
      if (!result.ok) throw new Error(result.error)
      setState(result.data)
    } catch (e) { setError(e.message || '调整失败，请重试') }
  }
  return <div>
    <div className="flex items-center justify-between gap-3 mb-3">
      <label htmlFor="orb-size-range" className="text-sm font-medium">悬浮球直径</label>
      <output htmlFor="orb-size-range" className="text-sm tabular-nums">{state ? `${state.size} px` : '读取中…'}</output>
    </div>
    <input id="orb-size-range" type="range" className="w-full cursor-pointer" min={state?.minSize || 40} max={state?.maxSize || 120} step="1"
      value={state?.size || 56} disabled={!state} onChange={e => change(Number(e.target.value))} />
    <div className="flex justify-between mt-1 text-xs text-dim"><span>小 · 40 px</span><span>大 · 120 px</span></div>
    <div className="flex items-center justify-between gap-3 mt-4">
      <p className="text-xs text-dim">调整立即生效并自动保存。固定位置时也可调整大小。</p>
      <button className="btn-ghost rounded-lg px-3 py-2 text-xs shrink-0" disabled={!state} onClick={() => change(state.defaultSize)}>恢复默认大小</button>
    </div>
    <label className="flex items-center justify-between gap-4 border-t border-line mt-5 pt-4 cursor-pointer">
      <span><span className="block text-sm font-medium">吸附屏幕边缘</span><span className="block text-xs text-dim mt-1">开启后，拖至屏幕可用边缘 24 px 内松手自动贴边；关闭后自由放置。固定位置时不会吸附移动。</span></span>
      <input type="checkbox" aria-label="吸附屏幕边缘" className="w-5 h-5 shrink-0" checked={state?.snapToEdge === true} disabled={!state} onChange={e => change(e.target.checked, 'snap')} />
    </label>
    {(error || state?.persistenceError) && <p className="text-sm text-magenta mt-3" role="alert">{error || '设置已生效，但保存失败，重启可能恢复旧值。请检查存储空间后重试。'}</p>}
  </div>
}
