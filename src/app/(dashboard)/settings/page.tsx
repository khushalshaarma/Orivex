"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  Settings,
  Users,
  Skull,
  Bell,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { NotificationSettings } from "@/components/notifications/notification-settings"

const tabs = [
  { id: "general", label: "General", icon: Settings },
  { id: "members", label: "Members", icon: Users },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "danger", label: "Danger Zone", icon: Skull },
]

export default function SettingsPage() {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage your workspace settings
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-0">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = pathname === `/settings/${tab.id}` || (tab.id === "general" && pathname === "/settings")
          return (
            <button
              key={tab.id}
              onClick={() => router.push(`/settings/${tab.id}`)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                isActive
                  ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* General content */}
      {pathname === "/settings/notifications" ? (
        <NotificationSettings />
      ) : (
        <SettingsGeneral />
      )}
    </div>
  )
}

function SettingsGeneral() {
  const [workspace, setWorkspace] = useState<{ id: string; name: string; slug: string; industry: string | null; companySize: string | null; timezone: string | null } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({ name: "", slug: "", industry: "", companySize: "", timezone: "" })

  useEffect(() => {
    fetch("/api/workspace/active")
      .then((r) => r.json())
      .then((j) => {
        if (j.data) {
          setWorkspace(j.data)
          setForm({
            name: j.data.name ?? "",
            slug: j.data.slug ?? "",
            industry: j.data.industry ?? "",
            companySize: j.data.companySize ?? "",
            timezone: j.data.timezone ?? "",
          })
        }
      })
      .catch(() => {})
  }, [])

  async function handleSave() {
    if (!workspace?.id) return
    setSaving(true)
    try {
      const res = await fetch(`/api/workspace/${workspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">General</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input className="flex h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm" placeholder="Name" value={form.name} onChange={(e) => setForm(p => ({...p, name: e.target.value}))} />
          <input className="flex h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm" placeholder="Slug" value={form.slug} onChange={(e) => setForm(p => ({...p, slug: e.target.value}))} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input className="flex h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm" placeholder="Industry" value={form.industry} onChange={(e) => setForm(p => ({...p, industry: e.target.value}))} />
          <input className="flex h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm" placeholder="Company Size" value={form.companySize} onChange={(e) => setForm(p => ({...p, companySize: e.target.value}))} />
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
          >
            {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
