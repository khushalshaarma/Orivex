"use client"

import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import {
  Bell,
  AtSign,
  Archive,
  Pin,
  Trash2,
  CheckCheck,
  CheckSquare,
  Square,
  Inbox,
  Clock,
  Star,
  Search,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useNotifications } from "@/hooks/use-notifications"
import { NotificationCard } from "./notification-card"
import { NotificationSearch } from "./notification-search"
import { NotificationBadge } from "./notification-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

type NotificationPriority = "low" | "normal" | "high" | "urgent"

interface NotificationActor {
  id: string
  name: string | null
  image: string | null
}

interface LocalNotification {
  id: string
  userId: string
  type: string
  title: string
  message: string | null
  read: boolean
  link: string | null
  createdAt: string
  priority?: NotificationPriority
  category?: string
  archived?: boolean
  pinned?: boolean
  actor?: NotificationActor | null
}

type TabId = "all" | "unread" | "mentions" | "archived" | "pinned"

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "all", label: "All", icon: <Bell className="h-4 w-4" /> },
  { id: "unread", label: "Unread", icon: <Inbox className="h-4 w-4" /> },
  { id: "mentions", label: "Mentions", icon: <AtSign className="h-4 w-4" /> },
  { id: "archived", label: "Archived", icon: <Archive className="h-4 w-4" /> },
  { id: "pinned", label: "Pinned", icon: <Pin className="h-4 w-4" /> },
]

export function NotificationCenter() {
  const router = useRouter()
  const { notifications: apiNotifications, loading, markRead: markAsRead, markAllAsRead } = useNotifications()
  const [activeTab, setActiveTab] = useState<TabId>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [allItems, setAllItems] = useState<LocalNotification[]>([])
  const sentinelRef = useRef<HTMLDivElement>(null)

  const notifications: LocalNotification[] = useMemo(
    () =>
      apiNotifications.map((n) => ({
        id: n.id,
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        read: n.read,
        link: n.link,
        createdAt: n.createdAt,
        category: n.category ?? undefined,
        priority: (n.priority?.toLowerCase() as NotificationPriority | undefined) ?? undefined,
        archived: n.archived ?? false,
        pinned: n.pinned ?? false,
        actor: n.actor ?? undefined,
      })),
    [apiNotifications],
  )

  useEffect(() => {
    if (notifications.length > 0) {
      // Merge incoming notifications into local cache (external data sync).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAllItems((prev) => {
        const existingIds = new Set(prev.map((n) => n.id))
        const newItems = notifications.filter((n) => !existingIds.has(n.id))
        if (newItems.length === 0) return prev
        return [...prev, ...newItems]
      })
    }
  }, [notifications])

  const filtered = useMemo(() => {
    let list = allItems

    list = list.filter((n) => {
      switch (activeTab) {
        case "unread":
          return !n.read
        case "mentions":
          return n.category === "Mention" || n.type === "mention"
        case "archived":
          return n.archived
        case "pinned":
          return n.pinned
        default:
          return !n.archived
      }
    })

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (n.message && n.message.toLowerCase().includes(q)),
      )
    }

    return list
  }, [allItems, activeTab, searchQuery])

  const tabCounts = useMemo(() => {
    const counts: Record<TabId, number> = { all: 0, unread: 0, mentions: 0, archived: 0, pinned: 0 }
    for (const n of allItems) {
      counts.all++
      if (!n.read) counts.unread++
      if (n.category === "Mention" || n.type === "mention") counts.mentions++
      if (n.archived) counts.archived++
      if (n.pinned) counts.pinned++
    }
    return counts
  }, [allItems])

  useEffect(() => {
    // Reset pagination / selection and re-seed the list when switching tabs.
    // `notifications` is intentionally excluded: re-seeding on every fetch
    // would discard the infinite-scroll cache.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAllItems((notifications as LocalNotification[]))
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIds(new Set())
  }, [activeTab])

  const handleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((n) => n.id)))
    }
  }, [filtered, selectedIds])

  const handleBulkMarkRead = useCallback(() => {
    selectedIds.forEach((id) => markAsRead(id))
    setSelectedIds(new Set())
  }, [selectedIds, markAsRead])

  const handleBulkArchive = useCallback(() => {
    setAllItems((prev) =>
      prev.map((n) => (selectedIds.has(n.id) ? { ...n, archived: true } : n)),
    )
    setSelectedIds(new Set())
  }, [selectedIds])

  const handleBulkDelete = useCallback(() => {
    setAllItems((prev) => prev.filter((n) => !selectedIds.has(n.id)))
    setSelectedIds(new Set())
  }, [selectedIds])

  const handleArchive = useCallback((id: string) => {
    setAllItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, archived: !n.archived } : n)),
    )
  }, [])

  const handlePin = useCallback((id: string) => {
    setAllItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)),
    )
  }, [])

  const handleDelete = useCallback((id: string) => {
    setAllItems((prev) => prev.filter((n) => n.id !== id))
  }, [])

  return (
    <div className="flex flex-col h-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Notifications</h2>
            <Button variant="ghost" size="sm" className="text-xs gap-1.5" onClick={markAllAsRead}>
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          </div>
          <NotificationSearch onSearch={setSearchQuery} />
        </div>

        <div className="flex gap-1 px-4 pb-2 overflow-x-auto scrollbar-none">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                activeTab === tab.id
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800",
              )}
            >
              {tab.icon}
              {tab.label}
              {tabCounts[tab.id] > 0 && (
                <Badge
                  variant={activeTab === tab.id ? "default" : "secondary"}
                  className="ml-0.5 h-4 min-w-[16px] px-1 text-[10px]"
                >
                  {tabCounts[tab.id] > 99 ? "99+" : tabCounts[tab.id]}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedIds.size > 0 && (
          <motion.div
            key="toolbar"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-zinc-200 dark:border-zinc-800"
          >
            <div className="flex items-center gap-1.5 px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 mr-2">
                {selectedIds.size} selected
              </span>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleBulkMarkRead}>
                <CheckCheck className="h-3.5 w-3.5" />
                Read
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleBulkArchive}>
                <Archive className="h-3.5 w-3.5" />
                Archive
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-red-500 hover:text-red-600" onClick={handleBulkDelete}>
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto">
        {loading && allItems.length === 0 ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={
              activeTab === "mentions" ? (
                <AtSign className="h-6 w-6" />
              ) : activeTab === "archived" ? (
                <Archive className="h-6 w-6" />
              ) : activeTab === "pinned" ? (
                <Pin className="h-6 w-6" />
              ) : searchQuery ? (
                <Search className="h-6 w-6" />
              ) : (
                <Bell className="h-6 w-6" />
              )
            }
            title={
              searchQuery
                ? "No results found"
                : `No ${activeTab === "all" ? "" : activeTab} notifications`
            }
            description={
              searchQuery
                ? "Try a different search term"
                : activeTab === "unread"
                  ? "All caught up! You have no unread notifications."
                  : activeTab === "mentions"
                    ? "No one has mentioned you yet."
                    : activeTab === "archived"
                      ? "No archived notifications."
                      : activeTab === "pinned"
                        ? "No pinned notifications."
                        : "You don't have any notifications yet."
            }
            className="py-12"
          />
        ) : (
          <>
            <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-100 dark:border-zinc-800">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
              >
                {selectedIds.size === filtered.length && filtered.length > 0 ? (
                  <CheckSquare className="h-3.5 w-3.5" />
                ) : (
                  <Square className="h-3.5 w-3.5" />
                )}
                Select all
              </button>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                {filtered.length} notification{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            <AnimatePresence initial={false}>
              {filtered.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onMarkRead={markAsRead}
                  onArchive={handleArchive}
                  onPin={handlePin}
                  onDelete={handleDelete}
                  selected={selectedIds.has(notification.id)}
                  onSelect={handleSelect}
                />
              ))}
            </AnimatePresence>

            <div ref={sentinelRef} className="h-4" />
          </>
        )}
      </div>
    </div>
  )
}
