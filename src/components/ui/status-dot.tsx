import { cn } from "@/lib/utils"

const statusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-500",
  AWAY: "bg-amber-400",
  BUSY: "bg-red-500",
  OFFLINE: "bg-zinc-400 dark:bg-zinc-600",
}

export function StatusDot({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-zinc-900",
        statusColors[status] ?? statusColors.OFFLINE,
        className
      )}
    />
  )
}
