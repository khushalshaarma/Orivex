"use client"

import { motion } from "framer-motion"
import { Star, FolderKanban, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProjectCardProps {
  project: {
    id: string
    name: string
    description: string | null
    status: string
    priority: string
    favorite: boolean
    color: string | null
    icon: string | null
    progress: number
    startDate: string | null
    dueDate: string | null
    owner: { id: string; name: string | null; image: string | null } | null
    team: { id: string; name: string; color: string | null } | null
    _count?: { tasks: number }
  }
  onClick?: () => void
  onFavorite?: () => void
}

const priorityColors: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  low: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
}

export function ProjectCard({ project, onClick, onFavorite }: ProjectCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 transition-all",
        "hover:shadow-lg hover:shadow-zinc-900/5 dark:hover:shadow-black/20 hover:-translate-y-0.5 cursor-pointer"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
            style={{ backgroundColor: project.color ?? "#6366f1" }}
          >
            {project.icon ?? project.name.charAt(0)}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {project.name}
            </h3>
            {project.team && (
              <p className="text-xs text-zinc-400">{project.team.name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onFavorite?.() }}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
              project.favorite
                ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                : "text-zinc-300 dark:text-zinc-600 hover:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 opacity-0 group-hover:opacity-100"
            )}
          >
            <Star className="h-4 w-4" fill={project.favorite ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      {project.description && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-4">
          {project.description}
        </p>
      )}

      <div className="flex items-center gap-3 text-xs text-zinc-400 mb-3 flex-wrap">
        <span className="flex items-center gap-1">
          <FolderKanban className="h-3.5 w-3.5" />
          {project._count?.tasks ?? 0} tasks
        </span>
        {project.dueDate && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(project.dueDate).toLocaleDateString()}
          </span>
        )}
        <span className={cn("px-1.5 py-0.5 rounded font-medium", priorityColors[project.priority] ?? priorityColors.low)}>
          {project.priority}
        </span>
      </div>

      <div className="mt-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-medium text-zinc-400">Progress</span>
          <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
            {project.progress}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${project.progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[11px] text-zinc-400">
        <span className={cn(
          "px-1.5 py-0.5 rounded font-medium",
          project.status === "active" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
          project.status === "archived" && "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
          project.status === "completed" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        )}>
          {project.status}
        </span>
      </div>
    </motion.div>
  )
}
