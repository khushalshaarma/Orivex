"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { Mic, Square, Pause, Play, Trash2, Download, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { toast } from "sonner"

interface VoiceNoteRecorderProps {
  onRecordingComplete?: (audioUrl: string, duration: number) => void
  maxDuration?: number
  className?: string
}

export function VoiceNoteRecorder({
  onRecordingComplete,
  maxDuration = 60,
  className,
}: VoiceNoteRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const startTimeRef = useRef<number | null>(null)
  const pauseTimeRef = useRef<number>(0)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/wav" })
        setBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)

        stream.getTracks().forEach((track) => track.stop())
        chunksRef.current = []

        if (onRecordingComplete) {
          onRecordingComplete(url, duration)
        }
      }

      mediaRecorder.start()
      startTimeRef.current = Date.now()
      setIsRecording(true)
      setIsPaused(false)

      timerIntervalRef.current = setInterval(() => {
        if (startTimeRef.current && !isPaused) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
          setDuration(elapsed)
        }
      }, 1000)

      toast.success("Recording started")
    } catch (error) {
      console.error("Error starting recording:", error)
      toast.error("Failed to access microphone. Please check permissions.")
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
      toast.info("Recording paused")
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume()
      setIsPaused(false)

      startTimeRef.current = Date.now() - duration * 1000 - pauseTimeRef.current * 1000

      timerIntervalRef.current = setInterval(() => {
        if (startTimeRef.current && !isPaused) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
          setDuration(elapsed)
        }
      }, 1000)

      toast.success("Recording resumed")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }

      if (duration < 1) {
        toast.error("Recording too short. Please record for at least 1 second.")
        return
      }

      toast.success("Recording saved")
    }
  }

  const deleteRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
      setBlob(null)
      setDuration(0)
    }
    toast.info("Recording deleted")
  }

  const playRecording = () => {
    if (audioRef.current && audioUrl) {
      audioRef.current.play()
    }
  }

  const downloadRecording = () => {
    if (blob && audioUrl) {
      const url = audioUrl
      const filename = `voice-note-${formatDuration(duration)}.wav`

      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success("Recording downloaded")
    }
  }

  const discardRecording = () => {
    deleteRecording()
    toast.info("Recording discarded")
  }

  useEffect(() => {
    if (duration >= maxDuration) {
      stopRecording()
      toast.warning(`Maximum duration of ${maxDuration} seconds reached`)  
    }
  }, [duration, maxDuration])

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [audioUrl])

  if (!audioUrl) {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <Button
          variant="outline"
          size="sm"
          onClick={isRecording ? stopRecording : startRecording}
          className={cn(
            "transition-all duration-200",
            isRecording
              ? "bg-red-50 hover:bg-red-100 text-red-600 border-red-300"
              : "hover:bg-blue-50 hover:text-blue-600"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isRecording ? (
            <Square className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
          <span className="ml-2">
            {isRecording
              ? "Stop"
              : "Record Voice Note"
            }
          </span>
        </Button>

        {isRecording && (
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className={cn(
                "h-2 w-2 rounded-full",
                isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse"
              )} />
              <span className="text-sm text-gray-600">
                {formatDuration(duration)}
              </span>
            </div>
            {isPaused && (
              <Button
                variant="outline"
                size="sm"
                onClick={resumeRecording}
                className="h-8 w-8 p-0"
              >
                <Play className="h-4 w-4" />
              </Button>
            )}
            {isPaused ? (
              <Button
                variant="outline"
                size="sm"
                onClick={pauseRecording}
                className="h-8 w-8 p-0"
              >
                <Pause className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={pauseRecording}
                className="h-8 w-8 p-0"
              >
                <Pause className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className="flex items-center space-x-2 px-3 py-1 bg-gray-50 rounded-lg border border-gray-200">
        <Mic className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium text-gray-700">
          {formatDuration(duration)}
        </span>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={playRecording}
        className="h-8 w-8 p-0"
      >
        <Play className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={downloadRecording}
        className="h-8 w-8 p-0"
      >
        <Download className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={discardRecording}
        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <audio ref={audioRef} src={audioUrl} className="hidden" />
    </div>
  )
}
