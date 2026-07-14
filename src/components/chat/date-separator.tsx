"use client"

import { format, isToday, isYesterday, isSameYear } from "date-fns"

interface DateSeparatorProps {
  date: Date
}

export function DateSeparator({ date }: DateSeparatorProps) {
  const label = isToday(date)
    ? "Today"
    : isYesterday(date)
      ? "Yesterday"
      : isSameYear(date, new Date())
        ? format(date, "EEEE, MMMM d")
        : format(date, "EEEE, MMMM d, yyyy")

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
      <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 shrink-0">
        {label}
      </span>
      <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
    </div>
  )
}
