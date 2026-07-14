"use client"
import { useState, useCallback, useEffect, forwardRef, useImperativeHandle } from "react"
import { UploadCloud, X, Download, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { FilePreview, type UploadFile } from "@/components/ui/file-preview"

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  url: string
  uploadedAt: Date
}

interface BatchUploadProps {
  endpoint: string
  onUploadSuccess?: (files: UploadedFile[]) => void
  accept?: string
  maxSize?: number
  maxFiles?: number
  className?: string
}

export interface BatchUploadHandle {
  upload: (files: File[]) => void
  clear: () => void
}

const BatchUpload = forwardRef<BatchUploadHandle, BatchUploadProps>(
  (
    { 
      endpoint, 
      onUploadSuccess, 
      accept = "*", 
      maxSize = 10485760, 
      maxFiles = 10, 
      className 
    }, 
    ref
  ) => {
  const [uploads, setUploads] = useState<UploadFile[]>([])
  const [isDragging, setIsDragging] = useState(false)

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const validateFile = (file: File): string | null => {
    if (maxFiles > 0 && uploads.length >= maxFiles) {
      return `Maximum ${maxFiles} files allowed`
    }

    if (maxSize > 0 && file.size > maxSize) {
      return `File size exceeds ${formatFileSize(maxSize)} limit`
    }

    return null
  }

  const uploadFile = async (file: File, fileId: string) => {
    const formData = new FormData()
    formData.append("file", file)

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
      onUploadSuccess?.([{ id: fileId, name: file.name, size: file.size, type: file.type, url: data.url, uploadedAt: new Date() }])
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
    <div className={cn("space-y-4", className)}>
      {uploads.length === 0 ? (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            isDragging
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <UploadCloud className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">
            Drop files here or click to upload
          </p>
          <p className="text-sm text-gray-500 mb-4">
            {accept !== "*" && `Accepts ${accept}. `}
            Max {maxFiles} files, up to {maxSize > 0 ? formatFileSize(maxSize) : "no size limit"}
          </p>
          <label>
            <input
              type="file"
              multiple={maxFiles > 1}
              accept={accept}
              className="hidden"
              onChange={handleFileChange}
            />
            <Button className="cursor-pointer">
              <Plus className="h-4 w-4 mr-2" />
              Select Files
            </Button>
          </label>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-900">
              Uploading ({uploads.length} files)
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="text-red-600 hover:text-red-700"
            >
              Clear all
            </Button>
          </div>

          {uploads.map((upload) => (
            <div key={upload.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-1 min-w-0">
                  <FilePreview
                    file={upload.file}
                    onRemove={() => removeUpload(upload.id)}
                    className="flex-1"
                  />
                </div>
                <div className="ml-4 text-right">
                  {upload.status === "success" && upload.url ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <a href={upload.url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </a>
                    </Button>
                  ) : upload.status === "error" ? (
                    <span className="text-sm text-red-600">
                      {upload.error}
                    </span>
                  ) : upload.status === "uploading" ? (
                    <span className="text-sm text-gray-500">
                      {upload.progress}% (uploading...)
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">
                      Pending
                    </span>
                  )}
                </div>
              </div>

              {upload.status === "uploading" && (
                <Progress value={upload.progress} className="h-2" />
              )}
            </div>
          ))}

          <div className="flex justify-end pt-4">
            <label>
              <input
                type="file"
                multiple={maxFiles > 1}
                accept={accept}
                className="hidden"
                onChange={handleFileChange}
              />
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add More Files
              </Button>
            </label>
          </div>
        </div>
      )}
    </div>
  )
})

BatchUpload.displayName = "BatchUpload"

export default BatchUpload
