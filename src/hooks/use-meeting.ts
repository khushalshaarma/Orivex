"use client"

import { useState, useEffect, useCallback } from "react"

export interface MeetingMember {
  id: string
  userId: string
  joinedAt: string | null
  user: { id: string; name: string | null; image: string | null }
}

export interface Meeting {
  id: string
  title: string
  description: string | null
  date: string
  time: string
  duration: number | null
  status: "SCHEDULED" | "STARTING" | "LIVE" | "ENDED" | "CANCELLED"
  meetingProvider: string | null
  meetingLink: string | null
  meetingCode: string | null
  workspaceId: string
  creatorId: string
  startedAt: string | null
  endedAt: string | null
  createdAt: string
  updatedAt: string
  creator: { id: string; name: string | null; image: string | null }
  members: MeetingMember[]
}

export function useMeetings(workspaceId: string | null) {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!workspaceId) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/meetings?workspaceId=${workspaceId}`)
      const json = await res.json()
      if (json.success) setMeetings(json.data ?? [])
    } catch {
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    const init = async () => { await load() }
    init()
  }, [load])

  const createMeeting = useCallback(async (data: {
    title: string
    date: string
    time: string
    description?: string
    duration?: number
    meetingProvider?: string
    memberIds?: string[]
  }) => {
    if (!workspaceId) return { success: false, error: "No workspace selected" }
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, workspaceId }),
      })
      const json = await res.json()
      if (json.success) {
        load()
      }
      return json
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Network error" }
    }
  }, [workspaceId, load])

  const updateMeeting = useCallback(async (id: string, data: {
    title?: string
    description?: string | null
    date?: string
    time?: string
    duration?: number | null
    meetingProvider?: string
  }) => {
    const res = await fetch(`/api/meetings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (json.success) await load()
    return json
  }, [load])

  const deleteMeeting = useCallback(async (id: string) => {
    const res = await fetch(`/api/meetings/${id}`, { method: "DELETE" })
    const json = await res.json()
    if (json.success) await load()
    return json
  }, [load])

  const startMeeting = useCallback(async (id: string) => {
    const res = await fetch(`/api/meetings/${id}/start`, { method: "POST" })
    const json = await res.json()
    if (json.success) await load()
    return json
  }, [load])

  const endMeeting = useCallback(async (id: string) => {
    const res = await fetch(`/api/meetings/${id}/end`, { method: "POST" })
    const json = await res.json()
    if (json.success) await load()
    return json
  }, [load])

  const cancelMeeting = useCallback(async (id: string) => {
    const res = await fetch(`/api/meetings/${id}/cancel`, { method: "POST" })
    const json = await res.json()
    if (json.success) await load()
    return json
  }, [load])

  const joinMeeting = useCallback(async (id: string) => {
    return fetch(`/api/meetings/${id}/join`, { method: "POST" }).then((r) => r.json())
  }, [])

  const leaveMeeting = useCallback(async (id: string) => {
    return fetch(`/api/meetings/${id}/leave`, { method: "POST" }).then((r) => r.json())
  }, [])

  return {
    meetings,
    loading,
    refetch: load,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    startMeeting,
    endMeeting,
    cancelMeeting,
    joinMeeting,
    leaveMeeting,
  }
}

export function useMeeting(id: string | null) {
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!id) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/meetings/${id}`)
      const json = await res.json()
      if (json.success) setMeeting(json.data)
    } catch {
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    const init = async () => { await load() }
    init()
  }, [load])

  return { meeting, setMeeting, loading, refetch: load }
}
