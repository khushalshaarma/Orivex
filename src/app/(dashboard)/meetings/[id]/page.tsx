"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useMeeting } from "@/hooks/use-meeting"
import { useSocket } from "@/features/chat/socket/provider"
import { SOCKET_EVENTS } from "@/features/chat/socket/types"
import type { MeetingChatMessage } from "@/features/chat/socket/types"
import {
  Mic, MicOff, Video, VideoOff, Monitor, Hand, MessageSquare,
  Users, PhoneOff, Loader2, Send, Clock, Play,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { toast } from "sonner"

export default function MeetingRoomPage() {
  const params = useParams()
  const router = useRouter()
  const meetingId = params.id as string
  const { data: session } = useSession()
  const { meeting, loading, refetch } = useMeeting(meetingId)
  const { socket, connected } = useSocket()

  const [muted, setMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(false)
  const [screenSharing, setScreenSharing] = useState(false)
  const [raisedHand, setRaisedHand] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showParticipants, setShowParticipants] = useState(false)
  const [chatMessages, setChatMessages] = useState<MeetingChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [participants, setParticipants] = useState<number>(0)
  const [duration, setDuration] = useState(0)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const isHost = meeting?.creatorId === session?.user?.id
  const isLive = meeting?.status === "LIVE"

  useEffect(() => {
    if (!socket || !meetingId) return
    socket.emit("meeting:join", { meetingId })
    return () => { socket.emit("meeting:leave", { meetingId }) }
  }, [socket, meetingId])

  useEffect(() => {
    if (!socket) return
    function handleParticipant(data: { action: string; user?: { id: string; name?: string }; userId?: string }) {
      if (data.action === "joined") setParticipants((p) => p + 1)
      else if (data.action === "left") setParticipants((p) => Math.max(0, p - 1))
    }
    function handleChat(msg: MeetingChatMessage) {
      setChatMessages((prev) => [...prev, msg])
    }
    function handleMute(data: { userId: string; muted: boolean }) {
      if (data.userId !== session?.user?.id) {
        toast.info(`${data.muted ? "Muted" : "Unmuted"} by host`)
      }
    }

    socket.on("meeting:participant", handleParticipant)
    socket.on("meeting:chat", handleChat)
    socket.on("meeting:mute", handleMute)

    return () => {
      socket.off("meeting:participant", handleParticipant)
      socket.off("meeting:chat", handleChat)
      socket.off("meeting:mute", handleMute)
    }
  }, [socket, session])

  useEffect(() => {
    if (!isLive) return
    const interval = setInterval(() => setDuration((d) => d + 1), 1000)
    return () => clearInterval(interval)
  }, [isLive])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  const handleEnd = useCallback(async () => {
    if (!isHost) return
    const res = await fetch(`/api/meetings/${meetingId}/end`, { method: "POST" })
    if (res.ok) {
      socket?.emit("meeting:ended", { meetingId })
      router.push("/meetings")
    }
  }, [meetingId, isHost, socket, router])

  const handleLeave = useCallback(async () => {
    await fetch(`/api/meetings/${meetingId}/leave`, { method: "POST" })
    socket?.emit("meeting:userLeft", { meetingId, userId: session?.user?.id })
    router.push("/meetings")
  }, [meetingId, socket, session, router])

  const handleSendChat = useCallback(() => {
    if (!chatInput.trim() || !socket) return
    const msg: MeetingChatMessage = {
      id: crypto.randomUUID(),
      userId: session?.user?.id ?? "",
      userName: session?.user?.name ?? "Unknown",
      content: chatInput.trim(),
      createdAt: new Date().toISOString(),
    }
    setChatMessages((prev) => [...prev, msg])
    socket.emit("meeting:chat", { meetingId, message: msg })
    setChatInput("")
  }, [chatInput, socket, session, meetingId])

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (!meeting) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-zinc-500">Meeting not found</p>
      </div>
    )
  }

  if (meeting.status === "ENDED") {
    return (
      <div className="flex h-full items-center justify-center flex-col gap-4">
        <div className="text-center">
          <p className="text-2xl mb-2">🎬</p>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Meeting Ended</h2>
          <p className="text-zinc-500 mt-1">{meeting.title} has ended</p>
          {meeting.endedAt && (
            <p className="text-sm text-zinc-400 mt-2">Ended at {format(new Date(meeting.endedAt), "h:mm a")}</p>
          )}
          <Button className="mt-4" onClick={() => router.push("/meetings")}>Back to Meetings</Button>
        </div>
      </div>
    )
  }

  if (meeting.status === "CANCELLED") {
    return (
      <div className="flex h-full items-center justify-center flex-col gap-4">
        <div className="text-center">
          <p className="text-2xl mb-2">🚫</p>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Meeting Cancelled</h2>
          <p className="text-zinc-500 mt-1">{meeting.title} was cancelled</p>
          <Button className="mt-4" onClick={() => router.push("/meetings")}>Back to Meetings</Button>
        </div>
      </div>
    )
  }

  if (meeting.status === "SCHEDULED") {
    return (
      <div className="flex h-full items-center justify-center flex-col gap-4">
        <div className="text-center">
          <Clock className="h-12 w-12 text-zinc-300 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{meeting.title}</h2>
          <p className="text-zinc-500 mt-1">Waiting for host to start the meeting...</p>
          <p className="text-sm text-zinc-400 mt-2">
            Scheduled for {meeting.date} at {meeting.time}
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button variant="outline" onClick={() => router.push("/meetings")}>Back</Button>
            {isHost && (
              <Button onClick={async () => {
                const res = await fetch(`/api/meetings/${meetingId}/start`, { method: "POST" })
                if (res.ok) {
                  socket?.emit("meeting:started", { meetingId, meeting })
                  refetch()
                }
              }}>
                <Play className="h-4 w-4 mr-2" /> Start Meeting
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col -m-4 md:-m-6 bg-black" style={{ marginTop: "-1rem" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between h-12 px-4 bg-zinc-950 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white truncate max-w-[200px]">{meeting.title}</span>
          <span className="flex items-center gap-1 text-xs text-green-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Live {formatDuration(duration)}
          </span>
          {screenSharing && (
            <span className="flex items-center gap-1 text-xs text-blue-400">
              <Monitor className="h-3 w-3" /> Sharing
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">{participants} participants</span>
        </div>
      </div>

      {/* Video grid */}
      <div className="flex-1 flex items-center justify-center bg-zinc-900 relative overflow-hidden">
        <div className="text-center">
          {cameraOff ? (
            <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3">
              <VideoOff className="h-8 w-8 text-zinc-500" />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl font-bold text-white">{session?.user?.name?.charAt(0) ?? "?"}</span>
            </div>
          )}
          <p className="text-zinc-300 font-medium">{session?.user?.name ?? "You"}</p>
          {muted && <p className="text-xs text-zinc-500 mt-1">Muted</p>}
          {raisedHand && (
            <span className="inline-flex items-center gap-1 text-xs text-yellow-400 mt-1">
              <Hand className="h-3 w-3" /> Hand raised
            </span>
          )}
        </div>

        {/* Chat panel */}
        {showChat && (
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-zinc-950 border-l border-zinc-800 flex flex-col">
            <div className="flex items-center justify-between px-3 h-10 border-b border-zinc-800">
              <span className="text-xs font-medium text-zinc-300">Meeting Chat</span>
              <button onClick={() => setShowChat(false)} className="text-zinc-500 hover:text-zinc-300">
                <MessageSquare className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="text-sm">
                  <span className="font-medium text-zinc-300">{msg.userName}</span>
                  <span className="text-zinc-400 ml-2">{msg.content}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="p-2 border-t border-zinc-800">
              <div className="flex gap-1">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSendChat() }}
                  placeholder="Type a message..."
                  className="flex-1 bg-zinc-800 text-xs text-zinc-300 rounded px-2 py-1.5 border border-zinc-700 outline-none"
                />
                <button onClick={handleSendChat} className="text-zinc-400 hover:text-white p-1">
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Participants panel */}
        {showParticipants && (
          <div className="absolute right-0 top-0 bottom-0 w-60 bg-zinc-950 border-l border-zinc-800 flex flex-col">
            <div className="flex items-center justify-between px-3 h-10 border-b border-zinc-800">
              <span className="text-xs font-medium text-zinc-300">Participants ({participants})</span>
              <button onClick={() => setShowParticipants(false)} className="text-zinc-500 hover:text-zinc-300">
                <Users className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center text-[9px] text-white font-bold">
                  {session?.user?.name?.charAt(0) ?? "?"}
                </div>
                <span className="text-zinc-300">{session?.user?.name ?? "You"}</span>
                <span className="text-[10px] text-zinc-500 ml-auto">Host</span>
              </div>
              {meeting.members.filter((m) => m.userId !== session?.user?.id).map((m) => (
                <div key={m.userId} className="flex items-center gap-2 text-sm">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={m.user.image ?? undefined} />
                    <AvatarFallback className="text-[8px]">{m.user.name?.charAt(0) ?? "?"}</AvatarFallback>
                  </Avatar>
                  <span className="text-zinc-300">{m.user.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 py-3 px-4 bg-zinc-950 border-t border-zinc-800 shrink-0">
        <button
          onClick={() => setMuted(!muted)}
          className={cn("p-3 rounded-full transition-colors", muted ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700")}
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
        <button
          onClick={() => setCameraOff(!cameraOff)}
          className={cn("p-3 rounded-full transition-colors", cameraOff ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700")}
          title={cameraOff ? "Turn on camera" : "Turn off camera"}
        >
          {cameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </button>
        <button
          onClick={() => {
            const next = !screenSharing
            setScreenSharing(next)
            socket?.emit("meeting:screenShare", { meetingId, userId: session?.user?.id, sharing: next })
          }}
          className={cn("p-3 rounded-full transition-colors", screenSharing ? "bg-green-600 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700")}
          title={screenSharing ? "Stop sharing" : "Share screen"}
        >
          <Monitor className="h-5 w-5" />
        </button>
        <button
          onClick={() => {
            const next = !raisedHand
            setRaisedHand(next)
            if (next) socket?.emit("meeting:raiseHand", { meetingId, userId: session?.user?.id })
          }}
          className={cn("p-3 rounded-full transition-colors", raisedHand ? "bg-yellow-600 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700")}
          title={raisedHand ? "Lower hand" : "Raise hand"}
        >
          <Hand className="h-5 w-5" />
        </button>
        <button
          onClick={() => { setShowChat(!showChat); setShowParticipants(false) }}
          className="p-3 rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
          title="Chat"
        >
          <MessageSquare className="h-5 w-5" />
        </button>
        <button
          onClick={() => { setShowParticipants(!showParticipants); setShowChat(false) }}
          className="p-3 rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
          title="Participants"
        >
          <Users className="h-5 w-5" />
        </button>
        {isHost ? (
          <button
            onClick={handleEnd}
            className="p-3 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
            title="End meeting"
          >
            <PhoneOff className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={handleLeave}
            className="p-3 rounded-full bg-zinc-800 text-red-400 hover:bg-zinc-700 transition-colors"
            title="Leave meeting"
          >
            <PhoneOff className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  )
}

