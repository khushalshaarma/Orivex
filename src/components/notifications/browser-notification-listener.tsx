"use client"

import { useBrowserNotifications } from "@/hooks/use-browser-notifications"

export function BrowserNotificationListener() {
  useBrowserNotifications()
  return null
}
