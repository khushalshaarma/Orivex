import { prisma } from "@/lib/prisma"
import type { NotificationCategory, NotificationPriority, Prisma } from "@prisma/client"

export interface CreateNotificationData {
  userId: string
  workspaceId?: string
  type: string
  category?: NotificationCategory
  priority?: NotificationPriority
  title: string
  message?: string
  link?: string
  actorId?: string
  entityId?: string
  entityType?: string
  batchId?: string
  actions?: Record<string, unknown>[]
  expiredAt?: Date
}

export interface NotificationFilter {
  userId: string
  read?: boolean
  archived?: boolean
  pinned?: boolean
  category?: NotificationCategory | NotificationCategory[]
  priority?: NotificationPriority | NotificationPriority[]
  search?: string
  workspaceId?: string
  type?: string
  startDate?: Date
  endDate?: Date
}

export interface PaginationOptions {
  page?: number
  pageSize?: number
  cursor?: string
}

export async function getNotifications(filter: NotificationFilter, options: PaginationOptions = {}) {
  const { page = 1, pageSize = 20 } = options

  const where: Prisma.NotificationWhereInput = { userId: filter.userId }

  if (filter.read !== undefined) where.read = filter.read
  if (filter.archived !== undefined) where.archived = filter.archived
  if (filter.pinned !== undefined) where.pinned = filter.pinned
  if (filter.workspaceId) where.workspaceId = filter.workspaceId
  if (filter.type) where.type = filter.type
  if (filter.category) where.category = Array.isArray(filter.category) ? { in: filter.category } : filter.category
  if (filter.priority) where.priority = Array.isArray(filter.priority) ? { in: filter.priority } : filter.priority
  if (filter.startDate || filter.endDate) {
    where.createdAt = {}
    if (filter.startDate) where.createdAt.gte = filter.startDate
    if (filter.endDate) where.createdAt.lte = filter.endDate
  }
  if (filter.search) {
    where.OR = [
      { title: { contains: filter.search, mode: "insensitive" } },
      { message: { contains: filter.search, mode: "insensitive" } },
    ]
  }

  if (options.cursor) {
    const cursorItem = await prisma.notification.findUnique({ where: { id: options.cursor }, select: { createdAt: true } })
    if (cursorItem) {
      where.createdAt = { ...((where.createdAt as object) || {}), lt: cursorItem.createdAt }
    }
  }

  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip: options.cursor ? undefined : (page - 1) * pageSize,
    }),
    prisma.notification.count({ where }),
  ])

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

export async function getUnreadCount(userId: string, workspaceId?: string) {
  return prisma.notification.count({
    where: { userId, read: false, ...(workspaceId ? { workspaceId } : {}) },
  })
}

export async function getUnreadMentionsCount(userId: string) {
  return prisma.notification.count({
    where: { userId, read: false, category: "MENTION" as NotificationCategory },
  })
}

export async function getMentionNotifications(userId: string, options: PaginationOptions = {}) {
  const { page = 1, pageSize = 20 } = options
  const where = { userId, category: "MENTION" as NotificationCategory }
  const [items, total] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: pageSize, skip: (page - 1) * pageSize }),
    prisma.notification.count({ where }),
  ])
  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

export async function markAsRead(notificationId: string) {
  return prisma.notification.update({ where: { id: notificationId }, data: { read: true } })
}

export async function markAsUnread(notificationId: string) {
  return prisma.notification.update({ where: { id: notificationId }, data: { read: false } })
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  })
}

export async function bulkMarkAsRead(ids: string[]) {
  return prisma.notification.updateMany({
    where: { id: { in: ids } },
    data: { read: true },
  })
}

export async function archiveNotification(notificationId: string) {
  return prisma.notification.update({ where: { id: notificationId }, data: { archived: true } })
}

export async function bulkArchive(ids: string[]) {
  return prisma.notification.updateMany({
    where: { id: { in: ids } },
    data: { archived: true },
  })
}

export async function deleteNotification(notificationId: string) {
  return prisma.notification.delete({ where: { id: notificationId } })
}

export async function bulkDelete(ids: string[]) {
  return prisma.notification.deleteMany({ where: { id: { in: ids } } })
}

export async function pinNotification(notificationId: string) {
  return prisma.notification.update({ where: { id: notificationId }, data: { pinned: true } })
}

export async function unpinNotification(notificationId: string) {
  return prisma.notification.update({ where: { id: notificationId }, data: { pinned: false } })
}

export async function createNotification(data: CreateNotificationData) {
  const notification = await prisma.notification.create({
    data: {
      userId: data.userId,
      workspaceId: data.workspaceId,
      type: data.type,
      category: data.category ?? "WORKSPACE",
      priority: data.priority ?? "NORMAL",
      title: data.title,
      message: data.message,
      link: data.link,
      actorId: data.actorId,
      entityId: data.entityId,
      entityType: data.entityType,
      batchId: data.batchId,
      actions: data.actions ? JSON.parse(JSON.stringify(data.actions)) : undefined,
      expiredAt: data.expiredAt,
    },
  })

  // Every notification must create an Audit Log.
  try {
    await createAuditLog({
      userId: data.actorId ?? data.userId,
      workspaceId: data.workspaceId,
      action: `notification.${data.type}`,
      entity: (data.entityType ?? "notification").toLowerCase(),
      entityId: data.entityId ?? notification.id,
      metadata: { title: data.title, category: notification.category, priority: notification.priority },
    })
  } catch {
    // Audit logging is best-effort
  }

  try {
    const { broadcastToUser } = await import("@/lib/socket-server")
    const [unread, mentions] = await Promise.all([
      getUnreadCount(data.userId),
      getUnreadMentionsCount(data.userId),
    ])
    broadcastToUser(data.userId, "notification:new", {
      id: notification.id,
      category: notification.category,
      priority: notification.priority,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      createdAt: notification.createdAt,
      unreadCount: unread,
      mentionsCount: mentions,
    })
  } catch {
    // Socket server might not be initialized; ignore
  }

  return notification
}

export interface TriggerNotificationData extends Omit<CreateNotificationData, "userId"> {
  userId: string
}

/**
 * Creates a notification for a single user AND an audit log in one shot.
 * Used by automatic triggers across the app.
 */
export async function triggerNotification(data: TriggerNotificationData) {
  const [notification] = await prisma.$transaction([
    prisma.notification.create({
      data: {
        userId: data.userId,
        workspaceId: data.workspaceId,
        type: data.type,
        category: data.category ?? "WORKSPACE",
        priority: data.priority ?? "NORMAL",
        title: data.title,
        message: data.message,
        link: data.link,
        actorId: data.actorId,
        entityId: data.entityId,
        entityType: data.entityType,
        batchId: data.batchId,
        actions: data.actions ? JSON.parse(JSON.stringify(data.actions)) : undefined,
        expiredAt: data.expiredAt,
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: data.actorId ?? data.userId,
        workspaceId: data.workspaceId ?? null,
        projectId: data.entityType === "project" ? data.entityId : null,
        taskId: data.entityType === "task" ? data.entityId : null,
        action: data.type,
        entity: (data.entityType ?? "notification").toLowerCase(),
        entityId: data.entityId ?? undefined,
        metadata: { title: data.title, category: data.category ?? "WORKSPACE" },
      },
    }),
  ])

  try {
    const { broadcastToUser } = await import("@/lib/socket-server")
    const [unread, mentions] = await Promise.all([
      getUnreadCount(data.userId),
      getUnreadMentionsCount(data.userId),
    ])
    broadcastToUser(data.userId, "notification:new", {
      id: notification.id,
      category: notification.category,
      priority: notification.priority,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      createdAt: notification.createdAt,
      unreadCount: unread,
      mentionsCount: mentions,
    })
  } catch {
    // Socket server might not be initialized; ignore
  }

  return notification
}

export interface NotifyWorkspaceData {
  type: string
  category?: NotificationCategory
  priority?: NotificationPriority
  title: string
  message?: string
  link?: string
  actorId?: string
  entityId?: string
  entityType?: string
  batchId?: string
  actions?: Record<string, unknown>[]
  excludeUserId?: string
}

/**
 * Broadcasts a notification to every workspace member (optionally excluding the
 * actor) and writes a single audit log for the event.
 */
export async function notifyWorkspace(workspaceId: string, data: NotifyWorkspaceData) {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    select: { userId: true },
  })

  const recipients = members.filter((m) => m.userId !== data.excludeUserId)
  if (recipients.length === 0) return []

  await prisma.notification.createMany({
    data: recipients.map((m) => ({
      userId: m.userId,
      workspaceId,
      type: data.type,
      category: data.category ?? "WORKSPACE",
      priority: data.priority ?? "NORMAL",
      title: data.title,
      message: data.message,
      link: data.link,
      actorId: data.actorId,
      entityId: data.entityId,
      entityType: data.entityType,
      batchId: data.batchId,
      actions: data.actions ? JSON.parse(JSON.stringify(data.actions)) : undefined,
    })),
  })

  await createAuditLog({
    userId: data.actorId,
    workspaceId,
    action: data.type,
    entity: (data.entityType ?? "notification").toLowerCase(),
    entityId: data.entityId,
    metadata: { title: data.title, broadcast: true },
  })

  try {
    const { broadcastToWorkspaceSocket } = await import("@/lib/socket-server")
    broadcastToWorkspaceSocket(workspaceId, "notification:bulk", {})
  } catch {
    // Socket server might not be initialized; ignore
  }

  return recipients
}

export async function broadcastToWorkspace(
  workspaceId: string,
  data: Omit<CreateNotificationData, "userId"> & { batchToSelf?: boolean },
  excludeUserId?: string,
) {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    select: { userId: true },
  })

  const notifications = members
    .filter((m) => data.batchToSelf || m.userId !== excludeUserId)
    .map((m) => ({
      userId: m.userId,
      workspaceId,
      type: data.type,
      category: (data.category ?? "WORKSPACE") as NotificationCategory,
      priority: (data.priority ?? "NORMAL") as NotificationPriority,
      title: data.title,
      message: data.message,
      link: data.link,
      actorId: data.actorId,
      entityId: data.entityId,
      entityType: data.entityType,
      batchId: data.batchId,
      actions: data.actions ? JSON.parse(JSON.stringify(data.actions)) : undefined,
    }))

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications })
  }

  return notifications
}

export async function searchNotifications(userId: string, query: string, options: PaginationOptions = {}) {
  const { page = 1, pageSize = 20 } = options
  const where: Prisma.NotificationWhereInput = {
    userId,
    OR: [
      { title: { contains: query, mode: "insensitive" } },
      { message: { contains: query, mode: "insensitive" } },
      { type: { contains: query, mode: "insensitive" } },
      { entityId: query },
    ],
  }
  const [items, total] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: pageSize, skip: (page - 1) * pageSize }),
    prisma.notification.count({ where }),
  ])
  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

export async function createAuditLog(data: {
  userId?: string
  workspaceId?: string
  projectId?: string
  taskId?: string
  action: string
  entity: string
  entityId?: string
  metadata?: Record<string, unknown>
}) {
  return prisma.auditLog.create({
    data: {
      userId: data.userId ?? null,
      workspaceId: data.workspaceId ?? null,
      projectId: data.projectId ?? null,
      taskId: data.taskId ?? null,
      action: data.action,
      entity: data.entity,
      entityId: data.entityId ?? null,
      metadata: data.metadata ? (JSON.parse(JSON.stringify(data.metadata)) as Prisma.InputJsonValue) : undefined,
    },
  })
}

export async function getActivityTimeline(workspaceId: string, options: { limit?: number; cursor?: string; entityType?: string } = {}) {
  const { limit = 50, cursor, entityType } = options
  const where: Prisma.AuditLogWhereInput = { workspaceId }
  if (entityType) where.entity = entityType
  if (cursor) {
    const cursorItem = await prisma.auditLog.findUnique({ where: { id: cursor }, select: { createdAt: true } })
    if (cursorItem) where.createdAt = { lt: cursorItem.createdAt }
  }
  return prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  })
}

export async function searchGlobal(userId: string, workspaceId: string, query: string) {
  const [notifications, activities, messages, users] = await Promise.all([
    prisma.notification.findMany({
      where: {
        userId,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { message: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.findMany({
      where: {
        workspaceId,
        OR: [
          { action: { contains: query, mode: "insensitive" } },
          { entity: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true, image: true } } },
    }),
    prisma.message.findMany({
      where: { workspaceId, content: { contains: query, mode: "insensitive" }, deleted: false },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, content: true, createdAt: true, sender: { select: { id: true, name: true } } },
    }),
    prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 5,
      select: { id: true, name: true, image: true, email: true },
    }),
  ])

  return { notifications, activities, messages, users }
}

export async function getNotification(notificationId: string) {
  return prisma.notification.findUnique({ where: { id: notificationId } })
}

export interface ProcessMentionsOptions {
  content: string
  workspaceId: string
  senderId: string
  senderName: string
  messageId: string
  channelId?: string | null
  conversationId?: string | null
  link: string
  everyoneAllowed: boolean
}

export interface ProcessMentionsResult {
  mentionedUserIds: string[]
  mentionedTeamIds: string[]
  everyone: boolean
}

const MENTION_TOKEN = /@([A-Za-z0-9_][A-Za-z0-9_ -]*?)(?=\s|$|[.,!?:;])/g

/**
 * Parses @username / @team / @everyone mentions from message content, resolves
 * them against workspace members & teams, and creates MENTION notifications.
 * `@everyone` is only honoured when `everyoneAllowed` is true (Owner/Admin).
 */
export async function processMessageMentions(opts: ProcessMentionsOptions): Promise<ProcessMentionsResult> {
  const [members, teams] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId: opts.workspaceId },
      select: { userId: true, user: { select: { id: true, name: true } } },
    }),
    prisma.team.findMany({
      where: { workspaceId: opts.workspaceId },
      select: { id: true, name: true },
    }),
  ])

  const nameToUserId = new Map<string, string>()
  for (const m of members) {
    if (m.user?.name) nameToUserId.set(m.user.name.toLowerCase(), m.userId)
  }
  const teamNameToId = new Map<string, string>()
  for (const t of teams) teamNameToId.set(t.name.toLowerCase(), t.id)

  const tokens = new Set<string>()
  let match: RegExpExecArray | null
  MENTION_TOKEN.lastIndex = 0
  while ((match = MENTION_TOKEN.exec(opts.content)) !== null) {
    tokens.add(match[1].trim().toLowerCase())
  }

  const mentionedUserIds = new Set<string>()
  const mentionedTeamIds = new Set<string>()
  let everyone = false

  for (const token of tokens) {
    if (token === "everyone" || token === "here") {
      if (opts.everyoneAllowed) everyone = true
      continue
    }
    const uid = nameToUserId.get(token)
    if (uid) {
      mentionedUserIds.add(uid)
      continue
    }
    const tid = teamNameToId.get(token)
    if (tid) mentionedTeamIds.add(tid)
  }

  if (mentionedTeamIds.size > 0) {
    const teamMembers = await prisma.teamMember.findMany({
      where: { teamId: { in: Array.from(mentionedTeamIds) } },
      select: { userId: true },
    })
    for (const tm of teamMembers) mentionedUserIds.add(tm.userId)
  }

  const recipients = new Set<string>(mentionedUserIds)
  if (everyone) {
    for (const m of members) recipients.add(m.userId)
  }
  recipients.delete(opts.senderId)

  for (const uid of recipients) {
    await createNotification({
      userId: uid,
      workspaceId: opts.workspaceId,
      type: "mention",
      category: "MENTION",
      priority: "HIGH",
      title: `${opts.senderName} mentioned you`,
      message: opts.content.slice(0, 200),
      actorId: opts.senderId,
      entityId: opts.messageId,
      entityType: "message",
      link: opts.link,
    })
  }

  return {
    mentionedUserIds: Array.from(mentionedUserIds),
    mentionedTeamIds: Array.from(mentionedTeamIds),
    everyone,
  }
}

export interface NotificationPreferencesInput {
  settings?: Record<string, { email: boolean; browser: boolean; push: boolean }>
  digestFrequency?: string
  browserEnabled?: boolean
  emailEnabled?: boolean
}

export async function getNotificationPreferences(userId: string) {
  const pref = await prisma.notificationPreference.findUnique({ where: { userId } })
  if (pref) return pref
  return prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId },
    update: {},
  })
}

export async function upsertNotificationPreferences(userId: string, data: NotificationPreferencesInput) {
  const updateData: Record<string, unknown> = {}
  if (data.settings !== undefined) updateData.settings = JSON.parse(JSON.stringify(data.settings))
  if (data.digestFrequency !== undefined) updateData.digestFrequency = data.digestFrequency
  if (data.browserEnabled !== undefined) updateData.browserEnabled = data.browserEnabled
  if (data.emailEnabled !== undefined) updateData.emailEnabled = data.emailEnabled

  return prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId, ...updateData },
    update: updateData,
  })
}

/**
 * Returns whether a user should receive an in-app/browser notification of the
 * given category based on their saved preferences. Falls back to enabled.
 */
export async function shouldDeliver(userId: string, category: string): Promise<boolean> {
  try {
    const pref = await prisma.notificationPreference.findUnique({ where: { userId } })
    if (!pref) return true
    const cat = (pref.settings as Record<string, { email: boolean; browser: boolean; push: boolean }> | null)?.[category]
    if (!cat) return true
    return cat.browser !== false || cat.email !== false
  } catch {
    return true
  }
}
