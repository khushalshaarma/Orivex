"use client"
import { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from "react"
import { Paperclip, X, Download, Upload, Image, Video, FileText, FileArchive, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import type { UploadFile } from "@/components/ui/file-preview"

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  url: string
  uploadedAt: Date
  previewUrl?: string
}

interface MessageComposerFileUploadProps {
  onFileUploaded?: (file: UploadedFile) => void
  onFilesUploaded?: (files: UploadedFile[]) => void
  accept?: string
  maxSize?: number
  maxFiles?: number
  endpoint?: string
  className?: string
  compact?: boolean
}

export interface MessageComposerFileUploadHandle {
  upload: (files: File[]) => void
  clear: () => void
  getUploadedFiles: () => UploadedFile[]
}

const MessageComposerFileUpload = forwardRef<MessageComposerFileUploadHandle, MessageComposerFileUploadProps>(
  (
    {
      onFileUploaded,
      onFilesUploaded,
      accept = "image/*,video/*,.pdf,.doc,.docx,.txt,.zip,.tar,.gz",
      maxSize = 52428800,
      maxFiles = 5,
      endpoint = "/api/files/upload",
      className,
      compact = false,
    },
    ref
  ): React.ReactElement | null => {
  const [uploads, setUploads] = useState<UploadFile[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploadQueue, setUploadQueue] = useState<File[]>([])
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

  const isImageFile = (type: string) => type.startsWith("image/")

  const validateFile = (file: File): string | null => {
    if (maxFiles > 0 && uploadedFiles.length >= maxFiles) {
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

  const uploadFile = async (file: File, fileId: string): Promise<UploadedFile | null> => {
    const uploadUpload = uploads.find((u) => u.id === fileId)
    if (!uploadUpload) return null

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
      
      const uploadedFile: UploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        url: data.url,
        uploadedAt: new Date(),
        previewUrl: isImageFile(file.type) ? URL.createObjectURL(file) : undefined,
      }
      
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

      setUploadedFiles((prev) => {
        const newFiles = [...prev, uploadedFile]
        onFilesUploaded?.(newFiles)
        onFileUploaded?.(uploadedFile)
        return newFiles
      })

      toast.success(`${file.name} uploaded successfully`)
      return uploadedFile
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
      return null
    }
  }

  const addToQueue = useCallback(
    (files: File[]) => {
      const validFiles = files.filter((file) => {
        const error = validateFile(file)
        if (error) {
          toast.error(error)
          return false
        }
        return true
      })

      if (validFiles.length > maxFiles - uploadedFiles.length) {
        toast.error(`Maximum ${maxFiles} files allowed`)
        return null
      }

      setUploadQueue((prev) => [...prev, ...validFiles])
    },
    [maxFiles, uploadedFiles.length]
  )

  const processQueue = useCallback(async () => {
    if (uploadQueue.length === 0) return null

    const filesToProcess = uploadQueue.slice(0, maxFiles - uploadedFiles.length)
    if (filesToProcess.length === 0) return null

    setUploadQueue([])

    const uploadPromises = filesToProcess.map(async (file) => {
      const fileId = Math.random().toString(36).substring(2, 9)
      const uploadData: UploadFile = {
        id: fileId,
        file,
        progress: 0,
        status: "pending" as const,
      }
      setUploads((prev) => [...prev, uploadData])

      const result = await uploadFile(file, fileId)
      return result
    })

    await Promise.allSettled(uploadPromises)
  }, [uploadQueue, maxFiles, uploadedFiles.length])

  const removeUpload = (id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id))
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const clearAll = () => {
    uploads.forEach((upload) => {
      if (upload.previewUrl) {
        URL.revokeObjectURL(upload.previewUrl)
      }
    })
    setUploads([])
    setUploadedFiles([])
  }

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || [])
      addToQueue(files)
      event.target.value = ""
    },
    [addToQueue]
  )

  const removeUploadedFile = (fileId: string) => {
    setUploadedFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === fileId)
      if (fileToRemove?.previewUrl) {
        URL.revokeObjectURL(fileToRemove.previewUrl)
      }
      const newFiles = prev.filter((f) => f.id !== fileId)
      onFilesUploaded?.(newFiles)
      return newFiles
    })
  }

  useEffect(() => {
    processQueue()
  }, [uploadQueue.length])

  useEffect(() => {
    return () => {
      uploads.forEach((upload) => {
        if (upload.previewUrl) {
          URL.revokeObjectURL(upload.previewUrl)
        }
      })
      uploadedFiles.forEach((file) => {
        if (file.previewUrl) {
          URL.revokeObjectURL(file.previewUrl)
        }
      })
    }
  }, [uploads, uploadedFiles])

  useImperativeHandle(
    ref,
    () => ({
      upload: addToQueue,
      clear: clearAll,
      getUploadedFiles: () => uploadedFiles,
    }),
    [addToQueue, clearAll, uploadedFiles]
  )

  const displayUploads = compact ? uploads : uploads

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

      {compact ? (
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
        <div className="space-y-3">
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Uploaded Files</div>
              <div className="space-y-2">
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {isImageFile(file.type) ? (
                        <img
                          src={file.previewUrl}
                          alt={file.name}
                          className="h-8 w-8 rounded object-cover"
                        />
                      ) : (
                        getFileIcon(file.type)
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(file.url, "_blank")}
                        className="h-8 w-8 p-0"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeUploadedFile(file.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
          >
            <Paperclip className="h-4 w-4 mr-2" />
            Attach Files
          </Button>

          {uploads.length > 0 && !compact && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Uploading</div>
              {uploads.map((upload) => (
                <div key={upload.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1 min-w-0">
                      {getFileIcon(upload.file.type)}
                      <div className="ml-2 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {upload.file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(upload.file.size)}
                        </p>
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      {upload.status === "success" ? (
                        <Upload className="h-4 w-4 text-green-600" />
                      ) : upload.status === "error" ? (
                        <X className="h-4 w-4 text-red-600" />
                      ) : upload.status === "uploading" ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                          <span className="text-xs text-gray-500">
                            {upload.progress}%
                          </span>
                        </div>
                      ) : (
                        <div className="h-4 w-4" />
                      )}
                    </div>
                  </div>

                  {upload.status === "uploading" && (
                    <Progress value={upload.progress} className="h-1" />
                  )}

                  {upload.status === "error" && (
                    <p className="text-xs text-red-600 truncate">
                      {upload.error}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

)

MessageComposerFileUpload.displayName = "MessageComposerFileUpload"

export default MessageComposerFileUpload
