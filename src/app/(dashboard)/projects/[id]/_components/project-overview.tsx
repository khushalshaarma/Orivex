"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  ListTodo,
  AlertCircle,
  Clock,
  TrendingUp,
  Users,
  Calendar,
  Target,
  Activity,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ListSkeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"
import { useProject } from "@/hooks/use-projects"

interface ProjectOverviewProps {
  projectId: string
}

interface ProjectStats {
  total: number
  byStatus: { status: string; _count: number }[]
  byPriority: { priority: string; _count: number }[]
}

interface ActivityItem {
  id: string
  action: string
  entity: string
  createdAt: string
  user: { id: string; name: string | null; image: string | null } | null
}

export function ProjectOverview({ projectId }: ProjectOverviewProps) {
  const { project } = useProject(projectId)
  const [stats, setStats] = useState<ProjectStats | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, activityRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/stats`),
          fetch(`/api/projects/${projectId}/activity?limit=5`),
        ])
        const [statsJson, activityJson] = await Promise.all([
          statsRes.json(),
          activityRes.json(),
        ])
        if (statsJson.success) setStats(statsJson.data)
        if (activityJson.success) setActivity(activityJson.data ?? [])
      } catch {
      } finally {
        setLoading(false)
      }
    }
    if (projectId) load()
  }, [projectId])

  if (loading) return <ListSkeleton items={4} />

  const statusCounts = stats?.byStatus ?? []
  const priorityCounts = stats?.byPriority ?? []
  const totalTasks = stats?.total ?? 0
  const doneCount = statusCounts.find((s) => s.status === "done")?._count ?? 0
  const progress = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-zinc-500">
              <ListTodo className="h-4 w-4 text-blue-500" />
              Total Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">{totalTasks}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-zinc-500">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">{progress}%</p>
            <div className="mt-2 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-zinc-500">
              <AlertCircle className="h-4 w-4 text-red-500" />
              High Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              {priorityCounts.filter((p) => p.priority === "urgent" || p.priority === "high").reduce((s, p) => s + p._count, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-zinc-500">
              <Users className="h-4 w-4 text-purple-500" />
              Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              {project?.members?.length ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-blue-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <EmptyState
                icon={<Clock className="h-8 w-8" />}
                title="No activity yet"
                description="Activity will appear as tasks are worked on"
              />
            ) : (
              <div className="space-y-3">
                {activity.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={item.user?.image ?? undefined} />
                      <AvatarFallback className="text-[10px]">{item.user?.name?.charAt(0) ?? "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 truncate">
                        {item.action.replace(/\./g, " ")}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-emerald-500" />
                Task Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Backlog", key: "backlog", color: "bg-zinc-400" },
                { label: "Todo", key: "todo", color: "bg-blue-500" },
                { label: "In Progress", key: "in_progress", color: "bg-amber-500" },
                { label: "Review", key: "review", color: "bg-purple-500" },
                { label: "Testing", key: "testing", color: "bg-rose-500" },
                { label: "Done", key: "done", color: "bg-emerald-500" },
              ].map((item) => {
                const count = statusCounts.find((s) => s.status === item.key)?._count ?? 0
                const pct = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0
                return (
                  <div key={item.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">{item.label}</span>
                      <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className={`h-full rounded-full ${item.color}`}
                      />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-amber-500" />
                Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {project?.startDate && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Start</span>
                  <span className="text-zinc-900 dark:text-zinc-100">
                    {new Date(project.startDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              {project?.dueDate && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Due</span>
                  <span className="text-zinc-900 dark:text-zinc-100">
                    {new Date(project.dueDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              {!project?.startDate && !project?.dueDate && (
                <p className="text-sm text-zinc-400">No dates set</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
