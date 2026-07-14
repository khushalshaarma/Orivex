"use client"

import { NotificationCenter } from "@/components/notifications/notification-center"

export default function NotificationsPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-6 h-14 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Notifications</h1>
      </div>
      <div className="flex-1 overflow-hidden">
        <NotificationCenter />
      </div>
    </div>
  )
}
