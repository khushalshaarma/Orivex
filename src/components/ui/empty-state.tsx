"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex flex-col items-center justify-center py-16 px-6 text-center", className)}
    >
      {icon && (
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900">
          <div className="text-zinc-500 dark:text-zinc-400">{icon}</div>
        </div>
      )}
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  )
}
