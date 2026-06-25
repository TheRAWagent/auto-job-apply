import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import {
  ThemeProviderContext,
  type Theme,
  type ResolvedTheme,
} from "@/lib/theme-context"

const STORAGE_KEY = "securefill-theme"

function getInitialTheme(_defaultTheme: Theme): Theme {
  // Temporarily force dark mode for the entire app.
  // NOTE: This bypasses localStorage and system preference until
  // theming is re-enabled. Remove this override when restoring
  // full theme support (respect `system` and stored preferences).
  return "dark"
}

function getSystemTheme(): ResolvedTheme {
  // return window.matchMedia("(prefers-color-scheme: dark)").matches
  //   ? "dark"
  //   : "light"
  return "dark";
}

function subscribeToSystemTheme(callback: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)")
  media.addEventListener("change", callback)
  return () => media.removeEventListener("change", callback)
}

function applyClass(resolved: ResolvedTheme) {
  const root = window.document.documentElement
  root.classList.remove("light", "dark")
  root.classList.add(resolved)
}

interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: Theme
}

export function ThemeProvider({
  children,
  defaultTheme = "dark",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() =>
    getInitialTheme(defaultTheme)
  )
  const systemTheme = useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemTheme,
    // () => (defaultTheme === "dark" ? "dark" : "light")
    () => "dark" as ResolvedTheme
  )

  const resolvedTheme = theme === "system" ? systemTheme : theme

  useEffect(() => {
    applyClass(resolvedTheme)
  }, [resolvedTheme])

  const setTheme = useCallback((newTheme: Theme) => {
    localStorage.setItem(STORAGE_KEY, newTheme)
    setThemeState(newTheme)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }, [resolvedTheme, setTheme])

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme]
  )

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}
