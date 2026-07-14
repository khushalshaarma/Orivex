"use client"
import { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from "react"
import { Paperclip, X, Download, Upload, Image, Video, FileText, FileArchive, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"

interface FileUpload {
  id: string
  file: File
  progress: number
  status: "pending" | "uploading" | "success" | "error"
  error?: string
  url?: string
}

interface MessageComposerFileUploadProps {
  onFileUploaded?: (file: { name: string; url: string; type: string; size: number }) => void
  accept?: string
  maxSize?: number
  maxFiles?: number
  endpoint?: string
  className?: string
}

export interface MessageComposerFileUploadHandle {
  upload: (files: File[]) => void
  clear: () => void
}

const MessageComposerFileUpload = forwardRef<MessageComposerFileUploadHandle, MessageComposerFileUploadProps>(
  (
    {
      onFileUploaded,
      accept = "image/*,video/*,.pdf,.doc,.docx,.txt,.zip,.tar,.gz",
      maxSize = 52428800,
      maxFiles = 5,
      endpoint = "/api/files/upload",
      className,
    },
    ref
  ) => {
  const [uploads, setUploads] = useState<FileUpload[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) {
      return <Image className="h-4 w-4 text-blue-600" />
    } else if (type.startsWith("video/")) {
      return <Video className="h-4 w-4 text-purple-600" />
    } else if (type.includes("pdf")) {
      return <FileText className="h-4 w-4 text-red-600" />
    } else if (type.includes("archive") || type.includes("zip") || type.includes("tar") || type.includes("gzip")) {
      return <FileArchive className="h-4 w-4 text-orange-600" />
    } else if (type.includes("text") || type.includes("doc") || type.includes("docx")) {
      return <FileText className="h-4 w-4 text-green-600" />
    } else {
      return <FileText className="h-4 w-4 text-gray-600" />
    }
  }

  const validateFile = (file: File): string | null => {
    if (maxFiles > 0 && uploads.length >= maxFiles) {
      return `Maximum ${maxFiles} files allowed`
    }

    if (maxSize > 0 && file.size > maxSize) {
      return `File size exceeds ${formatFileSize(maxSize)} limit`
    }

    const acceptedTypes = accept.split(",").map((t) => t.trim())
    const isAccepted = acceptedTypes.some((type) => {
      if (type === "*" || type === "*/*") return true
      if (type.includes("/")) {
        if (file.type === type) return true
        if (type.endsWith("/*") && file.type.startsWith(type.slice(0, -2))) return true
      } else {
        const fileExt = "." + file.name.split(".").pop()?.toLowerCase()
        return fileExt === type || file.name.endsWith(type)
      }
      return false
    })

    if (!isAccepted) {
      return `File type not accepted. Accepted: ${accept}`
    }

    return null
  }

  const uploadFile = async (file: File, fileId: string) => {
    const uploadUpload = uploads.find((u) => u.id === fileId)
    if (!uploadUpload) return

    setUploads((prev) =>
      prev.map((u) =>
        u.id === fileId
          ? { ...u, status: "uploading" as const }
          : u
      )
    )

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Upload failed")
      }

      const data = await response.json()
      
      setUploads((prev) =>
        prev.map((u) =>
          u.id === fileId
            ? { 
                ...u, 
                status: "success" as const, 
                progress: 100, 
                url: data.url,
                error: undefined
              }
            : u
        )
      )

      toast.success(`${file.name} uploaded successfully`)
      onFileUploaded?.({
        name: file.name,
        url: data.url,
        type: file.type,
        size: file.size,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Upload failed"
      setUploads((prev) =>
        prev.map((u) =>
          u.id === fileId
            ? { ...u, status: "error" as const, progress: 0, error: errorMessage }
            : u
        )
      )
      toast.error(`${file.name}: ${errorMessage}`)
    }
  }

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || [])
      files.forEach((file) => {
        const error = validateFile(file)
        if (error) {
          toast.error(error)
          return
        }

        const fileId = Math.random().toString(36).substring(2, 9)
        setUploads((prev) => [
          ...prev,
          {
            id: fileId,
            file,
            progress: 0,
            status: "pending" as const,
          },
        ])
      })

      event.target.value = ""
    },
    [uploads.length]
  )

  const uploadAll = useCallback(async () => {
    const pendingUploads = uploads.filter((u) => u.status === "pending")
    await Promise.all(pendingUploads.map((upload) => {
      if (upload.file) {
        return uploadFile(upload.file, upload.id)
      }
      return Promise.resolve()
    }))
  }, [uploads])

  const removeUpload = (id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id))
  }

  const clearAll = () => {
    setUploads([])
  }

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      setIsDragging(false)

      const files = Array.from(event.dataTransfer.files)
      files.forEach((file) => {
        const error = validateFile(file)
        if (error) {
          toast.error(error)
          return
        }

        const fileId = Math.random().toString(36).substring(2, 9)
        setUploads((prev) => [
          ...prev,
          {
            id: fileId,
            file,
            progress: 0,
            status: "pending" as const,
          },
        ])
      })
    },
    [uploads.length]
  )

  useEffect(() => {
    uploadAll()
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      upload: (files: File[]) => {
        files.forEach((file) => {
          const error = validateFile(file)
          if (error) {
            toast.error(error)
            return
          }

          const fileId = Math.random().toString(36).substring(2, 9)
          setUploads((prev) => [
            ...prev,
            {
              id: fileId,
              file,
              progress: 0,
              status: "pending" as const,
            },
          ])
        })
      },
      clear: clearAll,
    }),
    [uploads.length]
  )

  return (
    <div className={cn("relative", className)}>
      <input
        ref={fileInputRef}
        type="file"
        multiple={maxFiles > 1}
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
      />

      {uploads.length === 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="h-8 w-8 p-0"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
      ) : (
        <div className="space-y-2">
          {uploads.map((upload) => (
            <div key={upload.id} className="flex items-center space-x-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  {getFileIcon(upload.file.type)}
                  <span className="text-sm font-medium truncate max-w-xs">
                    {upload.file.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({formatFileSize(upload.file.size)})
                  </span>
                </div>
                <div className="mt-1">
                  {upload.status === "uploading" && (
                    <Progress value={upload.progress} className="h-1" />
                  )}
                </div>
              </div>

              <div>
                {upload.status === "success" ? (
                  <Upload className="h-4 w-4 text-green-600" />
                ) : upload.status === "error" ? (
                  <X className="h-4 w-4 text-red-600" />
                ) : upload.status === "uploading" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeUpload(upload.id)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

MessageComposerFileUpload.displayName = "MessageComposerFileUpload"

export default MessageComposerFileUpload
