"use client"

import { useRef, useEffect, useCallback, useState, memo } from "react"
import { MessageCard } from "./message-card"
import { DateSeparator } from "./date-separator"
import { Loader2 } from "lucide-react"
import type { Message } from "@/hooks/use-messages"
import { isSameDay, parseISO } from "date-fns"

interface MessageListProps {
  messages: Message[]
  loading: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  sessionUserId: string
  onEdit: (id: string, content: string) => void
  onDelete: (id: string) => void
  onReact: (id: string, emoji: string) => void
  onThreadClick: (message: Message) => void
}

export const MessageList = memo(function MessageList({
  messages,
  loading,
  hasMore,
  onLoadMore,
  sessionUserId,
  onEdit,
  onDelete,
  onReact,
  onThreadClick,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const prevLength = useRef(messages.length)

  useEffect(() => {
    if (shouldAutoScroll && messages.length > prevLength.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
    prevLength.current = messages.length
  }, [messages.length, shouldAutoScroll])

  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150
    setShouldAutoScroll(atBottom)
    if (atBottom && hasMore && el.scrollTop === 0 && onLoadMore) {
      onLoadMore()
    }
  }, [hasMore, onLoadMore])

  const sorted = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  let lastDate: string | null = null

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto"
    >
      {loading && messages.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-zinc-400">No messages yet. Start the conversation!</p>
        </div>
      ) : (
        <div className="py-3 px-4">
          {hasMore && (
            <div className="flex justify-center py-2">
              <button
                onClick={onLoadMore}
                className="text-xs text-blue-500 hover:text-blue-600 transition-colors"
              >
                Load older messages
              </button>
            </div>
          )}
          {sorted.map((msg) => {
            const msgDate = parseISO(msg.createdAt)
            const dateKey = msgDate.toDateString()
            const showDate = dateKey !== lastDate
            lastDate = dateKey

            return (
              <div key={msg.id}>
                {showDate && <DateSeparator date={msgDate} />}
                <MessageCard
                  message={msg}
                  isOwn={msg.senderId === sessionUserId}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onReact={onReact}
                  onThreadClick={onThreadClick}
                />
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
})
