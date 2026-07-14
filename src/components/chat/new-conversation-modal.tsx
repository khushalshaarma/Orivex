"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Search, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface NewConversationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
  members: { id: string; name: string | null; image: string | null }[]
  currentUserId: string
  workspaceId?: string | null
}

export function NewConversationModal({ open, onOpenChange, onCreated, members, currentUserId, workspaceId }: NewConversationModalProps) {
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const otherMembers = members.filter((m) => m.id !== currentUserId)
  const filtered = otherMembers.filter(
    (m) => !search || m.name?.toLowerCase().includes(search.toLowerCase())
  )

  function toggle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  async function handleSubmit() {
    if (selectedIds.length === 0) { setError("Select at least one member"); return }
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, userIds: selectedIds }),
      })
      const json = await res.json()
      if (json.success) {
        setSearch("")
        setSelectedIds([])
        onOpenChange(false)
        onCreated()
      } else {
        setError(json.error ?? "Failed to create conversation")
      }
    } catch {
      setError("Failed to create conversation")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
          <DialogDescription>Start a conversation with your team members</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search members..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {filtered.length === 0 && (
              <p className="text-sm text-zinc-400 text-center py-4">No members found</p>
            )}
            {filtered.map((member) => {
              const selected = selectedIds.includes(member.id)
              return (
                <button
                  key={member.id}
                  onClick={() => toggle(member.id)}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors",
                    selected
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.image ?? undefined} />
                    <AvatarFallback>{member.name?.charAt(0) ?? "?"}</AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-left font-medium">{member.name ?? "Unknown"}</span>
                  {selected && <Check className="h-4 w-4 text-blue-500" />}
                </button>
              )
            })}
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving || selectedIds.length === 0}>
              {saving ? "Creating..." : "Start Conversation"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
