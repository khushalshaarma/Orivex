"use client"

import { useRef, useCallback } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import {
  Building2,
  FolderKanban,
  ClipboardList,
  GitBranch,
  MessageSquare,
  AtSign,
  Heart,
  MessageSquareText,
  Reply,
  UserPlus,
  Bell,
  Settings,
  Bot,
  Activity,
  Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"

interface ActivityItem {
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

interface ActivityTimelineProps {
  activities: ActivityItem[]
  loading?: boolean
  onLoadMore?: () => void
  hasMore?: boolean
}

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  workspace: <Building2 className="h-4 w-4" />,
  project: <FolderKanban className="h-4 w-4" />,
  task: <ClipboardList className="h-4 w-4" />,
  sprint: <GitBranch className="h-4 w-4" />,
  message: <MessageSquare className="h-4 w-4" />,
  mention: <AtSign className="h-4 w-4" />,
  reaction: <Heart className="h-4 w-4" />,
  comment: <MessageSquareText className="h-4 w-4" />,
  reply: <Reply className="h-4 w-4" />,
  invitation: <UserPlus className="h-4 w-4" />,
  reminder: <Bell className="h-4 w-4" />,
  system: <Settings className="h-4 w-4" />,
  ai: <Bot className="h-4 w-4" />,
}

export function ActivityTimeline({ activities, loading, onLoadMore, hasMore }: ActivityTimelineProps) {
  const router = useRouter()
  const sentinelRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const sentinelCallback = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect()
      if (!node || !onLoadMore || !hasMore) return
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) onLoadMore()
        },
        { rootMargin: "200px" },
      )
      observerRef.current.observe(node)
    },
    [onLoadMore, hasMore],
  )

  if (loading && activities.length === 0) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <Skeleton className="h-8 w-8 rounded-full" />
              {i < 3 && <Skeleton className="mt-1 h-full w-[1px]" />}
            </div>
            <div className="flex-1 space-y-1.5 pb-6">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!loading && activities.length === 0) {
    return (
      <EmptyState
        icon={<Activity className="h-6 w-6" />}
        title="No activity yet"
        description="Activity from your workspace will appear here."
        className="py-16"
      />
    )
  }

  return (
    <div className="relative px-4 py-2">
      {activities.map((item, index) => {
        const isLast = index === activities.length - 1
        const entityIcon = item.entityType ? ENTITY_ICONS[item.entityType] : null

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03, duration: 0.25 }}
            className="relative flex gap-3 pb-6"
          >
            <div className="flex flex-col items-center">
              <button
                onClick={() => item.actor?.id && router.push(`/profile/${item.actor.id}`)}
                className="relative z-10 shrink-0"
              >
                <Avatar className="h-8 w-8 ring-2 ring-white dark:ring-zinc-900">
                  <AvatarImage src={item.actor?.image ?? undefined} alt={item.actor?.name ?? "User"} />
                  <AvatarFallback className="text-[11px]">
                    {item.actor?.name?.charAt(0).toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
              </button>
              {!isLast && (
                <div className="mt-1 h-full w-[1px] bg-zinc-200 dark:bg-zinc-700" />
              )}
            </div>

            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-snug">
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {item.actor?.name ?? "Someone"}
                  </span>{" "}
                  {item.action}
                  {item.entityName && (
                    <>
                      {" "}
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">
                        {item.entityName}
                      </span>
                    </>
                  )}
                </p>
                <span className="shrink-0 text-[11px] text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
                  {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                </span>
              </div>

              {item.description && (
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                  {item.description}
                </p>
              )}

              {item.link && (
                <button
                  onClick={() => router.push(item.link!)}
                  className="mt-1 flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  {entityIcon && <span className="text-zinc-400 dark:text-zinc-500">{entityIcon}</span>}
                  View details
                </button>
              )}
            </div>
          </motion.div>
        )
      })}

      {hasMore && (
        <div ref={sentinelCallback} className="flex justify-center py-4">
          <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
            <Clock className="h-3.5 w-3.5 animate-pulse" />
            Loading older activity...
          </div>
        </div>
      )}
    </div>
  )
}
