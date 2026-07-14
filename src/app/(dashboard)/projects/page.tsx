"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus,
  FolderKanban,
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List as ListIcon,
  Table as TableIcon,
  Star,
  X,
  ArrowUpDown,
  ChevronDown,
  Filter,
} from "lucide-react"
import { useProjects } from "@/hooks/use-projects"
import { useWorkspace } from "@/hooks/use-workspace"
import { ProjectCard } from "@/components/project-card"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/ui/empty-state"
import { CardSkeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
}

type SortKey = "updatedAt" | "createdAt" | "name" | "progress" | "dueDate"
type FilterState = {
  status: string
  priority: string
  teamId: string
  favorites: "all" | "favorites" | "non-favorites"
  archived: "all" | "active" | "archived"
  search: string
}

const defaultFilters: FilterState = {
  status: "",
  priority: "",
  teamId: "",
  favorites: "all",
  archived: "active",
  search: "",
}

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "updatedAt", label: "Recently Updated" },
  { key: "createdAt", label: "Recently Created" },
  { key: "name", label: "Alphabetical" },
  { key: "progress", label: "Progress" },
  { key: "dueDate", label: "Due Date" },
]

const statusOptions = ["active", "completed", "on_hold", "cancelled", "archived"]
const priorityOptions = ["urgent", "high", "medium", "low"]

function fuzzyMatch(text: string, query: string): boolean {
  const lower = text.toLowerCase()
  const q = query.toLowerCase()
  let qi = 0
  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) qi++
  }
  return qi === q.length
}

function isOverdue(date: string): boolean {
  return new Date(date) < new Date()
}

export default function ProjectsPage() {
  const router = useRouter()
  const { workspace } = useWorkspace()
  const { projects, loading, refetch } = useProjects()
  const [view, setView] = useState<"grid" | "list" | "table">("grid")
  const [createOpen, setCreateOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt")
  const [sortAsc, setSortAsc] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const [highlightedIdx, setHighlightedIdx] = useState(-1)
  const [teams, setTeams] = useState<{ id: string; name: string; color: string | null }[]>([])
  const [form, setForm] = useState({
    name: "",
    description: "",
    color: "#6366f1",
    teamId: "",
    visibility: "TEAM_ONLY" as string,
    startDate: "",
    dueDate: "",
  })

  useEffect(() => {
    if (workspace?.id) {
      fetch(`/api/workspace/${workspace.id}/teams`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success) {
            setTeams(json.data ?? [])
            if (json.data?.length > 0 && !form.teamId) {
              setForm((prev) => ({ ...prev, teamId: json.data[0].id }))
            }
          }
        })
        .catch(() => {})
    }
  }, [workspace?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const debouncedSearch = useCallback(
    (value: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        setFilters((prev) => ({ ...prev, search: value }))
      }, 200)
    },
    [],
  )

  const filtered = useMemo(() => {
    let result = [...projects]

    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (p) =>
          fuzzyMatch(p.name, q) ||
          (p.description && fuzzyMatch(p.description, q)) ||
          (p.team?.name && fuzzyMatch(p.team.name, q)) ||
          (p.labels && p.labels.some((l) => fuzzyMatch(l, q)))
      )
    }

    if (filters.status) {
      result = result.filter((p) => p.status === filters.status)
    }

    if (filters.priority) {
      result = result.filter((p) => p.priority === filters.priority)
    }

    if (filters.teamId) {
      result = result.filter((p) => p.teamId === filters.teamId)
    }

    if (filters.favorites === "favorites") {
      result = result.filter((p) => p.favorite)
    } else if (filters.favorites === "non-favorites") {
      result = result.filter((p) => !p.favorite)
    }

    if (filters.archived === "active") {
      result = result.filter((p) => p.status !== "archived" && !p.deletedAt)
    } else if (filters.archived === "archived") {
      result = result.filter((p) => p.status === "archived" || p.deletedAt)
    }

    result.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name)
          break
        case "progress":
          cmp = (a.progress ?? 0) - (b.progress ?? 0)
          break
        case "dueDate":
          if (!a.dueDate && !b.dueDate) cmp = 0
          else if (!a.dueDate) cmp = 1
          else if (!b.dueDate) cmp = -1
          else cmp = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
          break
        case "createdAt":
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case "updatedAt":
        default:
          cmp = 0
          break
      }
      return sortAsc ? cmp : -cmp
    })

    return result
  }, [projects, filters, sortKey, sortAsc])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.status) count++
    if (filters.priority) count++
    if (filters.teamId) count++
    if (filters.favorites !== "all") count++
    if (filters.archived !== "active") count++
    return count
  }, [filters])

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters)
    if (searchRef.current) searchRef.current.value = ""
  }, [])

  async function handleCreate() {
    if (!form.name.trim() || !workspace?.id) return
    setCreateLoading(true)
    setCreateError(null)
    try {
      const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          slug,
          description: form.description,
          color: form.color,
          teamId: form.teamId || undefined,
          workspaceId: workspace.id,
          visibility: form.visibility,
          startDate: form.startDate || null,
          dueDate: form.dueDate || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to create")
      setCreateOpen(false)
      setForm({ name: "", description: "", color: "#6366f1", teamId: "", visibility: "TEAM_ONLY", startDate: "", dueDate: "" })
      refetch()
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setCreateLoading(false)
    }
  }

  async function handleFavorite(id: string) {
    await fetch(`/api/projects/${id}/favorite`, { method: "POST" })
    refetch()
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((prev) => !prev)
    } else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlightedIdx((prev) => Math.min(prev + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightedIdx((prev) => Math.max(prev - 1, 0))
    } else if (e.key === "Enter" && highlightedIdx >= 0 && filtered[highlightedIdx]) {
      router.push(`/projects/${filtered[highlightedIdx].id}`)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Manage your team projects"
      >
        <div className="flex items-center gap-1">
          <Button
            variant={view === "grid" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setView("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setView("list")}
          >
            <ListIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "table" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setView("table")}
          >
            <TableIcon className="h-4 w-4" />
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Project
          </Button>
        </div>
      </PageHeader>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            ref={searchRef}
            placeholder="Search projects by name, description, team, labels..."
            className="pl-9 h-9 text-sm"
            defaultValue={filters.search}
            onChange={(e) => debouncedSearch(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {filters.search && (
            <button
              onClick={() => {
                setFilters((prev) => ({ ...prev, search: "" }))
                if (searchRef.current) searchRef.current.value = ""
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <ArrowUpDown className="mr-1.5 h-3.5 w-3.5" />
              Sort: {sortOptions.find((o) => o.key === sortKey)?.label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            {sortOptions.map((opt) => (
              <DropdownMenuItem
                key={opt.key}
                onClick={() => toggleSort(opt.key)}
                className="flex items-center justify-between"
              >
                {opt.label}
                {sortKey === opt.key && (
                  <span className="text-xs text-zinc-400">{sortAsc ? "↑" : "↓"}</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant={showFilters || activeFilterCount > 0 ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowFilters((prev) => !prev)}
        >
          <Filter className="mr-1.5 h-3.5 w-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Status</label>
                <Select
                  value={filters.status}
                  onValueChange={(v) => setFilters((prev) => ({ ...prev, status: v }))}
                >
                  <SelectTrigger className="h-8 w-[140px] text-xs">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    {statusOptions.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize text-xs">{s.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Priority</label>
                <Select
                  value={filters.priority}
                  onValueChange={(v) => setFilters((prev) => ({ ...prev, priority: v }))}
                >
                  <SelectTrigger className="h-8 w-[130px] text-xs">
                    <SelectValue placeholder="All priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All priorities</SelectItem>
                    {priorityOptions.map((p) => (
                      <SelectItem key={p} value={p} className="capitalize text-xs">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Team</label>
                <Select
                  value={filters.teamId}
                  onValueChange={(v) => setFilters((prev) => ({ ...prev, teamId: v }))}
                >
                  <SelectTrigger className="h-8 w-[150px] text-xs">
                    <SelectValue placeholder="All teams" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All teams</SelectItem>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Favorites</label>
                <Select
                  value={filters.favorites}
                  onValueChange={(v) => setFilters((prev) => ({ ...prev, favorites: v as FilterState["favorites"] }))}
                >
                  <SelectTrigger className="h-8 w-[130px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All projects</SelectItem>
                    <SelectItem value="favorites">Favorites only</SelectItem>
                    <SelectItem value="non-favorites">Non-favorites</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Archive</label>
                <Select
                  value={filters.archived}
                  onValueChange={(v) => setFilters((prev) => ({ ...prev, archived: v as FilterState["archived"] }))}
                >
                  <SelectTrigger className="h-8 w-[130px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active only</SelectItem>
                    <SelectItem value="archived">Archived only</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {filters.status && (
            <Badge variant="secondary" className="text-xs gap-1">
              Status: {filters.status.replace("_", " ")}
              <button onClick={() => setFilters((prev) => ({ ...prev, status: "" }))}><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {filters.priority && (
            <Badge variant="secondary" className="text-xs gap-1">
              Priority: {filters.priority}
              <button onClick={() => setFilters((prev) => ({ ...prev, priority: "" }))}><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {filters.teamId && (
            <Badge variant="secondary" className="text-xs gap-1">
              Team: {teams.find((t) => t.id === filters.teamId)?.name ?? filters.teamId}
              <button onClick={() => setFilters((prev) => ({ ...prev, teamId: "" }))}><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {filters.favorites === "favorites" && (
            <Badge variant="secondary" className="text-xs gap-1">
              Favorites
              <button onClick={() => setFilters((prev) => ({ ...prev, favorites: "all" }))}><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {filters.archived !== "active" && (
            <Badge variant="secondary" className="text-xs gap-1">
              {filters.archived === "archived" ? "Archived" : "All"}
              <button onClick={() => setFilters((prev) => ({ ...prev, archived: "active" }))}><X className="h-3 w-3" /></button>
            </Badge>
          )}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="h-12 w-12" />}
          title={filters.search || activeFilterCount > 0 ? "No matching projects" : "No projects yet"}
          description={
            filters.search || activeFilterCount > 0
              ? "Try adjusting your search or filters"
              : "Create your first project to get started"
          }
          action={
            !filters.search && activeFilterCount === 0 ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Create Project
              </Button>
            ) : !filters.search ? (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            ) : undefined
          }
        />
      ) : view === "grid" ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filtered.map((project, i) => (
            <div
              key={project.id}
              className={cn(highlightedIdx === i && "ring-2 ring-blue-500 rounded-2xl")}
            >
              <ProjectCard
                project={project}
                onClick={() => router.push(`/projects/${project.id}`)}
                onFavorite={() => handleFavorite(project.id)}
              />
            </div>
          ))}
        </motion.div>
      ) : view === "list" ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {filtered.map((project, i) => (
            <div
              key={project.id}
              className={cn(highlightedIdx === i && "ring-2 ring-blue-500 rounded-2xl")}
            >
              <ProjectCard
                project={project}
                onClick={() => router.push(`/projects/${project.id}`)}
                onFavorite={() => handleFavorite(project.id)}
              />
            </div>
          ))}
        </motion.div>
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">Name</th>
                <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">Priority</th>
                <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">Progress</th>
                <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">Team</th>
                <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">Due Date</th>
                <th className="text-right text-xs font-medium text-zinc-500 px-4 py-3">Favorite</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((project, i) => (
                <motion.tr
                  key={project.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className={cn(
                    "border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors",
                    highlightedIdx === i && "bg-blue-50 dark:bg-blue-900/10"
                  )}
                  onClick={() => router.push(`/projects/${project.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white shadow-sm"
                        style={{ backgroundColor: project.color ?? "#6366f1" }}
                      >
                        {project.icon ?? project.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{project.name}</p>
                        {project.description && (
                          <p className="text-xs text-zinc-400 line-clamp-1">{project.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      project.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                      project.status === "archived" ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400" :
                      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}>
                      {project.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      project.priority === "urgent" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                      project.priority === "high" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                      project.priority === "medium" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                      "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}>
                      {project.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-400">{project.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {project.team?.name ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-sm",
                      project.dueDate && isOverdue(project.dueDate) && project.status !== "completed"
                        ? "text-red-500 font-medium"
                        : "text-zinc-600 dark:text-zinc-400"
                    )}>
                      {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleFavorite(project.id) }}
                      className="text-zinc-300 dark:text-zinc-600 hover:text-amber-500 transition-colors"
                    >
                      <Star className="h-4 w-4" fill={project.favorite ? "currentColor" : "none"} />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>Create a new project for your workspace</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Project Name</Label>
              <Input
                placeholder="e.g. Frontend App"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <textarea
                className="flex min-h-[60px] w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10"
                placeholder="Brief description of the project"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Team</Label>
              <Select
                value={form.teamId}
                onValueChange={(v) => setForm((prev) => ({ ...prev, teamId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select
                value={form.visibility}
                onValueChange={(v) => setForm((prev) => ({ ...prev, visibility: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">Public</SelectItem>
                  <SelectItem value="PRIVATE">Private</SelectItem>
                  <SelectItem value="TEAM_ONLY">Team Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}
                className="h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 cursor-pointer"
              />
            </div>
            {createError && (
              <p className="text-sm text-red-500">{createError}</p>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!form.name.trim() || createLoading}>
                {createLoading ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
