import { cn } from "@/lib/utils"
import { Badge } from "./badge"

const roleStyles: Record<string, string> = {
  OWNER: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  ADMIN: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  MANAGER: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",
  DEVELOPER: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  DESIGNER: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 border-pink-200 dark:border-pink-800",
  QA: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800",
  GUEST: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700",
}

export function RoleBadge({ role, className }: { role: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", roleStyles[role] ?? "", className)}>
      {role.charAt(0) + role.slice(1).toLowerCase()}
    </Badge>
  )
}
