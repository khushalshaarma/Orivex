"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Navbar } from "@/components/layout/navbar"
import { CommandPalette } from "@/components/command-palette"
import { BrowserNotificationListener } from "@/components/notifications/browser-notification-listener"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Loader2, Menu } from "lucide-react"
import { useActiveWorkspace } from "@/hooks/use-workspace"
import { SocketProvider } from "@/features/chat/socket/provider"
import { cn } from "@/lib/utils"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const { loading: workspaceLoading, workspace } = useActiveWorkspace()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  if (status === "loading" || workspaceLoading) {
    return (
      <div className="flex h-screen items-center justify-center dark:bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (status === "unauthenticated") {
    redirect("/auth/login")
  }

  if (!workspace) {
    redirect("/onboarding")
  }

  const sidebarWidth = sidebarCollapsed ? 60 : 240

  return (
    <SocketProvider workspaceId={workspace?.id}>
      <BrowserNotificationListener />
      <div className="flex h-screen dark:bg-zinc-950">
        <CommandPalette />

        {/* Mobile sidebar overlay */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        <div className={cn(
          "fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:relative lg:z-auto",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}>
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            onNavigate={() => setMobileSidebarOpen(false)}
          />
        </div>

        <div
          className="flex flex-1 flex-col transition-all duration-300 min-w-0 lg:ml-0"
          style={{ marginLeft: sidebarWidth }}
        >
          <Navbar onMenuClick={() => setMobileSidebarOpen(true)} />
          <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </SocketProvider>
  )
}
