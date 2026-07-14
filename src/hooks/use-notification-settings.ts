"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"

export interface CategoryPref {
  email: boolean
  browser: boolean
  push: boolean
}

export interface NotificationPreferences {
  id: string
  userId: string
  settings: Record<string, CategoryPref> | null
  digestFrequency: string
  browserEnabled: boolean
  emailEnabled: boolean
}

async function fetcher(url: string, method = "GET", body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error ?? "Failed to load preferences")
  return json.data
}

export function useNotificationSettings() {
  const { data: session } = useSession()
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const reload = useCallback(async () => {
    if (!session?.user?.id) return
    setLoading(true)
    try {
      const data = await fetcher("/api/notifications/settings")
      setPrefs(data)
    } catch {
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (!session?.user?.id) return
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const data = await fetcher("/api/notifications/settings")
        if (!cancelled) setPrefs(data)
      } catch {
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [session?.user?.id])

  const save = useCallback(
    async (next: Partial<NotificationPreferences>) => {
      if (!session?.user?.id) return
      setSaving(true)
      try {
        const data = await fetcher("/api/notifications/settings", "PUT", next)
        setPrefs(data)
      } finally {
        setSaving(false)
      }
    },
    [session?.user?.id],
  )

  return { prefs, loading, saving, save, reload }
}
