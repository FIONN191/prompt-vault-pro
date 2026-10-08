import { useEffect, useState } from 'react'
import { usePreferences } from '../PreferencesContext.jsx'
import { THEMES } from '../utils/preferences.js'
import packageInfo from '../../package.json'

const PROVIDERS = [{ id: 'google.com', name: 'Google', icon: 'G' }, { id: 'github.com', name: 'GitHub', icon: '⌘' }, { id: 'apple.com', name: 'Apple', icon: '●' }]
const EMPTY_CONFIG = { apiKey: '', projectId: '', authDomain: '', appId: '', providers: ['google.com', 'github.com'] }
const button = 'btn-ghost rounded-xl px-4 py-2.5 text-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'
function Section({ title, description, children }) {
  return <section className="neon-panel p-5 sm:p-6"><h2 className="text-base font-bold mb-1">{title}</h2><p className="text-sm text-dim mb-5 leading-relaxed">{description}</p>{children}</section>
}
export default function SettingsPanel({ onNavigate, onManageCategories }) {
  const bridge = window.desktopPrompt
  const { preferences, savePreferences } = usePreferences()
  const [system, setSystem] = useState(null)
  const [account, setAccount] = useState(null)
  const [draft, setDraft] = useState(EMPTY_CONFIG)
  const [showConfig, setShowConfig] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => {
    if (!bridge) return
    let alive = true
    const unsubscribe = bridge.onAccount(value => { if (alive) setAccount(value) })
    Promise.all([bridge.settings('status'), bridge.account('status')]).then(([settings, auth]) => {
      if (!alive) return
      if (!settings.ok || !auth.ok) throw new Error(settings.error || auth.error)
      setSystem(settings.data); setAccount(auth.data); setDraft(auth.data.config || EMPTY_CONFIG)
    }).catch(e => { if (alive) setError(e.message) })
    return () => { alive = false; unsubscribe() }
  }, [bridge])
  async function run(fn, message = '') {
    if (busy) return
    setBusy(true); setError(''); setNotice('')
    try { await fn(); setNotice(message) } catch (e) { setError(e.message || '操作未完成，请重试') }
    finally { setBusy(false) }
  }
  async function authAction(action, value) {
    const result = await bridge.account(action, value)
    if (!result.ok) throw new Error(result.error)
    setAccount(result.data)
  }
  const status = !account?.user ? '本地访客' : account.verification === 'verified' ? '已登录' : account.verification === 'offline' ? '离线 · 已保存账号' : '正在验证账号'
  return <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-5">
    <div className="flex items-start justify-between gap-4 mb-7"><div><p className="text-xs tracking-[.2em] text-faint mb-2">PERSONAL WORKSPACE</p><h1 className="text-2xl font-bold">账号与设置</h1><p className="text-sm text-dim mt-2">按照你的习惯，让工作台随时就绪。</p></div><span className="text-xs font-mono text-dim border border-line rounded-full px-3 py-1.5">v{system?.version || packageInfo.version}</span></div>
    {error && <p className="border border-magenta/30 rounded-xl p-3 text-sm text-magenta" role="alert">{error}</p>}
    {notice && <p className="border border-line rounded-xl p-3 text-sm" role="status">{notice}</p>}
    <Section title="我的账号" description="使用已有账号登录，或继续作为访客使用全部本地功能。">
      <div className="flex gap-4 items-center mb-5"><div className="w-12 h-12 shrink-0 rounded-2xl bg-ink/10 grid place-items-center text-xl font-bold">{(account?.user?.displayName || account?.user?.email || 'P').slice(0, 1).toUpperCase()}</div><div className="min-w-0"><div className="font-semibold truncate">{account?.user?.displayName || account?.user?.email || '你的个人提示词空间'}</div><div className="text-xs text-dim mt-1 break-all">{status}{account?.user?.email && ` · ${account.user.email}`}</div></div></div>
      {!bridge ? <p className="text-sm text-dim">请在 Mac 或 Windows 桌面应用中登录账号。网页预览仍可编辑和管理本地提示词。</p> : <>
        {!account ? <p className="text-sm text-dim">正在读取账号状态…</p> : account.user ? <div className="flex flex-wrap gap-2"><button className={button} disabled={busy || account.pending} onClick={() => run(() => authAction('refresh'))}>刷新账号状态</button><button className={button} disabled={busy} onClick={() => run(() => authAction('logout'), '已退出账号，本地提示词已保留')}>退出登录</button></div> : <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{PROVIDERS.map(provider => <button key={provider.id} className={`${button} flex items-center justify-center gap-3`} disabled={busy || !account.configured || account.pending || !account.config?.providers?.includes(provider.id)} onClick={() => run(() => authAction('login', provider.id))}><span className="font-black text-lg" aria-hidden="true">{provider.icon}</span>{provider.name} 登录{account.configured && !account.config?.providers?.includes(provider.id) && <span className="text-xs">· 未启用</span>}</button>)}</div>}
        {account?.pending && <div className="mt-4 flex flex-wrap items-center gap-3 text-sm"><span role="status">等待系统浏览器完成登录…</span><button className={button} onClick={() => run(() => authAction('cancel'))} disabled={busy}>取消登录</button></div>}
        {account?.message && <p role="status" className="text-sm text-dim mt-3">{account.message}</p>}
        {account && !account.configured && <p className="text-sm text-dim mt-4">尚未连接 Firebase。配置项目后可使用已启用的登录方式。</p>}
      </>}
      <div className="mt-5 pt-4 border-t border-line text-xs text-dim leading-relaxed">提示词保存在这台设备上。登录与退出不会清空或自动上传素材库；跨设备备份仍通过 JSON 或 GitHub Secret Gist 完成。</div>
      {bridge && <button className="text-xs text-dim underline underline-offset-4 mt-4 cursor-pointer" aria-expanded={showConfig} onClick={() => { if (!showConfig) setDraft(account?.config || EMPTY_CONFIG); setShowConfig(!showConfig) }}>Firebase 项目配置</button>}
      {showConfig && <form className="mt-4 border border-line rounded-xl p-4 space-y-3" onSubmit={e => { e.preventDefault(); run(async () => { await authAction('configure', draft); setShowConfig(false) }, '项目配置已保存，请选择账号登录') }}>
        <p className="text-xs text-dim">填写 Firebase Web 应用的公开配置。此处不需要服务账号私钥或 OAuth Secret。保存配置会退出当前账号。</p>
        {['apiKey', 'projectId', 'authDomain', 'appId'].map(key => <label key={key} className="block text-xs text-dim">{key}<input className="input-cyber w-full px-3 py-2 mt-1 text-sm" autoComplete="off" spellCheck={false} required={key !== 'authDomain'} value={draft[key]} placeholder={key === 'authDomain' ? '项目ID.firebaseapp.com（留空自动填写）' : ''} onChange={e => setDraft({ ...draft, [key]: e.target.value.trim() })} /></label>)}
        <p className="text-xs text-dim leading-relaxed">在 Authentication 中启用 Google、GitHub、Apple，并添加授权域 <code>127.0.0.1</code>。GitHub 和 Apple 的回调地址为 https://项目ID.firebaseapp.com/__/auth/handler。</p>
        <div className="flex flex-wrap gap-4 text-xs text-dim">{PROVIDERS.map(p => <label key={p.id} className="flex gap-2 items-center"><input type="checkbox" checked={draft.providers?.includes(p.id) || false} onChange={e => setDraft({ ...draft, providers: e.target.checked ? [...(draft.providers || []), p.id] : (draft.providers || []).filter(id => id !== p.id) })} />{p.name} 已在控制台启用</label>)}</div>
        <button className={button} disabled={busy}>保存项目配置</button>
      </form>}
    </Section>
    <Section title="启动与桌面" description="登录电脑后自动准备好快速提示词面板。">
      <label className="flex items-center justify-between gap-4 cursor-pointer"><span><span className="block text-sm font-medium">开机自启</span><span className="block text-xs text-dim mt-1">安装版首次启动时默认开启；自启时只显示悬浮球。</span></span><input type="checkbox" className="w-5 h-5 accent-neutral-400" checked={!!system?.openAtLogin} disabled={busy || !system?.startupSupported} onChange={e => { const enabled = e.target.checked; run(async () => { const result = await bridge.settings('startup', enabled); if (!result.ok) throw new Error(result.error); setSystem(result.data) }, enabled ? '已开启开机自启' : '已关闭开机自启') }} /></label>
      {(!bridge || (system && !system.startupSupported)) && <p className="text-xs text-dim mt-3">网页、开发和测试环境不修改系统登录项。安装版中可设置此选项。</p>}
      {system?.startupError && <p className="text-sm text-magenta mt-3" role="alert">{system.startupError}</p>}
      <div className="border-t border-line mt-5 pt-4 flex flex-wrap gap-3 items-center justify-between"><div><p className="text-sm">快速提示词</p><p className="text-xs text-dim mt-1">⌘ / Ctrl + Shift + K · 复制与直接插入在面板内切换</p></div>{bridge && <button className={button} onClick={() => bridge.toggle()}>打开快速面板</button>}</div>
    </Section>
    <Section title="外观" description="主题会同步到主窗口、悬浮球和快速提示词面板。">
      <div className="grid sm:grid-cols-3 gap-3">{THEMES.map(theme => <button key={theme.id} aria-pressed={preferences.theme === theme.id} className={`text-left border rounded-xl p-4 cursor-pointer transition-colors ${preferences.theme === theme.id ? 'border-ink/50 bg-ink/5' : 'border-line hover:bg-ink/5'}`} onClick={() => run(() => savePreferences({ ...preferences, theme: theme.id }))}><div className="flex justify-between font-semibold text-sm">{theme.name}<span>{preferences.theme === theme.id ? '✓' : ''}</span></div><p className="text-xs text-dim mt-2">{theme.description}</p></button>)}</div>
    </Section>
    <Section title="素材库与备份" description="分类、主题和提示词均保存在本机；账号凭据不会包含在 JSON 导出中。">
      <div className="flex flex-wrap gap-3"><button className={button} onClick={onManageCategories}>管理分类与侧栏</button><button className={button} onClick={() => onNavigate('io')}>JSON 导入 / 导出</button>{bridge && <button className={button} onClick={() => bridge.toggle()}>Gist 备份 · 打开快速面板</button>}</div>
    </Section>
  </div>
}
