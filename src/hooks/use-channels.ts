"use client"

import { useState, useEffect, useCallback } from "react"

export interface Channel {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string | null
  type: "PUBLIC" | "PRIVATE" | "ANNOUNCEMENT"
  archived: boolean
  createdBy: string
  createdAt: string
  _count?: { members: number; messages: number }
  members?: {
    role: string
    user: { id: string; name: string | null; image: string | null } | null
  }[]
}

export function useChannels(workspaceId: string | null) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!workspaceId) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/channels?workspaceId=${workspaceId}`)
      const json = await res.json()
      if (json.success) setChannels(json.data ?? [])
    } catch {
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => { load() }, [load]) // eslint-disable-line react-hooks/set-state-in-effect

  const createChannel = useCallback(async (data: {
    name: string
    description?: string
    icon?: string
    color?: string
    type?: "PUBLIC" | "PRIVATE" | "ANNOUNCEMENT"
  }) => {
    if (!workspaceId) return null
    const res = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, workspaceId }),
    })
    const json = await res.json()
    if (json.success) {
      await load()
    }
    return json
  }, [workspaceId, load])

  return { channels, loading, refetch: load, createChannel }
}

export function useChannel(id: string | null) {
  const [channel, setChannel] = useState<Channel | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) { setLoading(false); return } // eslint-disable-line react-hooks/set-state-in-effect
    setLoading(true)
    fetch(`/api/channels/${id}`)
      .then((r) => r.json())
      .then((json) => { if (json.success) setChannel(json.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  return { channel, setChannel, loading }
}
