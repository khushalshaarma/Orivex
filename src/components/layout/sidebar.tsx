"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  CheckSquare,
  MessageSquare,
  Bell,
  Activity,
  ChevronLeft,
  LogOut,
  User,
  Settings,
  Building2,
  Target,
  Calendar,
  Search,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useUnreadCount } from "@/hooks/use-unread-count"

const sidebarLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/search", label: "Search", icon: Search },
  { href: "/members", label: "Members", icon: Users },
  { href: "/teams", label: "Teams", icon: Building2 },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/sprints", label: "Sprints", icon: Target },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/meetings", label: "Meetings", icon: Calendar },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/activity", label: "Activity", icon: Activity },
]

export function Sidebar({ collapsed, onToggle, onNavigate }: { collapsed: boolean; onToggle: () => void; onNavigate?: () => void }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { unreadCount } = useUnreadCount()

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-all duration-300",
        collapsed ? "w-[60px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div className={cn("flex h-14 items-center border-b border-zinc-200 dark:border-zinc-800 px-4", collapsed && "justify-center")}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-bold text-white shadow-sm">
            C
          </div>
          {!collapsed && <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Collab</span>}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {sidebarLinks.map((link) => {
          const Icon = link.icon
          const isActive = pathname === link.href || (link.href !== "/dashboard" && pathname?.startsWith(link.href))
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                collapsed && "justify-center px-2",
                isActive
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
              )}
            >
              <Icon className={cn("flex-shrink-0", collapsed ? "h-5 w-5" : "h-4 w-4")} />
              {!collapsed && <span>{link.label}</span>}
              {link.href === "/notifications" && unreadCount > 0 && (
                <span className={cn("ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white", collapsed && "absolute -right-1 -top-1 h-4 min-w-[16px]")}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 p-2 space-y-1">
        <Link
          href="/profile"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100 transition-colors",
            collapsed && "justify-center px-2"
          )}
        >
          <User className={cn("flex-shrink-0", collapsed ? "h-5 w-5" : "h-4 w-4")} />
          {!collapsed && <span>Profile</span>}
        </Link>
        <Link
          href="/settings/general"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100 transition-colors",
            collapsed && "justify-center px-2"
          )}
        >
          <Settings className={cn("flex-shrink-0", collapsed ? "h-5 w-5" : "h-4 w-4")} />
          {!collapsed && <span>Settings</span>}
        </Link>

        {!collapsed && session?.user && (
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 mt-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={session.user.image ?? undefined} />
              <AvatarFallback className="text-xs">{session.user.name?.charAt(0) ?? "U"}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">{session.user.name}</p>
              <p className="text-[11px] text-zinc-400 truncate">{session.user.email}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-1/2 flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-400 shadow-sm hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
      >
        <ChevronLeft className={cn("h-3.5 w-3.5 transition-transform", collapsed && "rotate-180")} />
      </button>
    </aside>
  )
}
