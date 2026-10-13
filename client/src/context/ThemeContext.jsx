import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)
const KEY = 'planet-theme'

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'planet')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem(KEY, theme) } catch { /* private mode: ignore */ }
  }, [theme])

  const toggle = useCallback(() => setTheme((t) => (t === 'planet' ? 'planet-dark' : 'planet')), [])
  return <ThemeContext.Provider value={{ theme, toggle, isDark: theme === 'planet-dark' }}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext)
