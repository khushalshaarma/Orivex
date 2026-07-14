"use client"

import { useState } from "react"
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
  Check,
  CheckCheck,
  Archive,
  Pin,
  Trash2,
  PinOff,
  RotateCcw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

type NotificationPriority = "low" | "normal" | "high" | "urgent"

interface NotificationActor {
  id: string
  name: string | null
  image: string | null
}

interface NotificationCardData {
  id: string
  title: string
  message: string | null
  read: boolean
  link: string | null
  createdAt: string
  category?: string
  type?: string
  priority?: NotificationPriority
  actor?: NotificationActor | null
  archived?: boolean
  pinned?: boolean
}

interface NotificationCardProps {
  notification: NotificationCardData
  onMarkRead?: (id: string) => void
  onArchive?: (id: string) => void
  onPin?: (id: string) => void
  onDelete?: (id: string) => void
  selected?: boolean
  onSelect?: (id: string) => void
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-zinc-400 dark:bg-zinc-500",
  normal: "bg-blue-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
}

const PRIORITY_BORDER: Record<string, string> = {
  low: "border-l-zinc-300 dark:border-l-zinc-600",
  normal: "border-l-blue-500",
  high: "border-l-orange-500",
  urgent: "border-l-red-500",
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

const DEFAULT_CATEGORY_ICON = <Bell className="h-4 w-4" />

function getCategoryIcon(category?: string): React.ReactNode {
  if (category && CATEGORY_ICONS[category]) return CATEGORY_ICONS[category]
  return DEFAULT_CATEGORY_ICON
}

export function NotificationCard({
  notification,
  onMarkRead,
  onArchive,
  onPin,
  onDelete,
  selected,
  onSelect,
}: NotificationCardProps) {
  const router = useRouter()
  const [hovering, setHovering] = useState(false)

  const handleClick = () => {
    if (notification.link) {
      if (!notification.read && onMarkRead) onMarkRead(notification.id)
      router.push(notification.link)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={cn(
        "group relative flex cursor-pointer items-start gap-3 border-l-2 px-4 py-3 transition-colors",
        "border-zinc-200 dark:border-zinc-700",
        notification.priority && PRIORITY_BORDER[notification.priority],
        !notification.read && "border-l-blue-500",
        "hover:bg-zinc-50 dark:hover:bg-zinc-800/40",
        selected && "bg-blue-50/60 dark:bg-blue-900/20",
        !hovering && !selected && !notification.read && "bg-blue-50/30 dark:bg-blue-900/10",
      )}
      onClick={handleClick}
    >
      {onSelect && (
        <div className="flex h-5 items-center pt-0.5" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={!!selected}
            onChange={() => onSelect(notification.id)}
            className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800"
          />
        </div>
      )}

      {notification.actor ? (
        <Avatar className="h-8 w-8 shrink-0 ring-1 ring-zinc-200 dark:ring-zinc-700">
          <AvatarImage src={notification.actor.image ?? undefined} alt={notification.actor.name ?? "User"} />
          <AvatarFallback className="text-[11px]">
            {notification.actor.name?.charAt(0).toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
          )}
        >
          {getCategoryIcon(notification.category || notification.type)}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm leading-snug truncate",
              notification.read
                ? "text-zinc-600 dark:text-zinc-400"
                : "font-semibold text-zinc-900 dark:text-zinc-50",
            )}
          >
            {notification.title}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            {notification.priority && (
              <span
                className={cn("h-2 w-2 rounded-full", PRIORITY_COLORS[notification.priority])}
                title={notification.priority.charAt(0).toUpperCase() + notification.priority.slice(1)}
              />
            )}
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>

        {notification.message && (
          <p
            className={cn(
              "mt-0.5 text-xs leading-relaxed line-clamp-2",
              notification.read
                ? "text-zinc-400 dark:text-zinc-500"
                : "text-zinc-500 dark:text-zinc-400",
            )}
          >
            {notification.message}
          </p>
        )}
      </div>

      {!notification.read && !notification.priority && (
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
      )}

      {hovering && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute bottom-2 right-2 flex items-center gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          {onMarkRead && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              onClick={() => onMarkRead(notification.id)}
              title={notification.read ? "Mark as unread" : "Mark as read"}
            >
              {notification.read ? <RotateCcw className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
            </Button>
          )}
          {onArchive && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              onClick={() => onArchive(notification.id)}
              title={notification.archived ? "Unarchive" : "Archive"}
            >
              <Archive className="h-3.5 w-3.5" />
            </Button>
          )}
          {onPin && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              onClick={() => onPin(notification.id)}
              title={notification.pinned ? "Unpin" : "Pin"}
            >
              {notification.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md text-zinc-400 hover:text-red-500"
              onClick={() => onDelete(notification.id)}
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
