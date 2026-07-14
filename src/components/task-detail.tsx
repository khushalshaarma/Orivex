"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Calendar,
  User,
  MessageSquare,
  ListTodo,
  Clock,
  Plus,
  Trash2,
  CheckSquare,
  Activity,
  Flag,
  Target,
  GitBranch,
  Link2,
  ArrowRight,
  Paperclip,
  Download,
  FileText,
  Image as ImageIcon,
  FileArchive,
} from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDistanceToNow } from "date-fns"
import type { Task } from "@/hooks/use-tasks"
import { useTaskDependencies } from "@/hooks/use-task-dependencies"
import { useSocket } from "@/features/chat/socket/provider"
import { cn } from "@/lib/utils"

interface TaskDetailProps {
  task: Task | null
  open: boolean
  onClose: () => void
  onUpdate?: (task: Task) => void
}

export function TaskDetail({ task, open, onClose, onUpdate }: TaskDetailProps) {
  if (!task) return null

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 overflow-y-auto"
          >
            <TaskDetailContent task={task} onClose={onClose} onUpdate={onUpdate} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function TaskDetailContent({ task: initialTask, onClose, onUpdate }: {
  task: Task
  onClose: () => void
  onUpdate?: (task: Task) => void
}) {
  const [task, setTask] = useState(initialTask)
  const [comment, setComment] = useState("")
  const [checklistTitle, setChecklistTitle] = useState("")
  const [showAddDep, setShowAddDep] = useState(false)
  const [depSearch, setDepSearch] = useState("")
  const [depResults, setDepResults] = useState<Task[]>([])
  const [uploading, setUploading] = useState(false)

  const { socket } = useSocket()
  const { dependencies, dependents, add: addDep, remove: removeDep } = useTaskDependencies(task.id)

  useEffect(() => {
    setTask(initialTask) // eslint-disable-line react-hooks/set-state-in-effect
  }, [initialTask])

  useEffect(() => {
    if (!socket) return
    const handler = (payload: { taskId: string; comment: unknown }) => {
      if (payload.taskId === task.id) {
        fetch(`/api/tasks/${task.id}`)
          .then((r) => r.json())
          .then((json) => {
            if (json.success) setTask(json.data)
          })
          .catch(() => {})
      }
    }
    socket.on("task:comment", handler)
    return () => { socket.off("task:comment", handler) }
  }, [socket, task.id])

  useEffect(() => {
    if (!showAddDep || !task.projectId) return
    const timeout = setTimeout(async () => {
      if (!depSearch.trim()) { setDepResults([]); return }
      try {
        const res = await fetch(`/api/tasks?projectId=${task.projectId}`)
        const json = await res.json()
        if (json.success) {
          const all = json.data as Task[]
          const q = depSearch.toLowerCase()
          const filtered = all.filter(
            (t) =>
              t.id !== task.id &&
              !dependencies.some((d) => d.id === t.id) &&
              (t.title.toLowerCase().includes(q) || t.id.toLowerCase().includes(q))
          )
          setDepResults(filtered.slice(0, 8))
        }
      } catch {}
    }, 200)
    return () => clearTimeout(timeout)
  }, [depSearch, showAddDep, task.projectId, task.id, dependencies])

  async function updateField(field: string, value: unknown) {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    })
    const json = await res.json()
    if (json.success) {
      const updated = { ...task, [field]: value }
      setTask(updated)
      onUpdate?.(updated)
    }
  }

  async function addComment() {
    if (!comment.trim()) return
    const res = await fetch(`/api/tasks/${task.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: comment }),
    })
    const json = await res.json()
    if (json.success) {
      setTask((prev) => ({
        ...prev,
        comments: [json.data, ...(prev.comments ?? [])],
      }))
      setComment("")
    }
  }

  async function addChecklist() {
    if (!checklistTitle.trim()) return
    const res = await fetch(`/api/tasks/${task.id}/checklists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: checklistTitle }),
    })
    const json = await res.json()
    if (json.success) {
      setTask((prev) => ({
        ...prev,
        checklists: [...(prev.checklists ?? []), json.data],
      }))
      setChecklistTitle("")
    }
  }

  async function toggleChecklist(id: string, completed: boolean) {
    await fetch(`/api/tasks/${task.id}/checklists?id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    })
    setTask((prev) => ({
      ...prev,
      checklists: prev.checklists?.map((c) =>
        c.id === id ? { ...c, completed } : c
      ),
    }))
  }

  async function deleteChecklist(id: string) {
    await fetch(`/api/tasks/${task.id}/checklists?id=${id}`, {
      method: "DELETE",
    })
    setTask((prev) => ({
      ...prev,
      checklists: prev.checklists?.filter((c) => c.id !== id),
    }))
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("taskId", task.id)
        const res = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        })
        const json = await res.json()
        if (json.success) {
          setTask((prev) => ({
            ...prev,
            attachments: [json.data, ...(prev.attachments ?? [])],
          }))
        }
      }
    } catch {
    } finally {
      setUploading(false)
    }
  }

  function getFileIcon(mimeType: string) {
    if (mimeType.startsWith("image/")) return <ImageIcon className="h-4 w-4 text-blue-500" />
    if (mimeType === "application/pdf") return <FileText className="h-4 w-4 text-red-500" />
    if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar"))
      return <FileArchive className="h-4 w-4 text-orange-500" />
    return <FileText className="h-4 w-4 text-zinc-400" />
  }

  const activityItems = task.auditLogs ?? []

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <Select
            value={task.status}
            onValueChange={(v) => updateField("status", v)}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["backlog", "todo", "in_progress", "review", "testing", "done"].map((s) => (
                <SelectItem key={s} value={s} className="text-xs capitalize">
                  {s.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={task.priority}
            onValueChange={(v) => updateField("priority", v)}
          >
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["urgent", "high", "medium", "low"].map((p) => (
                <SelectItem key={p} value={p} className="text-xs capitalize">
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div>
          <input
            className="w-full text-xl font-semibold bg-transparent border-none outline-none text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
            value={task.title}
            onChange={(e) => {
              setTask((prev) => ({ ...prev, title: e.target.value }))
            }}
            onBlur={(e) => {
              if (e.target.value !== initialTask.title) {
                updateField("title", e.target.value)
              }
            }}
          />
        </div>

        <Textarea
          placeholder="Add a description..."
          className="min-h-[80px] text-sm"
          value={task.description ?? ""}
          onChange={(e) => setTask((prev) => ({ ...prev, description: e.target.value }))}
          onBlur={(e) => {
            if (e.target.value !== (initialTask.description ?? "")) {
              updateField("description", e.target.value || null)
            }
          }}
        />

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-zinc-500">
            <User className="h-4 w-4" />
            <span className="text-zinc-500">Assignee:</span>
            <span className="text-zinc-900 dark:text-zinc-100">
              {task.assignee ? (
                <span className="inline-flex items-center gap-1.5">
                  <Avatar className="h-5 w-5 inline-block">
                    <AvatarImage src={task.assignee.image ?? undefined} />
                    <AvatarFallback className="text-[8px]">{task.assignee.name?.charAt(0)?.toUpperCase() ?? "?"}</AvatarFallback>
                  </Avatar>
                  {task.assignee.name ?? "Unassigned"}
                </span>
              ) : "Unassigned"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-zinc-500">
            <Flag className="h-4 w-4" />
            <span className="text-zinc-500">Reporter:</span>
            <span className="text-zinc-900 dark:text-zinc-100">{task.reporter?.name ?? task.assignee?.name ?? "Unassigned"}</span>
          </div>
          {task.startDate && (
            <div className="flex items-center gap-2 text-zinc-500">
              <Calendar className="h-4 w-4" />
              <span className="text-zinc-500">Start:</span>
              <span className="text-zinc-900 dark:text-zinc-100">{new Date(task.startDate).toLocaleDateString()}</span>
            </div>
          )}
          {task.dueDate && (
            <div className="flex items-center gap-2 text-zinc-500">
              <Calendar className="h-4 w-4" />
              <span className="text-zinc-500">Due:</span>
              <span className="text-zinc-900 dark:text-zinc-100">{formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}</span>
            </div>
          )}
          {task.estimatedTime && (
            <div className="flex items-center gap-2 text-zinc-500">
              <Clock className="h-4 w-4" />
              <span className="text-zinc-500">Est:</span>
              <span className="text-zinc-900 dark:text-zinc-100">{task.estimatedTime}m</span>
            </div>
          )}
          {task.storyPoints && (
            <div className="flex items-center gap-2 text-zinc-500">
              <Target className="h-4 w-4" />
              <span className="text-zinc-500">Points:</span>
              <span className="text-zinc-900 dark:text-zinc-100">{task.storyPoints}</span>
            </div>
          )}
        </div>

        {task.children && task.children.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Subtasks ({task.children.filter((c) => c.status === "done").length}/{task.children.length})
            </h4>
            <div className="space-y-1">
              {task.children.map((child) => (
                <div key={child.id} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <div className="h-4 w-4 rounded border border-zinc-300 dark:border-zinc-700 flex items-center justify-center">
                    {child.status === "done" && <CheckSquare className="h-3 w-3 text-emerald-500" />}
                  </div>
                  <span className={child.status === "done" ? "line-through text-zinc-400" : ""}>
                    {child.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Checklists */}
        <div>
          <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
            <ListTodo className="h-4 w-4" />
            Checklist
          </h4>
          <div className="space-y-1 mb-2">
            {(task.checklists ?? []).map((item) => (
              <div key={item.id} className="flex items-center gap-2 group">
                <button
                  onClick={() => toggleChecklist(item.id, !item.completed)}
                  className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                    item.completed
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "border-zinc-300 dark:border-zinc-700"
                  }`}
                >
                  {item.completed && <CheckSquare className="h-3 w-3" />}
                </button>
                <span className={`text-sm flex-1 ${item.completed ? "line-through text-zinc-400" : "text-zinc-700 dark:text-zinc-300"}`}>
                  {item.title}
                </span>
                <button
                  onClick={() => deleteChecklist(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Add item..."
              className="h-8 text-xs"
              value={checklistTitle}
              onChange={(e) => setChecklistTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addChecklist() }}
            />
            <Button size="sm" variant="ghost" onClick={addChecklist}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Dependencies */}
        <div>
          <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Dependencies
          </h4>
          <div className="space-y-1 mb-1">
            {dependencies.length === 0 && dependents.length === 0 && (
              <p className="text-xs text-zinc-400">No dependencies</p>
            )}
            {dependencies.length > 0 && (
              <div className="mb-2">
                <p className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1">Depends on</p>
                {dependencies.map((dep) => (
                  <div key={dep.id} className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 group py-0.5">
                    <Link2 className="h-3 w-3 text-amber-500 flex-shrink-0" />
                    <span className="truncate flex-1">{dep.title}</span>
                    <span className="text-[10px] capitalize px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">{dep.status.replace("_", " ")}</span>
                    <button
                      onClick={() => removeDep(dep.id)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {dependents.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1">Blocked by</p>
                {dependents.map((dep) => (
                  <div key={dep.id} className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 group py-0.5">
                    <ArrowRight className="h-3 w-3 text-blue-500 flex-shrink-0" />
                    <span className="truncate flex-1">{dep.title}</span>
                    <span className="text-[10px] capitalize px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">{dep.status.replace("_", " ")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {showAddDep ? (
            <div className="relative">
              <div className="flex items-center gap-2 mb-1">
                <Input
                  placeholder="Search tasks..."
                  className="h-7 text-xs"
                  value={depSearch}
                  onChange={(e) => setDepSearch(e.target.value)}
                  autoFocus
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => { setShowAddDep(false); setDepSearch(""); setDepResults([]) }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              {depResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {depResults.map((t) => (
                    <button
                      key={t.id}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                      onClick={async () => {
                        await addDep(t.id)
                        setDepResults((prev) => prev.filter((r) => r.id !== t.id))
                      }}
                    >
                      <span className="truncate flex-1">{t.title}</span>
                      <span className="text-[10px] capitalize text-zinc-400">{t.status.replace("_", " ")}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setShowAddDep(true)}>
              <Plus className="h-3 w-3" />
              Add dependency
            </Button>
          )}
        </div>

        {/* Attachments */}
        <div>
          <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            Attachments
          </h4>
          <div className="space-y-2 mb-2">
            {(task.attachments ?? []).length === 0 && (
              <p className="text-xs text-zinc-400">No attachments</p>
            )}
            {(task.attachments ?? []).map((att) => (
              <div key={att.id} className="flex items-center gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2">
                {getFileIcon(att.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">{att.name}</p>
                  <p className="text-[10px] text-zinc-400">{(att.size / 1024).toFixed(1)} KB</p>
                </div>
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors",
              "border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800",
              uploading && "opacity-50 pointer-events-none"
            )}>
              <Paperclip className="h-3.5 w-3.5" />
              {uploading ? "Uploading..." : "Attach file"}
              <input
                type="file"
                className="hidden"
                multiple
                accept="image/*,.pdf,.zip,.docx,.xlsx"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          </div>
        </div>

        {/* Comments */}
        <div>
          <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Comments
          </h4>
          <div className="flex items-start gap-2 mb-4">
            <Textarea
              placeholder="Write a comment..."
              className="min-h-[60px] text-sm"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <Button size="sm" onClick={addComment} disabled={!comment.trim()}>
              Send
            </Button>
          </div>
          <div className="space-y-3">
            {(task.comments ?? []).map((c) => (
              <div key={c.id} className="flex items-start gap-3">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={c.user?.image ?? undefined} />
                  <AvatarFallback className="text-[10px]">{c.user?.name?.charAt(0)?.toUpperCase() ?? "?"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                      {c.user?.name ?? "Unknown"}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity History */}
        {activityItems.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity
            </h4>
            <div className="space-y-2">
              {activityItems.map((log) => (
                <div key={log.id} className="flex items-start gap-3">
                  <Avatar className="h-6 w-6 mt-0.5">
                    <AvatarImage src={log.user?.image ?? undefined} />
                    <AvatarFallback className="text-[8px]">{log.user?.name?.charAt(0)?.toUpperCase() ?? "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{log.user?.name ?? "Someone"}</span>{" "}
                      {log.action.replace(/\./g, " ")}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
