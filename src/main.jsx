import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import DesktopQuickPrompt from './components/DesktopQuickPrompt.jsx'
import './index.css'
import { PreferencesProvider } from './PreferencesContext.jsx'
import { applyTheme, loadPreferences } from './utils/preferences.js'

const desktopMode = window.desktopPrompt && location.hash.startsWith('#desktop-')
applyTheme(loadPreferences().theme)
if (desktopMode) document.documentElement.classList.add(location.hash === '#desktop-orb' ? 'desktop-orb-page' : 'desktop-panel-page')
if (desktopMode) document.title = location.hash === '#desktop-orb' ? 'Prompt Vault 悬浮球' : '快速提示词'
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PreferencesProvider secondary={!!desktopMode}>
      {desktopMode ? <DesktopQuickPrompt orb={location.hash === '#desktop-orb'} /> : <App />}
    </PreferencesProvider>
  </React.StrictMode>,
)
