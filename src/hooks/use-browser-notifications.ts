"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useSocket } from "@/features/chat/socket/provider"
import { useNotificationSettings } from "@/hooks/use-notification-settings"

export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission === "granted"
  }
  const result = await Notification.requestPermission()
  return result === "granted"
}

/**
 * Surfaces in-app notifications as native OS notifications, respecting the
 * user's saved browser preferences. No spam: only fires for categories the
 * user enabled in notification settings.
 */
export function useBrowserNotifications() {
  const { data: session } = useSession()
  const { socket } = useSocket()
  const { prefs } = useNotificationSettings()

  useEffect(() => {
    if (!socket || !session?.user?.id) return
    if (typeof window === "undefined" || !("Notification" in window)) return
    if (Notification.permission !== "granted") return

    const handleNew = (payload: { title?: string; message?: string; category?: string }) => {
      if (!prefs?.browserEnabled) return
      const category = payload.category ?? "SYSTEM"
      const cat = prefs.settings?.[category]
      if (cat && cat.browser === false) return
      try {
        new Notification(payload.title ?? "Collab", {
          body: payload.message ?? "",
          tag: `collab-${payload.category}`,
        })
      } catch {
        // ignore
      }
    }

    socket.on("notification:new", handleNew)
    return () => {
      socket.off("notification:new", handleNew)
    }
  }, [socket, session?.user?.id, prefs])
}
