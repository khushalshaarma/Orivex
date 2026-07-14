"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"

export interface Activity {
  id: string
  actor: {
    id: string
    name: string
    image: string | null
  } | null
  action: string
  entityType?: string
  entityName?: string
  description?: string
  link?: string
  createdAt: string
}

interface RawActivityUser {
  id: string
  name: string | null
  image: string | null
}

interface RawActivityItem {
  id: string
  user?: RawActivityUser | null
  action: string
  entity: string
  entityName?: string | null
  description?: string | null
  link?: string | null
  createdAt: string
  metadata?: Record<string, unknown> | null
}

export function useActivity(workspaceId: string | null) {
  const { data: session } = useSession()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const mapActivity = (item: RawActivityItem): Activity => ({
    id: item.id,
    actor: item.user
      ? { id: item.user.id, name: item.user.name ?? "User", image: item.user.image }
      : { id: "", name: "System", image: null },
    action: item.action,
    entityType: item.entity,
    entityName: item.entityName ?? (item.metadata?.["name"] as string | undefined),
    description: item.description ?? (item.metadata?.["description"] as string | undefined),
    link: item.link ?? (item.metadata?.["link"] as string | undefined),
    createdAt: item.createdAt,
  })

  const load = useCallback(async () => {
    if (!session?.user?.id || !workspaceId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({ workspaceId })
      if (cursor) params.set("cursor", cursor)

      const res = await fetch(`/api/activity?${params.toString()}`)
      const json = await res.json()
      if (json.success) {
        const items = (json.data?.items ?? []).map(mapActivity)
        setActivities((prev) => [...prev, ...items])
        setCursor(json.data?.nextCursor ?? null)
        setHasMore(!!json.data?.nextCursor)
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id, workspaceId, cursor])

  useEffect(() => {
    // Reset local state when the active workspace changes. This is an
    // intentional external-state synchronization, not a derived value.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActivities([])
    setCursor(null)
    setHasMore(false)
    setLoading(true)
  }, [workspaceId])

  useEffect(() => {
    if (!session?.user?.id || !workspaceId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false)
      return
    }

    let cancelled = false

    const params = new URLSearchParams({ workspaceId })

    async function initialLoad() {
      try {
        const res = await fetch(`/api/activity?${params.toString()}`)
        const json = await res.json()
        if (!cancelled && json.success) {
          const items = (json.data?.items ?? []).map(mapActivity)
          setActivities(items)
          setCursor(json.data?.nextCursor ?? null)
          setHasMore(!!json.data?.nextCursor)
        }
      } catch {
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    initialLoad()
    return () => {
      cancelled = true
    }
  }, [session?.user?.id, workspaceId])

  const loadMore = useCallback(() => {
    if (!loading && hasMore && cursor) {
      setLoading(true)

      const params = new URLSearchParams({ workspaceId: workspaceId! })
      if (cursor) params.set("cursor", cursor)

      fetch(`/api/activity?${params.toString()}`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success) {
            const items = (json.data?.items ?? []).map(mapActivity)
            setActivities((prev) => [...prev, ...items])
            setCursor(json.data?.nextCursor ?? null)
            setHasMore(!!json.data?.nextCursor)
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [loading, hasMore, cursor, workspaceId])

  return { activities, loading, loadMore, hasMore }
}
