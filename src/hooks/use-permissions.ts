"use client"

import { useMemo, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { hasPermission, type Permission } from "@/config/permissions"

export function useCurrentMemberRole(workspaceId?: string) {
  const { data: session } = useSession()
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!workspaceId || !session?.user?.id) {
      setLoading(false) // eslint-disable-line react-hooks/set-state-in-effect
      return
    }

    let cancelled = false

    fetch(`/api/workspace/${workspaceId}/members`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) {
          const members = json.data ?? []
          const current = members.find((m: { userId: string }) => m.userId === session.user?.id)
          setRole(current?.role ?? null)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [workspaceId, session?.user?.id])

  return { role: (role ?? "GUEST") as Parameters<typeof hasPermission>[0], loading }
}

export function useCan(permission: Permission, workspaceId?: string) {
  const { role, loading } = useCurrentMemberRole(workspaceId)
  return useMemo(() => ({
    allowed: !loading && hasPermission(role, permission),
    loading,
  }), [role, loading, permission])
}
