"use client"

import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface NotificationBadgeProps {
  count: number
  className?: string
}

export function NotificationBadge({ count, className }: NotificationBadgeProps) {
  const display = count > 99 ? "99+" : count > 0 ? String(count) : null

  return (
    <AnimatePresence mode="wait">
      {display !== null && (
        <motion.span
          key={display}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white",
            className
          )}
        >
          {display}
        </motion.span>
      )}
    </AnimatePresence>
  )
}
