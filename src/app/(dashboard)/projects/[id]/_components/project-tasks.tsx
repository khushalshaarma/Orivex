"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Plus,
  Search,
  LayoutDashboard,
  ListTodo,
  Calendar as CalendarIcon,
} from "lucide-react"
import { useTasks } from "@/hooks/use-tasks"
import { useSprints } from "@/hooks/use-sprints"
import { useWorkspace } from "@/hooks/use-workspace"
import { useSession } from "next-auth/react"
import { useSocket } from "@/features/chat/socket/provider"
import type { Task } from "@/hooks/use-tasks"
import { KanbanBoard } from "@/components/task-card"
import { TaskDetail } from "@/components/task-detail"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/ui/empty-state"
import { ListSkeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ProjectTasksProps {
  projectId: string
}

type ViewMode = "board" | "list" | "timeline"

export function ProjectTasks({ projectId }: ProjectTasksProps) {
  const { data: session } = useSession()
  const { workspace } = useWorkspace()
  const { socket } = useSocket()
  const { tasks, setTasks, loading, refetch } = useTasks(projectId)
  const { sprints } = useSprints(projectId)
  const [search, setSearch] = useState("")
  const [view, setView] = useState<ViewMode>("board")
  const [createOpen, setCreateOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [members, setMembers] = useState<{ id: string; name: string | null; image: string | null; email?: string }[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", assigneeId: "", dueDate: "", labels: "", estimatedTime: "", sprintId: "" })

  useEffect(() => {
    if (!socket || !workspace?.id) return
    socket.emit("project:join", projectId)
    return () => { socket.emit("project:leave", projectId) }
  }, [socket, workspace?.id, projectId])

  useEffect(() => {
    if (!socket) return
    const handler = () => refetch()
    socket.on("task:created", handler)
    socket.on("task:updated", handler)
    socket.on("task:deleted", handler)
    socket.on("task:moved", handler)
    socket.on("task:comment", handler)
    return () => {
      socket.off("task:created", handler)
      socket.off("task:updated", handler)
      socket.off("task:deleted", handler)
      socket.off("task:moved", handler)
      socket.off("task:comment", handler)
    }
  }, [socket, refetch])

  useEffect(() => {
    if (workspace?.id) {
      fetch(`/api/workspace/${workspace.id}/members`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success) {
            const ms = (json.data ?? []).map((m: { userId: string; role: string; user: { id: string; name: string | null; image: string | null; email: string } }) => ({
              id: m.userId,
              name: m.user.name,
              image: m.user.image,
              email: m.user.email,
              role: m.role,
            }))
            setMembers(ms)
            const current = ms.find((m: { id: string }) => m.id === session?.user?.id)
            setUserRole(current?.role ?? "GUEST")
          }
        })
        .catch(() => {})
    }
  }, [workspace?.id, session?.user?.id])

  const canCreate = userRole === "OWNER" || userRole === "ADMIN" || userRole === "MANAGER"

  async function handleCreate() {
    if (!form.title.trim()) return
    setCreateLoading(true)
    try {
      const body: Record<string, unknown> = { ...form, projectId }
      if (form.dueDate) body.dueDate = form.dueDate
      if (form.labels) body.labels = form.labels.split(",").map((l) => l.trim()).filter(Boolean)
      else body.labels = []
      if (form.estimatedTime) body.estimatedTime = parseInt(form.estimatedTime)
      if (!form.assigneeId) body.assigneeId = null
      if (!form.sprintId) body.sprintId = null

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.success) {
        setCreateOpen(false)
        setForm({ title: "", description: "", priority: "medium", assigneeId: "", dueDate: "", labels: "", estimatedTime: "", sprintId: "" })
        refetch()
      }
    } catch {
    } finally {
      setCreateLoading(false)
    }
  }

  async function handleTaskDrop(taskId: string, newStatus: string) {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    )
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    })
  }

  function handleTaskClick(task: Task) {
    setSelectedTask(task)
    setDetailOpen(true)
  }

  const filtered = tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.assignee?.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search tasks..."
            className="pl-9 h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={view === "board" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setView("board")}
            title="Board view"
          >
            <LayoutDashboard className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setView("list")}
            title="List view"
          >
            <ListTodo className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "timeline" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setView("timeline")}
            title="Timeline view"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Task
          </Button>
        )}
      </div>

      {loading ? (
        <ListSkeleton items={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ListTodo className="h-12 w-12" />}
          title={search ? "No matching tasks" : "No tasks yet"}
          description={search ? "Try a different search term" : "Create your first task to get started"}
          action={
            !search ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Create Task
              </Button>
            ) : undefined
          }
        />
      ) : view === "board" ? (
        <div className="h-[600px]">
          <KanbanBoard
            tasks={filtered}
            onTaskClick={handleTaskClick}
            onTaskDrop={handleTaskDrop}
            isDragDisabled={userRole === "GUEST" || userRole === "VIEWER"}
            canDragOwn={userRole === "DEVELOPER"}
            currentUserId={session?.user?.id}
          />
        </div>
      ) : view === "list" ? (
        <div className="space-y-2">
          {filtered.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 hover:shadow-sm cursor-pointer transition-all"
              onClick={() => handleTaskClick(task)}
            >
              <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                task.priority === "urgent" ? "bg-red-500" :
                task.priority === "high" ? "bg-amber-500" :
                task.priority === "medium" ? "bg-blue-500" : "bg-zinc-400"
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    {task.title}
                  </p>
                  {task.children && task.children.length > 0 && (
                    <span className="text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                      {task.children.filter((c) => c.status === "done").length}/{task.children.length}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {task.status.replace("_", " ")}
                </p>
              </div>
              {task.dueDate && (
                <span className="text-xs text-zinc-400">
                  {new Date(task.dueDate).toLocaleDateString()}
                </span>
              )}
              {task.assignee && (
                <span className="text-xs text-zinc-500">{task.assignee.name}</span>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered
            .filter((t) => t.dueDate)
            .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
            .map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="relative pl-8 pb-6 cursor-pointer group"
                onClick={() => handleTaskClick(task)}
              >
                <div className="absolute left-3 top-2 bottom-0 w-px bg-zinc-200 dark:bg-zinc-800" />
                <div className={`absolute left-1.5 top-2 h-3 w-3 rounded-full border-2 ${
                  task.status === "done" ? "bg-emerald-500 border-emerald-500" :
                  task.status === "in_progress" ? "bg-amber-500 border-amber-500" :
                  "bg-white dark:bg-zinc-900 border-zinc-400"
                }`} />
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {task.title}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">{task.status.replace("_", " ")}</p>
                  </div>
                  <span className="text-xs text-zinc-400">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : ""}
                  </span>
                </div>
              </motion.div>
            ))}
        </div>
      )}

      <TaskDetail
        task={selectedTask}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onUpdate={(updated) => {
          setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
        }}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Task title"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                className="flex min-h-[60px] w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                placeholder="Optional description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assignee</Label>
                <Select
                  value={form.assigneeId}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, assigneeId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name ?? "Unknown"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, priority: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["urgent", "high", "medium", "low"].map((p) => (
                      <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Est. Time (min)</Label>
                <Input
                  type="number"
                  placeholder="60"
                  value={form.estimatedTime}
                  onChange={(e) => setForm((prev) => ({ ...prev, estimatedTime: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Labels (comma-separated)</Label>
              <Input
                placeholder="frontend, bug, urgent"
                value={form.labels}
                onChange={(e) => setForm((prev) => ({ ...prev, labels: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Sprint</Label>
              <Select
                value={form.sprintId}
                onValueChange={(v) => setForm((prev) => ({ ...prev, sprintId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No sprint" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No sprint</SelectItem>
                  {sprints.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!form.title.trim() || createLoading}>
                {createLoading ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
