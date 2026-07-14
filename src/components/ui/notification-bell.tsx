"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  CheckCheck,
  AtSign,
  Building2,
  FolderKanban,
  ClipboardList,
  GitBranch,
  MessageSquare,
  Heart,
  MessageSquareText,
  Reply,
  UserPlus,
  Settings,
  Bot,
  ExternalLink,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { formatDistanceToNow } from "date-fns"
import { useNotifications, type Notification } from "@/hooks/use-notifications"
import { useUnreadCount } from "@/hooks/use-unread-count"
import { cn } from "@/lib/utils"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

interface NotificationActor {
  id: string
  name: string | null
  image: string | null
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-zinc-400",
  NORMAL: "bg-blue-500",
  HIGH: "bg-orange-500",
  URGENT: "bg-red-500",
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Workspace: <Building2 className="h-4 w-4" />,
  Project: <FolderKanban className="h-4 w-4" />,
  Task: <ClipboardList className="h-4 w-4" />,
  Sprint: <GitBranch className="h-4 w-4" />,
  Message: <MessageSquare className="h-4 w-4" />,
  Mention: <AtSign className="h-4 w-4" />,
  Reaction: <Heart className="h-4 w-4" />,
  Comment: <MessageSquareText className="h-4 w-4" />,
  Reply: <Reply className="h-4 w-4" />,
  Invitation: <UserPlus className="h-4 w-4" />,
  Reminder: <Bell className="h-4 w-4" />,
  System: <Settings className="h-4 w-4" />,
  AI: <Bot className="h-4 w-4" />,
}

function getCategoryIcon(category?: string) {
  if (category && CATEGORY_ICONS[category]) return CATEGORY_ICONS[category]
  return <Bell className="h-4 w-4" />
}

export function NotificationBell() {
  const router = useRouter()
  const { notifications, markRead, markAllAsRead } = useNotifications()
  const { unreadCount } = useUnreadCount()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const mentionCount = notifications.filter(
    (n) => n.category === "Mention" || n.type === "mention",
  ).length

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) markRead(notification.id)
    setOpen(false)
    if (notification.link) router.push(notification.link)
  }

  const getActorFallback = (actor?: NotificationActor | null) => {
    if (!actor) return "?"
    return actor.name?.charAt(0).toUpperCase() ?? "?"
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <motion.span
            key={unreadCount}
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-zinc-900"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </motion.span>
        )}
        {mentionCount > 0 && (
          <span className="absolute -bottom-1 -left-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-purple-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-zinc-900">
            <AtSign className="h-2.5 w-2.5" />
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed right-4 sm:absolute sm:right-0 top-14 sm:top-full sm:mt-2 w-[calc(100vw-32px)] sm:w-96 origin-top-right sm:max-w-[calc(100vw-32px)]"
          >
            <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl shadow-black/10">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Mark all read
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-[min(360px,60vh)] overflow-y-auto">
                {(notifications as Notification[]).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                      <Bell className="h-6 w-6 text-zinc-400 dark:text-zinc-500" />
                    </div>
                    <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">All caught up!</p>
                    <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">No notifications yet</p>
                  </div>
                ) : (
                  (notifications as Notification[]).map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        "w-full text-left px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                        !notification.read && "bg-blue-50/40 dark:bg-blue-900/10",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          {notification.actor ? (
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={notification.actor.image ?? undefined} alt={notification.actor.name ?? "User"} />
                              <AvatarFallback className="text-[11px]">{getActorFallback(notification.actor)}</AvatarFallback>
                            </Avatar>
                          ) : (
                            getCategoryIcon(notification.category || notification.type)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={cn(
                                "text-sm truncate",
                                !notification.read
                                  ? "font-semibold text-zinc-900 dark:text-zinc-50"
                                  : "text-zinc-600 dark:text-zinc-400",
                              )}
                            >
                              {notification.title}
                            </p>
                            <div className="flex items-center gap-1 shrink-0">
                              {notification.priority && (
                                <span
                                  className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_COLORS[notification.priority])}
                                />
                              )}
                              <span className="text-[11px] text-zinc-400 dark:text-zinc-600 whitespace-nowrap">
                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                          {notification.message && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                          )}
                        </div>
                        {!notification.read && (
                          <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-2.5">
                <button
                  onClick={() => {
                    setOpen(false)
                    router.push("/notifications")
                  }}
                  className="flex w-full items-center justify-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors py-1"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View all notifications
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
