export type WorkspaceRole = "OWNER" | "ADMIN" | "MANAGER" | "DEVELOPER" | "DESIGNER" | "QA" | "GUEST"

export type Permission =
  | "workspace:delete"
  | "workspace:update"
  | "workspace:transfer_ownership"
  | "workspace:export"
  | "workspace:manage_billing"
  | "member:invite"
  | "member:remove"
  | "member:update_role"
  | "member:view"
  | "team:create"
  | "team:update"
  | "team:delete"
  | "team:archive"
  | "team:view"
  | "project:create"
  | "project:update"
  | "project:delete"
  | "project:view"
  | "task:create"
  | "task:update"
  | "task:delete"
  | "task:assign"
  | "task:view"
  | "settings:read"
  | "settings:write"
  | "notification:manage"
  | "channel:create"
  | "channel:update"
  | "channel:delete"
  | "channel:archive"
  | "channel:view"
  | "channel:invite"
  | "channel:remove_member"
  | "channel:manage_roles"
  | "message:send"
  | "message:edit"
  | "message:delete"
  | "message:pin"

const rolePermissions: Record<WorkspaceRole, Permission[]> = {
  OWNER: [
    "workspace:delete",
    "workspace:update",
    "workspace:transfer_ownership",
    "workspace:export",
    "workspace:manage_billing",
    "member:invite",
    "member:remove",
    "member:update_role",
    "member:view",
    "team:create",
    "team:update",
    "team:delete",
    "team:archive",
    "team:view",
    "project:create",
    "project:update",
    "project:delete",
    "project:view",
    "task:create",
    "task:update",
    "task:delete",
    "task:assign",
    "task:view",
    "settings:read",
    "settings:write",
    "notification:manage",
    "channel:create",
    "channel:update",
    "channel:delete",
    "channel:archive",
    "channel:view",
    "channel:invite",
    "channel:remove_member",
    "channel:manage_roles",
    "message:send",
    "message:edit",
    "message:delete",
    "message:pin",
  ],
  ADMIN: [
    "workspace:update",
    "workspace:export",
    "member:invite",
    "member:remove",
    "member:update_role",
    "member:view",
    "team:create",
    "team:update",
    "team:delete",
    "team:archive",
    "team:view",
    "project:create",
    "project:update",
    "project:delete",
    "project:view",
    "task:create",
    "task:update",
    "task:delete",
    "task:assign",
    "task:view",
    "settings:read",
    "settings:write",
    "notification:manage",
    "channel:create",
    "channel:update",
    "channel:delete",
    "channel:archive",
    "channel:view",
    "channel:invite",
    "channel:remove_member",
    "channel:manage_roles",
    "message:send",
    "message:edit",
    "message:delete",
    "message:pin",
  ],
  MANAGER: [
    "member:invite",
    "member:view",
    "team:create",
    "team:update",
    "team:view",
    "project:create",
    "project:update",
    "project:view",
    "task:create",
    "task:update",
    "task:delete",
    "task:assign",
    "task:view",
    "settings:read",
    "notification:manage",
    "channel:view",
    "channel:create",
    "channel:invite",
    "channel:remove_member",
    "message:send",
    "message:edit",
    "message:pin",
  ],
  DEVELOPER: [
    "member:view",
    "team:view",
    "project:view",
    "task:create",
    "task:update",
    "task:view",
    "notification:manage",
    "channel:view",
    "channel:create",
    "message:send",
    "message:edit",
    "message:pin",
  ],
  DESIGNER: [
    "member:view",
    "team:view",
    "project:view",
    "task:create",
    "task:update",
    "task:view",
    "notification:manage",
    "channel:view",
    "channel:create",
    "message:send",
    "message:edit",
    "message:pin",
  ],
  QA: [
    "member:view",
    "team:view",
    "project:view",
    "task:create",
    "task:update",
    "task:view",
    "notification:manage",
    "channel:view",
    "message:send",
    "message:edit",
  ],
  GUEST: [
    "member:view",
    "team:view",
    "project:view",
    "task:view",
    "channel:view",
    "message:send",
  ],
}

export function hasPermission(role: WorkspaceRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false
}

export function canViewAllTasks(role: WorkspaceRole): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "MANAGER"
}

export function getTaskFilter(userId: string, role: WorkspaceRole): { assigneeId: string } | { OR: ({ assigneeId: string } | { reporterId: string })[] } | Record<string, never> {
  if (canViewAllTasks(role)) return {}
  return { OR: [{ assigneeId: userId }, { reporterId: userId }] }
}

export function getRolePermissions(role: WorkspaceRole): Permission[] {
  return rolePermissions[role] ?? []
}

export function getHighestRole(roles: WorkspaceRole[]): WorkspaceRole {
  const hierarchy: WorkspaceRole[] = ["OWNER", "ADMIN", "MANAGER", "DEVELOPER", "DESIGNER", "QA", "GUEST"]
  for (const level of hierarchy) {
    if (roles.includes(level)) return level
  }
  return "GUEST"
}
