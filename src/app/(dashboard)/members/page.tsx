"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import {
  Search,
  UserPlus,
  Users,
  Mail,
  Loader2,
  MoreHorizontal,
  Shield,
  Crown,
  UserMinus,
  ArrowLeftRight,
} from "lucide-react"
import { useWorkspace } from "@/hooks/use-workspace"
import { toast } from "sonner"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RoleBadge } from "@/components/ui/role-badge"
import { StatusDot } from "@/components/ui/status-dot"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { ListSkeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"

interface Member {
  id: string
  userId: string
  role: string
  joinedAt: string
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
    position: string | null
    department: string | null
    status: string
    lastActiveAt: string | null
  }
}

const roles = ["OWNER", "ADMIN", "MANAGER", "DEVELOPER", "DESIGNER", "QA", "GUEST"]

export default function MembersPage() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const { workspace } = useWorkspace()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("")

  const [inviteOpen, setInviteOpen] = useState(searchParams.get("invite") === "true")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("DEVELOPER")
  const [inviting, setInviting] = useState(false)

  const [removeTarget, setRemoveTarget] = useState<Member | null>(null)
  const [transferTarget, setTransferTarget] = useState<Member | null>(null)
  const [roleChangeTarget, setRoleChangeTarget] = useState<Member | null>(null)

  const loadMembers = useCallback(async () => { // eslint-disable-line react-hooks/preserve-manual-memoization
    if (!workspace?.id) return
    try {
      const res = await fetch(`/api/workspace/${workspace.id}/members`)
      const json = await res.json()
      setMembers(json.data ?? [])
    } catch {
    } finally {
      setLoading(false)
    }
  }, [workspace?.id])

  useEffect(() => { loadMembers() }, [loadMembers]) // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => { if (searchParams.get("invite") === "true") setInviteOpen(true) }, [searchParams]) // eslint-disable-line react-hooks/set-state-in-effect

  const currentMember = members.find((m) => m.userId === session?.user?.id)
  const isOwner = currentMember?.role === "OWNER"
  const isAdmin = isOwner || currentMember?.role === "ADMIN"

  const filtered = members.filter((m) => {
    const matchesSearch =
      !search ||
      m.user.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.user.email.toLowerCase().includes(search.toLowerCase())
    const matchesRole = !roleFilter || m.role === roleFilter
    return matchesSearch && matchesRole
  })

  async function handleInvite() {
    if (!inviteEmail || !workspace?.id) return
    setInviting(true)
    try {
      const res = await fetch(`/api/workspace/${workspace.id}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      const json = await res.json()

      if (!res.ok || !json.success) {
        toast.error(json.error ?? "Failed to send invitation")
        return
      }

      const { notificationCreated, emailSent, emailError, notificationError } = json

      if (emailSent && notificationCreated) {
        toast.success("Invitation sent successfully", {
          description: "Email delivered and notification created.",
        })
      } else if (!emailSent && notificationCreated) {
        toast.warning("Invitation created, email delivery failed", {
          description: `Notification created. Reason: ${emailError ?? "unknown SMTP error"}`,
        })
      } else if (emailSent && !notificationCreated) {
        toast.warning("Invitation created, notification failed", {
          description: `Email sent. Reason: ${notificationError ?? "unknown error"}`,
        })
      } else {
        toast.warning("Invitation created, but email and notification failed", {
          description: `Email: ${emailError ?? "unknown"}. Notification: ${notificationError ?? "unknown"}.`,
        })
      }

      setInviteOpen(false)
      setInviteEmail("")
    } catch {
      toast.error("Failed to send invitation")
    } finally {
      setInviting(false)
    }
  }

  async function handleRemoveMember(member: Member) {
    if (!workspace?.id) return
    await fetch(`/api/members/${member.userId}/remove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: workspace.id }),
    })
    setRemoveTarget(null)
    loadMembers()
  }

  async function handleTransferOwnership(member: Member) {
    if (!workspace?.id) return
    await fetch(`/api/members/${member.userId}/transfer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: workspace.id }),
    })
    setTransferTarget(null)
    loadMembers()
  }

  async function handleRoleChange(member: Member, newRole: string) {
    if (!workspace?.id) return
    await fetch(`/api/members/${member.userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: workspace.id, role: newRole }),
    })
    setRoleChangeTarget(null)
    loadMembers()
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Members" description="Manage workspace members and roles">
        {isAdmin && (
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        )}
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">All roles</SelectItem>
            {roles.map((r) => (
              <SelectItem key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Members List */}
      {loading ? (
        <ListSkeleton items={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No members found"
          description={search ? "Try a different search" : "Invite members to your workspace"}
          action={
            isAdmin ? (
              <Button variant="outline" onClick={() => setInviteOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((member, i) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 hover:shadow-md transition-shadow"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={member.user.image ?? undefined} />
                <AvatarFallback>{member.user.name?.charAt(0)?.toUpperCase() ?? "?"}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    {member.user.name ?? "Unnamed"}
                  </p>
                  <StatusDot status={member.user.status} />
                  {member.role === "OWNER" && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                  {member.user.email}
                  {member.user.position && ` · ${member.user.position}`}
                </p>
              </div>

              <div className="hidden sm:block text-xs text-zinc-400 text-right">
                {member.user.lastActiveAt
                  ? formatDistanceToNow(new Date(member.user.lastActiveAt), { addSuffix: true })
                  : "Never"}
              </div>

              <RoleBadge role={member.role} />

              {isAdmin && member.role !== "OWNER" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setRoleChangeTarget(member)}>
                      <Shield className="mr-2 h-4 w-4" />
                      Change Role
                    </DropdownMenuItem>
                    {isOwner && (
                      <DropdownMenuItem onClick={() => setTransferTarget(member)}>
                        <ArrowLeftRight className="mr-2 h-4 w-4" />
                        Transfer Ownership
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600 dark:text-red-400"
                      onClick={() => setRemoveTarget(member)}
                    >
                      <UserMinus className="mr-2 h-4 w-4" />
                      Remove Member
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join this workspace
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email address</label>
              <Input
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                type="email"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.filter((r) => r !== "OWNER").map((r) => (
                    <SelectItem key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={!inviteEmail || inviting}>
              {inviting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Change Dialog */}
      {roleChangeTarget && (
        <Dialog open={!!roleChangeTarget} onOpenChange={() => setRoleChangeTarget(null)}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Change Role</DialogTitle>
              <DialogDescription>
                Update role for {roleChangeTarget.user.name ?? roleChangeTarget.user.email}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Select
                value={roleChangeTarget.role}
                onValueChange={(v) => handleRoleChange(roleChangeTarget, v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.filter((r) => r !== "OWNER").map((r) => (
                    <SelectItem key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Remove Confirm */}
      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
        title="Remove member"
        description={`Are you sure you want to remove ${removeTarget?.user.name ?? "this member"} from the workspace?`}
        confirmLabel="Remove"
        onConfirm={() => removeTarget && handleRemoveMember(removeTarget)}
      />

      {/* Transfer Ownership Confirm */}
      <ConfirmDialog
        open={!!transferTarget}
        onOpenChange={(o) => !o && setTransferTarget(null)}
        title="Transfer ownership"
        description={`Transfer workspace ownership to ${transferTarget?.user.name ?? "this member"}? You will no longer be the workspace owner.`}
        confirmLabel="Transfer"
        variant="warning"
        onConfirm={() => transferTarget && handleTransferOwnership(transferTarget)}
      />
    </div>
  )
}
