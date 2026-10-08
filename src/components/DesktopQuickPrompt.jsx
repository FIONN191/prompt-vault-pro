import { useEffect, useRef, useState } from 'react'
import QuickPromptFab from './QuickPromptFab.jsx'
import Toast from './Toast.jsx'
import DesktopOrb from './DesktopOrb.jsx'

export default function DesktopQuickPrompt({ orb }) {
  const [prompts, setPrompts] = useState(null)
  const [toasts, setToasts] = useState([])
  const pending = useRef(new Map())
  const bridge = window.desktopPrompt
  useEffect(() => {
    if (orb) return
    const snapshot = bridge.onSnapshot(setPrompts)
    const result = bridge.onResult(({ requestId, ...outcome }) => {
      const request = pending.current.get(requestId)
      if (!request) return
      clearTimeout(request.timer)
      pending.current.delete(requestId)
      request.resolve(outcome)
    })
    bridge.ready()
    return () => {
      snapshot(); result()
      for (const request of pending.current.values()) { clearTimeout(request.timer); request.resolve({ ok: false, error: '面板已关闭' }) }
      pending.current.clear()
    }
  }, [orb, bridge])
  const send = async command => {
    const requestId = crypto.randomUUID()
    const outcome = await new Promise(resolve => {
      const timer = setTimeout(() => { pending.current.delete(requestId); resolve({ ok: false, error: '操作超时，请重试' }) }, 15000)
      pending.current.set(requestId, { resolve, timer })
      bridge.command({ ...command, requestId })
    })
    return outcome
  }
  const run = async (command, success) => {
    const { ok } = await send(command)
    const requestId = crypto.randomUUID()
    setToasts([{ id: requestId, type: ok ? 'success' : 'error', message: ok ? success : '操作未完成，请打开主窗口检查；输入已保留' }])
    setTimeout(() => setToasts(items => items.filter(item => item.id !== requestId)), 3500)
    return ok
  }
  const manage = async (action, value) => {
    const result = action === 'category' ? await send({ type: 'category', name: value }) : await bridge.manageData(action, value)
    if (!result.ok) throw new Error(result.error || '操作失败')
    if (result.cancelled) return { cancelled: true }
    if (action === 'import' || action === 'pull') {
      const merged = await send({ type: 'import', payload: result.data })
      if (!merged.ok) throw new Error(merged.error || '导入失败')
      return merged.data
    }
    return result.data
  }
  if (orb) return <DesktopOrb />
  if (!prompts) return <div className="p-5 text-dim">正在连接提示词库… <button onClick={() => bridge.openMain()}>打开主窗口</button></div>
  return <>
    <QuickPromptFab desktop prompts={prompts}
      onCreateCategory={name => manage('category', name)}
      onManageData={manage}
      onQuickAdd={form => run({ type: 'add', form }, '已存入素材库')}
      onCopy={prompt => run({ type: 'copy', id: prompt.id }, '已复制，切回目标应用粘贴即可')}
      onOpenPrompt={prompt => bridge.openMain(prompt.id)} />
    <Toast toasts={toasts} />
  </>
}
