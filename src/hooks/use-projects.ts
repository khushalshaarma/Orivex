"use client"

import { useState, useEffect, useCallback } from "react"
import { useWorkspace } from "./use-workspace"

interface Project {
  id: string
  name: string
  slug: string
  description: string | null
  status: string
  priority: string
  favorite: boolean
  color: string | null
  icon: string | null
  progress: number
  startDate: string | null
  dueDate: string | null
  teamId: string
  ownerId: string
  createdAt: string
  deletedAt: string | null
  visibility?: string
  labels?: string[]
  owner: { id: string; name: string | null; image: string | null } | null
  team: { id: string; name: string; color: string | null } | null
  _count?: { tasks: number }
}

export function useProjects() {
  const { workspace } = useWorkspace()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => { // eslint-disable-line react-hooks/preserve-manual-memoization
    if (!workspace?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/projects?workspaceId=${workspace.id}`)
      const json = await res.json()
      if (json.success) setProjects(json.data ?? [])
    } catch {
    } finally {
      setLoading(false)
    }
  }, [workspace?.id])

  useEffect(() => { load() }, [load]) // eslint-disable-line react-hooks/set-state-in-effect

  return { projects, loading, refetch: load }
}

interface ProjectDetail extends Project {
  members: {
    id: string
    userId: string
    projectId: string
    role: string
    joinedAt: string
    user: { id: string; name: string | null; image: string | null; email: string }
  }[]
}

export function useProject(id: string | null) {
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) { setLoading(false); return } // eslint-disable-line react-hooks/set-state-in-effect
    setLoading(true)
    fetch(`/api/projects/${id}`)
      .then((r) => r.json())
      .then((json) => { if (json.success) setProject(json.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  return { project, loading, setProject }
}
