"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Search as SearchIcon,
  FolderKanban,
  ListTodo,
  Users,
  Hash,
  MessageSquare,
  Calendar,
  ArrowRight,
  X,
} from "lucide-react"
import { useWorkspace } from "@/hooks/use-workspace"
import { Input } from "@/components/ui/input"

interface SearchResults {
  projects: { id: string; name: string; color: string | null; icon: string | null }[]
  tasks: { id: string; title: string; status: string; priority: string; projectId: string }[]
  members: { id: string; name: string | null; image: string | null; email: string }[]
  channels: { id: string; name: string; slug: string }[]
  messages: { id: string; content: string; createdAt: string; sender: { name: string | null } }[]
  meetings: { id: string; title: string; date: string; time: string }[]
}

export default function SearchPage() {
  const router = useRouter()
  const { workspace } = useWorkspace()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    const wsId = workspace?.id
    if (!wsId || !query.trim()) {
      setResults(null) // eslint-disable-line react-hooks/set-state-in-effect
      setSearched(false) // eslint-disable-line react-hooks/set-state-in-effect
      return
    }
    const timeout = setTimeout(async () => {
      setLoading(true)
      setSearched(true)
      try {
        const res = await fetch(`/api/search?workspaceId=${wsId}&q=${encodeURIComponent(query)}`)
        const json = await res.json()
        if (json.success) setResults(json.data)
      } catch {
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [query, workspace?.id])

  const sections = results ? [
    { label: "Projects", icon: FolderKanban, items: results.projects, onClick: (i: { id: string }) => router.push(`/projects/${i.id}`) },
    { label: "Tasks", icon: ListTodo, items: results.tasks, onClick: (i: { id: string }) => router.push(`/tasks?task=${i.id}`) },
    { label: "Members", icon: Users, items: results.members, onClick: (i: { id: string }) => router.push(`/members`) },
    { label: "Channels", icon: Hash, items: results.channels, onClick: (i: { id: string }) => router.push(`/messages`) },
    { label: "Messages", icon: MessageSquare, items: results.messages, onClick: (i: { id: string }) => router.push(`/messages`) },
    { label: "Meetings", icon: Calendar, items: results.meetings, onClick: (i: { id: string }) => router.push(`/meetings`) },
  ].filter((s) => s.items.length > 0) : []

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
        <Input
          placeholder="Search projects, tasks, members, messages..."
          className="pl-12 h-12 text-base rounded-2xl"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults(null); setSearched(false) }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
      )}

      {searched && !loading && sections.length === 0 && (
        <div className="text-center py-16 text-zinc-400">
          <SearchIcon className="h-12 w-12 mx-auto mb-4 text-zinc-300 dark:text-zinc-600" />
          <p className="text-lg font-medium">No results found</p>
          <p className="text-sm mt-1">Try a different search term</p>
        </div>
      )}

      {!searched && !query && (
        <div className="text-center py-16 text-zinc-400">
          <SearchIcon className="h-16 w-16 mx-auto mb-4 text-zinc-300 dark:text-zinc-600" />
          <p className="text-lg font-medium">Search across your workspace</p>
          <p className="text-sm mt-1">Find projects, tasks, members, channels, and more</p>
        </div>
      )}

      {sections.map((section) => {
        const Icon = section.icon
        return (
          <div key={section.label}>
            <div className="flex items-center gap-2 mb-3">
              <Icon className="h-4 w-4 text-zinc-400" />
              <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{section.label}</h3>
              <span className="text-xs text-zinc-400">({section.items.length})</span>
            </div>
            <div className="space-y-1">
              {section.items.map((item, i) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => section.onClick(item)}
                  className="w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {"name" in item ? item.name : "title" in item ? item.title : item.content?.slice(0, 100) ?? ""}
                    </p>
                    {"email" in item && (
                      <p className="text-xs text-zinc-400 truncate">{item.email}</p>
                    )}
                    {"status" in item && (
                      <p className="text-[10px] text-zinc-400 capitalize">{item.status.replace("_", " ")}</p>
                    )}
                    {"content" in item && (
                      <p className="text-xs text-zinc-400 truncate">{item.content.slice(0, 120)}</p>
                    )}
                    {"date" in item && (
                      <p className="text-xs text-zinc-400">{item.date} at {item.time}</p>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-zinc-300 dark:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
