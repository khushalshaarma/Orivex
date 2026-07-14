"use client"

import { useState, useEffect } from "react"
import { Hash, Plus, MessageCircle, Search, Settings, ChevronDown, ChevronRight, Phone, Video, Lock, BellOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useSocket } from "@/features/chat/socket/provider"
import { SOCKET_EVENTS } from "@/features/chat/socket/types"
import type { PresenceData } from "@/features/chat/socket/types"

interface Channel {
  id: string
  name: string
  slug?: string
  description?: string
  type?: string
  archived?: boolean
  icon?: string
  color?: string
  _count?: { members: number; messages: number }
}

interface Conversation {
  id: string
  members: { id: string; name: string | null; image: string | null }[]
  messages?: { content: string; createdAt: string; senderId: string; type: string }[]
  _count?: { messages: number }
}

interface ChatSidebarProps {
  channels: Channel[]
  conversations: Conversation[]
  activeChannelId: string | null
  activeConversationId: string | null
  unreadMap?: Record<string, number>
  onChannelSelect: (id: string) => void
  onConversationSelect: (id: string) => void
  onCreateChannel: () => void
  onNewConversation: () => void
  online?: boolean
}

function PresenceDot({ userId, onlineUsers }: { userId: string; onlineUsers: Set<string> }) {
  const isOnline = onlineUsers.has(userId)
  return (
    <span
      className={cn(
        "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-zinc-950 transition-colors",
        isOnline ? "bg-green-500" : "bg-zinc-300 dark:bg-zinc-600"
      )}
    />
  )
}

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="ml-auto flex-shrink-0 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
      {count > 99 ? "99+" : count}
    </span>
  )
}

export function ChatSidebar({
  channels,
  conversations,
  activeChannelId,
  activeConversationId,
  unreadMap = {},
  onChannelSelect,
  onConversationSelect,
  onCreateChannel,
  onNewConversation,
  online = false,
}: ChatSidebarProps) {
  const [channelsOpen, setChannelsOpen] = useState(true)
  const [dmsOpen, setDmsOpen] = useState(true)
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const { socket } = useSocket()

  useEffect(() => {
    if (!socket) return

    function handlePresence(data: PresenceData) {
      setOnlineUsers((prev) => {
        const next = new Set(prev)
        if (data.status === "offline") {
          next.delete(data.userId)
        } else {
          next.add(data.userId)
        }
        return next
      })
    }

    function handleInitialPresence(users: PresenceData[]) {
      setOnlineUsers(new Set(users.filter((u) => u.status !== "offline").map((u) => u.userId)))
    }

    socket.on(SOCKET_EVENTS.PRESENCE_UPDATE, handlePresence)
    socket.on("presence:init", handleInitialPresence)

    return () => {
      socket.off(SOCKET_EVENTS.PRESENCE_UPDATE, handlePresence)
      socket.off("presence:init", handleInitialPresence)
    }
  }, [socket])

  const publicChannels = channels.filter((c) => c.type === "PUBLIC" || !c.type)
  const privateChannels = channels.filter((c) => c.type === "PRIVATE")
  const announcementChannels = channels.filter((c) => c.type === "ANNOUNCEMENT")

  return (
    <div className="flex h-full flex-col bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 w-60">
      <div className="flex h-12 items-center justify-between px-3 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          <MessageCircle className="h-4 w-4" />
          <span>Chat</span>
          {!online && <span className="h-2 w-2 rounded-full bg-amber-400" title="Reconnecting..." />}
        </div>
        <div className="flex items-center gap-0.5">
          <button className="h-7 w-7 inline-flex items-center justify-center rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <Search className="h-3.5 w-3.5" />
          </button>
          <button className="h-7 w-7 inline-flex items-center justify-center rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <button
              onClick={() => setChannelsOpen(!channelsOpen)}
              className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              {channelsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <span>Channels</span>
            </button>
            <button
              type="button"
              onClick={onCreateChannel}
              className="h-5 w-5 inline-flex items-center justify-center rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="Create channel"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
          {channelsOpen && (
            <div className="space-y-0.5">
              {publicChannels.map((ch) => (
                <ChannelItem
                  key={ch.id}
                  channel={ch}
                  isActive={activeChannelId === ch.id}
                  unread={unreadMap[ch.id] ?? 0}
                  onClick={() => onChannelSelect(ch.id)}
                />
              ))}
              {privateChannels.length > 0 && (
                <div className="text-[10px] text-zinc-400 uppercase px-2 pt-1 pb-0.5">Private</div>
              )}
              {privateChannels.map((ch) => (
                <ChannelItem
                  key={ch.id}
                  channel={ch}
                  isActive={activeChannelId === ch.id}
                  unread={unreadMap[ch.id] ?? 0}
                  onClick={() => onChannelSelect(ch.id)}
                  icon={<Lock className="h-3.5 w-3.5 shrink-0 text-zinc-400" />}
                />
              ))}
              {announcementChannels.length > 0 && (
                <div className="text-[10px] text-zinc-400 uppercase px-2 pt-1 pb-0.5">Announcements</div>
              )}
              {announcementChannels.map((ch) => (
                <ChannelItem
                  key={ch.id}
                  channel={ch}
                  isActive={activeChannelId === ch.id}
                  unread={unreadMap[ch.id] ?? 0}
                  onClick={() => onChannelSelect(ch.id)}
                  icon={<BellOff className="h-3.5 w-3.5 shrink-0 text-zinc-400" />}
                />
              ))}
              {channels.length === 0 && (
                <p className="text-[11px] text-zinc-400 px-2 py-1">No channels yet</p>
              )}
            </div>
          )}
        </div>

        <div>
          <div
            onClick={() => setDmsOpen(!dmsOpen)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDmsOpen(!dmsOpen) } }}
            role="button"
            tabIndex={0}
            className="flex w-full items-center justify-between mb-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer"
          >
            <div className="flex items-center gap-1">
              {dmsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <span>Direct Messages</span>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onNewConversation() }}
              className="h-5 w-5 inline-flex items-center justify-center rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="New message"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
          {dmsOpen && (
            <div className="space-y-0.5">
              {conversations.map((conv) => {
                const other = conv.members[0]
                return (
                  <button
                    key={conv.id}
                    onClick={() => onConversationSelect(conv.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors group",
                      activeConversationId === conv.id
                        ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                        : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300"
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={other?.image ?? undefined} />
                        <AvatarFallback className="text-[8px]">{other?.name?.charAt(0) ?? "?"}</AvatarFallback>
                      </Avatar>
                      <PresenceDot userId={other?.id ?? ""} onlineUsers={onlineUsers} />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <span className="truncate block">{other?.name ?? "Unknown"}</span>
                      {conv.messages?.[0] && (
                        <span className="text-[10px] text-zinc-400 truncate block">
                          {conv.messages[0].senderId === other?.id ? "" : "You: "}
                          {conv.messages[0].content}
                        </span>
                      )}
                    </div>
                    <UnreadBadge count={unreadMap[conv.id] ?? 0} />
                    <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                      <Phone className="h-3 w-3 text-zinc-400" />
                      <Video className="h-3 w-3 text-zinc-400" />
                    </div>
                  </button>
                )
              })}
              {conversations.length === 0 && (
                <p className="text-[11px] text-zinc-400 px-2 py-1">No conversations yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ChannelItem({
  channel,
  isActive,
  unread,
  onClick,
  icon,
}: {
  channel: Channel
  isActive: boolean
  unread: number
  onClick: () => void
  icon?: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded px-2 py-1 text-sm transition-colors group",
        isActive
          ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
          : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300"
      )}
    >
      {icon ?? <Hash className="h-3.5 w-3.5 shrink-0" />}
      <span className="truncate flex-1 text-left">{channel.name}</span>
      {channel.type === "ANNOUNCEMENT" && (
        <BellOff className="h-3 w-3 text-zinc-400 shrink-0" />
      )}
      <UnreadBadge count={unread} />
    </button>
  )
}
