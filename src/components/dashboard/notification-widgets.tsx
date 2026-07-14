"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useSession } from "next-auth/react"
import {
  Bell,
  AtSign,
  MessageSquare,
  CheckSquare,
  Building2,
  FolderKanban,
  ClipboardList,
  GitBranch,
  Heart,
  MessageSquareText,
  Reply,
  UserPlus,
  Settings,
  Bot,
  ArrowRight,
  Inbox,
  ListTodo,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { formatDistanceToNow } from "date-fns"
import { useActiveWorkspace } from "@/hooks/use-workspace"
import { useMyTasks } from "@/hooks/use-tasks"
import { cn } from "@/lib/utils"

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

interface NoteItem {
  id: string
  title: string
  message: string | null
  category: string | null
  read: boolean
  createdAt: string
  link: string | null
}

interface MsgItem {
  id: string
  content: string
  createdAt: string
  sender: { id: string; name: string | null; image: string | null } | null
  channel: { id: string; name: string } | null
  conversation: { id: string } | null
}

export function NotificationWidgets() {
  const router = useRouter()
  const { data: session } = useSession()
  const { workspace } = useActiveWorkspace()
  const wsId = workspace?.id
  const { tasks: myTasks } = useMyTasks(wsId ?? null)

  const [notes, setNotes] = useState<NoteItem[]>([])
  const [mentions, setMentions] = useState(0)
  const [messages, setMessages] = useState<MsgItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.user?.id || !wsId) return
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [notesRes, unreadRes, msgsRes] = await Promise.all([
          fetch(`/api/notifications?pageSize=6`).catch(() => null),
          fetch(`/api/notifications/unread-count`).catch(() => null),
          fetch(`/api/workspace/${wsId}/recent-messages?limit=6`).catch(() => null),
        ])

        if (cancelled) return
        if (notesRes?.ok) {
          const json = await notesRes.json()
          setNotes((json.data?.items ?? []).slice(0, 6))
        }
        if (unreadRes?.ok) {
          const json = await unreadRes.json()
          setMentions(json.data?.mentions ?? 0)
        }
        if (msgsRes?.ok) {
          const json = await msgsRes.json()
          setMessages(json.data ?? [])
        }
      } catch {
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [session?.user?.id, wsId])

  const openLink = (link: string | null, fallback: string) => {
    router.push(link ?? fallback)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Recent Notifications */}
      <motion.div variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }} className="lg:col-span-2">
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4 text-blue-500" />
              Recent Notifications
            </CardTitle>
            <button
              onClick={() => router.push("/notifications")}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
                ))}
              </div>
            ) : notes.length === 0 ? (
              <EmptyState icon={<Inbox className="h-8 w-8" />} title="No notifications yet" description="You're all caught up" />
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {notes.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => openLink(n.link, "/notifications")}
                    className="flex w-full items-start gap-3 py-2.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40 px-1 -mx-1 rounded-lg"
                  >
                    <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {CATEGORY_ICONS[n.category ?? "System"] ?? <Bell className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm truncate", n.read ? "text-zinc-600 dark:text-zinc-400" : "font-semibold text-zinc-900 dark:text-zinc-50")}>
                        {n.title}
                      </p>
                      {n.message && (
                        <p className="text-xs text-zinc-400 truncate">{n.message}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-[11px] text-zinc-400">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Right column */}
      <div className="space-y-6">
        {/* Unread Mentions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AtSign className="h-4 w-4 text-purple-500" />
              Unread Mentions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <button
              onClick={() => router.push("/notifications")}
              className="flex w-full items-center justify-between rounded-xl bg-purple-50 dark:bg-purple-900/20 px-4 py-3 transition-colors hover:bg-purple-100 dark:hover:bg-purple-900/30"
            >
              <span className="text-sm text-zinc-600 dark:text-zinc-300">Mentions awaiting you</span>
              <Badge variant="secondary" className="bg-purple-500 text-white">{mentions}</Badge>
            </button>
          </CardContent>
        </Card>

        {/* Assigned Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListTodo className="h-4 w-4 text-emerald-500" />
              Assigned Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myTasks.length === 0 ? (
              <p className="text-sm text-zinc-400">No tasks assigned to you</p>
            ) : (
              <div className="space-y-1.5">
                {myTasks.slice(0, 5).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => router.push(`/tasks?task=${t.id}`)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <span className={cn("h-2 w-2 rounded-full", t.priority === "urgent" ? "bg-red-500" : t.priority === "high" ? "bg-amber-500" : t.priority === "medium" ? "bg-blue-500" : "bg-zinc-400")} />
                    <span className="flex-1 truncate text-sm text-zinc-700 dark:text-zinc-300">{t.title}</span>
                    {t.project && (
                      <span className="truncate text-[11px] text-zinc-400 max-w-[80px]">{t.project.name}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Messages */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-sky-500" />
              Recent Messages
            </CardTitle>
            <button
              onClick={() => router.push("/messages")}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Open <ArrowRight className="h-3 w-3" />
            </button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-9 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
                ))}
              </div>
            ) : messages.length === 0 ? (
              <p className="text-sm text-zinc-400">No recent messages</p>
            ) : (
              <div className="space-y-1">
                {messages.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => router.push(m.channel ? `/messages/${m.channel.id}` : `/messages?conversation=${m.conversation?.id}`)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={m.sender?.image ?? undefined} />
                      <AvatarFallback className="text-[10px]">{m.sender?.name?.charAt(0) ?? "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
                        {m.sender?.name ?? "Unknown"}
                        {m.channel && <span className="text-zinc-400 font-normal"> #{m.channel.name}</span>}
                      </p>
                      <p className="text-xs text-zinc-400 truncate">{m.content}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
