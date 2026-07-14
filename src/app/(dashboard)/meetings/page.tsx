"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion } from "framer-motion"
import {
  Calendar,
  Clock,
  Plus,
  Video,
  Users,
  Loader2,
  Play,
  Square,
  XCircle,
  ExternalLink,
  Copy,
  Edit3,
  Trash2,
  Phone,
  Monitor,
  Hand,
  MessageSquare,
  Mic,
  MicOff,
  VideoOff,
} from "lucide-react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useActiveWorkspace } from "@/hooks/use-workspace"
import { useMeetings, type Meeting } from "@/hooks/use-meeting"
import { useSocket } from "@/features/chat/socket/provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { ListSkeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { format, formatDistanceToNow, parseISO } from "date-fns"
import { cn } from "@/lib/utils"

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  SCHEDULED: { label: "Scheduled", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", dot: "bg-yellow-500" },
  STARTING: { label: "Starting", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", dot: "bg-blue-500" },
  LIVE: { label: "Live", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", dot: "bg-green-500 animate-pulse" },
  ENDED: { label: "Ended", color: "bg-zinc-100 text-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400", dot: "bg-zinc-400" },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", dot: "bg-red-500" },
}

const providerIcons: Record<string, string> = {
  google: "G",
  zoom: "Z",
  teams: "T",
  collab: "C",
}

export default function MeetingsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { workspace } = useActiveWorkspace()
  const { socket } = useSocket()
  const wsId = workspace?.id ?? null
  const { meetings, loading, refetch, createMeeting, updateMeeting, deleteMeeting, startMeeting, endMeeting, cancelMeeting } = useMeetings(wsId)

  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null)
  const [creating, setCreating] = useState(false)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [duration, setDuration] = useState("30")
  const [meetingProvider, setMeetingProvider] = useState("google")
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [workspaceMembers, setWorkspaceMembers] = useState<{ id: string; name: string | null; image: string | null }[]>([])

  useEffect(() => {
    if (!wsId) return
    fetch(`/api/workspace/${wsId}/members`).then((r) => r.json()).then((j) => {
      if (j.data) {
        const raw: ({ id: string; name: string | null; image: string | null } | null)[] = j.data.map(
          (m: { user: { id: string; name: string | null; image: string | null } | null }) => m.user
        )
        const users = raw.filter((u): u is { id: string; name: string | null; image: string | null } => u !== null)
        const deduped = Array.from(new Map(users.map((u) => [u.id, u])).values())
        setWorkspaceMembers(deduped)
      }
    }).catch(() => {})
  }, [wsId])

  useEffect(() => {
    if (!socket) return
    function handleMeetingStarted(data: { meetingId: string }) {
      refetch()
      toast.success("A meeting has started!", { action: { label: "Join", onClick: () => router.push(`/meetings/${data.meetingId}`) } })
    }
    function handleMeetingEnded() { refetch() }
    socket.on("meeting:started", handleMeetingStarted)
    socket.on("meeting:ended", handleMeetingEnded)
    return () => {
      socket.off("meeting:started", handleMeetingStarted)
      socket.off("meeting:ended", handleMeetingEnded)
    }
  }, [socket, refetch, router])

  const resetForm = useCallback(() => {
    setTitle("")
    setDescription("")
    setDate("")
    setTime("")
    setDuration("30")
    setMeetingProvider("google")
    setSelectedMembers([])
  }, [])

  const handleCreate = useCallback(async () => {
    try {
      if (!title.trim() || !date || !time) { toast.error("Title, date, and time are required"); return }
      setCreating(true)
      const res = await createMeeting({
        title: title.trim(),
        date,
        time,
        description: description.trim() || undefined,
        duration: parseInt(duration) || undefined,
        meetingProvider,
        memberIds: selectedMembers.length > 0 ? [...new Set(selectedMembers)] : undefined,
      })
      if (res?.success) {
        toast.success("Meeting scheduled")
        setCreateOpen(false)
        resetForm()
      } else {
        toast.error(res?.error ?? "Failed to create meeting")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create meeting")
    } finally {
      setCreating(false)
    }
  }, [title, date, time, description, duration, meetingProvider, selectedMembers, createMeeting, resetForm])

  const handleEdit = useCallback(async () => {
    if (!editingMeeting) return
    const res = await updateMeeting(editingMeeting.id, {
      title: title.trim() || undefined,
      description: description.trim() || null,
      date: date || undefined,
      time: time || undefined,
      duration: parseInt(duration) || null,
      meetingProvider,
    })
    if (res?.success) {
      toast.success("Meeting updated")
      setEditOpen(false)
      setEditingMeeting(null)
      resetForm()
    } else {
      toast.error(res?.error ?? "Failed to update meeting")
    }
  }, [editingMeeting, title, description, date, time, duration, meetingProvider, updateMeeting, resetForm])

  const openEdit = useCallback((m: Meeting) => {
    setEditingMeeting(m)
    setTitle(m.title)
    setDescription(m.description ?? "")
    setDate(m.date)
    setTime(m.time)
    setDuration(String(m.duration ?? 30))
    setMeetingProvider(m.meetingProvider ?? "google")
    setEditOpen(true)
  }, [])

  const handleStart = useCallback(async (id: string) => {
    const meeting = meetings.find((m) => m.id === id)
    if (!meeting) return
    const res = await startMeeting(id)
    if (res?.success) {
      toast.success("Meeting started!")
      socket?.emit("meeting:started", { meetingId: id, meeting: res.data })
      if (meeting.meetingProvider === "collab") {
        router.push(`/meetings/${id}`)
      } else if (meeting.meetingLink) {
        window.open(meeting.meetingLink, "_blank")
      }
    } else {
      toast.error(res?.error ?? "Failed to start meeting")
    }
  }, [meetings, startMeeting, socket, router])

  const handleEnd = useCallback(async (id: string) => {
    const res = await endMeeting(id)
    if (res?.success) {
      toast.success("Meeting ended")
      socket?.emit("meeting:ended", { meetingId: id })
    } else {
      toast.error(res?.error ?? "Failed to end meeting")
    }
  }, [endMeeting, socket])

  const handleCancel = useCallback(async (id: string) => {
    const res = await cancelMeeting(id)
    if (res?.success) {
      toast.success("Meeting cancelled")
    } else {
      toast.error(res?.error ?? "Failed to cancel meeting")
    }
  }, [cancelMeeting])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this meeting?")) return
    const res = await deleteMeeting(id)
    if (res?.success) {
      toast.success("Meeting deleted")
    } else {
      toast.error(res?.error ?? "Failed to delete meeting")
    }
  }, [deleteMeeting])

  const handleCopyLink = useCallback((meeting: Meeting) => {
    const link = meeting.meetingLink || `${window.location.origin}/meetings/${meeting.id}`
    navigator.clipboard.writeText(link)
    toast.success("Meeting link copied")
  }, [])

  const toggleMember = useCallback((id: string) => {
    setSelectedMembers((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id])
  }, [])

  const liveMeetings = useMemo(() => meetings.filter((m) => m.status === "LIVE"), [meetings])
  const upcomingMeetings = useMemo(() => meetings.filter((m) => m.status === "SCHEDULED" || m.status === "STARTING"), [meetings])
  const pastMeetings = useMemo(() => meetings.filter((m) => m.status === "ENDED" || m.status === "CANCELLED"), [meetings])

  const isHost = useCallback((m: Meeting) => session?.user?.id === m.creatorId, [session])
  const isMember = useCallback((m: Meeting) => m.members.some((mem) => mem.userId === session?.user?.id), [session])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Meetings</h1>
          <p className="text-sm text-zinc-500 mt-1">Schedule, join, and manage meetings</p>
        </div>
        <Button onClick={() => { resetForm(); setCreateOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" /> Schedule Meeting
        </Button>
      </div>

      {liveMeetings.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" /> Live Now
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {liveMeetings.map((m) => (
              <MeetingCard
                key={m.id}
                meeting={m}
                isHost={isHost(m)}
                isMember={isMember(m)}
                onStart={() => handleStart(m.id)}
                onEnd={() => handleEnd(m.id)}
                onEdit={() => openEdit(m)}
                onCancel={() => handleCancel(m.id)}
                onDelete={() => handleDelete(m.id)}
                onCopyLink={() => handleCopyLink(m)}
                onJoin={() => {
                  if (m.meetingProvider === "collab") router.push(`/meetings/${m.id}`)
                  else if (m.meetingLink) window.open(m.meetingLink, "_blank")
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
          Upcoming ({upcomingMeetings.length})
        </h2>
        {loading ? (
          <ListSkeleton items={3} />
        ) : upcomingMeetings.length === 0 && liveMeetings.length === 0 ? (
          <EmptyState
            icon={<Calendar className="h-8 w-8" />}
            title="No meetings scheduled"
            description="Schedule your first meeting to get started"
            action={<Button onClick={() => { resetForm(); setCreateOpen(true) }}>Schedule Meeting</Button>}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingMeetings.map((m) => (
              <MeetingCard
                key={m.id}
                meeting={m}
                isHost={isHost(m)}
                isMember={isMember(m)}
                onStart={() => handleStart(m.id)}
                onEnd={() => handleEnd(m.id)}
                onEdit={() => openEdit(m)}
                onCancel={() => handleCancel(m.id)}
                onDelete={() => handleDelete(m.id)}
                onCopyLink={() => handleCopyLink(m)}
                onJoin={() => {
                  if (m.meetingProvider === "collab") router.push(`/meetings/${m.id}`)
                  else if (m.meetingLink) window.open(m.meetingLink, "_blank")
                }}
              />
            ))}
          </div>
        )}
      </div>

      {pastMeetings.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
            Past ({pastMeetings.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pastMeetings.map((m) => (
              <MeetingCard
                key={m.id}
                meeting={m}
                isHost={isHost(m)}
                isMember={isMember(m)}
                onStart={() => handleStart(m.id)}
                onEnd={() => handleEnd(m.id)}
                onEdit={() => openEdit(m)}
                onCancel={() => handleCancel(m.id)}
                onDelete={() => handleDelete(m.id)}
                onCopyLink={() => handleCopyLink(m)}
                onJoin={() => {
                  if (m.meetingLink) window.open(m.meetingLink, "_blank")
                }}
              />
            ))}
          </div>
        </div>
      )}

      <CreateMeetingDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={title}
        onTitleChange={setTitle}
        description={description}
        onDescriptionChange={setDescription}
        date={date}
        onDateChange={setDate}
        time={time}
        onTimeChange={setTime}
        duration={duration}
        onDurationChange={setDuration}
        meetingProvider={meetingProvider}
        onProviderChange={setMeetingProvider}
        selectedMembers={selectedMembers}
        onToggleMember={toggleMember}
        workspaceMembers={workspaceMembers}
        onSubmit={handleCreate}
        submitLabel="Schedule Meeting"
        loading={creating}
      />

      {editingMeeting && (
        <CreateMeetingDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          title={title}
          onTitleChange={setTitle}
          description={description}
          onDescriptionChange={setDescription}
          date={date}
          onDateChange={setDate}
          time={time}
          onTimeChange={setTime}
          duration={duration}
          onDurationChange={setDuration}
          meetingProvider={meetingProvider}
          onProviderChange={setMeetingProvider}
          selectedMembers={selectedMembers}
          onToggleMember={toggleMember}
          workspaceMembers={workspaceMembers}
          onSubmit={handleEdit}
          submitLabel="Save Changes"
          loading={false}
        />
      )}
    </div>
  )
}

function MeetingCard({
  meeting,
  isHost,
  isMember,
  onStart,
  onEnd,
  onEdit,
  onCancel,
  onDelete,
  onCopyLink,
  onJoin,
}: {
  meeting: Meeting
  isHost: boolean
  isMember: boolean
  onStart: () => void
  onEnd: () => void
  onEdit: () => void
  onCancel: () => void
  onDelete: () => void
  onCopyLink: () => void
  onJoin: () => void
}) {
  const cfg = statusConfig[meeting.status] ?? statusConfig.SCHEDULED
  const providerIcon = providerIcons[meeting.meetingProvider ?? "google"] ?? "?"

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group"
    >
      <Card className={cn(
        "h-full transition-shadow hover:shadow-md",
        meeting.status === "LIVE" && "ring-2 ring-green-500/50"
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium", cfg.color)}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                  {cfg.label}
                </span>
                {meeting.meetingProvider && (
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[9px] font-bold text-zinc-500">
                    {providerIcon}
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{meeting.title}</h3>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{meeting.date}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{meeting.time}</span>
            {meeting.duration && <span>{meeting.duration}min</span>}
          </div>

          {meeting.description && (
            <p className="text-xs text-zinc-400 line-clamp-2">{meeting.description}</p>
          )}

          <div className="flex items-center gap-1.5">
            <Avatar className="h-5 w-5">
              <AvatarImage src={meeting.creator.image ?? undefined} />
              <AvatarFallback className="text-[7px]">{meeting.creator.name?.charAt(0) ?? "?"}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-zinc-500">{meeting.creator.name ?? "Unknown"}</span>
            <span className="text-xs text-zinc-300 mx-1">·</span>
            <Users className="h-3 w-3 text-zinc-400" />
            <span className="text-xs text-zinc-500">{meeting.members.length} participants</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {meeting.members.slice(0, 5).map((m) => (
              <Avatar key={m.userId} className="h-6 w-6 border-2 border-white dark:border-zinc-900">
                <AvatarImage src={m.user.image ?? undefined} />
                <AvatarFallback className="text-[7px]">{m.user.name?.charAt(0) ?? "?"}</AvatarFallback>
              </Avatar>
            ))}
            {meeting.members.length > 5 && (
              <span className="text-[10px] text-zinc-400 font-medium">+{meeting.members.length - 5}</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-100 dark:border-zinc-800">
            {meeting.status === "SCHEDULED" && isHost && (
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={onStart}>
                <Play className="h-3 w-3" /> Start
              </Button>
            )}
            {meeting.status === "LIVE" && isHost && (
              <Button size="sm" variant="destructive" className="h-8 text-xs gap-1.5" onClick={onEnd}>
                <Square className="h-3 w-3" /> End
              </Button>
            )}
            {meeting.status === "LIVE" && !isHost && isMember && (
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={onJoin}>
                <Video className="h-3 w-3" /> Join
              </Button>
            )}
            {meeting.status === "SCHEDULED" && !isHost && isMember && (
              <div className="text-xs text-zinc-400 flex items-center gap-1.5">
                <Clock className="h-3 w-3" /> Waiting for host...
              </div>
            )}
            {isHost && meeting.status === "SCHEDULED" && (
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onEdit} title="Edit">
                <Edit3 className="h-3.5 w-3.5" />
              </Button>
            )}
            {isHost && (meeting.status === "SCHEDULED" || meeting.status === "STARTING") && (
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onCancel} title="Cancel">
                <XCircle className="h-3.5 w-3.5 text-red-500" />
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onCopyLink} title="Copy link">
              <Copy className="h-3.5 w-3.5" />
            </Button>
            {meeting.meetingLink && meeting.status !== "CANCELLED" && (
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => window.open(meeting.meetingLink!, "_blank")} title="Open link">
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            )}
            {isHost && meeting.status !== "LIVE" && (
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 ml-auto" onClick={onDelete} title="Delete">
                <Trash2 className="h-3.5 w-3.5 text-red-400" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function CreateMeetingDialog({
  open, onOpenChange,
  title, onTitleChange,
  description, onDescriptionChange,
  date, onDateChange,
  time, onTimeChange,
  duration, onDurationChange,
  meetingProvider, onProviderChange,
  selectedMembers, onToggleMember,
  workspaceMembers,
  onSubmit, submitLabel,
  loading,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string; onTitleChange: (v: string) => void
  description: string; onDescriptionChange: (v: string) => void
  date: string; onDateChange: (v: string) => void
  time: string; onTimeChange: (v: string) => void
  duration: string; onDurationChange: (v: string) => void
  meetingProvider: string; onProviderChange: (v: string) => void
  selectedMembers: string[]; onToggleMember: (id: string) => void
  workspaceMembers: { id: string; name: string | null; image: string | null }[]
  onSubmit: () => void
  submitLabel: string
  loading?: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{submitLabel === "Schedule Meeting" ? "Schedule Meeting" : "Edit Meeting"}</DialogTitle>
          <DialogDescription>Fill in the details below</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input placeholder="Meeting title" value={title} onChange={(e) => onTitleChange(e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => onDateChange(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Input type="time" value={time} onChange={(e) => onTimeChange(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Duration (min)</Label>
              <Select value={duration} onValueChange={onDurationChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[15, 30, 45, 60, 90, 120].map((d) => (
                    <SelectItem key={d} value={String(d)}>{d} min</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={meetingProvider} onValueChange={onProviderChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="google">Google Meet</SelectItem>
                  <SelectItem value="zoom">Zoom</SelectItem>
                  <SelectItem value="teams">Microsoft Teams</SelectItem>
                  <SelectItem value="collab">Collab (Internal)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea placeholder="Meeting agenda..." value={description} onChange={(e) => onDescriptionChange(e.target.value)} className="min-h-[60px]" />
          </div>
          <div className="space-y-2">
            <Label>Invite Members ({selectedMembers.length} selected)</Label>
            <div className="max-h-32 overflow-y-auto space-y-1 border rounded-lg p-1">
              {workspaceMembers.filter((m) => m.id).map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => onToggleMember(member.id)}
                  className={cn(
                    "flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm transition-colors",
                    selectedMembers.includes(member.id) ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  <Avatar className="h-6 w-6"><AvatarImage src={member.image ?? undefined} /><AvatarFallback className="text-[8px]">{member.name?.charAt(0) ?? "?"}</AvatarFallback></Avatar>
                  <span className="text-left">{member.name ?? "Unknown"}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button onClick={onSubmit} disabled={loading}>{loading ? "Creating..." : submitLabel}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
