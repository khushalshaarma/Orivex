"use client"

import { useState, useEffect, useRef } from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface NotificationSearchProps {
  onSearch: (query: string) => void
  placeholder?: string
}

export function NotificationSearch({ onSearch, placeholder = "Search notifications..." }: NotificationSearchProps) {
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(value)
    }, 300)
    return () => clearTimeout(timer)
  }, [value, onSearch])

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "h-9 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-8 text-sm outline-none",
          "placeholder:text-zinc-400",
          "focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10",
          "dark:border-zinc-800 dark:bg-zinc-950 dark:placeholder:text-zinc-500",
          "dark:focus:border-zinc-600 dark:focus:ring-zinc-300/10",
        )}
      />
      {value && (
        <button
          onClick={() => {
            setValue("")
            inputRef.current?.focus()
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
