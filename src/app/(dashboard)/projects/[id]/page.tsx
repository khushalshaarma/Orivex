"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  LayoutDashboard,
  ListTodo,
  Calendar,
  Paperclip,
  Users,
  Activity,
  Settings,
  MoreHorizontal,
  Star,
  Copy,
  Archive,
  Trash2,
  RotateCcw,
  Lock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { CardSkeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useProject } from "@/hooks/use-projects"
import { ProjectOverview } from "./_components/project-overview"
import { ProjectTasks } from "./_components/project-tasks"
import { ProjectTimeline } from "./_components/project-timeline"
import { ProjectFiles } from "./_components/project-files"
import { ProjectMembers } from "./_components/project-members"
import { ProjectActivity } from "./_components/project-activity"
import { ProjectSettings } from "./_components/project-settings"

const tabs = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "timeline", label: "Timeline", icon: Calendar },
  { id: "files", label: "Files", icon: Paperclip },
  { id: "members", label: "Members", icon: Users },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings },
]

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { project, loading, setProject } = useProject(id)
  const [activeTab, setActiveTab] = useState("overview")
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)

  useEffect(() => {
    if (!loading && !project) {
      setAccessDenied(true) // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [loading, project])

  async function handleFavorite() {
    if (!project) return
    const res = await fetch(`/api/projects/${project.id}/favorite`, { method: "POST" })
    const json = await res.json()
    if (json.success) {
      setProject({ ...project, favorite: json.data.favorite })
    }
  }

  async function handleDuplicate() {
    if (!project) return
    const res = await fetch(`/api/projects/${project.id}/duplicate`, { method: "POST" })
    const json = await res.json()
    if (json.success) {
      router.push(`/projects/${json.data.id}`)
    }
  }

  async function handleArchive() {
    if (!project) return
    await fetch(`/api/projects/${project.id}`, { method: "DELETE" })
    router.push("/projects")
  }

  async function handleDelete() {
    if (!project) return
    await fetch(`/api/projects/${project.id}`, { method: "DELETE" })
    router.push("/projects")
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-zinc-500">
        <Lock className="h-16 w-16 mb-4 text-zinc-300 dark:text-zinc-600" />
        <p className="text-lg font-medium">Access Denied</p>
        <p className="text-sm text-zinc-400 mt-1">You do not have access to this project.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/projects")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-zinc-500">
        <p className="text-lg font-medium">Project not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/projects")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
      </div>
    )
  }

  const isArchived = project.status === "archived" || !!project.deletedAt

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/projects")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold text-white shadow-sm"
            style={{ backgroundColor: project.color ?? "#6366f1" }}
          >
            {project.icon ?? project.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {project.name}
              </h1>
              <Badge variant={isArchived ? "secondary" : project.status === "active" ? "success" : "default"}>
                {project.status === "archived" ? "archived" : project.status}
              </Badge>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {project.team?.name} &middot; {project._count?.tasks ?? 0} tasks
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleFavorite}>
            <Star className="mr-1.5 h-4 w-4" fill={project.favorite ? "currentColor" : "none"} />
            {project.favorite ? "Favorited" : "Favorite"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              {isArchived ? (
                <DropdownMenuItem onClick={() => fetch(`/api/projects/${project.id}/restore`, { method: "POST" }).then(() => router.refresh())}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restore
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleArchive}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 dark:text-red-400"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                isActive
                  ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === "overview" && <ProjectOverview projectId={project.id} />}
        {activeTab === "tasks" && <ProjectTasks projectId={project.id} />}
        {activeTab === "timeline" && <ProjectTimeline projectId={project.id} />}
        {activeTab === "files" && <ProjectFiles projectId={project.id} />}
        {activeTab === "members" && <ProjectMembers projectId={project.id} />}
        {activeTab === "activity" && <ProjectActivity projectId={project.id} />}
        {activeTab === "settings" && <ProjectSettings projectId={project.id} />}
      </motion.div>

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
            <Button variant="destructive" onClick={handleDelete}>
              Delete Project
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
