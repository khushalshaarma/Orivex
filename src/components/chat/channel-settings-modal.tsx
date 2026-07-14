"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Trash2, Crown, Shield, User } from "lucide-react"
import type { Channel } from "@/hooks/use-channels"

interface ChannelSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  channel: Channel | null
  members?: {
    id: string
    role: string
    user: { id: string; name: string | null; image: string | null; email: string | null } | null
  }[]
  currentUserId: string
}

const roleIcons: Record<string, React.ElementType> = {
  OWNER: Crown,
  MODERATOR: Shield,
  MEMBER: User,
}

export function ChannelSettingsModal({ open, onOpenChange, channel, members, currentUserId }: ChannelSettingsModalProps) {
  const ch = channel
  const [name, setName] = useState(ch?.name ?? "")
  const [description, setDescription] = useState(ch?.description ?? "")

  if (!ch) return null

  async function handleSave() {
    if (!ch) return
    await fetch(`/api/channels/${ch.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
    })
    onOpenChange(false)
  }

  async function handleRemoveMember(userId: string) {
    if (!ch) return
    await fetch(`/api/channels/${ch.id}/members/${userId}`, { method: "DELETE" })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Channel Settings — #{ch.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-3">
            <Label>Channel Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[60px]"
            />
            <Button size="sm" onClick={handleSave}>Save</Button>
          </div>

          <div>
            <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Members ({members?.length ?? 0})
            </h4>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {members?.map((member) => {
                const RoleIcon = roleIcons[member.role] ?? User
                return (
                  <div key={member.id} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={member.user?.image ?? undefined} />
                      <AvatarFallback className="text-[9px]">{member.user?.name?.charAt(0) ?? "?"}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">
                      {member.user?.name ?? "Unknown"}
                    </span>
                    <RoleIcon className="h-3.5 w-3.5 text-zinc-400" />
                    <span className="text-[10px] uppercase text-zinc-400">{member.role}</span>
                    {member.user?.id !== currentUserId && member.role !== "OWNER" && (
                      <button
                        onClick={() => handleRemoveMember(member.user!.id)}
                        className="opacity-0 hover:opacity-100 text-zinc-400 hover:text-red-500 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
