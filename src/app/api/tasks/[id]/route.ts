import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getTaskById, updateTask, deleteTask } from "@/services/task"
import { hasPermission, canViewAllTasks } from "@/config/permissions"
import type { WorkspaceRole } from "@/config/permissions"

async function checkTaskAccess(userId: string, taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId, deletedAt: null },
    include: {
      project: { include: { team: true } },
    },
  })
  if (!task) return { task: null, allowed: false, role: "GUEST" as WorkspaceRole, workspaceId: null }

  const project = task.project
  const workspaceId = project.team?.workspaceId ?? null

  if (!workspaceId) return { task, allowed: false, role: "GUEST" as WorkspaceRole, workspaceId: null }

  const workspaceMember = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  })
  if (!workspaceMember) return { task, allowed: false, role: "GUEST" as WorkspaceRole, workspaceId }

  const role = workspaceMember.role as WorkspaceRole

  if (!canViewAllTasks(role) && task.assigneeId !== userId && task.reporterId !== userId) {
    return { task: null, allowed: false, role, workspaceId }
  }

  return { task, allowed: true, role, workspaceId }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const { task, allowed } = await checkTaskAccess(session.user.id, id)
    if (!allowed) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }
    if (!task) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 })
    }
    const fullTask = await getTaskById(id)
    return NextResponse.json({ success: true, data: fullTask })
  } catch (error) {
    console.error("Error getting task:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const { task, allowed, role, workspaceId } = await checkTaskAccess(session.user.id, id)
    if (!allowed) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }
    if (!task) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 })
    }

    const body = await request.json()
    const canUpdate = hasPermission(role, "task:update") || (role === "DEVELOPER" && task.assigneeId === session.user.id)
    if (!canUpdate) {
      return NextResponse.json({ success: false, error: "Forbidden: You don't have permission to update this task" }, { status: 403 })
    }

    const updated = await updateTask(id, body, session.user.id)

    if (workspaceId) {
      try {
        const { getIO, broadcastToUser } = await import("@/lib/socket-server")
        const io = getIO()
        if (io) {
          const safePayload = { id: updated.id, projectId: updated.projectId, assigneeId: updated.assigneeId, reporterId: updated.reporterId }
          io.to(`workspace:${workspaceId}`).emit("task:updated", { id: updated.id })
          if (updated.assigneeId) broadcastToUser(updated.assigneeId, "task:updated", safePayload)
          if (updated.reporterId && updated.reporterId !== updated.assigneeId) broadcastToUser(updated.reporterId, "task:updated", safePayload)
        }
      } catch {}
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("Error updating task:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const { task, allowed, role, workspaceId } = await checkTaskAccess(session.user.id, id)
    if (!allowed) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }
    if (!task) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 })
    }

    if (!hasPermission(role, "task:delete")) {
      return NextResponse.json({ success: false, error: "Forbidden: You don't have permission to delete tasks" }, { status: 403 })
    }

    await deleteTask(id)

    if (workspaceId) {
      try {
        const { getIO } = await import("@/lib/socket-server")
        const io = getIO()
        if (io) {
          io.to(`workspace:${workspaceId}`).emit("task:deleted", { id })
        }
      } catch {}
    }

    return NextResponse.json({ success: true, data: null })
  } catch (error) {
    console.error("Error deleting task:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
