"use client"

import { useState, useEffect, useRef } from "react"
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from "lucide-react"
import { useSocket } from "@/features/chat/socket/provider"

interface VoiceCallUIProps {
  direction: "incoming" | "outgoing"
  peerId: string
  onEnd: () => void
  onAccept?: () => void
  onReject?: () => void
}

export function VoiceCallUI({ direction, peerId, onEnd, onAccept, onReject }: VoiceCallUIProps) {
  const [muted, setMuted] = useState(false)
  const [speaker, setSpeaker] = useState(true)
  const [duration, setDuration] = useState(0)
  const [connecting, setConnecting] = useState(direction === "outgoing")
  const { socket } = useSocket()
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined)

  useEffect(() => {
    if (direction === "outgoing") {
      const timer = setTimeout(() => setConnecting(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [direction])

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setDuration((d) => d + 1)
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  function toggleMute() {
    const next = !muted
    setMuted(next)
    socket?.emit("call:mute", { to: peerId, muted: next })
  }

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`
  }

  if (direction === "incoming") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-8 text-center max-w-sm w-full mx-4">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <Phone className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Incoming Call</h3>
          <p className="text-sm text-zinc-500 mb-6">Voice call from team member</p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={onReject}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-red-500 hover:bg-red-600 text-white font-medium transition-colors"
            >
              <PhoneOff className="h-4 w-4" />
              Decline
            </button>
            <button
              onClick={onAccept}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-green-500 hover:bg-green-600 text-white font-medium transition-colors"
            >
              <Phone className="h-4 w-4" />
              Accept
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-8 text-center max-w-sm w-full mx-4">
        <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
          <Phone className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
          {connecting ? "Connecting..." : "Call in Progress"}
        </h3>
        <p className="text-sm text-zinc-500 mb-2">
          {connecting ? "Ringing..." : formatDuration(duration)}
        </p>

        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={toggleMute}
            className={`p-4 rounded-full transition-colors ${
              muted
                ? "bg-red-100 dark:bg-red-900/30 text-red-600"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600"
            }`}
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
          <button
            onClick={() => setSpeaker(!speaker)}
            className={`p-4 rounded-full transition-colors ${
              speaker
                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-600"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600"
            }`}
            title={speaker ? "Speaker on" : "Speaker off"}
          >
            {speaker ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </button>
        </div>

        <button
          onClick={onEnd}
          className="flex items-center gap-2 px-8 py-3 rounded-full bg-red-500 hover:bg-red-600 text-white font-medium transition-colors mx-auto"
        >
          <PhoneOff className="h-4 w-4" />
          End Call
        </button>
      </div>
    </div>
  )
}
