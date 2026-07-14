import { prisma } from "@/lib/prisma"
import { triggerNotification } from "@/services/notification"
import type { WorkspaceRole } from "@/config/permissions"
import { canViewAllTasks } from "@/config/permissions"

interface CreateTaskData {
  title: string
  description?: string
  status?: string
  priority?: string
  labels?: string[]
  estimatedTime?: number
  storyPoints?: number
  assigneeId?: string | null
  reporterId?: string | null
  projectId: string
  parentId?: string | null
  sprintId?: string | null
  startDate?: string | null
  dueDate?: string | null
}

interface UpdateTaskData {
  title?: string
  description?: string | null
  status?: string
  priority?: string
  labels?: string[]
  estimatedTime?: number | null
  timeSpent?: number | null
  storyPoints?: number | null
  assigneeId?: string | null
  reporterId?: string | null
  parentId?: string | null
  sprintId?: string | null
  startDate?: string | null
  dueDate?: string | null
  sortOrder?: number
}

export async function getTaskById(id: string, userId?: string, userRole?: string) {
  const where: Record<string, unknown> = { id, deletedAt: null }
  if (userId && userRole && !canViewAllTasks(userRole as WorkspaceRole)) {
    where.OR = [{ assigneeId: userId }, { reporterId: userId }]
  }
  return prisma.task.findFirst({
    where,
    include: {
      assignee: { select: { id: true, name: true, image: true, email: true } },
      reporter: { select: { id: true, name: true, image: true } },
      project: { select: { id: true, name: true, color: true } },
      sprint: { select: { id: true, name: true, status: true } },
      parent: { select: { id: true, title: true, status: true } },
      children: {
        where: { deletedAt: null },
        orderBy: { sortOrder: "asc" },
        include: {
          assignee: { select: { id: true, name: true, image: true } },
        },
      },
      comments: {
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
      },
      checklists: { orderBy: { sortOrder: "asc" } },
      attachments: { orderBy: { createdAt: "desc" } },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
      },
    },
  })
}

export async function getTasksByProject(projectId: string, userId?: string, userRole?: string) {
  const baseWhere: Record<string, unknown> = { projectId, parentId: null, deletedAt: null }
  if (userId && userRole && !canViewAllTasks(userRole as WorkspaceRole)) {
    baseWhere.OR = [{ assigneeId: userId }, { reporterId: userId }]
  }
  return prisma.task.findMany({
    where: baseWhere,
    include: {
      assignee: { select: { id: true, name: true, image: true } },
      children: {
        where: { deletedAt: null },
        select: { id: true, title: true, status: true, assigneeId: true },
      },
      _count: { select: { comments: true, attachments: true, checklists: true, dependencies: true } },
    },
    orderBy: { sortOrder: "asc" },
  })
}

export async function getTasksByWorkspace(workspaceId: string, options?: { status?: string; assigneeId?: string; limit?: number }, userId?: string, userRole?: string) {
  const baseWhere: Record<string, unknown> = {
    project: { team: { workspaceId } },
    deletedAt: null,
    ...(options?.status ? { status: options.status } : {}),
    ...(options?.assigneeId ? { assigneeId: options.assigneeId } : {}),
  }
  if (userId && userRole && !canViewAllTasks(userRole as WorkspaceRole) && !options?.assigneeId) {
    baseWhere.OR = [{ assigneeId: userId }, { reporterId: userId }]
  }
  return prisma.task.findMany({
    where: baseWhere,
    include: {
      assignee: { select: { id: true, name: true, image: true } },
      project: { select: { id: true, name: true, color: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: options?.limit ?? 50,
  })
}

export async function getMyTasks(userId: string, workspaceId: string) {
  return prisma.task.findMany({
    where: {
      assigneeId: userId,
      project: { team: { workspaceId } },
      deletedAt: null,
      status: { notIn: ["done", "cancelled"] },
    },
    include: {
      project: { select: { id: true, name: true, color: true } },
    },
    orderBy: [{ dueDate: "asc" }, { priority: "asc" }],
    take: 20,
  })
}

export async function createTask(data: CreateTaskData) {
  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description,
      status: data.status ?? "backlog",
      priority: data.priority ?? "medium",
      labels: data.labels ?? [],
      estimatedTime: data.estimatedTime,
      storyPoints: data.storyPoints,
      assigneeId: data.assigneeId,
      reporterId: data.reporterId ?? data.assigneeId,
      projectId: data.projectId,
      parentId: data.parentId,
      sprintId: data.sprintId,
      startDate: data.startDate ? new Date(data.startDate) : null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    },
    include: {
      assignee: { select: { id: true, name: true, image: true } },
      project: { select: { id: true, name: true } },
    },
  })

  const project = await prisma.project.findUnique({ where: { id: data.projectId } })
  if (project) {
    const team = await prisma.team.findUnique({ where: { id: project.teamId } })
    await prisma.auditLog.create({
      data: {
        workspaceId: team?.workspaceId,
        projectId: data.projectId,
        taskId: task.id,
        action: "task.created",
        entity: "task",
        entityId: task.id,
        metadata: { title: data.title },
      } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    })

    if (data.assigneeId && data.assigneeId !== (data.reporterId ?? data.assigneeId)) {
      await triggerNotification({
        userId: data.assigneeId,
        workspaceId: team?.workspaceId ?? undefined,
        type: "task.assigned",
        category: "TASK",
        priority: "NORMAL",
        title: `You were assigned a task`,
        message: data.title,
        actorId: data.reporterId ?? data.assigneeId,
        entityId: task.id,
        entityType: "task",
        link: `/tasks?task=${task.id}`,
      })
    }
  }

  return task
}

export async function updateTask(id: string, data: UpdateTaskData, actorId?: string) {
  const previous = await prisma.task.findUnique({
    where: { id },
    select: { assigneeId: true, status: true, projectId: true, title: true, priority: true },
  })

  const updateData: Record<string, unknown> = {}
  if (data.title !== undefined) updateData.title = data.title
  if (data.description !== undefined) updateData.description = data.description
  if (data.status !== undefined) updateData.status = data.status
  if (data.priority !== undefined) updateData.priority = data.priority
  if (data.labels !== undefined) updateData.labels = data.labels
  if (data.estimatedTime !== undefined) updateData.estimatedTime = data.estimatedTime
  if (data.timeSpent !== undefined) updateData.timeSpent = data.timeSpent
  if (data.storyPoints !== undefined) updateData.storyPoints = data.storyPoints
  if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId
  if (data.reporterId !== undefined) updateData.reporterId = data.reporterId
  if (data.parentId !== undefined) updateData.parentId = data.parentId
  if (data.sprintId !== undefined) updateData.sprintId = data.sprintId
  if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder

  const task = await prisma.task.update({
    where: { id },
    data: updateData,
    include: {
      assignee: { select: { id: true, name: true, image: true } },
      project: { select: { id: true, name: true, team: { select: { workspaceId: true } } } },
    },
  })

  const workspaceId = task.project.team?.workspaceId ?? undefined

  // Audit log for task update
  if (actorId && workspaceId) {
    const changedFields = Object.keys(data).filter((k) => k !== 'sortOrder')
    if (changedFields.length > 0) {
      await prisma.auditLog.create({
        data: {
          userId: actorId,
          workspaceId,
          projectId: task.projectId,
          taskId: id,
          action: "task.updated",
          entity: "task",
          entityId: id,
          metadata: { changes: data as any }, // eslint-disable-line @typescript-eslint/no-explicit-any
        },
      }).catch(() => {})
    }
  }

  // Task assigned / reassigned
  if (
    data.assigneeId !== undefined &&
    data.assigneeId !== previous?.assigneeId &&
    data.assigneeId &&
    previous?.assigneeId !== data.assigneeId
  ) {
    await triggerNotification({
      userId: data.assigneeId,
      workspaceId,
      type: "task.assigned",
      category: "TASK",
      priority: "NORMAL",
      title: `You were assigned a task`,
      message: task.title,
      actorId,
      entityId: id,
      entityType: "task",
      link: `/tasks?task=${id}`,
    })
  }

  // Task completed
  if (data.status === "done" && previous?.status !== "done") {
    const completedAssignee = task.assigneeId ?? previous?.assigneeId
    if (completedAssignee) {
      await triggerNotification({
        userId: completedAssignee,
        workspaceId,
        type: "task.completed",
        category: "TASK",
        priority: "LOW",
        title: `Task completed: ${task.title}`,
        message: `The task was marked as done`,
        actorId,
        entityId: id,
        entityType: "task",
        link: `/tasks?task=${id}`,
      }).catch(() => {})
    }
  }

  // Task status changed
  if (data.status && data.status !== previous?.status && previous?.status) {
    const assignee = task.assigneeId ?? previous?.assigneeId
    if (assignee && assignee !== actorId) {
      await triggerNotification({
        userId: assignee,
        workspaceId,
        type: "task.status_changed",
        category: "TASK",
        priority: "NORMAL",
        title: `Task status changed: ${task.title}`,
        message: `Moved from ${previous.status.replace("_", " ")} to ${data.status.replace("_", " ")}`,
        actorId,
        entityId: id,
        entityType: "task",
        link: `/tasks?task=${id}`,
      }).catch(() => {})
    }
  }

  return task
}

export async function deleteTask(id: string) {
  return prisma.task.update({
    where: { id },
    data: { deletedAt: new Date() },
  })
}

export async function reorderTasks(updates: { id: string; status: string; sortOrder: number }[]) {
  const transactions = updates.map((u) =>
    prisma.task.update({
      where: { id: u.id },
      data: { status: u.status, sortOrder: u.sortOrder },
    })
  )
  await prisma.$transaction(transactions)
}

export async function addComment(taskId: string, userId: string, content: string) {
  return prisma.taskComment.create({
    data: { taskId, userId, content },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  })
}

export async function getComments(taskId: string) {
  return prisma.taskComment.findMany({
    where: { taskId },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function addChecklistItem(taskId: string, title: string) {
  const maxOrder = await prisma.checklistItem.aggregate({
    where: { taskId },
    _max: { sortOrder: true },
  })
  return prisma.checklistItem.create({
    data: { taskId, title, sortOrder: (maxOrder._max.sortOrder ?? 0) + 1 },
  })
}

export async function updateChecklistItem(id: string, data: { title?: string; completed?: boolean }) {
  return prisma.checklistItem.update({ where: { id }, data })
}

export async function deleteChecklistItem(id: string) {
  return prisma.checklistItem.delete({ where: { id } })
}

export async function addAttachment(data: {
  name: string
  url: string
  type: string
  size: number
  taskId?: string
  projectId?: string
  uploadedById: string
}) {
  return prisma.attachment.create({ data })
}

export async function getAttachments(taskId: string) {
  return prisma.attachment.findMany({
    where: { taskId },
    orderBy: { createdAt: "desc" },
  })
}
