"use client"

import { useState, useEffect, useCallback } from "react"

export interface Sprint {
  id: string
  name: string
  goal: string | null
  status: string
  velocity: number
  startDate: string | null
  endDate: string | null
  projectId: string
  createdAt: string
  _count?: { tasks: number }
  tasks?: {
    id: string
    title: string
    status: string
    priority: string
    assignee: { id: string; name: string | null; image: string | null } | null
  }[]
}

export function useSprints(projectId: string | null) {
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!projectId) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/sprints?projectId=${projectId}`)
      const json = await res.json()
      if (json.success) setSprints(json.data ?? [])
    } catch {
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load]) // eslint-disable-line react-hooks/set-state-in-effect

  return { sprints, loading, refetch: load }
}
