"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Activity, Clock } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { ListSkeleton } from "@/components/ui/skeleton"
import { formatDistanceToNow } from "date-fns"

interface ProjectActivityProps {
  projectId: string
}

interface ActivityItem {
  id: string
  action: string
  entity: string
  entityId: string | null
  metadata: unknown
  createdAt: string
  user: { id: string; name: string | null; image: string | null } | null
}

export function ProjectActivity({ projectId }: ProjectActivityProps) {
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/projects/${projectId}/activity?limit=20`)
        const json = await res.json()
        if (json.success) setActivity(json.data ?? [])
      } catch {
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId])

  if (loading) return <ListSkeleton items={6} />

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-blue-500" />
          Activity Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <EmptyState
            icon={<Clock className="h-8 w-8" />}
            title="No activity yet"
            description="Activity will appear as the project is worked on"
          />
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/30 via-purple-500/30 to-transparent" />
            <div className="space-y-0">
              {activity.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="relative flex items-start gap-4 pb-6 last:pb-0"
                >
                  <div className="relative z-10 mt-0.5">
                    <Avatar className="h-8 w-8 border-2 border-white dark:border-zinc-900 shadow-sm">
                      <AvatarImage src={item.user?.image ?? undefined} />
                      <AvatarFallback className="text-[10px]">
                        {item.user?.name?.charAt(0)?.toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                      {item.action.replace(/\./g, " ")}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
