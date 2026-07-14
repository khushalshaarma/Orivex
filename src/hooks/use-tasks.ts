"use client"

import { useState, useEffect, useCallback } from "react"

export interface Task {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  labels: string[] | null
  estimatedTime: number | null
  timeSpent: number | null
  storyPoints: number | null
  startDate: string | null
  assigneeId: string | null
  reporterId: string | null
  projectId: string
  parentId: string | null
  sprintId: string | null
  dueDate: string | null
  sortOrder: number
  createdAt: string
  assignee: { id: string; name: string | null; image: string | null } | null
  reporter: { id: string; name: string | null; image: string | null } | null
  project: { id: string; name: string; color: string | null } | null
  sprint: { id: string; name: string; status: string } | null
  parent: { id: string; title: string; status: string } | null
  children?: Task[]
  comments?: { id: string; content: string; createdAt: string; user: { id: string; name: string | null; image: string | null } }[]
  checklists?: { id: string; title: string; completed: boolean; sortOrder: number }[]
  attachments?: { id: string; name: string; url: string; type: string; size: number; createdAt: string }[]
  auditLogs?: { id: string; action: string; entity: string; createdAt: string; user: { id: string; name: string | null; image: string | null } | null }[]
  _count?: { comments: number; attachments: number; checklists: number; dependencies?: number }
}

export function useTasks(projectId: string | null) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!projectId) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/tasks?projectId=${projectId}`)
      const json = await res.json()
      if (json.success) setTasks(json.data ?? [])
    } catch {
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load]) // eslint-disable-line react-hooks/set-state-in-effect

  return { tasks, setTasks, loading, refetch: load }
}

export function useTask(id: string | null) {
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) { setLoading(false); return } // eslint-disable-line react-hooks/set-state-in-effect
    setLoading(true)
    fetch(`/api/tasks/${id}`)
      .then((r) => r.json())
      .then((json) => { if (json.success) setTask(json.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  return { task, setTask, loading }
}

export function useMyTasks(workspaceId: string | null) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!workspaceId) { setLoading(false); return } // eslint-disable-line react-hooks/set-state-in-effect
    fetch(`/api/tasks?workspaceId=${workspaceId}&my=true`)
      .then((r) => r.json())
      .then((json) => { if (json.success) setTasks(json.data ?? []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [workspaceId])

  return { tasks, loading }
}
