"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import {
  Plus,
  Users,
  Settings2,
  Archive,
  Loader2,
} from "lucide-react"
import { useWorkspace, useWorkspaceMembers } from "@/hooks/use-workspace"
import { useCan } from "@/hooks/use-permissions"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
import { Card, CardContent } from "@/components/ui/card"
import { ListSkeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

interface Team {
  id: string
  name: string
  slug: string
  description: string | null
  color: string | null
  icon: string | null
  leadId: string | null
  workspaceId: string | null
  createdAt: string
  _count: { members: number; projects: number }
  lead: { id: string; name: string | null; image: string | null; email: string } | null
  members: Array<{
    id: string
    userId: string
    role: string
    user: { id: string; name: string | null; image: string | null; email: string }
  }>
}

const colors = [
  "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#f43f5e",
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6", "#6b7280",
]

export default function TeamsPage() {
  const { workspace } = useWorkspace()
  const { members } = useWorkspaceMembers()
  const searchParams = useSearchParams()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  const [createOpen, setCreateOpen] = useState(searchParams.get("create") === "true")
  const [editTarget, setEditTarget] = useState<Team | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<Team | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: "",
    description: "",
    color: "#6366f1",
    leadId: "",
  })

  const { allowed: canCreate } = useCan("team:create")
  const { allowed: canEdit } = useCan("team:update")
  const { allowed: canDelete } = useCan("team:delete")

  const loadTeams = useCallback(async () => { // eslint-disable-line react-hooks/preserve-manual-memoization
    if (!workspace?.id) return
    try {
      const res = await fetch(`/api/workspace/${workspace.id}/teams`)
      const json = await res.json()
      setTeams(json.data ?? [])
    } catch {
    } finally {
      setLoading(false)
    }
  }, [workspace?.id])

  useEffect(() => { loadTeams() }, [loadTeams]) // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => { if (searchParams.get("create") === "true") setCreateOpen(true) }, [searchParams]) // eslint-disable-line react-hooks/set-state-in-effect

  function resetForm() {
    setForm({ name: "", description: "", color: "#6366f1", leadId: "" })
  }

  async function handleCreate() {
    if (!workspace?.id) return
    setSaving(true)
    try {
      await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, workspaceId: workspace.id }),
      })
      setCreateOpen(false)
      resetForm()
      loadTeams()
    } catch {
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit() {
    if (!editTarget) return
    setSaving(true)
    try {
      await fetch(`/api/teams/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      setEditTarget(null)
      resetForm()
      loadTeams()
    } catch {
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    await fetch(`/api/teams/${deleteTarget.id}`, { method: "DELETE" })
    setDeleteTarget(null)
    loadTeams()
  }

  async function handleArchive() {
    if (!archiveTarget) return
    await fetch(`/api/teams/${archiveTarget.id}?archive=true`, { method: "DELETE" })
    setArchiveTarget(null)
    loadTeams()
  }

  function openEdit(team: Team) {
    setEditTarget(team)
    setForm({
      name: team.name,
      description: team.description ?? "",
      color: team.color ?? "#6366f1",
      leadId: team.leadId ?? "",
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Teams" description="Manage your workspace teams">
        {canCreate && (
          <Button onClick={() => { resetForm(); setCreateOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" />
            Create Team
          </Button>
        )}
      </PageHeader>

      {loading ? (
        <ListSkeleton items={4} />
      ) : teams.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No teams yet"
          description="Create teams to organize your workspace"
          action={
            canCreate ? (
              <Button onClick={() => { resetForm(); setCreateOpen(true) }}>
                <Plus className="mr-2 h-4 w-4" />
                Create Team
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team, i) => (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="group relative overflow-hidden transition-all hover:shadow-lg hover:shadow-zinc-900/5 dark:hover:shadow-black/20">
                <div className="h-2" style={{ backgroundColor: team.color ?? "#6366f1" }} />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white"
                        style={{ backgroundColor: team.color ?? "#6366f1" }}
                      >
                        {team.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{team.name}</h3>
                        {team.description && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
                            {team.description}
                          </p>
                        )}
                      </div>
                    </div>
                    {(canEdit || canDelete) && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEdit && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(team)}>
                            <Settings2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => setArchiveTarget(team)}>
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                    <span>{team._count.members} members</span>
                    <span>{team._count.projects} projects</span>
                  </div>

                  {team.lead && (
                    <div className="mt-3 flex items-center gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={team.lead.image ?? undefined} />
                        <AvatarFallback className="text-[10px]">{team.lead.name?.charAt(0) ?? "?"}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">
                        Lead: {team.lead.name ?? team.lead.email}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={createOpen || !!editTarget} onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEditTarget(null) } }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Team" : "Create Team"}</DialogTitle>
            <DialogDescription>
              {editTarget ? "Update team details" : "Create a new team in your workspace"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="Team name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="What does this team do?"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, color: c }))}
                    className={`h-8 w-8 rounded-lg transition-all ${
                      form.color === c ? "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900 scale-110" : ""
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Team Lead</Label>
              <Select
                value={form.leadId}
                onValueChange={(v) => setForm((p) => ({ ...p, leadId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a lead" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      {m.user.name ?? m.user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); setEditTarget(null) }}>
              Cancel
            </Button>
            <Button onClick={editTarget ? handleEdit : handleCreate} disabled={!form.name || saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editTarget ? "Save Changes" : "Create Team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirm */}
      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(o) => !o && setArchiveTarget(null)}
        title="Archive team"
        description={`Archive ${archiveTarget?.name}? Members and projects won't be deleted.`}
        confirmLabel="Archive"
        variant="warning"
        onConfirm={handleArchive}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete team"
        description={`Permanently delete ${deleteTarget?.name}? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  )
}
