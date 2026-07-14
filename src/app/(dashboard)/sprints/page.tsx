"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Plus,
  Target,
  Play,
  CheckCircle2,
  Calendar,
  ListTodo,
  ArrowRight,
} from "lucide-react"
import { useProjects } from "@/hooks/use-projects"
import { useSprints } from "@/hooks/use-sprints"
import type { Sprint } from "@/hooks/use-sprints"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { ListSkeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function SprintsPage() {
  const { projects } = useProjects()
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const { sprints, loading, refetch } = useSprints(selectedProjectId)
  const [createOpen, setCreateOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [form, setForm] = useState({ name: "", goal: "", startDate: "", endDate: "" })

  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id) // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [projects, selectedProjectId])

  async function handleCreate() {
    if (!form.name.trim() || !selectedProjectId) return
    setCreateLoading(true)
    try {
      const res = await fetch("/api/sprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, projectId: selectedProjectId }),
      })
      if (res.ok) {
        setCreateOpen(false)
        setForm({ name: "", goal: "", startDate: "", endDate: "" })
        refetch()
      }
    } catch {
    } finally {
      setCreateLoading(false)
    }
  }

  async function handleStartSprint(id: string) {
    await fetch(`/api/sprints/${id}/start`, { method: "POST" })
    refetch()
  }

  async function handleCompleteSprint(id: string) {
    await fetch(`/api/sprints/${id}/complete`, { method: "POST" })
    refetch()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sprints"
        description="Plan and manage your sprints"
      >
        <div className="flex items-center gap-2">
          <Select
            value={selectedProjectId ?? undefined}
            onValueChange={setSelectedProjectId}
          >
            <SelectTrigger className="w-[200px] h-9 text-sm">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Sprint
          </Button>
        </div>
      </PageHeader>

      {!selectedProjectId ? (
        <EmptyState
          icon={<Target className="h-12 w-12" />}
          title="Select a project"
          description="Choose a project from the dropdown to view its sprints"
        />
      ) : loading ? (
        <ListSkeleton items={4} />
      ) : sprints.length === 0 ? (
        <EmptyState
          icon={<Target className="h-12 w-12" />}
          title="No sprints yet"
          description="Create your first sprint to get started"
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create Sprint
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sprints.map((sprint) => (
            <SprintCard
              key={sprint.id}
              sprint={sprint}
              onStart={handleStartSprint}
              onComplete={handleCompleteSprint}
              onTaskClick={(taskId) => {
                window.location.href = `/tasks?task=${taskId}`
              }}
            />
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Sprint</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Sprint Name</Label>
              <Input
                placeholder="e.g. Sprint 2"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Goal (optional)</Label>
              <Input
                placeholder="What should this sprint achieve?"
                value={form.goal}
                onChange={(e) => setForm((p) => ({ ...p, goal: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!form.name.trim() || createLoading}>
                {createLoading ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface SprintCardProps {
  sprint: Sprint
  onStart: (id: string) => void
  onComplete: (id: string) => void
  onTaskClick: (taskId: string) => void
}

function SprintCard({ sprint, onStart, onComplete, onTaskClick }: SprintCardProps) {
  const totalTasks = sprint.tasks?.length ?? 0
  const doneTasks = sprint.tasks?.filter((t) => t.status === "done").length ?? 0
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{sprint.name}</CardTitle>
                <Badge
                  variant={
                    sprint.status === "active" ? "success" :
                    sprint.status === "completed" ? "default" :
                    "secondary"
                  }
                >
                  {sprint.status}
                </Badge>
              </div>
              {sprint.goal && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{sprint.goal}</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {sprint.status === "planning" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onStart(sprint.id)}
                >
                  <Play className="mr-1 h-3.5 w-3.5" />
                  Start
                </Button>
              )}
              {sprint.status === "active" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onComplete(sprint.id)}
                >
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                  Complete
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 text-xs text-zinc-400">
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {sprint.startDate ? new Date(sprint.startDate).toLocaleDateString() : "TBD"}
              <ArrowRight className="h-3 w-3" />
              {sprint.endDate ? new Date(sprint.endDate).toLocaleDateString() : "TBD"}
            </div>
            <div className="flex items-center gap-1">
              <ListTodo className="h-3.5 w-3.5" />
              {totalTasks} tasks
            </div>
            <div className="flex items-center gap-1">
              <Target className="h-3.5 w-3.5" />
              Velocity: {sprint.velocity}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-zinc-500">Progress</span>
              <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={cn(
                  "h-full rounded-full",
                  progress === 100 ? "bg-emerald-500" : "bg-blue-500"
                )}
              />
            </div>
          </div>

          {sprint.tasks && sprint.tasks.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {sprint.tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                  onClick={() => onTaskClick(task.id)}
                >
                  <div className={cn(
                    "h-2 w-2 rounded-full flex-shrink-0",
                    task.status === "done" ? "bg-emerald-500" :
                    task.status === "in_progress" ? "bg-amber-500" :
                    task.status === "review" ? "bg-purple-500" :
                    task.status === "testing" ? "bg-rose-500" :
                    "bg-zinc-400"
                  )} />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300 flex-1 truncate">
                    {task.title}
                  </span>
                  {task.assignee?.name && (
                    <span className="text-xs text-zinc-400">{task.assignee.name}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
