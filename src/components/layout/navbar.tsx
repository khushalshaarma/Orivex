"use client"

import { useTheme } from "@/providers/theme-provider"
import { Moon, Sun, Monitor, Search, Menu } from "lucide-react"
import { NotificationBell } from "@/components/ui/notification-bell"

const themeIcons = { dark: Moon, light: Sun, system: Monitor } as const

export function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { theme, setTheme } = useTheme()

  function toggleTheme() {
    if (theme === "dark") setTheme("light")
    else if (theme === "light") setTheme("system")
    else setTheme("dark")
  }

  const ThemeIcon = themeIcons[theme] ?? Moon

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl px-4 md:px-6">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors lg:hidden"
          title="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-400 w-48 md:w-64">
          <Search className="h-4 w-4 shrink-0" />
          <span className="truncate">Search anything...</span>
          <kbd className="ml-auto hidden sm:inline-flex items-center gap-0.5 rounded-md border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 shrink-0">
            <span>⌘</span>K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <NotificationBell />
        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
          title={`Theme: ${theme}`}
        >
          <ThemeIcon className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
