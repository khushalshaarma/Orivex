import { prisma } from "@/lib/prisma"
import { notifyWorkspace } from "@/services/notification"
import type { WorkspaceRole } from "@/config/permissions"
import { canViewAllTasks } from "@/config/permissions"

interface CreateSprintData {
  name: string
  goal?: string
  startDate?: string | null
  endDate?: string | null
  projectId: string
  workspaceId?: string | null
}

export async function getSprintById(id: string, userId?: string, userRole?: string) {
  const taskWhere: Record<string, unknown> = { deletedAt: null }
  if (userId && userRole && !canViewAllTasks(userRole as WorkspaceRole)) {
    taskWhere.OR = [{ assigneeId: userId }, { reporterId: userId }]
  }
  return prisma.sprint.findUnique({
    where: { id, deletedAt: null },
    include: {
      _count: { select: { tasks: true } },
      tasks: {
        where: taskWhere,
        include: {
          assignee: { select: { id: true, name: true, image: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  })
}

export async function getSprintsByProject(projectId: string) {
  return prisma.sprint.findMany({
    where: { projectId, deletedAt: null },
    include: {
      _count: { select: { tasks: true } },
    },
    orderBy: { startDate: "desc" },
  })
}

export async function createSprint(data: CreateSprintData) {
  return prisma.sprint.create({
    data: {
      name: data.name,
      goal: data.goal,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      projectId: data.projectId,
      workspaceId: data.workspaceId,
    },
  })
}

export async function updateSprint(id: string, data: Partial<CreateSprintData & { status: string; velocity: number }>) {
  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.goal !== undefined) updateData.goal = data.goal
  if (data.status !== undefined) updateData.status = data.status
  if (data.velocity !== undefined) updateData.velocity = data.velocity
  if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null
  if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null

  return prisma.sprint.update({ where: { id }, data: updateData })
}

export async function deleteSprint(id: string) {
  return prisma.sprint.update({
    where: { id },
    data: { deletedAt: new Date() },
  })
}

export async function startSprint(id: string, actorId?: string) {
  const sprint = await prisma.sprint.findUnique({ where: { id }, include: { project: { select: { name: true, team: { select: { workspaceId: true } } } } } })
  if (!sprint) throw new Error("Sprint not found")

  const taskCount = await prisma.task.count({
    where: { sprintId: id, deletedAt: null },
  })

  const result = await prisma.sprint.update({
    where: { id },
    data: { status: "active", velocity: taskCount },
  })

  const workspaceId = sprint.project.team?.workspaceId
  if (workspaceId) {
    await notifyWorkspace(workspaceId, {
      type: "sprint.started",
      category: "SPRINT",
      priority: "NORMAL",
      title: `Sprint started: ${sprint.name}`,
      message: `A new sprint is now active`,
      actorId,
      entityId: id,
      entityType: "sprint",
      link: `/sprints`,
      excludeUserId: actorId,
    })
  }

  return result
}

export async function completeSprint(id: string, actorId?: string) {
  const sprint = await prisma.sprint.findUnique({ where: { id }, include: { project: { select: { name: true, team: { select: { workspaceId: true } } } } } })
  const result = await prisma.sprint.update({
    where: { id },
    data: { status: "completed", endDate: new Date() },
  })

  const workspaceId = sprint?.project.team?.workspaceId
  if (workspaceId) {
    await notifyWorkspace(workspaceId, {
      type: "sprint.completed",
      category: "SPRINT",
      priority: "HIGH",
      title: `Sprint completed: ${sprint?.name}`,
      message: `The sprint has been completed`,
      actorId,
      entityId: id,
      entityType: "sprint",
      link: `/sprints`,
      excludeUserId: actorId,
    })
  }

  return result
}

export async function getSprintBurndown(sprintId: string, userId?: string, userRole?: string) {
  const taskWhere: Record<string, unknown> = { deletedAt: null }
  if (userId && userRole && !canViewAllTasks(userRole as WorkspaceRole)) {
    taskWhere.OR = [{ assigneeId: userId }, { reporterId: userId }]
  }
  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: {
      tasks: {
        where: taskWhere,
        select: { status: true, updatedAt: true },
      },
    },
  })
  if (!sprint) throw new Error("Sprint not found")

  const total = sprint.tasks.length
  const done = sprint.tasks.filter((t) => t.status === "done" || t.status === "testing").length

  return {
    total,
    completed: done,
    remaining: total - done,
    progress: total > 0 ? Math.round((done / total) * 100) : 0,
  }
}

export async function addTasksToSprint(sprintId: string, taskIds: string[]) {
  const updates = taskIds.map((id) =>
    prisma.task.update({
      where: { id },
      data: { sprintId },
    })
  )
  await prisma.$transaction(updates)
}
