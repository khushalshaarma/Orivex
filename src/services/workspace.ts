import { prisma } from "@/lib/prisma"
import { v4 as uuid } from "uuid"
import { addDays } from "date-fns"
import type { WorkspaceRole } from "@prisma/client"
import { triggerNotification, notifyWorkspace } from "@/services/notification"
import { sendInvitationEmail, type EmailResult } from "@/lib/email"

export async function getWorkspaceBySlug(slug: string) {
  return prisma.workspace.findUnique({ where: { slug, deletedAt: null } })
}

export async function getWorkspaceById(id: string) {
  return prisma.workspace.findUnique({
    where: { id, deletedAt: null },
    include: {
      _count: { select: { members: true, teams: true } },
    },
  })
}

export async function getUserWorkspaces(userId: string) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: { workspace: true },
  })
  return memberships.map((m) => m.workspace)
}

export async function getActiveWorkspace(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeWorkspaceId: true, activeWorkspace: true },
  })
  if (user?.activeWorkspace) return user.activeWorkspace

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId },
    include: { workspace: true },
    orderBy: { joinedAt: "asc" },
  })
  return membership?.workspace ?? null
}

export async function createWorkspace(data: {
  name: string
  slug: string
  logo?: string
  industry?: string
  companySize?: string
  timezone?: string
  ownerId: string
}) {
  const workspace = await prisma.workspace.create({
    data: {
      name: data.name,
      slug: data.slug,
      logo: data.logo,
      industry: data.industry,
      companySize: data.companySize,
      timezone: data.timezone,
      members: {
        create: { userId: data.ownerId, role: "OWNER" },
      },
    },
  })

  await prisma.user.update({
    where: { id: data.ownerId },
    data: { activeWorkspaceId: workspace.id },
  })

  await createAuditLog({
    userId: data.ownerId,
    workspaceId: workspace.id,
    action: "workspace.created",
    entity: "workspace",
    entityId: workspace.id,
    metadata: { name: data.name },
  })

  return workspace
}

export async function updateWorkspace(
  workspaceId: string,
  data: Partial<{
    name: string
    slug: string
    logo: string
    industry: string
    companySize: string
    timezone: string
  }>,
  actorId: string
) {
  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data,
  })

  await createAuditLog({
    userId: actorId,
    workspaceId,
    action: "workspace.updated",
    entity: "workspace",
    entityId: workspaceId,
    metadata: data,
  })

  return workspace
}

export async function deleteWorkspace(workspaceId: string, actorId: string) {
  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { deletedAt: new Date() },
  })

  await createAuditLog({
    userId: actorId,
    workspaceId,
    action: "workspace.deleted",
    entity: "workspace",
    entityId: workspaceId,
  })

  return workspace
}

export async function transferOwnership(workspaceId: string, newOwnerId: string, currentOwnerId: string) {
  await prisma.$transaction([
    prisma.workspaceMember.update({
      where: { userId_workspaceId: { userId: currentOwnerId, workspaceId } },
      data: { role: "ADMIN" },
    }),
    prisma.workspaceMember.update({
      where: { userId_workspaceId: { userId: newOwnerId, workspaceId } },
      data: { role: "OWNER" },
    }),
  ])

  await createAuditLog({
    userId: currentOwnerId,
    workspaceId,
    action: "workspace.transferred",
    entity: "workspace",
    entityId: workspaceId,
    metadata: { newOwnerId },
  })
}

export async function getWorkspaceMembers(workspaceId: string) {
  return prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          position: true,
          department: true,
          status: true,
          lastActiveAt: true,
          timezone: true,
          username: true,
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  })
}

export async function updateMemberRole(workspaceId: string, userId: string, role: WorkspaceRole, actorId: string) {
  const member = await prisma.workspaceMember.update({
    where: { userId_workspaceId: { userId, workspaceId } },
    data: { role },
  })

  await createAuditLog({
    userId: actorId,
    workspaceId,
    action: "member.role_updated",
    entity: "workspace_member",
    entityId: member.id,
    metadata: { targetUserId: userId, newRole: role },
  })

  if (actorId !== userId) {
    await triggerNotification({
      userId,
      workspaceId,
      type: "member.role_updated",
      category: "WORKSPACE",
      priority: "NORMAL",
      title: `Your role was changed to ${role}`,
      message: `Your workspace role has been updated`,
      actorId,
      entityId: member.id,
      entityType: "workspace_member",
      link: `/members`,
    }).catch(() => {})
  }

  return member
}

export async function removeMember(workspaceId: string, userId: string, actorId: string) {
  await prisma.workspaceMember.delete({
    where: { userId_workspaceId: { userId, workspaceId } },
  })

  if (actorId !== userId) {
    await createAuditLog({
      userId: actorId,
      workspaceId,
      action: "member.removed",
      entity: "workspace_member",
      entityId: userId,
      metadata: { removedUserId: userId },
    })
  }
}

export type InviteMemberResult = {
  id: string
  email: string
  workspaceId: string
  invitedById: string | null
  token: string
  role: WorkspaceRole
  status: string
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
  emailSent: boolean
  emailError?: string
  emailMessageId?: string
  notificationCreated?: boolean
  notificationError?: string
}

export async function inviteMember(data: {
  email: string
  workspaceId: string
  invitedById: string
  role: WorkspaceRole
}): Promise<InviteMemberResult> {
  const existing = await prisma.invitation.findFirst({
    where: {
      email: data.email,
      workspaceId: data.workspaceId,
      status: "PENDING",
    },
  })
  if (existing) {
    return {
      ...existing,
      emailSent: false,
      emailError: "A pending invitation already exists for this email",
      notificationCreated: true,
    }
  }

  const token = uuid()
  const invitation = await prisma.invitation.create({
    data: {
      email: data.email,
      workspaceId: data.workspaceId,
      invitedById: data.invitedById,
      role: data.role,
      token,
      expiresAt: addDays(new Date(), 7),
    },
  })

  if (process.env.NODE_ENV !== "production") {
    console.log("[invitation] Invitation Created", {
      invitationId: invitation.id,
      workspaceId: data.workspaceId,
      invitedById: data.invitedById,
      recipientEmail: data.email,
      expiresAt: invitation.expiresAt,
    })
  }
  console.log("[invite] invitation created")

  let notificationCreated = false
  let notificationError: string | undefined
  try {
    const recipients = await notifyWorkspace(data.workspaceId, {
      type: "invitation.sent",
      category: "WORKSPACE",
      priority: "NORMAL",
      title: "New invitation sent",
      message: `Invitation sent to ${data.email}`,
      actorId: data.invitedById,
      entityType: "invitation",
      entityId: invitation.id,
    })
    notificationCreated = recipients.length > 0
    if (process.env.NODE_ENV !== "production") {
      console.log("[invitation] Notification Created", {
        workspaceId: data.workspaceId,
        recipientCount: recipients.length,
        socketEmitted: true,
      })
    }
  } catch (error) {
    notificationError = error instanceof Error ? error.message : "Unknown notification error"
    console.error("[invitation] Notification creation failed", {
      workspaceId: data.workspaceId,
      recipientEmail: data.email,
      error: notificationError,
    })
  }

  // All database writes (invitation + notifications) are committed above.
  // Emails MUST be sent AFTER the DB transaction/commits, never inside a
  // transaction callback. sendInvitationEmail handles its own errors and
  // never throws, so the invitation response is always returned.
  console.log("[invite] before sendInvitationEmail")

  const [workspace, inviter] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: data.workspaceId },
      select: { name: true, logo: true },
    }),
    data.invitedById
      ? prisma.user.findUnique({
          where: { id: data.invitedById },
          select: { name: true },
        })
      : Promise.resolve(null),
  ])

  const emailResult: EmailResult = await sendInvitationEmail({
    to: data.email,
    workspaceName: workspace?.name ?? "Collab",
    inviterName: inviter?.name ?? "A workspace owner",
    role: data.role,
    token,
    expiresAt: invitation.expiresAt,
    workspaceLogo: workspace?.logo ?? null,
  })

  console.log("[invite] after sendInvitationEmail")

  return {
    ...invitation,
    emailSent: emailResult.sent,
    emailError: emailResult.error,
    emailMessageId: emailResult.messageId,
    notificationCreated,
    notificationError,
  }
}

export async function getPendingInvitations(workspaceId: string) {
  return prisma.invitation.findMany({
    where: { workspaceId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    include: { invitedBy: { select: { id: true, name: true, email: true } } },
  })
}

export async function acceptInvitation(token: string, authUserId: string, authUserEmail?: string | null) {
  console.log("[acceptInvitation] Starting acceptance flow", {
    token: token.slice(0, 8) + "...",
    authUserId,
    authUserEmail,
  })

  // 1. Find and validate the invitation
  const invitation = await prisma.invitation.findUnique({ where: { token } })
  if (!invitation) throw new Error("Invalid invitation token")

  console.log("[acceptInvitation] Found invitation", {
    token: token.slice(0, 8) + "...",
    invitationEmail: invitation.email,
    workspaceId: invitation.workspaceId,
    status: invitation.status,
    expiresAt: invitation.expiresAt,
  })

  if (invitation.status !== "PENDING") throw new Error("Invitation is no longer valid")
  if (new Date() > invitation.expiresAt) {
    await prisma.invitation.update({ where: { id: invitation.id }, data: { status: "EXPIRED" } })
    throw new Error("Invitation has expired")
  }

  // 2. Verify the authenticated user's email matches the invitation email
  if (!authUserEmail) {
    throw new Error("Cannot verify your email. Please ensure you are logged in with the correct account.")
  }
  if (authUserEmail.toLowerCase() !== invitation.email.toLowerCase()) {
    console.warn("[acceptInvitation] Email mismatch", {
      authUserEmail,
      invitationEmail: invitation.email,
    })
    throw new Error(
      "This invitation was sent to a different email address. Please sign out and sign in with the correct account.",
    )
  }

  // 3. Resolve the user — verify they exist in the User table
  let user = await prisma.user.findUnique({ where: { id: authUserId } })

  if (!user) {
    console.warn("[acceptInvitation] Auth user ID not found in User table, looking up by invitation email", {
      authUserId,
      invitationEmail: invitation.email,
    })
    user = await prisma.user.findUnique({ where: { email: invitation.email } })
  }

  if (!user) {
    throw new Error(
      "User account not found. Please create an account with the email address where you received the invitation before accepting.",
    )
  }

  const resolvedUserId = user.id
  console.log("[acceptInvitation] Resolved user", {
    resolvedUserId,
    resolvedUserEmail: user.email,
    workspaceId: invitation.workspaceId,
  })

  // 4. Check for duplicate membership
  const existingMember = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: resolvedUserId, workspaceId: invitation.workspaceId } },
  })
  if (existingMember) {
    console.log("[acceptInvitation] User is already a member", {
      resolvedUserId,
      workspaceId: invitation.workspaceId,
    })
    return { ...invitation, alreadyMember: true, workspaceId: invitation.workspaceId }
  }

  // 5. Perform acceptance in a transaction
  const [workspaceMember] = await prisma.$transaction([
    prisma.workspaceMember.create({
      data: { userId: resolvedUserId, workspaceId: invitation.workspaceId, role: invitation.role },
    }),
    prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED" },
    }),
  ])

  console.log("[acceptInvitation] Workspace member created", {
    workspaceMemberId: workspaceMember.id,
    resolvedUserId,
    workspaceId: invitation.workspaceId,
  })

  // 6. Update active workspace (best-effort, not in transaction)
  try {
    await prisma.user.update({
      where: { id: resolvedUserId },
      data: { activeWorkspaceId: invitation.workspaceId },
    })
  } catch (e) {
    console.error("[acceptInvitation] Failed to update active workspace:", e)
  }

  // 7. Trigger welcome notification (best-effort)
  const workspace = await prisma.workspace.findUnique({
    where: { id: invitation.workspaceId },
    select: { name: true },
  })
  await triggerNotification({
    userId: resolvedUserId,
    workspaceId: invitation.workspaceId,
    type: "workspace.joined",
    category: "WORKSPACE",
    priority: "NORMAL",
    title: `Welcome to ${workspace?.name ?? "the workspace"}!`,
    message: `You joined the workspace`,
    entityId: invitation.workspaceId,
    entityType: "workspace",
    link: `/dashboard`,
  }).catch(() => {})

  return invitation
}

export async function cancelInvitation(invitationId: string) {
  return prisma.invitation.update({
    where: { id: invitationId },
    data: { status: "CANCELLED" },
  })
}

export async function resendInvitation(invitationId: string) {
  const invitation = await prisma.invitation.findUnique({ where: { id: invitationId } })
  if (!invitation) throw new Error("Invitation not found")

  const updated = await prisma.invitation.update({
    where: { id: invitationId },
    data: {
      token: uuid(),
      expiresAt: addDays(new Date(), 7),
      status: "PENDING",
    },
  })

  if (invitation.status !== "ACCEPTED" && invitation.status !== "CANCELLED") {
    console.log("[invite] before sendInvitationEmail (resend)")
    const [workspace, inviter] = await Promise.all([
      prisma.workspace.findUnique({
        where: { id: updated.workspaceId },
        select: { name: true, logo: true },
      }),
      updated.invitedById
        ? prisma.user.findUnique({
            where: { id: updated.invitedById },
            select: { name: true },
          })
        : Promise.resolve(null),
    ])
    await sendInvitationEmail({
      to: updated.email,
      workspaceName: workspace?.name ?? "Collab",
      inviterName: inviter?.name ?? "A workspace owner",
      role: updated.role,
      token: updated.token,
      expiresAt: updated.expiresAt,
      workspaceLogo: workspace?.logo ?? null,
    })
    console.log("[invite] after sendInvitationEmail (resend)")
  }

  return updated
}

export async function getWorkspaceStats(workspaceId: string) {
  const [members, teams, projects, activeToday, pendingInvites] = await Promise.all([
    prisma.workspaceMember.count({ where: { workspaceId } }),
    prisma.team.count({ where: { workspaceId, deletedAt: null } }),
    prisma.project.count({
      where: { team: { workspaceId }, deletedAt: null },
    }),
    prisma.user.count({
      where: {
        workspaceMemberships: { some: { workspaceId } },
        lastActiveAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.invitation.count({ where: { workspaceId, status: "PENDING" } }),
  ])

  return { members, teams, projects, activeToday, pendingInvites }
}

export async function getRecentActivity(workspaceId: string, limit = 10) {
  return prisma.auditLog.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  })
}

export async function getWorkspaceTeams(workspaceId: string) {
  return prisma.team.findMany({
    where: { workspaceId, deletedAt: null },
    include: {
      _count: { select: { members: true, projects: true } },
      lead: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  })
}

async function createAuditLog(data: {
  userId: string
  workspaceId: string
  action: string
  entity: string
  entityId?: string
  metadata?: Record<string, unknown>
}) {
  return prisma.auditLog.create({ data: data as any }) // eslint-disable-line @typescript-eslint/no-explicit-any
}
