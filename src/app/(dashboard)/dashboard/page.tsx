"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import {
  Users,
  FolderKanban,
  UserCheck,
  Activity,
  Mail,
  Clock,
  UserPlus,
  Plus,
  FileUp,
  Calendar,
  Building2,
  Sparkles,
  ChevronRight,
  Target,
  Zap,
  ListTodo,
  TrendingUp,
  X,
  Loader2,
} from "lucide-react"
import { useWorkspace } from "@/hooks/use-workspace"
import { useProjects } from "@/hooks/use-projects"
import { useMyTasks } from "@/hooks/use-tasks"
import { useSprints } from "@/hooks/use-sprints"
import { NotificationWidgets } from "@/components/dashboard/notification-widgets"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ListSkeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"

interface Stats {
  members: number
  teams: number
  projects: number
  activeToday: number
  pendingInvites: number
}

interface ActivityItem {
  id: string
  action: string
  entity: string
  createdAt: string
  user: { id: string; name: string | null; image: string | null } | null
}

interface TeamSummary {
  id: string
  name: string
  color: string | null
  _count: { members: number; projects: number }
  lead: { id: string; name: string | null; image: string | null } | null
}

const actionLabels: Record<string, string> = {
  "workspace.created": "created the workspace",
  "workspace.updated": "updated workspace settings",
  "team.created": "created a new team",
  "team.updated": "updated team",
  "team.archived": "archived a team",
  "member.role_updated": "updated a member role",
  "member.removed": "removed a member",
  "workspace.transferred": "transferred ownership",
}

function getActionText(action: string, userName: string | null | undefined) {
  const name = userName ?? "Someone"
  return `${name} ${actionLabels[action] ?? action.replace(/\./g, " ")}`
}

function getActionIcon(action: string) {
  if (action.startsWith("team")) return Building2
  if (action.startsWith("member")) return Users
  if (action.startsWith("workspace")) return Sparkles
  return Activity
}

const quickActions = [
  { label: "Invite Member", href: "/members?invite=true", icon: UserPlus, color: "from-blue-500 to-blue-600" },
  { label: "Create Team", href: "/teams?create=true", icon: Building2, color: "from-purple-500 to-purple-600" },
  { label: "Create Project", href: "/projects?create=true", icon: FolderKanban, color: "from-emerald-500 to-emerald-600" },
  { label: "Upload File", href: "#", icon: FileUp, color: "from-amber-500 to-amber-600" },
  { label: "Schedule Meeting", href: "#", icon: Calendar, color: "from-rose-500 to-rose-600" },
]

const statIcons: Record<string, React.ReactNode> = {
  Members: <Users className="h-5 w-5" />,
  Teams: <Building2 className="h-5 w-5" />,
  Projects: <FolderKanban className="h-5 w-5" />,
  "Active Today": <UserCheck className="h-5 w-5" />,
  "Pending Invites": <Mail className="h-5 w-5" />,
}
const statColors: Record<string, string> = {
  Members: "from-blue-500/10 to-blue-600/5 dark:from-blue-500/20 dark:to-blue-600/10",
  Teams: "from-purple-500/10 to-purple-600/5 dark:from-purple-500/20 dark:to-purple-600/10",
  Projects: "from-emerald-500/10 to-emerald-600/5 dark:from-emerald-500/20 dark:to-emerald-600/10",
  "Active Today": "from-amber-500/10 to-amber-600/5 dark:from-amber-500/20 dark:to-amber-600/10",
  "Pending Invites": "from-rose-500/10 to-rose-600/5 dark:from-rose-500/20 dark:to-rose-600/10",
}
const statGradients: Record<string, string> = {
  Members: "from-blue-500 to-blue-600",
  Teams: "from-purple-500 to-purple-600",
  Projects: "from-emerald-500 to-emerald-600",
  "Active Today": "from-amber-500 to-amber-600",
  "Pending Invites": "from-rose-500 to-rose-600",
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

const fadeIn = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({ opacity: 1, x: 0, transition: { delay: i * 0.03 } }),
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const { workspace } = useWorkspace()
  const { projects } = useProjects()
  const { tasks: myTasks } = useMyTasks(workspace?.id ?? null)
  const firstProjectId = projects.find((p) => p.status === "active")?.id ?? null
  const { sprints: activeSprints, loading: sprintsLoading } = useSprints(firstProjectId)
  const [stats, setStats] = useState<Stats | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!workspace?.id) return
    const wsId = workspace.id

    async function load() {
      try {
        const [statsRes, activityRes, teamsRes] = await Promise.all([
          fetch(`/api/workspace/${wsId}/stats`),
          fetch(`/api/workspace/${wsId}/activity?limit=8`),
          fetch(`/api/workspace/${wsId}/teams`),
        ])
        const [statsJson, activityJson, teamsJson] = await Promise.all([
          statsRes.json(),
          activityRes.json(),
          teamsRes.json(),
        ])
        setStats(statsJson.data)
        setActivity(activityJson.data ?? [])
        setTeams(teamsJson.data ?? [])
      } catch {
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [workspace?.id])

  const today = useMemo(() => new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }), [])

  // Upload state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleUploadFile() {
    if (uploadFiles.length === 0) return
    setUploading(true)
    try {
      for (const file of uploadFiles) {
        const formData = new FormData()
        formData.append("file", file)
        const res = await fetch("/api/files/upload", { method: "POST", body: formData })
        const json = await res.json()
        if (json.success) {
          toast.success(`${file.name} uploaded`)
        } else {
          toast.error(json.error ?? `Failed to upload ${file.name}`)
        }
      }
      setUploadFiles([])
      setUploadDialogOpen(false)
    } catch {
      toast.error("Upload failed")
    } finally {
      setUploading(false)
    }
  }

  // Meeting state
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false)
  const [meetingTitle, setMeetingTitle] = useState("")
  const [meetingDate, setMeetingDate] = useState("")
  const [meetingTime, setMeetingTime] = useState("")
  const [meetingDescription, setMeetingDescription] = useState("")
  const [creatingMeeting, setCreatingMeeting] = useState(false)

  async function handleCreateMeeting() {
    if (!meetingTitle.trim() || !meetingDate || !meetingTime) {
      toast.error("Title, date, and time are required")
      return
    }
    setCreatingMeeting(true)
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: meetingTitle, date: meetingDate, time: meetingTime, description: meetingDescription, workspaceId: workspace?.id }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success("Meeting created")
        setMeetingTitle("")
        setMeetingDate("")
        setMeetingTime("")
        setMeetingDescription("")
        setMeetingDialogOpen(false)
      } else {
        toast.error(json.error ?? "Failed to create meeting")
      }
    } catch {
      toast.error("Failed to create meeting")
    } finally {
      setCreatingMeeting(false)
    }
  }

  if (!session?.user) return null

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >

      {/* Premium Workspace Header */}
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-950 p-8 shadow-sm">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/5 to-purple-500/5 dark:from-blue-500/10 dark:to-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex items-start justify-between">
          <div className="flex items-start gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/20">
              <Building2 className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {workspace?.name ?? "Workspace"}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  <Zap className="h-3 w-3" />
                  Pro Plan
                </span>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Welcome back{session.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}
              </p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <Clock className="h-3.5 w-3.5" />
                  {today}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <UserCheck className="h-3.5 w-3.5" />
                  {stats?.activeToday ?? 0} online
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-shadow">
              <Plus className="mr-1.5 h-4 w-4" />
              Quick Create
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Animated Statistics */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {["Members", "Teams", "Projects", "Active Today", "Pending Invites"].map((title, i) => (
          <motion.div
            key={title}
            variants={itemVariants}
            custom={i}
            className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 transition-all hover:shadow-lg hover:shadow-zinc-900/5 dark:hover:shadow-black/20 hover:-translate-y-0.5 cursor-default"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${statColors[title]} opacity-50`} />
            <div className="relative">
              <div className="flex items-start justify-between mb-3">
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</p>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${statGradients[title]} text-white shadow-sm`}>
                  {statIcons[title]}
                </div>
              </div>
              {loading ? (
                <div className="h-8 w-16 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
              ) : (
                <motion.p
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 + 0.2, type: "spring", stiffness: 200 }}
                  className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
                >
                  {title === "Members" ? stats?.members ?? 0 :
                   title === "Teams" ? stats?.teams ?? 0 :
                   title === "Projects" ? stats?.projects ?? 0 :
                   title === "Active Today" ? stats?.activeToday ?? 0 :
                   stats?.pendingInvites ?? 0}
                </motion.p>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Activity Timeline */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-blue-500" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <ListSkeleton />
              ) : activity.length === 0 ? (
                <EmptyState
                  icon={<Clock className="h-8 w-8" />}
                  title="No activity yet"
                  description="Activity will appear as your team works"
                />
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/30 via-purple-500/30 to-transparent" />
                  <div className="space-y-0">
                    {activity.map((item, i) => (
                      <motion.div
                        key={item.id}
                        custom={i}
                        variants={fadeIn}
                        initial="hidden"
                        animate="visible"
                        className="relative flex items-start gap-4 pb-6 last:pb-0"
                      >
                        <div className="relative z-10 mt-0.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white dark:border-zinc-900 bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 shadow-sm">
                            {item.user?.image ? (
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={item.user.image} />
                                <AvatarFallback className="text-[10px]">{item.user.name?.charAt(0)?.toUpperCase() ?? "?"}</AvatarFallback>
                              </Avatar>
                            ) : (
                              <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                                {item.user?.name?.charAt(0)?.toUpperCase() ?? "?"}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <p className="text-sm text-zinc-700 dark:text-zinc-300">
                            {getActionText(item.action, item.user?.name)}
                          </p>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400">
                          {(() => {
                            const Icon = getActionIcon(item.action)
                            return <Icon className="h-4 w-4" />
                          })()}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Sidebar */}
        <div className="space-y-6">

          {/* Workspace Health */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-4 w-4 text-emerald-500" />
                  Workspace Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Profile Completion", value: 60, color: "bg-blue-500" },
                  { label: "Workspace Setup", value: workspace ? 100 : 0, color: "bg-purple-500" },
                  { label: "Members Invited", value: Math.min(((stats?.members ?? 0) / 10) * 100, 100), color: "bg-emerald-500" },
                  { label: "Projects Created", value: Math.min(((stats?.projects ?? 0) / 5) * 100, 100), color: "bg-amber-500" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{item.label}</span>
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{Math.round(item.value)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.value}%` }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                        className={`h-full rounded-full ${item.color} shadow-sm`}
                      />
                    </div>
                  </div>
                ))}
                <div className="pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">Overall</span>
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                      {Math.round([60, workspace ? 100 : 0, Math.min(((stats?.members ?? 0) / 10) * 100, 100), Math.min(((stats?.projects ?? 0) / 5) * 100, 100)].reduce((a, b) => a + b, 0) / 4)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {quickActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <Button
                      key={action.label}
                      variant="outline"
                      className="w-full justify-start group relative overflow-hidden"
                      onClick={() => {
                        if (action.label === "Upload File") {
                          setUploadDialogOpen(true)
                        } else if (action.label === "Schedule Meeting") {
                          setMeetingDialogOpen(true)
                        } else if (action.href !== "#") {
                          window.location.href = action.href
                        }
                      }}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-r ${action.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                      <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${action.color} text-white mr-3 shadow-sm`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="flex-1 text-left">{action.label}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-zinc-300 group-hover:text-zinc-500 dark:text-zinc-600 dark:group-hover:text-zinc-400 transition-colors" />
                    </Button>
                  )
                })}
              </CardContent>
            </Card>
          </motion.div>

          {/* Teams */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4 text-purple-500" />
                  Teams
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <ListSkeleton items={3} />
                ) : teams.length === 0 ? (
                  <EmptyState
                    icon={<Building2 className="h-8 w-8" />}
                    title="No teams yet"
                    description="Teams help organize your engineers and projects"
                    action={
                      <Button
                        size="sm"
                        onClick={() => window.location.href = "/teams?create=true"}
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Create Team
                      </Button>
                    }
                  />
                ) : (
                  <div className="space-y-2">
                    {teams.slice(0, 4).map((team, i) => (
                      <motion.div
                        key={team.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all cursor-pointer"
                        onClick={() => window.location.href = "/teams"}
                      >
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm group-hover:shadow-md transition-shadow"
                          style={{ backgroundColor: team.color ?? "#6366f1" }}
                        >
                          {team.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                            {team.name}
                          </p>
                          <p className="text-xs text-zinc-400">
                            {team._count.members} members &middot; {team._count.projects} projects
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-zinc-300 dark:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

        </div>
      </div>

      {/* Projects & Tasks Summary */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-zinc-500">
              <FolderKanban className="h-4 w-4 text-blue-500" />
              Active Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {projects.filter((p) => p.status === "active").length}
            </p>
            <p className="text-xs text-zinc-400 mt-1">of {projects.length} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-zinc-500">
              <ListTodo className="h-4 w-4 text-amber-500" />
              Tasks Due Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {myTasks.filter((t) => {
                if (!t.dueDate) return false
                const due = new Date(t.dueDate)
                const today = new Date()
                return due.getDate() === today.getDate() &&
                  due.getMonth() === today.getMonth() &&
                  due.getFullYear() === today.getFullYear()
              }).length}
            </p>
            <p className="text-xs text-zinc-400 mt-1">across all projects</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-zinc-500">
              <UserCheck className="h-4 w-4 text-emerald-500" />
              My Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{myTasks.length}</p>
            <p className="text-xs text-zinc-400 mt-1">
              {myTasks.filter((t) => t.status === "done").length} completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-zinc-500">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              Team Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {(() => {
                if (projects.length === 0) return "0%"
                const avg = projects.reduce((s, p) => s + (p.progress ?? 0), 0) / projects.length
                return `${Math.round(avg)}%`
              })()}
            </p>
            <p className="text-xs text-zinc-400 mt-1">average across projects</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
            <DialogDescription>Select files to upload to your workspace</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => setUploadFiles(Array.from(e.target.files || []))}
            />
            {uploadFiles.length === 0 ? (
              <div
                className="border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg p-8 text-center cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileUp className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Click to select files or drag and drop</p>
                <p className="text-xs text-zinc-400 mt-1">Max 50MB per file</p>
              </div>
            ) : (
              <div className="space-y-2">
                {uploadFiles.map((file, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-700 p-2">
                    <span className="text-sm truncate flex-1">{file.name}</span>
                    <span className="text-xs text-zinc-400 ml-2">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                    <button type="button" onClick={() => setUploadFiles((prev) => prev.filter((_, j) => j !== i))} className="ml-2 text-zinc-400 hover:text-red-500">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    Add More
                  </Button>
                  <Button size="sm" onClick={handleUploadFile} disabled={uploading}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileUp className="h-4 w-4 mr-1" />}
                    Upload {uploadFiles.length > 1 ? `(${uploadFiles.length} files)` : ""}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Meeting Dialog */}
      <Dialog open={meetingDialogOpen} onOpenChange={setMeetingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Meeting</DialogTitle>
            <DialogDescription>Create a new meeting and notify team members</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="meeting-title">Title</Label>
              <Input
                id="meeting-title"
                placeholder="e.g. Sprint Planning"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="meeting-date">Date</Label>
                <Input
                  id="meeting-date"
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meeting-time">Time</Label>
                <Input
                  id="meeting-time"
                  type="time"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meeting-description">Description (optional)</Label>
              <Textarea
                id="meeting-description"
                placeholder="Meeting agenda..."
                value={meetingDescription}
                onChange={(e) => setMeetingDescription(e.target.value)}
                className="min-h-[60px]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMeetingDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateMeeting} disabled={creatingMeeting}>
                {creatingMeeting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Calendar className="h-4 w-4 mr-1" />}
                {creatingMeeting ? "Creating..." : "Schedule Meeting"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notification Widgets */}
      <motion.div variants={itemVariants}>
        <NotificationWidgets />
      </motion.div>

      {/* Active Projects & Sprint Progress */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderKanban className="h-4 w-4 text-blue-500" />
              Active Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            {projects.filter((p) => p.status === "active").length === 0 ? (
              <EmptyState
                icon={<FolderKanban className="h-8 w-8" />}
                title="No active projects"
                description="Create a project to get started"
                action={
                  <Button
                    size="sm"
                    onClick={() => window.location.href = "/projects?create=true"}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Create Project
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {projects.filter((p) => p.status === "active").slice(0, 5).map((project, i) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all cursor-pointer"
                    onClick={() => window.location.href = `/projects/${project.id}`}
                  >
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
                      style={{ backgroundColor: project.color ?? "#6366f1" }}
                    >
                      {project.icon ?? project.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{project.name}</p>
                      <p className="text-xs text-zinc-400">{project._count?.tasks ?? 0} tasks</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-400 w-8 text-right">{project.progress}%</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-amber-500" />
              Active Sprint
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sprintsLoading ? (
              <ListSkeleton items={3} />
            ) : activeSprints.filter((s) => s.status === "active").length === 0 ? (
              <EmptyState
                icon={<Target className="h-8 w-8" />}
                title="No active sprint"
                description="Start a sprint to track progress"
                action={
                  <Button
                    size="sm"
                    onClick={() => window.location.href = "/sprints"}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    View Sprints
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {activeSprints.filter((s) => s.status === "active").slice(0, 1).map((sprint) => {
                  const total = sprint.tasks?.length ?? 0
                  const done = sprint.tasks?.filter((t) => t.status === "done").length ?? 0
                  const progress = total > 0 ? Math.round((done / total) * 100) : 0
                  return (
                    <div key={sprint.id}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{sprint.name}</p>
                        <Badge variant="success">Active</Badge>
                      </div>
                      {sprint.goal && (
                        <p className="text-xs text-zinc-500 mb-3">{sprint.goal}</p>
                      )}
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-zinc-500">Progress</span>
                        <span className="text-xs font-medium">{progress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden mb-3">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.8 }}
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                        />
                      </div>
                      <div className="flex items-center gap-4 text-xs text-zinc-400">
                        <span>{done}/{total} done</span>
                        <span>Velocity: {sprint.velocity}</span>
                        {sprint.endDate && (
                          <span>Due {formatDistanceToNow(new Date(sprint.endDate), { addSuffix: true })}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Projects */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderKanban className="h-4 w-4 text-blue-500" />
              Recent Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <EmptyState
                icon={<FolderKanban className="h-8 w-8" />}
                title="No projects yet"
                description="Create your first project to get started"
                action={
                  <Button
                    size="sm"
                    onClick={() => window.location.href = "/projects?create=true"}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Create Project
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {projects.slice(0, 4).map((project, i) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group relative rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
                    onClick={() => window.location.href = `/projects/${project.id}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white shadow-sm"
                        style={{ backgroundColor: project.color ?? "#6366f1" }}
                      >
                        {project.icon ?? project.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {project.name}
                        </p>
                        <p className="text-xs text-zinc-400 truncate">
                          {project.team?.name ?? "No team"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>{project._count?.tasks ?? 0} tasks</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                        <span>{project.progress}%</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Upcoming Deadlines */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-rose-500" />
              Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const upcomingTasks = myTasks
                .filter((t) => t.dueDate && t.status !== "done")
                .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
                .slice(0, 8)

              if (upcomingTasks.length === 0) {
                return (
                  <EmptyState
                    icon={<Calendar className="h-8 w-8" />}
                    title="No upcoming deadlines"
                    description="You're all caught up!"
                  />
                )
              }

              return (
                <div className="space-y-2">
                  {upcomingTasks.map((task, i) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-4 rounded-xl px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all cursor-pointer"
                      onClick={() => window.location.href = `/tasks?task=${task.id}`}
                    >
                      <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                        task.priority === "urgent" ? "bg-red-500" :
                        task.priority === "high" ? "bg-amber-500" :
                        task.priority === "medium" ? "bg-blue-500" : "bg-zinc-400"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {task.title}
                        </p>
                        {task.project && (
                          <p className="text-xs text-zinc-400">{task.project.name}</p>
                        )}
                      </div>
                      <span className="text-xs text-zinc-400 flex items-center gap-1 flex-shrink-0">
                        <Calendar className="h-3 w-3" />
                        {new Date(task.dueDate!).toLocaleDateString()}
                      </span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${
                        task.priority === "urgent" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                        task.priority === "high" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                        "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}>
                        {task.priority}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )
            })()}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
