import type { Server as HTTPServer } from "http"
import { Server } from "socket.io"
import type { Socket } from "socket.io"

let ioInstance: Server | null = null

interface OnlineUser {
  userId: string
  socketId: string
  status: "online" | "away" | "busy" | "offline"
  lastActiveAt: Date
  workspaceId?: string
  channelIds: string[]
}

interface SocketData {
  userId: string
  workspaceId: string
}

interface MessageSentData {
  channelId?: string
  conversationId?: string
  message: Record<string, unknown>
}

interface MessageEditedData {
  channelId?: string
  conversationId?: string
  messageId: string
  content: string
  edited: boolean
}

interface MessageDeletedData {
  channelId?: string
  conversationId?: string
  messageId: string
}

interface ReactionData {
  channelId?: string
  conversationId?: string
  messageId: string
  reaction: Record<string, unknown>
}

interface TypingData {
  channelId?: string
  conversationId?: string
  userName?: string
}

interface ReadReceiptData {
  messageId: string
  channelId?: string
  conversationId?: string
}

const onlineUsers = new Map<string, OnlineUser>()

export function initSocketServer(httpServer: HTTPServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:3000"],
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  })

  ioInstance = io

  io.use((socket, next) => {
    const userId = socket.handshake.query.userId as string
    const workspaceId = socket.handshake.query.workspaceId as string
    if (!userId) return next(new Error("Authentication required"))
    const data: SocketData = { userId, workspaceId }
    ;(socket as unknown as { data: SocketData }).data = data
    next()
  })

  io.on("connection", (socket: Socket) => {
    const { userId, workspaceId } = (socket as unknown as { data: SocketData }).data

    onlineUsers.set(userId, {
      userId,
      socketId: socket.id,
      status: "online",
      lastActiveAt: new Date(),
      workspaceId,
      channelIds: [],
    })

    socket.join(`user:${userId}`)

    socket.broadcast.emit("presence:update", { userId, status: "online" })

    socket.on("workspace:join", (wsId: string) => {
      socket.join(`workspace:${wsId}`)
      const user = onlineUsers.get(userId)
      if (user) user.workspaceId = wsId
    })

    socket.on("workspace:leave", (wsId: string) => {
      socket.leave(`workspace:${wsId}`)
    })

    socket.on("project:join", (projectId: string) => {
      socket.join(`project:${projectId}`)
    })

    socket.on("project:leave", (projectId: string) => {
      socket.leave(`project:${projectId}`)
    })

    socket.on("channel:join", (channelId: string) => {
      socket.join(`channel:${channelId}`)
      const user = onlineUsers.get(userId)
      if (user && !user.channelIds.includes(channelId)) {
        user.channelIds.push(channelId)
      }
    })

    socket.on("channel:leave", (channelId: string) => {
      socket.leave(`channel:${channelId}`)
      const user = onlineUsers.get(userId)
      if (user) {
        user.channelIds = user.channelIds.filter((id) => id !== channelId)
      }
    })

    socket.on("conversation:join", (conversationId: string) => {
      socket.join(`conversation:${conversationId}`)
    })

    socket.on("conversation:leave", (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`)
    })

    socket.on("message:sent", (data: MessageSentData) => {
      if (data.channelId) {
        socket.to(`channel:${data.channelId}`).emit("message:sent", data.message)
      }
      if (data.conversationId) {
        socket.to(`conversation:${data.conversationId}`).emit("message:sent", data.message)
      }
    })

    socket.on("message:edited", (data: MessageEditedData) => {
      if (data.channelId) {
        socket.to(`channel:${data.channelId}`).emit("message:edited", data)
      }
      if (data.conversationId) {
        socket.to(`conversation:${data.conversationId}`).emit("message:edited", data)
      }
    })

    socket.on("message:deleted", (data: MessageDeletedData) => {
      if (data.channelId) {
        socket.to(`channel:${data.channelId}`).emit("message:deleted", data)
      }
      if (data.conversationId) {
        socket.to(`conversation:${data.conversationId}`).emit("message:deleted", data)
      }
    })

    socket.on("reaction:added", (data: ReactionData) => {
      if (data.channelId) {
        socket.to(`channel:${data.channelId}`).emit("reaction:added", data)
      }
      if (data.conversationId) {
        socket.to(`conversation:${data.conversationId}`).emit("reaction:added", data)
      }
    })

    socket.on("call:signal", (data: { to: string; signal: unknown; type: string }) => {
      io.to(`user:${data.to}`).emit("call:signal", {
        from: userId,
        signal: data.signal,
        type: data.type,
      })
    })

    socket.on("call:start", (data: { to: string; type: "voice" | "video" }) => {
      io.to(`user:${data.to}`).emit("call:incoming", {
        from: userId,
        type: data.type,
      })
    })

    socket.on("call:accept", (data: { to: string }) => {
      io.to(`user:${data.to}`).emit("call:accepted", { from: userId })
    })

    socket.on("call:reject", (data: { to: string }) => {
      io.to(`user:${data.to}`).emit("call:rejected", { from: userId })
    })

    socket.on("call:end", (data: { to: string }) => {
      io.to(`user:${data.to}`).emit("call:ended", { from: userId })
    })

    socket.on("call:mute", (data: { to: string; muted: boolean }) => {
      io.to(`user:${data.to}`).emit("call:muted", { from: userId, muted: data.muted })
    })

    socket.on("call:screen:start", (data: { to: string }) => {
      io.to(`user:${data.to}`).emit("call:screen:started", { from: userId })
    })

    socket.on("call:screen:stop", (data: { to: string }) => {
      io.to(`user:${data.to}`).emit("call:screen:stopped", { from: userId })
    })

    socket.on("call:raise-hand", (data: { to: string }) => {
      io.to(`user:${data.to}`).emit("call:raise-hand", { from: userId })
    })

    socket.on("meeting:join", (data: { meetingId: string }) => {
      socket.join(`meeting:${data.meetingId}`)
    })

    socket.on("meeting:leave", (data: { meetingId: string }) => {
      socket.leave(`meeting:${data.meetingId}`)
    })

    socket.on("meeting:started", (data: { meetingId: string; meeting: Record<string, unknown> }) => {
      io.to(`workspace:${workspaceId}`).emit("meeting:started", { meetingId: data.meetingId, meeting: data.meeting })
    })

    socket.on("meeting:ended", (data: { meetingId: string }) => {
      io.to(`meeting:${data.meetingId}`).emit("meeting:ended", { meetingId: data.meetingId })
      io.to(`workspace:${workspaceId}`).emit("meeting:ended", { meetingId: data.meetingId })
    })

    socket.on("meeting:userJoined", (data: { meetingId: string; user: { id: string; name: string | null; image: string | null } }) => {
      socket.to(`meeting:${data.meetingId}`).emit("meeting:participant", { action: "joined", user: data.user })
    })

    socket.on("meeting:userLeft", (data: { meetingId: string; userId: string }) => {
      socket.to(`meeting:${data.meetingId}`).emit("meeting:participant", { action: "left", userId: data.userId })
    })

    socket.on("meeting:mute", (data: { meetingId: string; userId: string; muted: boolean }) => {
      socket.to(`meeting:${data.meetingId}`).emit("meeting:mute", { userId, muted: data.muted })
    })

    socket.on("meeting:camera", (data: { meetingId: string; userId: string; cameraOff: boolean }) => {
      socket.to(`meeting:${data.meetingId}`).emit("meeting:camera", { userId, cameraOff: data.cameraOff })
    })

    socket.on("meeting:screenShare", (data: { meetingId: string; userId: string; sharing: boolean }) => {
      socket.to(`meeting:${data.meetingId}`).emit("meeting:screenShare", { userId, sharing: data.sharing })
    })

    socket.on("meeting:raiseHand", (data: { meetingId: string; userId: string }) => {
      socket.to(`meeting:${data.meetingId}`).emit("meeting:raiseHand", { userId })
    })

    socket.on("meeting:chat", (data: { meetingId: string; message: { id: string; userId: string; userName: string; content: string; createdAt: string } }) => {
      socket.to(`meeting:${data.meetingId}`).emit("meeting:chat", data.message)
    })

    socket.on("typing:start", (data: TypingData) => {
      const event = { userId, userName: data.userName }
      if (data.channelId) {
        socket.to(`channel:${data.channelId}`).emit("typing:update", { ...event, channelId: data.channelId })
      }
      if (data.conversationId) {
        socket.to(`conversation:${data.conversationId}`).emit("typing:update", { ...event, conversationId: data.conversationId })
      }
    })

    socket.on("typing:stop", (data: TypingData) => {
      if (data.channelId) {
        socket.to(`channel:${data.channelId}`).emit("typing:update", { userId, stop: true })
      }
      if (data.conversationId) {
        socket.to(`conversation:${data.conversationId}`).emit("typing:update", { userId, stop: true })
      }
    })

    socket.on("presence:update", (status: "online" | "away" | "busy" | "offline") => {
      const user = onlineUsers.get(userId)
      if (user) {
        user.status = status
        user.lastActiveAt = new Date()
      }
      io.emit("presence:update", { userId, status })
    })

    socket.on("read:receipt", (data: ReadReceiptData) => {
      if (data.channelId) {
        socket.to(`channel:${data.channelId}`).emit("read:receipt", { ...data, userId })
      }
      if (data.conversationId) {
        socket.to(`conversation:${data.conversationId}`).emit("read:receipt", { ...data, userId })
      }
    })

    socket.on("heartbeat", () => {
      const user = onlineUsers.get(userId)
      if (user) {
        user.lastActiveAt = new Date()
      }
    })

    socket.on("disconnect", () => {
      onlineUsers.delete(userId)
      io.emit("presence:update", { userId, status: "offline" })
    })
  })

  setInterval(() => {
    const now = Date.now()
    for (const [id, user] of onlineUsers) {
      if (now - user.lastActiveAt.getTime() > 30000) {
        user.status = "away"
        io.emit("presence:update", { userId: id, status: "away" })
      }
    }
  }, 15000)

  return io
}

export function getIO() {
  return ioInstance
}

export function broadcastToUser(userId: string, event: string, data: Record<string, unknown>) {
  ioInstance?.to(`user:${userId}`).emit(event, data)
}

export function broadcastToWorkspaceSocket(workspaceId: string, event: string, data: Record<string, unknown>) {
  ioInstance?.to(`workspace:${workspaceId}`).emit(event, data)
}

export function getOnlineUsers() {
  return Array.from(onlineUsers.values())
}

export function isUserOnline(userId: string) {
  return onlineUsers.has(userId)
}
