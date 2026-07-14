"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AtSign, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

interface Member {
  id: string
  name: string
  image?: string | null
  email?: string
}

interface MentionAutocompleteProps {
  open: boolean
  query: string
  onSelect: (userId: string) => void
  members: Member[]
}

export function MentionAutocomplete({ open, query, onSelect, members }: MentionAutocompleteProps) {
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  const filtered = members.filter((m) => {
    if (!query) return true
    const q = query.toLowerCase()
    return (
      m.name.toLowerCase().includes(q) ||
      (m.email && m.email.toLowerCase().includes(q))
    )
  })

  useEffect(() => {
    // Reset the keyboard-highlighted index whenever the query or open state changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHighlightedIndex(0)
  }, [query, open])

  const scrollToIndex = useCallback((idx: number) => {
    const el = itemRefs.current[idx]
    if (el) el.scrollIntoView({ block: "nearest" })
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setHighlightedIndex((prev) => {
          const next = Math.min(prev + 1, filtered.length - 1)
          scrollToIndex(next)
          return next
        })
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setHighlightedIndex((prev) => {
          const next = Math.max(prev - 1, 0)
          scrollToIndex(next)
          return next
        })
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault()
        if (filtered[highlightedIndex]) {
          onSelect(filtered[highlightedIndex].id)
        }
      }
    },
    [open, filtered, highlightedIndex, onSelect, scrollToIndex],
  )

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  function highlightMatch(text: string, query: string) {
    if (!query) return text
    const q = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const parts = text.split(new RegExp(`(${q})`, "gi"))
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <span key={i} className="font-semibold text-blue-600 dark:text-blue-400">
          {part}
        </span>
      ) : (
        part
      ),
    )
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl shadow-black/5"
        >
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Users className="mb-2 h-5 w-5 text-zinc-300 dark:text-zinc-600" />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">No matching members</p>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                  Try a different name
                </p>
              </div>
            ) : (
              filtered.map((member, index) => (
                <button
                  key={member.id}
                  ref={(el) => {
                    itemRefs.current[index] = el
                  }}
                  onClick={() => onSelect(member.id)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors",
                    index === highlightedIndex
                      ? "bg-blue-50 dark:bg-blue-900/20"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                  )}
                >
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={member.image ?? undefined} alt={member.name} />
                    <AvatarFallback className="text-[10px]">
                      {member.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                      {highlightMatch(member.name, query)}
                    </p>
                    {member.email && (
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate">
                        {highlightMatch(member.email, query)}
                      </p>
                    )}
                  </div>
                  <AtSign className="h-3.5 w-3.5 shrink-0 text-zinc-300 dark:text-zinc-600" />
                </button>
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
