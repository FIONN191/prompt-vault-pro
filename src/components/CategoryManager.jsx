import { useEffect, useRef, useState } from 'react'
import { usePreferences } from '../PreferencesContext.jsx'
import { generateId } from '../utils/storage.js'

export default function CategoryManager({ prompts, onSave, onClose }) {
  const { preferences } = usePreferences()
  const [draft, setDraft] = useState(() => structuredClone(preferences))
  const [selected, setSelected] = useState(draft.categories[0].id)
  const [removed, setRemoved] = useState({})
  const [deleting, setDeleting] = useState(false)
  const [target, setTarget] = useState('')
  const [error, setError] = useState('')
  const dialog = useRef(null)
  const item = draft.categories.find(c => c.id === selected)
  const index = draft.categories.findIndex(c => c.id === selected)
  const count = id => prompts.filter(p => (removed[p.category] || p.category) === id).length
  useEffect(() => {
    const previous = document.activeElement
    dialog.current?.focus()
    return () => previous?.focus?.()
  }, [])
  function onKeyDown(event) {
    if (event.key === 'Escape') { event.stopPropagation(); onClose() }
    if (event.key !== 'Tab') return
    const nodes = [...dialog.current.querySelectorAll('button, input, textarea, select')].filter(node => !node.disabled)
    const first = nodes[0], last = nodes[nodes.length - 1]
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  }
  const edit = (field, value) => setDraft(p => ({ ...p, categories: p.categories.map(c => c.id === selected ? { ...c, [field]: value } : c) }))
  const sidebar = (field, value) => setDraft(p => ({ ...p, sidebar: { ...p.sidebar, [field]: value } }))
  const add = () => {
    const id = `category-${generateId()}`
    setDraft(p => ({ ...p, categories: [...p.categories, { id, zh: '', color: '#a3a3a3', description: '' }] }))
    setSelected(id); setDeleting(false); setError('')
  }
  const move = offset => {
    const list = [...draft.categories]
    ;[list[index], list[index + offset]] = [list[index + offset], list[index]]
    setDraft(p => ({ ...p, categories: list }))
  }
  const remove = () => {
    if (!target) return
    setRemoved(p => ({ ...Object.fromEntries(Object.entries(p).map(([id, value]) => [id, value === selected ? target : value])), [selected]: target }))
    setDraft(p => ({ ...p, categories: p.categories.filter(c => c.id !== selected) }))
    setSelected(target); setDeleting(false); setTarget('')
  }
  const save = () => {
    const names = draft.categories.map(c => c.zh.trim().toLocaleLowerCase())
    if (names.some(name => !name)) return setError('每个分类都需要名称，请填写新增分类的名称。')
    if (new Set(names).size !== names.length) return setError('分类名称不能重复。')
    if (['title', 'allLabel', 'favoritesLabel'].some(key => !draft.sidebar[key].trim())) return setError('分类栏名称不能为空。')
    try { onSave(draft, removed); onClose() }
    catch (error) { setError(`保存失败：${error.message}。修改仍保留在此窗口。`) }
  }
  return <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6">
    <div className="absolute inset-0 bg-black/65" onClick={onClose} />
    <section ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="category-manager-title" onKeyDown={onKeyDown}
      className="modal-card relative neon-panel w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden outline-none">
      <header className="flex items-start justify-between p-5 border-b border-line">
        <div><h2 id="category-manager-title" className="text-lg font-semibold">管理分类</h2><p className="text-sm text-dim mt-1">按自己的方式组织提示词，保存后同步到所有窗口。</p></div>
        <button className="btn-ghost rounded-md px-3 py-1.5" aria-label="关闭分类管理" onClick={onClose}>✕</button>
      </header>
      <div className="overflow-y-auto min-h-0">
        <div className="grid sm:grid-cols-[240px_1fr]">
          <div className="p-4 sm:border-r border-b sm:border-b-0 border-line">
            <button className="btn-neon w-full rounded-lg p-2 text-sm mb-3" onClick={add}>+ 新增分类</button>
            <div className="space-y-1 max-h-64 sm:max-h-96 overflow-y-auto" aria-label="分类顺序">
              {draft.categories.map(c => <button key={c.id} onClick={() => { setSelected(c.id); setDeleting(false) }} aria-pressed={selected === c.id}
                className={`flex items-center gap-2 w-full p-2.5 rounded-lg text-sm text-left ${selected === c.id ? 'bg-panel-3 text-ink' : 'text-dim hover:bg-panel-2'}`}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} /><span className="truncate flex-1">{c.zh || '未命名分类'}</span><span className="text-xs text-faint">{count(c.id)}</span>
              </button>)}
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex justify-between items-center"><h3 className="font-medium">分类属性</h3><div className="flex gap-2">
              <button aria-label="上移分类" disabled={index === 0} onClick={() => move(-1)} className="btn-ghost px-3 py-1 rounded">↑</button>
              <button aria-label="下移分类" disabled={index === draft.categories.length - 1} onClick={() => move(1)} className="btn-ghost px-3 py-1 rounded">↓</button>
            </div></div>
            <label className="block text-sm text-dim">分类名称<input className="input-cyber mt-1 w-full p-2.5" maxLength={40} value={item.zh} onChange={e => edit('zh', e.target.value)} placeholder="例如：日常写作、客户项目" /></label>
            <label className="flex items-center justify-between text-sm text-dim">分类颜色<input type="color" value={item.color} onChange={e => edit('color', e.target.value)} className="h-9 w-16 cursor-pointer rounded border border-line" /></label>
            <p className="text-xs text-faint">颜色在霓虹主题中显示，简洁和浅色主题保持灰阶。</p>
            <label className="block text-sm text-dim">分类说明<textarea className="input-cyber mt-1 w-full p-2.5 resize-y" rows={2} maxLength={160} value={item.description} onChange={e => edit('description', e.target.value)} placeholder="记录此分类的用途，悬停分类时可查看" /></label>
            {!deleting ? <button onClick={() => { setDeleting(true); setTarget('') }} disabled={draft.categories.length < 2} className="btn-ghost rounded px-3 py-2 text-sm">移除这个分类…</button> :
              <div className="rounded-lg border border-line-bright p-3 space-y-3">
                <p className="text-sm">此分类有 {count(selected)} 条提示词，移除分类后迁移到：</p>
                <select aria-label="迁移到分类" value={target} onChange={e => setTarget(e.target.value)} className="input-cyber w-full p-2 text-sm"><option value="">请选择目标分类</option>{draft.categories.filter(c => c.id !== selected).map(c => <option key={c.id} value={c.id}>{c.zh || '未命名分类'}</option>)}</select>
                <div className="flex gap-2"><button disabled={!target} onClick={remove} className="btn-magenta px-3 py-2 rounded text-sm">确认移除分类</button><button onClick={() => setDeleting(false)} className="btn-ghost px-3 py-2 rounded text-sm">取消移除</button></div>
                <p className="text-xs text-faint">点击底部「保存设置」后生效，不会删除提示词。</p>
              </div>}
          </div>
        </div>
        <div className="p-5 border-t border-line space-y-3">
          <h3 className="font-medium">左侧分类栏</h3>
          <div className="grid sm:grid-cols-3 gap-3">{[['title', '分类栏标题'], ['allLabel', '全部入口名称'], ['favoritesLabel', '收藏入口名称']].map(([key, name]) => <label key={key} className="text-sm text-dim">{name}<input className="input-cyber mt-1 w-full p-2" maxLength={40} value={draft.sidebar[key]} onChange={e => sidebar(key, e.target.value)} /></label>)}</div>
          <label className="flex gap-2 items-center text-sm text-dim"><input type="checkbox" checked={draft.sidebar.showCounts} onChange={e => sidebar('showCounts', e.target.checked)} />显示分类中的提示词数量</label>
        </div>
      </div>
      <footer className="p-4 border-t border-line flex flex-wrap items-center gap-3">
        {error && <p role="alert" className="text-sm text-magenta flex-1">{error}</p>}
        <div className="ml-auto flex gap-2"><button onClick={onClose} className="btn-ghost rounded-lg px-4 py-2 text-sm">取消</button><button onClick={save} className="btn-neon rounded-lg px-4 py-2 text-sm">保存设置</button></div>
      </footer>
    </section>
  </div>
}
