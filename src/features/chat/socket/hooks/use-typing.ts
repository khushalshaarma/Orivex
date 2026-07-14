"use client"

import { useState, useEffect, useCallback } from "react"
import { useSocket } from "../provider"
import { SOCKET_EVENTS } from "../types"
import type { TypingUser } from "../types"

export function useTyping(channelId?: string | null, conversationId?: string | null) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const { socket } = useSocket()

  useEffect(() => {
    if (!socket) return

    function handleStart(data: TypingUser) {
      const match = (data.channelId && data.channelId === channelId) || (data.conversationId && data.conversationId === conversationId)
      if (!match) return
      setTypingUsers((prev) => {
        if (prev.find((u) => u.userId === data.userId)) return prev
        return [...prev, data]
      })
    }

    function handleStop(data: TypingUser) {
      setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId))
    }

    socket.on(SOCKET_EVENTS.TYPING_START, handleStart)
    socket.on(SOCKET_EVENTS.TYPING_STOP, handleStop)
    return () => {
      socket.off(SOCKET_EVENTS.TYPING_START, handleStart)
      socket.off(SOCKET_EVENTS.TYPING_STOP, handleStop)
    }
  }, [socket, channelId, conversationId])

  const emitTyping = useCallback((isTyping: boolean) => {
    if (!socket) return
    const event = isTyping ? SOCKET_EVENTS.TYPING_START : SOCKET_EVENTS.TYPING_STOP
    socket.emit(event, { channelId, conversationId })
  }, [socket, channelId, conversationId])

  return { typingUsers, emitTyping }
}
