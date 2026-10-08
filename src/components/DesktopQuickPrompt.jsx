import { useEffect, useRef, useState } from 'react'
import QuickPromptFab from './QuickPromptFab.jsx'
import Toast from './Toast.jsx'
import DesktopOrb from './DesktopOrb.jsx'

export default function DesktopQuickPrompt({ orb }) {
  const [prompts, setPrompts] = useState(null)
  const [toasts, setToasts] = useState([])
  const pending = useRef(new Map())
  const [insertion, setInsertion] = useState({ enabled: false, permitted: true })
  const [insertionPending, setInsertionPending] = useState(false)
  const [insertionMessage, setInsertionMessage] = useState('')
  const delivering = useRef(false)
  const bridge = window.desktopPrompt
  useEffect(() => {
    if (orb) return
    bridge.insertion('status').then(setInsertion).catch(() => setInsertionMessage('直接插入助手不可用'))
    let active = true
    const refresh = () => bridge.insertion('status').then(result => {
      if (!active) return
      setInsertion(result)
      if (result.enabled && result.permitted) setInsertionMessage('权限已生效。请点击目标输入框，再选提示词。')
    }).catch(() => {})
    window.addEventListener('focus', refresh)
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
      active = false
      window.removeEventListener('focus', refresh)
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
  const changeInsertion = async enabled => {
    if (insertionPending) return
    setInsertionPending(true)
    try {
      const result = await bridge.insertion('configure', enabled)
      if (typeof result.enabled === 'boolean') setInsertion(result)
      setInsertionMessage(!result.ok ? result.error : enabled ? result.permitted ? '先点击目标输入框，再选提示词；仅粘贴，不自动发送。' : '系统尚未认可当前应用的辅助功能权限。若已开启，请关闭再开启 PromptVaultPro 权限，然后重新检查。' : '已切换为仅复制')
    } catch { setInsertionMessage('设置保存失败，请重试') }
    finally { setInsertionPending(false) }
  }
  const deliver = async prompt => {
    if (delivering.current) return
    delivering.current = true
    try {
      const result = await send({ type: 'copy', id: prompt.id })
      if (!result.ok) { setInsertionMessage(result.error || '复制失败，未执行插入'); return }
      if (insertion.enabled) {
        const pasted = await bridge.insertion('insert', prompt.id)
        setInsertionMessage(pasted.ok ? '已执行粘贴，未发送' : pasted.error)
      } else {
        const id = crypto.randomUUID()
        setToasts([{ id, type: 'success', message: '已复制，切回目标应用粘贴即可' }])
        setTimeout(() => setToasts(items => items.filter(item => item.id !== id)), 3500)
      }
    } catch { setInsertionMessage('直接插入未完成，可手动粘贴') }
    finally { delivering.current = false }
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
      onCopy={deliver}
      insertion={insertion}
      insertionPending={insertionPending}
      insertionMessage={insertionMessage}
      onChangeInsertion={changeInsertion}
      onOpenInsertionSettings={() => bridge.insertion('settings')}
      onOpenPrompt={prompt => bridge.openMain(prompt.id)} />
    <Toast toasts={toasts} />
  </>
}
