import { useEffect, useState } from 'react'

export default function QuickPanelData({ onManageData }) {
  const [status, setStatus] = useState({ configured: false, gistId: '' })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [token, setToken] = useState('')
  const [gistId, setGistId] = useState('')
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    onManageData('status').then(value => { if (active) { setStatus(value); setGistId(value.gistId) } }).catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [])
  const run = async action => {
    if (busy) return
    setBusy(action); setError(''); setMessage('')
    try {
      const result = await onManageData(action, action === 'configure' ? { token, gistId } : undefined)
      if (result?.cancelled) return
      if (action === 'configure') { setStatus(result); setToken(''); setSettingsOpen(false); setMessage('Gist 配置已保存') }
      else if (action === 'upload') { setStatus(result); setGistId(result.gistId); setMessage(`已上传合并，共 ${result.count} 条`) }
      else if (action === 'import' || action === 'pull') setMessage(`合并完成：新增 ${result.added} 条，更新 ${result.updated} 条`)
      else setMessage('JSON 已导出')
    } catch (e) { setError(e.message) }
    finally { setBusy('') }
  }
  return <section className="qv-data" aria-label="提示词数据">
    <div className="qv-section-heading"><strong>提示词数据</strong><button onClick={() => setSettingsOpen(v => !v)} disabled={!!busy} aria-expanded={settingsOpen}>Gist 设置</button></div>
    <p>支持 Prompt Vault / Gemini Voyager JSON 导入，或与 GitHub Secret Gist 合并同步。</p>
    <div className="qv-data-actions">{[['export', '↓ 导出'], ['import', '↑ 导入'], ['pull', '☁ 拉取（合并）'], ['upload', '☁ 上传（合并）']].map(([action, label]) => <button key={action} disabled={!!busy} onClick={() => { if (['pull', 'upload'].includes(action) && !status.configured) { setSettingsOpen(true); setMessage('请先填写 GitHub 令牌，再点击上传或拉取'); return } run(action) }}>{busy === action ? '处理中…' : label}</button>)}</div>
    {settingsOpen && <div className="qv-gist-settings">
      <label>GitHub 令牌<input aria-label="GitHub 令牌" type="password" autoComplete="off" value={token} onChange={e => setToken(e.target.value)} placeholder={status.configured ? '已保存，留空保留原令牌' : '需要 Gists 读写权限'} className="qv-input" /></label>
      <label>Gist ID<input aria-label="Gist ID" value={gistId} onChange={e => setGistId(e.target.value)} placeholder="首次上传留空，自动创建 Secret Gist" className="qv-input" /></label>
      <p>令牌使用系统加密存储。Secret Gist 不公开列出，但持有链接即可访问。上传内容包含提示词和分类，不包含应用 API 配置。</p>
      <button className="qv-primary" disabled={!!busy || (!status.configured && !token.trim())} onClick={() => run('configure')}>保存 Gist 配置</button>
    </div>}
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
  </section>
}
