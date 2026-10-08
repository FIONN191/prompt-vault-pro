import { initializeApp } from 'firebase/app'
import { getAuth, setPersistence, inMemoryPersistence, GoogleAuthProvider, GithubAuthProvider, OAuthProvider, signInWithPopup, signOut } from 'firebase/auth'
import './style.css'
const secret = location.hash.slice(1)
history.replaceState(null, '', location.pathname)
const button = document.querySelector('#continue'), message = document.querySelector('#message')
const errors = {
  'auth/popup-closed-by-user': '登录窗口已关闭。可以重新点击继续。',
  'auth/popup-blocked': '浏览器拦截了弹窗，请允许此页面打开登录窗口。',
  'auth/unauthorized-domain': '请在 Firebase Authentication 的授权域中添加 127.0.0.1。',
  'auth/operation-not-allowed': '该登录方式尚未在 Firebase 控制台启用。',
  'auth/account-exists-with-different-credential': '这个邮箱已绑定其他登录方式，请使用原来的方式登录。',
  'auth/network-request-failed': '网络连接失败，请检查网络后重试。',
}
async function call(route, data) {
  const result = await fetch(route, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` }, body: JSON.stringify(data || {}) })
  const value = await result.json()
  if (!result.ok) throw new Error(value.error || '本次登录已过期，请回到应用重新开始')
  return value
}
async function initialize() {
try {
  const { config, provider } = await call('/config')
  const labels = { 'google.com': 'Google', 'github.com': 'GitHub', 'apple.com': 'Apple' }
  const auth = getAuth(initializeApp(config))
  auth.languageCode = 'zh-CN'
  await setPersistence(auth, inMemoryPersistence)
  document.querySelector('#title').textContent = `使用 ${labels[provider]} 登录`
  button.textContent = `继续使用 ${labels[provider]}`
  message.textContent = '点击继续，在官方账号窗口完成授权。'
  button.disabled = false
  button.onclick = async () => {
    button.disabled = true
    try {
      const oauth = provider === 'google.com' ? new GoogleAuthProvider() : provider === 'github.com' ? new GithubAuthProvider() : new OAuthProvider('apple.com')
      if (provider === 'apple.com') { oauth.addScope('email'); oauth.addScope('name') }
      const { user } = await signInWithPopup(auth, oauth)
      await call('/complete', { idToken: await user.getIdToken(), refreshToken: user.refreshToken })
      await signOut(auth)
      document.querySelector('#title').textContent = '登录成功'
      message.textContent = '账号已连接到 Prompt Vault Pro。你可以关闭此页，回到应用继续使用。'
      button.hidden = true
    } catch (e) {
      message.textContent = errors[e.code] || e.message || '登录未完成，请回到应用重试'
      button.disabled = false
    }
  }
} catch (e) { message.textContent = e.message; document.querySelector('#title').textContent = '暂时无法登录' }

}
initialize()
