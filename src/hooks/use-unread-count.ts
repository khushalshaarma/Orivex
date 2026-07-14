"use client"

import { useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useSocket } from "@/features/chat/socket/provider"

export function useUnreadCount() {
  const { data: session } = useSession()
  const { socket } = useSocket()
  const [unreadCount, setUnreadCount] = useState(0)
  const [mentionsCount, setMentionsCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const loadRef = useRef<() => void>(() => {})

  useEffect(() => {
    if (!session?.user?.id) return
    let cancelled = false

    async function load() {
      try {
        const res = await fetch("/api/notifications/unread-count")
        const json = await res.json()
        if (!cancelled && json.success) {
          setUnreadCount(json.data?.unread ?? 0)
          setMentionsCount(json.data?.mentions ?? 0)
        }
      } catch {
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadRef.current = load
    load()
    const interval = setInterval(() => loadRef.current(), 15000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (!socket || !session?.user?.id) return

    const handleNew = (payload: { unreadCount?: number; mentionsCount?: number }) => {
      if (payload.unreadCount !== undefined) setUnreadCount(payload.unreadCount)
      if (payload.mentionsCount !== undefined) setMentionsCount(payload.mentionsCount)
    }

    const handleRead = (payload: { unreadCount?: number }) => {
      if (payload.unreadCount !== undefined) setUnreadCount(payload.unreadCount)
    }

    // Bulk notifications (e.g. a new workspace invitation broadcast) also
    // change the unread count, so refetch to keep the badge accurate.
    const handleBulk = () => {
      if (process.env.NODE_ENV !== "production") {
        console.log("[notifications] unread count refreshed (notification:bulk)")
      }
      loadRef.current()
    }

    socket.on("notification:new", handleNew)
    socket.on("notification:read", handleRead)
    socket.on("notification:bulk", handleBulk)

    return () => {
      socket.off("notification:new", handleNew)
      socket.off("notification:read", handleRead)
      socket.off("notification:bulk", handleBulk)
    }
  }, [socket, session?.user?.id])

  return { unreadCount, mentionsCount, loading }
}
