"use client"

import { useState, useEffect, useCallback } from "react"
import { useSocket } from "../provider"
import { SOCKET_EVENTS } from "../types"
import type { PresenceData } from "../types"

export function usePresence() {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const { socket } = useSocket()

  useEffect(() => {
    if (!socket) return

    function handlePresence(data: PresenceData) {
      setOnlineUsers((prev) => {
        const next = new Set(prev)
        if (data.status === "offline") {
          next.delete(data.userId)
        } else {
          next.add(data.userId)
        }
        return next
      })
    }

    function handleInit(users: PresenceData[]) {
      setOnlineUsers(new Set(users.filter((u) => u.status !== "offline").map((u) => u.userId)))
    }

    socket.on("presence:init", handleInit)
    socket.on(SOCKET_EVENTS.PRESENCE_UPDATE, handlePresence)
    socket.emit(SOCKET_EVENTS.PRESENCE_UPDATE, { status: "online" })

    return () => {
      socket.off("presence:init", handleInit)
      socket.off(SOCKET_EVENTS.PRESENCE_UPDATE, handlePresence)
    }
  }, [socket])

  const updatePresence = useCallback((status: "online" | "away" | "busy" | "offline") => {
    if (!socket) return
    socket.emit(SOCKET_EVENTS.PRESENCE_UPDATE, { status })
  }, [socket])

  const isOnline = useCallback((userId: string) => onlineUsers.has(userId), [onlineUsers])

  return { onlineUsers, isOnline, updatePresence }
}
