"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Skeleton } from "./skeleton"

interface StatCardProps {
  title: string
  value: string | number
  icon?: React.ReactNode
  description?: string
  trend?: { value: number; positive: boolean }
  className?: string
  loading?: boolean
}

export function StatCard({ title, value, icon, description, trend, className, loading }: StatCardProps) {
  if (loading) {
    return (
      <div className={cn("rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5", className)}>
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-8 w-16" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 transition-all hover:shadow-lg hover:shadow-zinc-900/5 dark:hover:shadow-black/20",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</p>
          <p className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{value}</p>
          {trend && (
            <p
              className={cn(
                "text-xs font-medium",
                trend.positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
              )}
            >
              {trend.positive ? "+" : ""}
              {trend.value}% from last month
            </p>
          )}
          {description && (
            <p className="text-xs text-zinc-400">{description}</p>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 text-zinc-600 dark:text-zinc-300">
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  )
}
