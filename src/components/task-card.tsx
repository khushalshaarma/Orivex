"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Calendar, MessageSquare, Paperclip, ListTodo, GitBranch } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import type { Task } from "@/hooks/use-tasks"

const priorityColors: Record<string, string> = {
  urgent: "border-l-red-500",
  high: "border-l-amber-500",
  medium: "border-l-blue-500",
  low: "border-l-zinc-400",
}

const priorityBadgeColors: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  low: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
}

interface TaskCardProps {
  task: Task
  onClick?: () => void
  isDragging?: boolean
  isDragDisabled?: boolean
  sortableId?: string
}

export function TaskCard({ task, onClick, isDragging: _, isDragDisabled, sortableId }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sortableId ?? task.id,
    data: { task },
    disabled: isDragDisabled,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 shadow-sm transition-all",
        "hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 hover:-translate-y-0.5",
        isDragDisabled ? "cursor-not-allowed opacity-75" : "cursor-pointer",
        "border-l-[3px]",
        priorityColors[task.priority] ?? "border-l-zinc-400",
        isDragging && "opacity-50 shadow-lg rotate-2 z-50"
      )}
      {...(!isDragDisabled ? { ...attributes, ...listeners } : {})}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={cn(
              "text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded",
              priorityBadgeColors[task.priority]
            )}>
              {task.priority}
            </span>
            {task.labels?.slice(0, 2).map((label) => (
              <span key={label} className="text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                {label}
              </span>
            ))}
          </div>
          <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-snug mb-2 line-clamp-2">
            {task.title}
          </h4>
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            {task.dueDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
              </span>
            )}
            {task._count && (
              <>
                {task._count.dependencies && task._count.dependencies > 0 && (
                  <span className="flex items-center gap-1 text-amber-500">
                    <GitBranch className="h-3 w-3" />
                    {task._count.dependencies}
                  </span>
                )}
                {task._count.comments > 0 && (
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {task._count.comments}
                  </span>
                )}
                {task._count.attachments > 0 && (
                  <span className="flex items-center gap-1">
                    <Paperclip className="h-3 w-3" />
                    {task._count.attachments}
                  </span>
                )}
                {task._count.checklists > 0 && (
                  <span className="flex items-center gap-1">
                    <ListTodo className="h-3 w-3" />
                    {task._count.checklists}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
        {task.assignee && (
          <div className="group/assignee relative flex-shrink-0 mt-1">
            <Avatar className="h-7 w-7">
              <AvatarImage src={task.assignee.image ?? undefined} />
              <AvatarFallback className="text-[10px]">
                {task.assignee.name?.charAt(0)?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div className="absolute right-0 top-full mt-1 z-50 hidden group-hover/assignee:block">
              <div className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs rounded-lg px-2 py-1.5 shadow-lg whitespace-nowrap">
                <p className="font-medium">{task.assignee.name ?? "Unnamed"}</p>
                {(task.assignee as Record<string, string>).email && (
                  <p className="text-zinc-400 dark:text-zinc-500">{(task.assignee as Record<string, string>).email}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

const columns = ["backlog", "todo", "in_progress", "review", "testing", "done"] as const
const columnLabels: Record<string, string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In Progress",
  review: "Review",
  testing: "Testing",
  done: "Done",
}
const columnColors: Record<string, string> = {
  backlog: "border-t-zinc-400",
  todo: "border-t-blue-500",
  in_progress: "border-t-amber-500",
  review: "border-t-purple-500",
  testing: "border-t-rose-500",
  done: "border-t-emerald-500",
}
const columnHeaderColors: Record<string, string> = {
  backlog: "text-zinc-500",
  todo: "text-blue-600 dark:text-blue-400",
  in_progress: "text-amber-600 dark:text-amber-400",
  review: "text-purple-600 dark:text-purple-400",
  testing: "text-rose-600 dark:text-rose-400",
  done: "text-emerald-600 dark:text-emerald-400",
}

interface KanbanBoardProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onTaskDrop: (taskId: string, newStatus: string) => void
  isDragDisabled?: boolean
  canDragOwn?: boolean
  currentUserId?: string
}

export function KanbanBoard({ tasks, onTaskClick, onTaskDrop, isDragDisabled, canDragOwn, currentUserId }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  function handleDragStart(event: React.DragEvent, task: Task) {
    if (isDragDisabled) {
      event.preventDefault()
      return
    }
    if (canDragOwn && task.assigneeId !== currentUserId) {
      event.preventDefault()
      return
    }
    setActiveTask(task)
    event.dataTransfer.setData("text/plain", task.id)
    event.dataTransfer.effectAllowed = "move"
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  function handleDrop(e: React.DragEvent, status: string) {
    e.preventDefault()
    const taskId = e.dataTransfer.getData("text/plain")
    if (taskId) onTaskDrop(taskId, status)
    setActiveTask(null)
  }

  function handleDragEnd() {
    setActiveTask(null)
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-full">
      {columns.map((status) => {
        const columnTasks = tasks.filter((t) => t.status === status)
        return (
          <div
            key={status}
            className={cn(
              "flex-shrink-0 w-72 flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 border-t-[3px]",
              columnColors[status]
            )}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status)}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className={cn("text-sm font-semibold", columnHeaderColors[status])}>
                  {columnLabels[status]}
                </span>
                <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full font-medium">
                  {columnTasks.length}
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px]">
              {columnTasks.length === 0 ? (
                <div
                  className={cn(
                    "flex items-center justify-center h-24 text-xs border-2 border-dashed rounded-xl transition-colors",
                    isDragDisabled
                      ? "text-zinc-400 border-zinc-200 dark:border-zinc-800 cursor-not-allowed"
                      : "text-zinc-400 border-zinc-200 dark:border-zinc-800"
                  )}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, status)}
                >
                  Drop tasks here
                </div>
              ) : (
                columnTasks.map((task) => {
                  const dragDisabled = isDragDisabled || (canDragOwn && task.assigneeId !== currentUserId)
                  return (
                    <div
                      key={task.id}
                      draggable={!dragDisabled}
                      onDragStart={(e) => handleDragStart(e, task)}
                      onDragEnd={handleDragEnd}
                    >
                      <TaskCard
                        task={task}
                        onClick={() => onTaskClick(task)}
                        isDragging={activeTask?.id === task.id}
                        isDragDisabled={dragDisabled}
                        sortableId={task.id}
                      />
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
