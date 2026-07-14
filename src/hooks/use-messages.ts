"use client"

import { useCallback } from "react"
import useSWR from "swr"
import useSWRMutation from "swr/mutation"
import type { MessageReaction } from "@prisma/client"

export interface Message {
  id: string
  workspaceId: string
  channelId: string | null
  conversationId: string | null
  senderId: string
  content: string
  type: "TEXT" | "IMAGE" | "FILE" | "SYSTEM"
  status: "SENT" | "DELIVERED" | "READ"
  parentId: string | null
  replyCount: number
  pinned: boolean
  edited: boolean
  deleted: boolean
  createdAt: string
  updatedAt: string
  sender: { id: string; name: string | null; image: string | null }
  reactions: (MessageReaction & { user: { id: string; name: string | null; image: string | null } })[]
  attachments: { id: string; url: string; name: string; type: string }[]
  _count?: { replies: number }
}

async function fetcher(url: string) {
  const res = await fetch(url)
  const json = await res.json()
  if (!json.success) throw new Error(json.error ?? "Failed to fetch")
  return json.data
}

async function poster(url: string, { arg }: { arg: Record<string, unknown> }) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error ?? "Failed to send")
  return json.data
}

export function useChannelMessages(channelId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Message[]>(
    channelId ? `/api/channels/${channelId}/messages` : null,
    fetcher,
  )

  const { trigger: send } = useSWRMutation(
    channelId ? `/api/channels/${channelId}/messages` : null,
    poster,
  )

  const sendMessage = useCallback(async (content: string, fileUrls?: string[]) => {
    if (!channelId) throw new Error("No channel selected")
    const result = await send({ content, fileUrls } as unknown as Record<string, unknown>)
    await mutate()
    return result
  }, [channelId, send, mutate])

  return { messages: data ?? [], loading: isLoading, error, sendMessage, mutate }
}

export function useConversationMessages(conversationId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Message[]>(
    conversationId ? `/api/conversations/${conversationId}/messages` : null,
    fetcher,
  )

  const { trigger: send } = useSWRMutation(
    conversationId ? `/api/conversations/${conversationId}/messages` : null,
    poster,
  )

  const sendMessage = useCallback(async (content: string, fileUrls?: string[]) => {
    if (!conversationId) throw new Error("No conversation selected")
    const result = await send({ content, fileUrls } as unknown as Record<string, unknown>)
    await mutate()
    return result
  }, [conversationId, send, mutate])

  return { messages: data ?? [], loading: isLoading, error, sendMessage, mutate }
}

export function useThreadMessages(parentId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Message[]>(
    parentId ? `/api/messages/${parentId}/thread` : null,
    fetcher,
  )

  const { trigger: send } = useSWRMutation(
    parentId ? `/api/messages/${parentId}/thread` : null,
    poster,
  )

  const sendReply = useCallback((content: string) => {
    if (!parentId) return Promise.reject(new Error("No parent message"))
    return send({ content })
  }, [parentId, send])

  return { replies: data ?? [], loading: isLoading, error, sendReply, mutate }
}

export function useMessageActions() {
  const editMessage = useCallback(async (messageId: string, content: string) => {
    const res = await fetch(`/api/messages/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error ?? "Failed to edit")
    return json.data
  }, [])

  const deleteMessage = useCallback(async (messageId: string) => {
    const res = await fetch(`/api/messages/${messageId}`, {
      method: "DELETE",
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error ?? "Failed to delete")
    return json.data
  }, [])

  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    const res = await fetch(`/api/messages/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error ?? "Failed to react")
    return json.data
  }, [])

  const pinMessage = useCallback(async (messageId: string) => {
    const res = await fetch(`/api/messages/${messageId}/pin`, {
      method: "POST",
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error ?? "Failed to pin")
    return json.data
  }, [])

  return { editMessage, deleteMessage, addReaction, pinMessage }
}

export function useMentionAutocomplete(workspaceId: string | null, query: string) {
  const { data: members, isLoading } = useSWR<{ id: string; userId: string; user: { id: string; name: string | null; email: string; image: string | null } }[]>(
    workspaceId && query ? `/api/workspace/${workspaceId}/members?search=${encodeURIComponent(query)}` : null,
    fetcher,
  )

  return { members: members ?? [], loading: isLoading ?? false, search: query }
}
