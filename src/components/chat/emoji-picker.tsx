"use client"

import { useState, useRef, useEffect } from "react"

const EMOJI_LIST = ["👍", "👎", "😄", "🎉", "❤️", "🚀", "👀", "🙏", "🔥", "✅", "💯", "⭐", "💡", "📌", "🎯", "😂", "😢", "😮", "🙌", "👏"]

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  open: boolean
  onClose: () => void
}

export function EmojiPicker({ onSelect, open, onClose }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 mb-1 z-50 p-2 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 grid grid-cols-5 gap-1"
    >
      {EMOJI_LIST.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => { onSelect(emoji); onClose() }}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 text-base transition-colors"
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}
