"use client"

import { useState, useEffect } from "react"
import { PhoneOff, Mic, MicOff, Video, VideoOff, Monitor, Hand, Users } from "lucide-react"
import { useSocket } from "@/features/chat/socket/provider"

interface VideoCallUIProps {
  direction: "incoming" | "outgoing"
  peerId: string
  onEnd: () => void
  onAccept?: () => void
  onReject?: () => void
}

export function VideoCallUI({ direction, peerId, onEnd, onAccept, onReject }: VideoCallUIProps) {
  const [muted, setMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(false)
  const [screenSharing, setScreenSharing] = useState(false)
  const [raisedHand, setRaisedHand] = useState(false)
  const [duration, setDuration] = useState(0)
  const [connecting, setConnecting] = useState(direction === "outgoing")
  const [showParticipants, setShowParticipants] = useState(false)
  const { socket } = useSocket()

  useEffect(() => {
    if (direction === "outgoing") {
      const timer = setTimeout(() => setConnecting(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [direction])

  useEffect(() => {
    const interval = setInterval(() => {
      setDuration((d) => d + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`
  }

  function toggleMute() {
    const next = !muted
    setMuted(next)
    socket?.emit("call:mute", { to: peerId, muted: next })
  }

  function toggleCamera() {
    setCameraOff(!cameraOff)
  }

  function toggleScreenShare() {
    const next = !screenSharing
    setScreenSharing(next)
    if (next) {
      socket?.emit("call:screen:start", { to: peerId })
    } else {
      socket?.emit("call:screen:stop", { to: peerId })
    }
  }

  function toggleRaiseHand() {
    const next = !raisedHand
    setRaisedHand(next)
    if (next) {
      socket?.emit("call:raise-hand", { to: peerId })
    }
  }

  if (direction === "incoming") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-8 text-center max-w-sm w-full mx-4">
          <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-4">
            <Video className="h-8 w-8 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Incoming Video Call</h3>
          <p className="text-sm text-zinc-500 mb-6">Video call from team member</p>
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
              <Video className="h-4 w-4" />
              Accept
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center bg-zinc-900">
          <div className="text-center">
            {cameraOff ? (
              <div className="w-32 h-32 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                <VideoOff className="h-12 w-12 text-zinc-500" />
              </div>
            ) : (
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl text-white font-bold">You</span>
              </div>
            )}
            <p className="text-zinc-400 text-sm">{connecting ? "Connecting..." : formatDuration(duration)}</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 p-4 bg-zinc-950">
          <button
            onClick={toggleMute}
            className={`p-3 rounded-full transition-colors ${
              muted ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
          <button
            onClick={toggleCamera}
            className={`p-3 rounded-full transition-colors ${
              cameraOff ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
            title={cameraOff ? "Turn on camera" : "Turn off camera"}
          >
            {cameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </button>
          <button
            onClick={toggleScreenShare}
            className={`p-3 rounded-full transition-colors ${
              screenSharing ? "bg-green-600 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
            title={screenSharing ? "Stop sharing" : "Share screen"}
          >
            <Monitor className="h-5 w-5" />
          </button>
          <button
            onClick={toggleRaiseHand}
            className={`p-3 rounded-full transition-colors ${
              raisedHand ? "bg-yellow-600 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
            title={raisedHand ? "Lower hand" : "Raise hand"}
          >
            <Hand className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className="p-3 rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
            title="Participants"
          >
            <Users className="h-5 w-5" />
          </button>
          <button
            onClick={onEnd}
            className="p-3 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
            title="End call"
          >
            <PhoneOff className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
