"use client"

import { useState, useEffect, useCallback } from "react"

export interface Conversation {
  id: string
  workspaceId: string
  createdAt: string
  members: {
    userId: string
    user: { id: string; name: string | null; image: string | null; email: string | null }
  }[]
  messages?: { content: string; createdAt: string; senderId: string; type: string }[]
  _count?: { messages: number }
}

export function useConversations(workspaceId: string | null) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!workspaceId) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/conversations?workspaceId=${workspaceId}`)
      const json = await res.json()
      if (json.success) setConversations(json.data ?? [])
    } catch {
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => { load() }, [load]) // eslint-disable-line react-hooks/set-state-in-effect

  const createConversation = useCallback(async (userIds: string[]) => {
    if (!workspaceId) return null
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, userIds }),
    })
    const json = await res.json()
    if (json.success) {
      await load()
    }
    return json
  }, [workspaceId, load])

  return { conversations, loading, refetch: load, createConversation }
}
