"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import useSWRInfinite from "swr/infinite"
import { useSession } from "next-auth/react"
import { useSocket } from "@/features/chat/socket/provider"

export interface Notification {
  id: string
  userId: string
  type: string
  category: string | null
  title: string
  message: string | null
  link: string | null
  read: boolean
  archived: boolean
  pinned: boolean
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT" | null
  actor?: { id: string; name: string | null; image: string | null } | null
  createdAt: string
  updatedAt: string
}

export interface NotificationFilter {
  category?: string
  read?: boolean
  archived?: boolean
  pinned?: boolean
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT"
  search?: string
  pageSize?: number
}

const PAGE_SIZE = 10

function buildQuery(filter: NotificationFilter, page: number, size: number): string {
  const params = new URLSearchParams()
  params.set("page", String(page))
  params.set("pageSize", String(size))
  if (filter.category) params.set("category", filter.category)
  if (filter.read !== undefined) params.set("read", String(filter.read))
  if (filter.archived !== undefined) params.set("archived", String(filter.archived))
  if (filter.pinned !== undefined) params.set("pinned", String(filter.pinned))
  if (filter.priority) params.set("priority", filter.priority)
  if (filter.search) params.set("search", filter.search)
  return params.toString()
}

async function fetcher(url: string) {
  const res = await fetch(url)
  const json = await res.json()
  if (!json.success) throw new Error(json.error ?? "Failed to fetch")
  return json.data
}

export function useNotifications(filter: NotificationFilter = {}) {
  const { data: session } = useSession()
  const { socket } = useSocket()
  const pageSize = filter.pageSize ?? PAGE_SIZE

  const getKey = useCallback(
    (pageIndex: number, previousPageData: { items: Notification[]; hasMore: boolean } | null) => {
      if (!session?.user?.id) return null
      if (previousPageData && !previousPageData.hasMore) return null
      const page = pageIndex + 1
      return `/api/notifications?${buildQuery(filter, page, pageSize)}`
    },
    [session?.user?.id, filter, pageSize],
  )

  const { data, error, isLoading, isValidating, mutate, setSize, size } =
    useSWRInfinite<{ items: Notification[]; totalPages: number; hasMore: boolean }>(getKey, fetcher, {
      revalidateFirstPage: false,
    })

  const notifications = data ? data.flatMap((page) => page.items) : []
  const totalPages = data?.[0]?.totalPages ?? 1
  const hasMore = data?.[data.length - 1]?.hasMore ?? false
  const loading = isLoading
  const validating = isValidating

  useEffect(() => {
    if (!socket || !session?.user?.id) return

    const handleNew = () => {
      if (process.env.NODE_ENV !== "production") {
        console.log("[notifications] cache invalidated (notification:new)")
      }
      mutate()
    }

    const handleRead = (payload: { notificationId: string }) => {
      mutate((pages) => {
        if (!pages) return pages
        return pages.map((page) => ({
          ...page,
          items: page.items.map((n) =>
            n.id === payload.notificationId ? { ...n, read: true } : n,
          ),
        }))
      }, false)
    }

    const handleBulk = () => {
      if (process.env.NODE_ENV !== "production") {
        console.log("[notifications] cache invalidated (notification:bulk)")
      }
      mutate()
    }

    socket.on("notification:new", handleNew)
    socket.on("notification:read", handleRead)
    socket.on("notification:bulk", handleBulk)

    return () => {
      socket.off("notification:new", handleNew)
      socket.off("notification:read", handleRead)
      socket.off("notification:bulk", handleBulk)
    }
  }, [socket, session?.user?.id, mutate])

  const loadMore = useCallback(() => {
    if (!isValidating && hasMore) {
      setSize((prev) => prev + 1)
    }
  }, [isValidating, hasMore, setSize])

  const markRead = useCallback(
    async (id: string) => {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" })
      mutate()
    },
    [mutate],
  )

  const markAllAsRead = useCallback(async () => {
    await fetch("/api/notifications/read-all", { method: "POST" })
    mutate()
  }, [mutate])

  const bulkMarkRead = useCallback(
    async (ids: string[]) => {
      await fetch("/api/notifications/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read", ids }),
      })
      mutate()
    },
    [mutate],
  )

  const bulkArchive = useCallback(
    async (ids: string[]) => {
      await fetch("/api/notifications/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive", ids }),
      })
      mutate()
    },
    [mutate],
  )

  const bulkDelete = useCallback(
    async (ids: string[]) => {
      await fetch("/api/notifications/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids }),
      })
      mutate()
    },
    [mutate],
  )

  const bulkPin = useCallback(
    async (ids: string[], pinned: boolean) => {
      await fetch("/api/notifications/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: pinned ? "pin" : "unpin", ids }),
      })
      mutate()
    },
    [mutate],
  )

  return {
    notifications,
    loading,
    validating,
    error,
    page: size,
    totalPages,
    hasMore,
    loadMore,
    setPage: setSize,
    markRead,
    markAllAsRead,
    bulkMarkRead,
    bulkArchive,
    bulkDelete,
    bulkPin,
    refetch: mutate,
  }
}
