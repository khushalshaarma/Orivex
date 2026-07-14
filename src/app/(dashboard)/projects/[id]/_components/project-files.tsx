"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import {
  Paperclip,
  FileText,
  Image,
  FileArchive,
  Video,
  Download,
  Upload,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { ListSkeleton } from "@/components/ui/skeleton"
import { formatDistanceToNow } from "date-fns"

interface ProjectFilesProps {
  projectId: string
}

interface Attachment {
  id: string
  name: string
  url: string
  type: string
  size: number
  createdAt: string
  uploadedBy: { id: string; name: string | null; image: string | null }
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return Image
  if (type.startsWith("video/")) return Video
  if (type.includes("zip") || type.includes("rar") || type.includes("tar")) return FileArchive
  return FileText
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ProjectFiles({ projectId }: ProjectFilesProps) {
  const [files, setFiles] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/projects/${projectId}/attachments`)
        const json = await res.json()
        if (json.success) setFiles(json.data ?? [])
      } catch {
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch(`/api/projects/${projectId}/attachments`, {
        method: "POST",
        body: formData,
      })
      const json = await res.json()
      if (json.success) {
        setFiles((prev) => [json.data, ...prev])
      }
    } catch {
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  if (loading) return <ListSkeleton items={4} />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{files.length} files</p>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-1.5 h-4 w-4" />
            )}
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </div>

      {files.length === 0 ? (
        <EmptyState
          icon={<Paperclip className="h-12 w-12" />}
          title="No files yet"
          description="Upload files to share with your team"
          action={
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-1.5 h-4 w-4" />
              Upload File
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file, i) => {
            const Icon = getFileIcon(file.type)
            return (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="group hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    {file.type.startsWith("image/") ? (
                      <div className="relative h-32 rounded-lg overflow-hidden mb-3 bg-zinc-100 dark:bg-zinc-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={file.url}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-32 items-center justify-center rounded-lg mb-3 bg-zinc-50 dark:bg-zinc-800/50">
                        <Icon className="h-10 w-10 text-zinc-400" />
                      </div>
                    )}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {formatFileSize(file.size)} &middot; {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={file.url}
                          download={file.name}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                          <Download className="h-3.5 w-3.5 text-zinc-500" />
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
