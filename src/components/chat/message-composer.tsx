"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { Send, Paperclip, X, FileText } from "lucide-react"
import { useSocket } from "@/features/chat/socket/provider"
import { useSession } from "next-auth/react"
import { useActiveWorkspace } from "@/hooks/use-workspace"
import { MentionAutocomplete } from "@/components/notifications/mention-autocomplete"
import { useChatFileUpload } from "@/hooks/use-chat-file-upload"
import { toast } from "sonner"

interface Member {
  id: string
  name: string
  image?: string | null
  email?: string
}

interface MessageComposerProps {
  onSend: (content: string, fileUrls?: string[]) => Promise<void>
  placeholder?: string
  channelId?: string | null
  conversationId?: string | null
}

const MENTION_TRIGGER = /(?:^|\s)@([\w]*)$/

export function MessageComposer({ onSend, placeholder = "Message...", channelId, conversationId }: MessageComposerProps) {
  const [content, setContent] = useState("")
  const [sending, setSending] = useState(false)
  const [typingTimeout, setTypingTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { socket } = useSocket()
  const { data: session } = useSession()
  const { workspace } = useActiveWorkspace()
  const { uploadChatFile } = useChatFileUpload()

  const target = useMemo(
    () => channelId ? { channelId: channelId as string } : conversationId ? { conversationId: conversationId as string } : null,
    [channelId, conversationId]
  )

  useEffect(() => {
    if (!workspace?.id) return
    let cancelled = false
    fetch(`/api/workspace/${workspace.id}/members`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && j.data) {
          setMembers(
            (j.data as { user: { id: string; name?: string | null; image?: string | null; email?: string | null } }[]).map(
              (m) => ({ id: m.user.id, name: m.user.name ?? "Unknown", image: m.user.image, email: m.user.email ?? undefined }),
            ),
          )
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [workspace?.id])

  useEffect(() => {
    if (!socket || !target) return
    const handle = () => {
      if (socket) {
        socket.emit("typing:stop", target)
      }
    }
    socket.on("message:sent", handle)
    return () => { socket.off("message:sent", handle) }
  }, [socket, target])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    setSelectedFiles((prev) => [...prev, ...files].slice(0, 5))
    e.target.value = ""
  }

  function removeFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const detectMention = useCallback((value: string) => {
    const match = value.match(MENTION_TRIGGER)
    if (match) {
      setShowMentions(true)
      setMentionQuery(match[1])
    } else {
      setShowMentions(false)
      setMentionQuery("")
    }
  }, [])

  async function handleSend() {
    const trimmed = content.trim()
    if ((!trimmed && selectedFiles.length === 0) || sending) return

    setSending(true)
    try {
      let fileUrls: string[] | undefined
      if (selectedFiles.length > 0) {
        const results = await Promise.all(selectedFiles.map((f) => uploadChatFile(f)))
        fileUrls = results.filter((r) => r.success).map((r) => r.url!).filter(Boolean)
        if (fileUrls.length !== selectedFiles.length) {
          toast.error("Some files failed to upload")
        }
      }
      await onSend(trimmed, fileUrls?.length ? fileUrls : undefined)
      setContent("")
      setSelectedFiles([])
      setShowMentions(false)
      if (socket && target) {
        socket.emit("typing:stop", target)
      }
      if (typingTimeout) clearTimeout(typingTimeout)
    } catch {
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  function insertMention(memberId: string) {
    const member = members.find((m) => m.id === memberId)
    if (!member) return
    const next = content.replace(MENTION_TRIGGER, `$1@${member.name} `)
    setContent(next)
    setShowMentions(false)
    setMentionQuery("")
    inputRef.current?.focus()
  }

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value
    setContent(value)
    detectMention(value)
    if (!socket || !target) return
    socket.emit("typing:start", {
      ...target,
      userId: session?.user?.id,
      userName: session?.user?.name,
    })
    if (typingTimeout) clearTimeout(typingTimeout)
    setTypingTimeout(setTimeout(() => {
      if (socket && target) {
        socket.emit("typing:stop", target)
      }
    }, 2000))
  }

  return (
    <div className="relative border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      {selectedFiles.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto">
          {selectedFiles.map((file, i) => (
            <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 shrink-0">
              <FileText className="h-3 w-3" />
              <span className="max-w-[120px] truncate">{file.name}</span>
              <button type="button" onClick={() => removeFile(i)} className="text-zinc-400 hover:text-red-500 ml-1">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {showMentions && (
        <MentionAutocomplete
          open={showMentions}
          query={mentionQuery}
          onSelect={insertMention}
          members={members}
        />
      )}
      <div className="flex items-end gap-2 px-4 py-3">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <div className="flex-1 flex items-end gap-2 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5">
          <textarea
          ref={inputRef}
          className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 border-none outline-none resize-none min-h-[36px] max-h-[160px] leading-tight py-1.5"
          placeholder={placeholder}
          value={content}
          rows={1}
          onChange={handleChange}
          onInput={(e) => autoResize(e.currentTarget)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
        />
        <button
          onClick={handleSend}
          disabled={!content.trim() || sending}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-zinc-400 hover:text-zinc-600 disabled:opacity-30 transition-colors"
        >
          <Send className="h-4 w-4" />
        </button>
        </div>
      </div>
    </div>
  )
}
