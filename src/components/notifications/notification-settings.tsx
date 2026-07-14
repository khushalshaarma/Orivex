"use client"

import { useState, useCallback, useEffect } from "react"
import { motion } from "framer-motion"
import { Save, Bell, Mail, Smartphone, RotateCcw, BellRing } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useNotificationSettings, type CategoryPref, type NotificationPreferences } from "@/hooks/use-notification-settings"
import { requestBrowserNotificationPermission } from "@/hooks/use-browser-notifications"

const CATEGORIES = [
  "Workspace",
  "Project",
  "Task",
  "Sprint",
  "Message",
  "Mention",
  "Reaction",
  "Comment",
  "Reply",
  "Invitation",
  "Reminder",
  "System",
  "AI",
] as const

const DIGEST_OPTIONS = [
  { value: "instant", label: "Instant" },
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "disabled", label: "Disabled" },
] as const

type Channel = "email" | "browser" | "push"
type DigestFrequency = "instant" | "hourly" | "daily" | "disabled"

const DEFAULT_SETTINGS: Record<string, CategoryPref> = Object.fromEntries(
  CATEGORIES.map((cat) => [cat, { email: true, browser: true, push: false }]),
) as Record<string, CategoryPref>

export function NotificationSettings() {
  const { prefs, loading, saving, save } = useNotificationSettings()
  const [local, setLocal] = useState<NotificationPreferences | null>(null)
  const [browserPerm, setBrowserPerm] = useState<NotificationPermission | "unsupported">("default")

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBrowserPerm("unsupported")
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBrowserPerm(Notification.permission)
  }, [])

  const enableBrowser = useCallback(async () => {
    const granted = await requestBrowserNotificationPermission()
    setBrowserPerm(granted ? "granted" : "denied")
  }, [])

  useEffect(() => {
    if (prefs) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocal({
        ...prefs,
        settings: { ...DEFAULT_SETTINGS, ...(prefs.settings ?? {}) },
      })
    }
  }, [prefs])

  const toggleChannel = useCallback(
    (category: string, channel: Channel) => {
      setLocal((prev) => {
        if (!prev) return prev
        const settings = {
          ...prev.settings,
          [category]: {
            ...prev.settings?.[category],
            [channel]: !prev.settings?.[category]?.[channel],
          },
        }
        return { ...prev, settings: settings as Record<string, CategoryPref> }
      })
    },
    [],
  )

  const setDigest = useCallback((value: string) => {
    setLocal((prev) => (prev ? { ...prev, digestFrequency: value } : prev))
  }, [])

  const handleSave = useCallback(async () => {
    if (!local) return
    await save({
      settings: local.settings,
      digestFrequency: local.digestFrequency,
      browserEnabled: local.browserEnabled,
      emailEnabled: local.emailEnabled,
    })
  }, [local, save])

  if (loading || !local) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8">
        <div className="h-4 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Notification Settings</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Choose which notifications you receive and how
        </p>
      </div>

      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Digest Frequency</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              How often to batch non-urgent notifications
            </p>
          </div>
          <div className="flex gap-1">
            {DIGEST_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setDigest(option.value)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  local.digestFrequency === option.value
                    ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                    : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Browser Notifications</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {browserPerm === "unsupported"
                ? "Your browser does not support notifications"
                : browserPerm === "granted"
                  ? "Browser notifications are enabled"
                  : browserPerm === "denied"
                    ? "Notifications are blocked in your browser settings"
                    : "Allow Collab to send native notifications"}
            </p>
          </div>
          {browserPerm !== "unsupported" && browserPerm !== "granted" && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={enableBrowser}>
              <BellRing className="h-3.5 w-3.5" />
              Enable
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400">Category</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <div className="flex items-center justify-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </div>
              </th>
              <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <div className="flex items-center justify-center gap-1">
                  <Bell className="h-3.5 w-3.5" />
                  Browser
                </div>
              </th>
              <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <div className="flex items-center justify-center gap-1">
                  <Smartphone className="h-3.5 w-3.5" />
                  Push
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((category) => (
              <tr
                key={category}
                className="border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
              >
                <td className="px-6 py-3">
                  <span className="text-sm text-zinc-900 dark:text-zinc-50">{category}</span>
                </td>
                {(["email", "browser", "push"] as Channel[]).map((channel) => (
                  <td key={channel} className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleChannel(category, channel)}
                      className={cn(
                        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                        local.settings?.[category]?.[channel]
                          ? "bg-zinc-900 dark:bg-zinc-50"
                          : "bg-zinc-200 dark:bg-zinc-700",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform",
                          local.settings?.[category]?.[channel] ? "translate-x-[18px]" : "translate-x-[3px]",
                        )}
                      />
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800">
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Changes are applied across all workspaces
        </p>
        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving ? (
            <RotateCcw className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  )
}
