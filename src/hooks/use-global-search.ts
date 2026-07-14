"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"

export interface GlobalSearchResult {
  notifications: { id: string; title: string; message: string | null; link: string | null; createdAt: string }[]
  activities: { id: string; type: string; description: string; createdAt: string }[]
  messages: { id: string; content: string; channelId: string | null; conversationId: string | null; createdAt: string }[]
  users: { id: string; name: string | null; email: string; image: string | null }[]
}

export function useGlobalSearch() {
  const { data: session } = useSession()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<GlobalSearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(
    (q: string) => {
      setQuery(q)

      if (debounceRef.current) clearTimeout(debounceRef.current)

      if (!q.trim()) {
        setResults(null)
        setLoading(false)
        return
      }

      setLoading(true)

      debounceRef.current = setTimeout(async () => {
        if (!session?.user?.id) {
          setLoading(false)
          return
        }

        try {
          const res = await fetch(`/api/notifications/search?q=${encodeURIComponent(q.trim())}`)
          const json = await res.json()
          if (json.success) {
            setResults(json.data ?? null)
          }
        } catch {
        } finally {
          setLoading(false)
        }
      }, 300)
    },
    [session?.user?.id],
  )

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return { results, loading, search, query }
}
