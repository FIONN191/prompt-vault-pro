import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { applyTheme, loadPreferences, normalizePreferences, persistPreferences } from './utils/preferences.js'

const PreferencesContext = createContext(null)
export function PreferencesProvider({ secondary = false, children }) {
  const [preferences, setPreferences] = useState(loadPreferences)
  const savePreferences = useCallback(next => {
    const value = normalizePreferences(next)
    persistPreferences(value)
    setPreferences(value)
  }, [])
  useLayoutEffect(() => { applyTheme(preferences.theme) }, [preferences.theme])
  useEffect(() => {
    const bridge = window.desktopPrompt
    if (!secondary || !bridge) return
    const unsubscribe = bridge.onPreferences(value => setPreferences(normalizePreferences(value)))
    bridge.preferencesReady()
    return unsubscribe
  }, [secondary])
  useEffect(() => {
    if (!secondary) window.desktopPrompt?.publishPreferences(preferences)
  }, [preferences, secondary])
  const categories = useMemo(() => preferences.categories.map(c => ({ ...c, color: preferences.theme === 'neon' ? c.color : preferences.theme === 'light' ? '#525252' : '#b5b5b5' })), [preferences])
  return <PreferencesContext.Provider value={{ preferences, categories, setPreferences, savePreferences }}>{children}</PreferencesContext.Provider>
}
export const usePreferences = () => useContext(PreferencesContext)
