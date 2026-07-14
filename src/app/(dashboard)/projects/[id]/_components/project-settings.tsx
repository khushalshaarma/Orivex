"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Save,
  RotateCcw,
  Trash2,
  Archive,
  Copy,
  AlertTriangle,
} from "lucide-react"
import { useProject } from "@/hooks/use-projects"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ListSkeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

interface ProjectSettingsProps {
  projectId: string
}

export function ProjectSettings({ projectId }: ProjectSettingsProps) {
  const { project, loading, setProject } = useProject(projectId)
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "active",
    priority: "medium",
    visibility: "TEAM_ONLY" as "PUBLIC" | "PRIVATE" | "TEAM_ONLY",
    color: "#6366f1",
    icon: "",
    startDate: "",
    dueDate: "",
    labels: "",
  })

  useEffect(() => {
    if (project) {
      setForm({ // eslint-disable-line react-hooks/set-state-in-effect
        name: project.name ?? "",
        description: project.description ?? "",
        status: project.status ?? "active",
        priority: project.priority ?? "medium",
        visibility: (project.visibility ?? "TEAM_ONLY") as "PUBLIC" | "PRIVATE" | "TEAM_ONLY",
        color: project.color ?? "#6366f1",
        icon: project.icon ?? "",
        startDate: project.startDate ? project.startDate.split("T")[0] : "",
        dueDate: project.dueDate ? project.dueDate.split("T")[0] : "",
        labels: Array.isArray(project.labels) ? project.labels.join(", ") : "",
      })
    }
  }, [project])

  async function handleSave() {
    if (!project) return
    setSaving(true)
    setMessage(null)
    try {
      const labels = form.labels
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean)

      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name || undefined,
          description: form.description || undefined,
          status: form.status,
          priority: form.priority,
          visibility: form.visibility,
          color: form.color,
          icon: form.icon || undefined,
          startDate: form.startDate || null,
          dueDate: form.dueDate || null,
          labels,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setProject(json.data)
        setMessage({ type: "success", text: "Project settings saved successfully" })
      } else {
        setMessage({ type: "error", text: json.error ?? "Failed to save" })
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong" })
    } finally {
      setSaving(false)
    }
  }

  async function handleArchive() {
    if (!project) return
    await fetch(`/api/projects/${project.id}`, { method: "DELETE" })
    window.location.href = "/projects"
  }

  async function handleRestore() {
    if (!project) return
    const res = await fetch(`/api/projects/${project.id}/restore`, { method: "POST" })
    const json = await res.json()
    if (json.success) {
      setProject(json.data)
      setMessage({ type: "success", text: "Project restored" })
    }
  }

  async function handleDuplicate() {
    if (!project) return
    const res = await fetch(`/api/projects/${project.id}/duplicate`, { method: "POST" })
    const json = await res.json()
    if (json.success) {
      window.location.href = `/projects/${json.data.id}`
    }
  }

  async function handleDelete() {
    if (!project) return
    setDeleteLoading(true)
    try {
      await fetch(`/api/projects/${project.id}`, { method: "DELETE" })
      window.location.href = "/projects"
    } catch {
    } finally {
      setDeleteLoading(false)
    }
  }

  if (loading) return <ListSkeleton items={4} />
  if (!project) return null

  const isArchived = project.status === "archived" || !!project.deletedAt

  return (
    <div className="space-y-8 max-w-3xl">
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`px-4 py-3 rounded-xl text-sm ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
              : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
          }`}
        >
          {message.text}
        </motion.div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Basic project information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Icon (emoji)</Label>
              <Input
                placeholder="🚀"
                value={form.icon}
                onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <input
              type="color"
              value={form.color}
              onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
              className="h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 cursor-pointer"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status & Priority</CardTitle>
          <CardDescription>Project state and importance</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Visibility</Label>
            <Select value={form.visibility} onValueChange={(v) => setForm((p) => ({ ...p, visibility: v as "PUBLIC" | "PRIVATE" | "TEAM_ONLY" }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PUBLIC">Public</SelectItem>
                <SelectItem value="PRIVATE">Private</SelectItem>
                <SelectItem value="TEAM_ONLY">Team Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dates</CardTitle>
          <CardDescription>Project timeline</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Labels</CardTitle>
          <CardDescription>Comma-separated labels for filtering</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="frontend, backend, design, urgent"
            value={form.labels}
            onChange={(e) => setForm((p) => ({ ...p, labels: e.target.value }))}
          />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-1.5 h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
        {isArchived ? (
          <Button variant="outline" onClick={handleRestore}>
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Restore
          </Button>
        ) : (
          <Button variant="outline" onClick={handleArchive}>
            <Archive className="mr-1.5 h-4 w-4" />
            Archive
          </Button>
        )}
        <Button variant="outline" onClick={handleDuplicate}>
          <Copy className="mr-1.5 h-4 w-4" />
          Duplicate
        </Button>
      </div>

      <Separator />

      <Card className="border-red-200 dark:border-red-900/50">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-xl border border-red-200 dark:border-red-900/50 px-4 py-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Delete this project</p>
                <p className="text-xs text-zinc-500">This will permanently delete the project and all its tasks</p>
              </div>
            </div>
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{project.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? "Deleting..." : "Delete Project"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
