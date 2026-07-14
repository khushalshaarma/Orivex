"use client"

import { useState, useCallback } from "react"
import { formatDistanceToNow } from "date-fns"
import { Edit3, Trash2, Pin, MoreHorizontal, MessageSquare, Copy, Forward } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { EmojiPicker } from "./emoji-picker"
import type { Message } from "@/hooks/use-messages"
import { toast } from "sonner"

interface MessageCardProps {
  message: Message
  isOwn: boolean
  onEdit?: (id: string, content: string) => void
  onDelete?: (id: string) => void
  onPin?: (id: string) => void
  onReact?: (id: string, emoji: string) => void
  onThreadClick?: (message: Message) => void
  threadReplyCount?: number
}

const statusIcons: Record<string, React.ReactNode> = {
  SENT: <span className="text-[10px] text-zinc-400">✓</span>,
  DELIVERED: <span className="text-[10px] text-zinc-400">✓✓</span>,
  READ: <span className="text-[10px] text-blue-500">✓✓</span>,
}

function renderContent(content: string) {
  const urlRegex = /(https?:\/\/[^\s<]+)/g
  const codeBlockRegex = /```([\s\S]*?)```/g
  const inlineCodeRegex = /`([^`]+)`/g

  const codeBlocks: { start: number; end: number; content: string }[] = []
  let codeMatch: RegExpExecArray | null
  while ((codeMatch = codeBlockRegex.exec(content)) !== null) {
    codeBlocks.push({ start: codeMatch.index, end: codeMatch.index + codeMatch[0].length, content: codeMatch[1] })
  }

  const segments: { start: number; end: number; type: "text" | "code" | "url" | "inline-code"; content: string }[] = []

  let i = 0
  while (i < content.length) {
    const codeBlock = codeBlocks.find((cb) => i >= cb.start && i < cb.end)
    if (codeBlock) {
      segments.push({ start: codeBlock.start, end: codeBlock.end, type: "code", content: codeBlock.content })
      i = codeBlock.end
      continue
    }
    const rest = content.slice(i)
    const inlineMatch = rest.match(inlineCodeRegex)
    if (inlineMatch && inlineMatch.index === 0) {
      segments.push({ start: i, end: i + inlineMatch[0].length, type: "inline-code", content: inlineMatch[1] })
      i += inlineMatch[0].length
      continue
    }
    const urlMatch = rest.match(urlRegex)
    if (urlMatch && urlMatch.index === 0) {
      segments.push({ start: i, end: i + urlMatch[0].length, type: "url", content: urlMatch[0] })
      i += urlMatch[0].length
      continue
    }
    const lineEnd = content.indexOf("\n", i)
    const nextSegment = lineEnd >= 0 ? lineEnd + 1 : content.length
    segments.push({ start: i, end: nextSegment, type: "text", content: content.slice(i, nextSegment) })
    i = nextSegment
  }

  return segments.map((seg, idx) => {
    if (seg.type === "code") {
      return (
        <pre key={idx} className="bg-zinc-100 dark:bg-zinc-800 rounded p-2 my-1 overflow-x-auto text-[12px] font-mono">
          <code>{seg.content}</code>
        </pre>
      )
    }
    if (seg.type === "inline-code") {
      return <code key={idx} className="bg-zinc-100 dark:bg-zinc-800 rounded px-1 text-[12px] font-mono">{seg.content}</code>
    }
    if (seg.type === "url") {
      return (
        <a key={idx} href={seg.content} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all">
          {seg.content}
        </a>
      )
    }
    if (seg.content.startsWith("@")) {
      return <span key={idx} className="text-blue-500 font-medium">{seg.content}</span>
    }
    return <span key={idx}>{seg.content}</span>
  })
}

export function MessageCard({ message, isOwn, onEdit, onDelete, onPin, onReact, onThreadClick, threadReplyCount }: MessageCardProps) {
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [showActions, setShowActions] = useState(false)
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)

  function handleSaveEdit() {
    if (editContent.trim() && editContent !== message.content) {
      onEdit?.(message.id, editContent)
    }
    setEditing(false)
  }

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content)
    toast.success("Copied to clipboard")
  }, [message.content])

  if (message.type === "SYSTEM") {
    return (
      <div className="flex items-center justify-center py-2">
        <span className="text-[11px] text-zinc-400 italic">{message.content}</span>
      </div>
    )
  }

  if (message.deleted) {
    return (
      <div className="flex items-center justify-center py-2">
        <span className="text-[11px] text-zinc-400 italic">This message was deleted</span>
      </div>
    )
  }

  return (
    <div
      className="group flex items-start gap-3 px-4 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors relative"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Avatar className="h-8 w-8 flex-shrink-0 mt-0.5">
        <AvatarImage src={message.sender.image ?? undefined} />
        <AvatarFallback className="text-[10px]">{message.sender.name?.charAt(0) ?? "?"}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {message.sender.name ?? "Unknown"}
          </span>
          <span className="text-[11px] text-zinc-400">
            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
          </span>
          {message.edited && <span className="text-[10px] text-zinc-400 italic">(edited)</span>}
          {message.pinned && (
            <span className="flex items-center gap-0.5 text-[10px] text-amber-500">
              <Pin className="h-2.5 w-2.5" /> Pinned
            </span>
          )}
          {isOwn && (
            <span className="ml-auto">{statusIcons[message.status] ?? null}</span>
          )}
        </div>

        {editing ? (
          <div className="space-y-1">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[40px] text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSaveEdit() }
                if (e.key === "Escape") setEditing(false)
              }}
            />
            <div className="flex gap-1">
              <Button size="sm" className="h-7 text-xs" onClick={handleSaveEdit}>Save</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-words">
            {renderContent(message.content)}
          </div>
        )}

        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {message.attachments.map((att) => (
              <div key={att.id} className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-600 dark:text-zinc-400">
                <a href={att.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 truncate max-w-[200px]">
                  {att.name}
                </a>
              </div>
            ))}
          </div>
        )}

        {message.reactions && message.reactions.length > 0 && (
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {message.reactions.map((r) => (
              <button
                key={r.id}
                onClick={() => onReact?.(message.id, r.emoji)}
                className={cn(
                  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] border transition-colors",
                  r.userId === message.senderId
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                    : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                )}
              >
                {r.emoji}
              </button>
            ))}
            <button
              onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
              className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 px-1"
            >
              +
            </button>
          </div>
        )}

        {onThreadClick && (
          <button
            onClick={() => onThreadClick(message)}
            className="flex items-center gap-1.5 mt-1 text-[11px] text-zinc-400 hover:text-blue-500 transition-colors"
          >
            <MessageSquare className="h-3 w-3" />
            <span>{threadReplyCount ?? message._count?.replies ?? 0 > 0 ? `${message._count?.replies ?? 0} replies` : "Reply in thread"}</span>
          </button>
        )}
      </div>

      {showActions && (
        <div className="absolute right-2 top-0 -translate-y-1/2 flex items-center gap-px bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm">
          <div className="relative">
            <button
              onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
              className="flex h-7 w-7 items-center justify-center rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="React"
            >
              <span className="text-sm">🙂</span>
            </button>
            <EmojiPicker
              open={emojiPickerOpen}
              onSelect={(emoji) => { onReact?.(message.id, emoji); setEmojiPickerOpen(false) }}
              onClose={() => setEmojiPickerOpen(false)}
            />
          </div>
          {isOwn && onEdit && (
            <button
              onClick={() => { setEditing(true); setEditContent(message.content) }}
              className="flex h-7 w-7 items-center justify-center rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Edit"
            >
              <Edit3 className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex h-7 w-7 items-center justify-center rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Copy"
          >
            <Copy className="h-3 w-3" />
          </button>
          {onPin && (
            <button
              onClick={() => onPin(message.id)}
              className="flex h-7 w-7 items-center justify-center rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Pin"
            >
              <Pin className="h-3 w-3" />
            </button>
          )}
          <button
            className="flex h-7 w-7 items-center justify-center rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Forward"
          >
            <Forward className="h-3 w-3" />
          </button>
          {isOwn && onDelete && (
            <button
              onClick={() => onDelete(message.id)}
              className="flex h-7 w-7 items-center justify-center rounded text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
          <button className="flex h-7 w-7 items-center justify-center rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <MoreHorizontal className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}
