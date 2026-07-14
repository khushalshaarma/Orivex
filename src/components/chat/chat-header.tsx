"use client"

import { useState, useEffect } from "react"
import { Hash, Users, Pin, Search, Info, Phone, Video } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSocket } from "@/features/chat/socket/provider"
import type { TypingUser } from "@/features/chat/socket/types"

interface ChatHeaderProps {
  title: string
  type: "channel" | "direct"
  channelId?: string | null
  conversationId?: string | null
  pinnedCount?: number
  onlineCount?: number
  onVoiceCall?: () => void
  onVideoCall?: () => void
}

export function ChatHeader({ title, type, channelId, conversationId, pinnedCount, onlineCount, onVoiceCall, onVideoCall }: ChatHeaderProps) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const { socket } = useSocket()

  useEffect(() => {
    if (!socket) return
    const target = channelId ? { channelId } : conversationId ? { conversationId } : null
    if (!target) return

    function handleTyping(data: TypingUser) {
      const isTarget = (data.channelId && data.channelId === channelId) || (data.conversationId && data.conversationId === conversationId)
      if (!isTarget) return
      setTypingUsers((prev) => {
        if (prev.find((u) => u.userId === data.userId)) return prev
        return [...prev, data]
      })
    }

    function handleStopTyping(data: TypingUser) {
      setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId))
    }

    function handleTypingUpdate(data: { userId: string; stop?: boolean }) {
      setTypingUsers((prev) => {
        if (data.stop) return prev.filter((u) => u.userId !== data.userId)
        if (prev.find((u) => u.userId === data.userId)) return prev
        return [...prev, data as unknown as TypingUser]
      })
    }

    socket.on("typing:start", handleTyping)
    socket.on("typing:stop", handleStopTyping)
    socket.on("typing:update", handleTypingUpdate)

    return () => {
      socket.off("typing:start", handleTyping)
      socket.off("typing:stop", handleStopTyping)
      socket.off("typing:update", handleTypingUpdate)
    }
  }, [socket, channelId, conversationId])

  const icon = type === "channel" ? (
    <Hash className="h-4 w-4 text-zinc-400" />
  ) : (
    <Users className="h-4 w-4 text-zinc-400" />
  )

  const typingText = typingUsers.length > 0
    ? typingUsers.length === 1
      ? `${typingUsers[0].userName ?? "Someone"} is typing...`
      : `${typingUsers.length} people are typing...`
    : null

  return (
    <div className="flex items-center justify-between h-12 px-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        {icon}
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{title}</h2>
        {typingText && (
          <span className="text-[10px] text-zinc-400 italic ml-2 truncate animate-pulse">{typingText}</span>
        )}
        {type === "channel" && onlineCount !== undefined && (
          <span className="text-[11px] text-zinc-400 hidden sm:inline">{onlineCount} online</span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {type === "direct" && (
          <>
            {onVoiceCall && (
              <button
                onClick={onVoiceCall}
                className="h-7 w-7 inline-flex items-center justify-center rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Voice call"
              >
                <Phone className="h-3.5 w-3.5" />
              </button>
            )}
            {onVideoCall && (
              <button
                onClick={onVideoCall}
                className="h-7 w-7 inline-flex items-center justify-center rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Video call"
              >
                <Video className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        )}
        {pinnedCount !== undefined && pinnedCount > 0 && (
          <button className="h-7 w-7 inline-flex items-center justify-center rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" title={`${pinnedCount} pinned messages`}>
            <Pin className="h-3.5 w-3.5" />
          </button>
        )}
        <button className="h-7 w-7 inline-flex items-center justify-center rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
          <Search className="h-3.5 w-3.5" />
        </button>
        <button className="h-7 w-7 inline-flex items-center justify-center rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
          <Info className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
