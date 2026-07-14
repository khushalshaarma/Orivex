"use client"
import { useState, useEffect, useMemo } from "react"
import { FileText, Image as ImageIcon, FileArchive, Video, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"

export interface UploadFile {
  id: string
  file: File
  progress: number
  status: "pending" | "uploading" | "success" | "error"
  error?: string
  url?: string
  previewUrl?: string
}

interface FilePreviewProps {
  file: File
  onRemove?: () => void
  className?: string
}

export function FilePreview({ file, onRemove, className }: FilePreviewProps) {
  const isImage = file.type.startsWith("image/")
  const isPDF = file.type === "application/pdf"
  const isVideo = file.type.startsWith("video/")
  const isArchive = [
    "application/zip",
    "application/x-tar",
    "application/gzip",
    "application/x-rar-compressed",
  ].includes(file.type)

  const [imageLoaded, setImageLoaded] = useState(false)

  const objectUrl = useMemo(() => {
    if (!isImage) return null
    return URL.createObjectURL(file)
  }, [file, isImage])

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [objectUrl])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFileIcon = () => {
    if (isImage) {
      return <ImageIcon className="h-6 w-6 text-blue-600" />
    } else if (isPDF) {
      return <FileText className="h-6 w-6 text-red-600" />
    } else if (isVideo) {
      return <Video className="h-6 w-6 text-purple-600" />
    } else if (isArchive) {
      return <FileArchive className="h-6 w-6 text-orange-600" />
    } else {
      return <FileText className="h-6 w-6 text-gray-600" />
    }
  }

  return (
    <div
      className={cn(
        "relative group flex items-center p-3 rounded-lg border border-gray-200",
        "hover:bg-gray-50 transition-colors",
        className,
      )}
    >
      <div className="flex-shrink-0 mr-3">
        {isImage && objectUrl ? (
          <div className="relative h-10 w-10">
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            )}
            <img
              src={objectUrl}
              alt={file.name}
              className={`h-10 w-10 rounded object-cover ${imageLoaded ? "" : "invisible"}`}
              onLoad={() => setImageLoaded(true)}
            />
          </div>
        ) : (
          getFileIcon()
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {file.name}
        </p>
        <p className="text-xs text-gray-500">
          {formatFileSize(file.size)}
        </p>
      </div>

      {onRemove && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="ml-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
