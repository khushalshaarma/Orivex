"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Calendar, ListTodo, Plus } from "lucide-react"
import { useTasks } from "@/hooks/use-tasks"
import { useSprints } from "@/hooks/use-sprints"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { ListSkeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface ProjectTimelineProps {
  projectId: string
}

export function ProjectTimeline({ projectId }: ProjectTimelineProps) {
  const { tasks, loading: tasksLoading } = useTasks(projectId)
  const { sprints, loading: sprintsLoading, refetch: refetchSprints } = useSprints(projectId)
  const [sprintOpen, setSprintOpen] = useState(false)
  const [sprintForm, setSprintForm] = useState({ name: "", goal: "", startDate: "", endDate: "" })

  const loading = tasksLoading || sprintsLoading

  async function handleCreateSprint() {
    if (!sprintForm.name.trim()) return
    try {
      const res = await fetch("/api/sprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...sprintForm,
          projectId,
        }),
      })
      if (res.ok) {
        setSprintOpen(false)
        setSprintForm({ name: "", goal: "", startDate: "", endDate: "" })
        refetchSprints()
      }
    } catch {}
  }

  const tasksWithDates = tasks.filter((t) => t.dueDate)

  if (loading) return <ListSkeleton items={4} />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
            <button className="px-3 py-1.5 text-xs font-medium rounded-md bg-white dark:bg-zinc-900 shadow-sm">
              Gantt
            </button>
            <button className="px-3 py-1.5 text-xs font-medium rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
              Calendar
            </button>
            <button className="px-3 py-1.5 text-xs font-medium rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
              Board
            </button>
          </div>
        </div>
        <Button size="sm" onClick={() => setSprintOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          New Sprint
        </Button>
      </div>

      {sprints.length === 0 && tasksWithDates.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-12 w-12" />}
          title="No timeline items"
          description="Create a sprint or add due dates to tasks"
          action={
            <Button onClick={() => setSprintOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create Sprint
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {sprints.map((sprint) => (
            <Card key={sprint.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base">{sprint.name}</CardTitle>
                    <span className={cn(
                      "text-[10px] font-medium px-2 py-0.5 rounded-full",
                      sprint.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                      sprint.status === "completed" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                      "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    )}>
                      {sprint.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-400">
                    {sprint.startDate && <span>{new Date(sprint.startDate).toLocaleDateString()}</span>}
                    {sprint.endDate && <span>→ {new Date(sprint.endDate).toLocaleDateString()}</span>}
                    <span>{sprint._count?.tasks ?? 0} tasks</span>
                  </div>
                </div>
                {sprint.goal && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{sprint.goal}</p>
                )}
              </CardHeader>
            </Card>
          ))}

          {tasksWithDates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ListTodo className="h-4 w-4 text-blue-500" />
                  Tasks with Due Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tasksWithDates
                  .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
                  .map((task, i) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-4 rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-2.5"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {task.title}
                        </p>
                      </div>
                      <span className="text-xs text-zinc-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(task.dueDate!).toLocaleDateString()}
                      </span>
                      <span className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded",
                        task.priority === "urgent" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                        task.priority === "high" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                        "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      )}>
                        {task.priority}
                      </span>
                    </motion.div>
                  ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Dialog open={sprintOpen} onOpenChange={setSprintOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Sprint</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Sprint Name</Label>
              <Input
                placeholder="e.g. Sprint 1"
                value={sprintForm.name}
                onChange={(e) => setSprintForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Goal (optional)</Label>
              <Input
                placeholder="Sprint goal"
                value={sprintForm.goal}
                onChange={(e) => setSprintForm((p) => ({ ...p, goal: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={sprintForm.startDate}
                  onChange={(e) => setSprintForm((p) => ({ ...p, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={sprintForm.endDate}
                  onChange={(e) => setSprintForm((p) => ({ ...p, endDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setSprintOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateSprint}>Create Sprint</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
