"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Users, FolderKanban, Settings, UserPlus, User, Command, ArrowRight } from "lucide-react"

const pages = [
  { id: "dashboard", label: "Go to Dashboard", icon: FolderKanban, href: "/dashboard" },
  { id: "members", label: "Go to Members", icon: Users, href: "/members" },
  { id: "teams", label: "Go to Teams", icon: Users, href: "/teams" },
  { id: "projects", label: "Go to Projects", icon: FolderKanban, href: "/projects" },
  { id: "tasks", label: "Go to Tasks", icon: FolderKanban, href: "/tasks" },
  { id: "settings", label: "Go to Settings", icon: Settings, href: "/settings" },
  { id: "profile", label: "Go to Profile", icon: User, href: "/profile" },
]

const actions = [
  { id: "invite", label: "Invite Member", icon: UserPlus, action: "invite" },
  { id: "create-team", label: "Create Team", icon: Users, action: "createTeam" },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const allItems = [...pages, ...actions]

  const filtered = allItems.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase())
  )

  const handleSelect = useCallback(
    (item: (typeof allItems)[number]) => {
      setOpen(false)
      setQuery("")
      if ("href" in item) {
        router.push(item.href)
      } else if (item.action === "invite") {
        router.push("/members?invite=true")
      } else if (item.action === "createTeam") {
        router.push("/teams?create=true")
      }
    },
    [router]
  )

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
      setQuery("")
      setSelectedIndex(0)
    }
  }, [open])

  useEffect(() => {
    setSelectedIndex(0) // eslint-disable-line react-hooks/set-state-in-effect
  }, [query])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      handleSelect(filtered[selectedIndex])
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -20 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 top-[15%] -translate-x-1/2 w-full max-w-lg z-50"
          >
            <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl shadow-black/20">
              <div className="flex items-center border-b border-zinc-200 dark:border-zinc-800 px-4">
                <Search className="h-5 w-5 text-zinc-400 flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search pages, actions..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 bg-transparent border-0 outline-none px-3 py-4 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400"
                />
                <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-400">
                  <Command className="h-3 w-3" />
                  K
                </kbd>
              </div>

              <div className="max-h-72 overflow-y-auto p-2">
                {filtered.length === 0 ? (
                  <div className="py-8 text-center text-sm text-zinc-500">
                    No results found
                  </div>
                ) : (
                  filtered.map((item, index) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                        index === selectedIndex
                          ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      }`}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <span className="flex-1 text-left">{item.label}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
