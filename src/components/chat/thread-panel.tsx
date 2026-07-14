"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Loader2, MessageSquare } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useSocket } from "@/features/chat/socket/provider"
import type { Message } from "@/hooks/use-messages"
import { toast } from "sonner"

interface ThreadPanelProps {
  parentMessage: Message | null
  open: boolean
  onClose: () => void
  onReact?: (messageId: string, emoji: string) => void
}

export function ThreadPanel({ parentMessage, open, onClose, onReact }: ThreadPanelProps) {
  const [replies, setReplies] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [content, setContent] = useState("")
  const { socket } = useSocket()
  const listRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)

  useEffect(() => {
    if (!parentMessage || !open) return
    let cancelled = false
    loadingRef.current = true
    if (!cancelled) setLoading(true)
    const fetchReplies = async () => {
      try {
        const res = await fetch(`/api/messages/${parentMessage.id}/thread`)
        const json = await res.json()
        if (!cancelled && json.success) {
          setReplies(json.data)
        }
      } catch {
      } finally {
        if (!cancelled) {
          setLoading(false)
          loadingRef.current = false
        }
      }
    }
    fetchReplies()
    return () => { cancelled = true }
  }, [parentMessage?.id, open])

  useEffect(() => {
    if (!socket || !parentMessage) return
    const pid = parentMessage.id

    function handleNewMessage(msg: Message) {
      if (msg.parentId === pid) {
        setReplies((prev) => {
          if (prev.find((r) => r.id === msg.id)) return prev
          return [...prev, msg]
        })
      }
    }

    socket.on("message:sent", handleNewMessage)
    return () => {
      socket.off("message:sent", handleNewMessage)
    }
  }, [socket, parentMessage?.id])

  const handleSend = useCallback(async () => {
    if (!content.trim() || !parentMessage) return
    const res = await fetch(`/api/messages/${parentMessage.id}/thread`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.trim() }),
    })
    const json = await res.json()
    if (json.success) {
      const reply = json.data
      setReplies((prev) => [...prev, reply])
      setContent("")
      if (socket) {
        const target = parentMessage.channelId
          ? { channelId: parentMessage.channelId }
          : { conversationId: parentMessage.conversationId }
        socket.emit("message:sent", { ...target, message: reply })
      }
    } else {
      toast.error(json.error ?? "Failed to send reply")
    }
  }, [content, parentMessage, socket])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="w-80 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col shrink-0"
        >
          <div className="flex items-center justify-between px-4 h-12 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Thread</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={listRef}>
            {parentMessage && (
              <div className="pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-start gap-2 mb-1">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={parentMessage.sender.image ?? undefined} />
                    <AvatarFallback className="text-[8px]">{parentMessage.sender.name?.charAt(0) ?? "?"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{parentMessage.sender.name}</span>
                      <span className="text-[10px] text-zinc-400">{formatDistanceToNow(new Date(parentMessage.createdAt), { addSuffix: true })}</span>
                    </div>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-0.5">{parentMessage.content}</p>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
              </div>
            ) : replies.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-8">No replies yet</p>
            ) : (
              replies.map((reply) => (
                <div key={reply.id} className="flex items-start gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={reply.sender.image ?? undefined} />
                    <AvatarFallback className="text-[8px]">{reply.sender.name?.charAt(0) ?? "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{reply.sender.name}</span>
                      <span className="text-[10px] text-zinc-400">{formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}</span>
                    </div>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-0.5">{reply.content}</p>
                    {reply.reactions && reply.reactions.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        {reply.reactions.map((r) => (
                          <button key={r.id} onClick={() => onReact?.(reply.id, r.emoji)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800"
                          >
                            {r.emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
            <div className="flex items-end gap-2 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5">
              <textarea
                className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 border-none outline-none resize-none min-h-[36px] max-h-[120px] leading-tight py-1.5"
                placeholder="Reply in thread..."
                value={content}
                rows={1}
                onChange={(e) => setContent(e.target.value)}
                onInput={(e) => {
                  const el = e.currentTarget
                  el.style.height = "auto"
                  el.style.height = `${Math.min(el.scrollHeight, 120)}px`
                }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              />
              <button onClick={handleSend} disabled={!content.trim()} className="shrink-0 flex h-7 w-7 items-center justify-center rounded text-zinc-400 hover:text-zinc-600 disabled:opacity-50 transition-colors">
                <MessageSquare className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
