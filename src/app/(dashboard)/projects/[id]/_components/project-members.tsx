"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Users, Plus } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { ListSkeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDistanceToNow } from "date-fns"
import { useProject } from "@/hooks/use-projects"
import { useWorkspace } from "@/hooks/use-workspace"

interface ProjectMembersProps {
  projectId: string
}

export function ProjectMembers({ projectId }: ProjectMembersProps) {
  const { project, loading, setProject } = useProject(projectId)
  const { workspace } = useWorkspace()
  const [addOpen, setAddOpen] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [workspaceMembers, setWorkspaceMembers] = useState<{ userId: string; user: { id: string; name: string | null; image: string | null; email: string } }[]>([])
  const [selectedUserId, setSelectedUserId] = useState("")
  const [selectedRole, setSelectedRole] = useState("MEMBER")

  useEffect(() => {
    if (workspace?.id) {
      fetch(`/api/workspace/${workspace.id}/members`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success) setWorkspaceMembers(json.data ?? [])
        })
        .catch(() => {})
    }
  }, [workspace?.id])

  const members = project?.members ?? []
  const existingIds = new Set(members.map((m) => m.userId))
  const availableMembers = workspaceMembers.filter((wm) => !existingIds.has(wm.userId))

  async function handleAddMember() {
    if (!selectedUserId) return
    setAddLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, role: selectedRole }),
      })
      const json = await res.json()
      if (json.success && project) {
        setProject({
          ...project,
          members: [...members, json.data],
        })
        setAddOpen(false)
        setSelectedUserId("")
        setSelectedRole("MEMBER")
      }
    } catch {
    } finally {
      setAddLoading(false)
    }
  }

  if (loading) return <ListSkeleton items={4} />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{members.length} members</p>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Member
        </Button>
      </div>

      {members.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No members yet"
          description="Add members to collaborate on this project"
          action={
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Member
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {members.map((member, i) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={member.user?.image ?? undefined} />
                <AvatarFallback>{member.user?.name?.charAt(0) ?? "?"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {member.user?.name ?? "Unknown"}
                </p>
                <p className="text-xs text-zinc-400">{member.user?.email}</p>
              </div>
              <Badge variant={member.role === "OWNER" ? "default" : "secondary"}>
                {member.role}
              </Badge>
              <span className="text-xs text-zinc-400">
                Joined {formatDistanceToNow(new Date(member.joinedAt), { addSuffix: true })}
              </span>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Member</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a workspace member" />
                </SelectTrigger>
                <SelectContent>
                  {availableMembers.length === 0 ? (
                    <SelectItem value="" disabled>No available members</SelectItem>
                  ) : (
                    availableMembers.map((wm) => (
                      <SelectItem key={wm.userId} value={wm.userId}>
                        {wm.user.name ?? wm.user.email}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OWNER">Owner</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="VIEWER">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAddMember} disabled={!selectedUserId || addLoading}>
                {addLoading ? "Adding..." : "Add Member"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
