"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"

interface Workspace {
  id: string
  name: string
  slug: string
  logo: string | null
  industry: string | null
  companySize: string | null
  timezone: string | null
}

interface WorkspaceMember {
  id: string
  userId: string
  workspaceId: string
  role: string
  joinedAt: string
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
    position: string | null
    department: string | null
    status: string
    lastActiveAt: string | null
  }
}

export function useWorkspace() {
  const { data: session } = useSession()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session?.user?.id) return

    let cancelled = false

    fetch("/api/workspace/active")
      .then((res) => {
        if (cancelled) return
        if (res.status === 404) {
          setWorkspace(null)
          return
        }
        if (!res.ok) {
          setError("Failed to load workspace")
          return
        }
        return res.json()
      })
      .then((json) => {
        if (!cancelled && json) {
          setWorkspace(json.data ?? null)
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load workspace")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [session?.user?.id])

  return { workspace, loading, error, refetch: () => {} }
}

export function useWorkspaceMembers() {
  const { workspace } = useWorkspace()
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!workspace?.id) {
      setLoading(false) // eslint-disable-line react-hooks/set-state-in-effect
      return
    }

    let cancelled = false

    fetch(`/api/workspace/${workspace.id}/members`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setMembers(json.data ?? [])
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [workspace?.id])

  return { members, loading }
}

export function useActiveWorkspace() {
  const { workspace, loading } = useWorkspace()

  return { workspace, loading }
}
