import { prisma } from "@/lib/prisma"
import { notifyWorkspace } from "@/services/notification"
import type { WorkspaceRole } from "@/config/permissions"
import { canViewAllTasks } from "@/config/permissions"

interface CreateProjectData {
  name: string
  slug: string
  description?: string
  color?: string
  icon?: string
  teamId: string
  ownerId: string
  visibility?: "PUBLIC" | "PRIVATE" | "TEAM_ONLY"
  startDate?: string | null
  dueDate?: string | null
}

interface UpdateProjectData {
  name?: string
  slug?: string
  description?: string
  status?: string
  priority?: string
  visibility?: "PUBLIC" | "PRIVATE" | "TEAM_ONLY"
  favorite?: boolean
  color?: string
  icon?: string
  labels?: string[]
  progress?: number
  startDate?: string | null
  dueDate?: string | null
}

export async function getProjectById(id: string) {
  return prisma.project.findUnique({
    where: { id, deletedAt: null },
    include: {
      owner: { select: { id: true, name: true, image: true } },
      team: { select: { id: true, name: true, color: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, image: true, email: true } },
        },
      },
      _count: { select: { tasks: true } },
    },
  })
}

export async function getProjectsByTeam(teamId: string) {
  return prisma.project.findMany({
    where: { teamId, deletedAt: null },
    include: {
      owner: { select: { id: true, name: true, image: true } },
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getProjectsByWorkspace(workspaceId: string) {
  return prisma.project.findMany({
    where: { team: { workspaceId }, deletedAt: null },
    include: {
      owner: { select: { id: true, name: true, image: true } },
      team: { select: { id: true, name: true, color: true } },
      _count: { select: { tasks: true } },
    },
    orderBy: [{ favorite: "desc" }, { updatedAt: "desc" }],
  })
}

export async function createProject(data: CreateProjectData) {
  const project = await prisma.project.create({
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description,
      color: data.color,
      icon: data.icon,
      teamId: data.teamId,
      ownerId: data.ownerId,
      visibility: data.visibility ?? "TEAM_ONLY",
      startDate: data.startDate ? new Date(data.startDate) : null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    },
    include: {
      owner: { select: { id: true, name: true, image: true } },
      team: { select: { id: true, name: true, color: true } },
    },
  })

  await prisma.projectMember.create({
    data: { userId: data.ownerId, projectId: project.id, role: "OWNER" },
  })

  const team = await prisma.team.findUnique({ where: { id: data.teamId } })
  if (team?.workspaceId) {
    await notifyWorkspace(team.workspaceId, {
      type: "project.created",
      category: "PROJECT",
      priority: "NORMAL",
      title: `New project: ${project.name}`,
      message: `${project.owner?.name ?? "A member"} created the project`,
      actorId: data.ownerId,
      entityId: project.id,
      entityType: "project",
      link: `/projects/${project.id}`,
      excludeUserId: data.ownerId,
    })
  }

  return project
}

export async function updateProject(id: string, data: UpdateProjectData, actorId: string) {
  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.slug !== undefined) updateData.slug = data.slug
  if (data.description !== undefined) updateData.description = data.description
  if (data.status !== undefined) updateData.status = data.status
  if (data.priority !== undefined) updateData.priority = data.priority
  if (data.visibility !== undefined) updateData.visibility = data.visibility
  if (data.favorite !== undefined) updateData.favorite = data.favorite
  if (data.color !== undefined) updateData.color = data.color
  if (data.icon !== undefined) updateData.icon = data.icon
  if (data.labels !== undefined) updateData.labels = data.labels
  if (data.progress !== undefined) updateData.progress = data.progress
  if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null

  const project = await prisma.project.update({
    where: { id },
    data: updateData,
  })

  const team = await prisma.team.findUnique({ where: { id: project.teamId } })
  await prisma.auditLog.create({
    data: {
      userId: actorId,
      workspaceId: team?.workspaceId,
      projectId: id,
      action: "project.updated",
      entity: "project",
      entityId: id,
      metadata: data,
    } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
  })

  return project
}

export async function archiveProject(id: string, actorId: string) {
  const project = await prisma.project.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  const team = await prisma.team.findUnique({ where: { id: project.teamId } })
  await prisma.auditLog.create({
    data: {
      userId: actorId,
      workspaceId: team?.workspaceId,
      projectId: id,
      action: "project.archived",
      entity: "project",
      entityId: id,
    } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
  })

  if (team?.workspaceId) {
    await notifyWorkspace(team.workspaceId, {
      type: "project.archived",
      category: "PROJECT",
      priority: "NORMAL",
      title: `Project archived: ${project.name}`,
      message: `The project was archived`,
      actorId,
      entityId: id,
      entityType: "project",
      link: `/projects/${id}`,
      excludeUserId: actorId,
    })
  }

  return project
}

export async function restoreProject(id: string, actorId: string) {
  const project = await prisma.project.update({
    where: { id },
    data: { deletedAt: null },
  })

  const team = await prisma.team.findUnique({ where: { id: project.teamId } })
  await prisma.auditLog.create({
    data: {
      userId: actorId,
      workspaceId: team?.workspaceId,
      projectId: id,
      action: "project.restored",
      entity: "project",
      entityId: id,
    } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
  })

  if (team?.workspaceId) {
    await notifyWorkspace(team.workspaceId, {
      type: "project.restored",
      category: "PROJECT",
      priority: "NORMAL",
      title: `Project restored: ${project.name}`,
      message: `The project was restored`,
      actorId,
      entityId: id,
      entityType: "project",
      link: `/projects/${id}`,
      excludeUserId: actorId,
    })
  }

  return project
}

export async function duplicateProject(id: string, actorId: string) {
  const original = await prisma.project.findUnique({
    where: { id },
    include: { tasks: true },
  })
  if (!original) throw new Error("Project not found")

  const newProject = await prisma.project.create({
    data: {
      name: `${original.name} (copy)`,
      slug: `${original.slug}-copy`,
      description: original.description,
      color: original.color,
      icon: original.icon,
      teamId: original.teamId,
      ownerId: actorId,
    },
  })

  await prisma.projectMember.create({
    data: { userId: actorId, projectId: newProject.id, role: "OWNER" },
  })

  for (const task of original.tasks) {
    if (task.deletedAt) continue
    await prisma.task.create({
      data: {
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        projectId: newProject.id,
        sortOrder: task.sortOrder,
      },
    })
  }

  const team = await prisma.team.findUnique({ where: { id: original.teamId } })
  await prisma.auditLog.create({
    data: {
      userId: actorId,
      workspaceId: team?.workspaceId,
      projectId: newProject.id,
      action: "project.duplicated",
      entity: "project",
      entityId: newProject.id,
      metadata: { sourceId: id },
    } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
  })

  return newProject
}

export async function getProjectStats(projectId: string, userId?: string, userRole?: string) {
  const baseWhere: Record<string, unknown> = { projectId, deletedAt: null }
  if (userId && userRole && !canViewAllTasks(userRole as WorkspaceRole)) {
    baseWhere.OR = [{ assigneeId: userId }, { reporterId: userId }]
  }
  const [total, byStatus, byPriority] = await Promise.all([
    prisma.task.count({ where: baseWhere }),
    prisma.task.groupBy({
      by: ["status"],
      where: baseWhere,
      _count: true,
    }),
    prisma.task.groupBy({
      by: ["priority"],
      where: baseWhere,
      _count: true,
    }),
  ])

  return { total, byStatus, byPriority }
}

export async function toggleFavorite(id: string) {
  const project = await prisma.project.findUnique({ where: { id } })
  if (!project) throw new Error("Project not found")
  return prisma.project.update({
    where: { id },
    data: { favorite: !project.favorite },
  })
}
