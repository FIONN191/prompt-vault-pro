import { useEffect, useMemo, useRef, useState } from 'react'
import { TAG_ORDER_KEY, normalizeTagOrder, rankTags, moveTag } from '../utils/tagOrder.js'

export default function QuickTagFilter({ prompts, activeTag, onSelect }) {
  const [settings, setSettings] = useState(() => {
    try { return normalizeTagOrder(JSON.parse(localStorage.getItem(TAG_ORDER_KEY))) } catch { return normalizeTagOrder(null) }
  })
  const [error, setError] = useState('')
  const [over, setOver] = useState(null)
  const dragged = useRef(null)
  const tags = useMemo(() => rankTags(prompts, settings), [prompts, settings])
  useEffect(() => {
    const sync = e => { if (e.key === TAG_ORDER_KEY) { try { setSettings(normalizeTagOrder(JSON.parse(e.newValue))) } catch {} } }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])
  const save = next => {
    try { localStorage.setItem(TAG_ORDER_KEY, JSON.stringify(next)); setSettings(next); setError('') }
    catch { setError('排序保存失败，请重试') }
  }
  const reorder = (source, target) => save({ mode: 'custom', order: moveTag(tags, source, target) })
  return <>
    <div className="qv-tag-sort">
      <label>标签排序 <select aria-label="标签排序" value={settings.mode} onChange={e => save({ ...settings, mode: e.target.value })}>
        <option value="frequency">使用频率</option><option value="custom">自定义</option>
      </select></label>
      <small>{settings.mode === 'custom' ? '拖拽调整 · Alt + ← / →' : '按提示词调用次数'}</small>
    </div>
    {error && <small role="alert">{error}</small>}
    <div className="qv-tags" aria-label="标签筛选">
      <button className={`qv-tag ${!activeTag ? 'is-active' : ''}`} onClick={() => onSelect(null)} aria-pressed={!activeTag}>全部</button>
      {tags.map(tag => <button key={tag} data-tag={tag}
        className={`qv-tag ${activeTag === tag ? 'is-active' : ''} ${over === tag ? 'is-drop-target' : ''}`}
        draggable={settings.mode === 'custom'} aria-pressed={activeTag === tag}
        title={settings.mode === 'custom' ? '拖拽排序，或按 Alt + 左右方向键移动' : tag}
        onClick={() => { if (!dragged.current) onSelect(activeTag === tag ? null : tag) }}
        onDragStart={e => { dragged.current = tag; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', tag) }}
        onDragOver={e => { if (dragged.current && settings.mode === 'custom') { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOver(tag) } }}
        onDrop={e => { e.preventDefault(); if (dragged.current) reorder(dragged.current, tag); dragged.current = null; setOver(null) }}
        onDragEnd={() => { dragged.current = null; setOver(null) }}
        onKeyDown={e => {
          if (settings.mode !== 'custom' || !e.altKey || !['ArrowLeft','ArrowRight'].includes(e.key)) return
          e.preventDefault()
          const target = tags[tags.indexOf(tag) + (e.key === 'ArrowLeft' ? -1 : 1)]
          if (target) reorder(tag, target)
        }}>{tag}</button>)}
    </div>
  </>
}
