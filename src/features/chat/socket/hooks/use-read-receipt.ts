"use client"

import { useCallback } from "react"
import { useSocket } from "../provider"
import { SOCKET_EVENTS } from "../types"

export function useReadReceipt(channelId?: string | null, conversationId?: string | null) {
  const { socket } = useSocket()

  const markAsRead = useCallback((messageId: string) => {
    if (!socket) return
    socket.emit(SOCKET_EVENTS.READ_RECEIPT, {
      messageId,
      channelId,
      conversationId,
    })
  }, [socket, channelId, conversationId])

  const markAsDelivered = useCallback((messageId: string) => {
    if (!socket) return
    socket.emit(SOCKET_EVENTS.DELIVERY_RECEIPT, {
      messageId,
      channelId,
      conversationId,
    })
  }, [socket, channelId, conversationId])

  return { markAsRead, markAsDelivered }
}
