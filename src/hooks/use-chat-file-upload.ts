"use client"
import { useState, useCallback } from "react"

export interface ChatFileUploadResult {
  success: boolean
  url?: string
  filename?: string
  error?: string
}

export interface UseChatFileUploadOptions {
  endpoint?: string
  onUploaded?: (result: ChatFileUploadResult) => void
}

export function useChatFileUpload(options: UseChatFileUploadOptions = {}) {
  const endpoint = options.endpoint ?? "/api/files/upload"
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadChatFile = useCallback(
    async (file: File, uploaderId?: string): Promise<ChatFileUploadResult> => {
      setUploading(true)
      setError(null)
      try {
        const formData = new FormData()
        formData.append("file", file)
        if (uploaderId) formData.append("uploaderId", uploaderId)

        const response = await fetch(endpoint, {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || "Upload failed")
        }

        const data = await response.json()
        const result: ChatFileUploadResult = {
          success: true,
          url: data.url,
          filename: data.filename ?? file.name,
        }
        options.onUploaded?.(result)
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed"
        setError(message)
        return { success: false, error: message }
      } finally {
        setUploading(false)
      }
    },
    [endpoint, options],
  )

  const uploadMessageFiles = useCallback(
    async (files: File[], uploaderId?: string): Promise<ChatFileUploadResult[]> => {
      return Promise.all(files.map((file) => uploadChatFile(file, uploaderId)))
    },
    [uploadChatFile],
  )

  return { uploadChatFile, uploadMessageFiles, uploading, error }
}
