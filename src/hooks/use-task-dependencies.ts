"use client"

import { useState, useEffect, useCallback } from "react"

export interface DependencyTask {
  id: string
  title: string
  status: string
  priority: string
  assigneeId: string | null
}

export function useTaskDependencies(taskId: string | null) {
  const [dependencies, setDependencies] = useState<DependencyTask[]>([])
  const [dependents, setDependents] = useState<DependencyTask[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!taskId) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/dependencies`)
      const json = await res.json()
      if (json.success) {
        setDependencies(json.data.dependencies ?? [])
        setDependents(json.data.dependents ?? [])
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => { load() }, [load]) // eslint-disable-line react-hooks/set-state-in-effect

  const add = useCallback(async (dependencyId: string) => {
    if (!taskId) return
    const res = await fetch(`/api/tasks/${taskId}/dependencies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dependencyId }),
    })
    const json = await res.json()
    if (json.success) {
      const taskRes = await fetch(`/api/tasks/${dependencyId}`)
      const taskJson = await taskRes.json()
      if (taskJson.success) {
        setDependencies((prev) => [
          ...prev,
          {
            id: taskJson.data.id,
            title: taskJson.data.title,
            status: taskJson.data.status,
            priority: taskJson.data.priority,
            assigneeId: taskJson.data.assigneeId,
          },
        ])
      }
    }
    return json
  }, [taskId])

  const remove = useCallback(async (dependencyId: string) => {
    if (!taskId) return
    const res = await fetch(`/api/tasks/${taskId}/dependencies?dependencyId=${dependencyId}`, {
      method: "DELETE",
    })
    const json = await res.json()
    if (json.success) {
      setDependencies((prev) => prev.filter((d) => d.id !== dependencyId))
    }
    return json
  }, [taskId])

  return { dependencies, dependents, loading, refetch: load, add, remove }
}
