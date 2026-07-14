"use client"

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react"
import { io, type Socket } from "socket.io-client"
import { useSession } from "next-auth/react"

interface SocketContextValue {
  socket: Socket | null
  connected: boolean
}

const SocketContext = createContext<SocketContextValue>({ socket: null, connected: false })

export function SocketProvider({ children, workspaceId }: { children: ReactNode; workspaceId?: string | null }) {
  const { data: session } = useSession()
  const [connected, setConnected] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)
  const joinedRef = useRef(false)

  useEffect(() => {
    if (!session?.user?.id) return

    const instance = io({
      query: {
        userId: session.user.id,
        workspaceId: workspaceId ?? "",
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })

    instance.on("connect", () => {
      setConnected(true)
      if (workspaceId) {
        instance.emit("workspace:join", workspaceId)
      }
      joinedRef.current = true
    })

    instance.on("disconnect", () => {
      setConnected(false)
      joinedRef.current = false
    })

    instance.on("reconnect", () => {
      setConnected(true)
      if (workspaceId) {
        instance.emit("workspace:join", workspaceId)
      }
    })

    const heartbeat = setInterval(() => {
      instance.emit("heartbeat")
    }, 15000)

    setSocket(instance)

    return () => {
      clearInterval(heartbeat)
      instance.disconnect()
      setSocket(null)
    }
  }, [session?.user?.id, workspaceId])

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  return useContext(SocketContext)
}
