import { useEffect, useState } from 'react'

// Dark mode here is a class on <html> (toggled by ThemeToggle), not a media
// query — Tailwind's `dark:` classes pick it up automatically, but raw SVG
// (e.g. Recharts) needs the actual boolean to choose inline colors.
export function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  )

  useEffect(() => {
    const root = document.documentElement
    const observer = new MutationObserver(() => setIsDark(root.classList.contains('dark')))
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return isDark
}
