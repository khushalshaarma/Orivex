import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  getTasksByProject,
  getTasksByWorkspace,
  getMyTasks,
  createTask,
} from "@/services/task"
import { hasPermission } from "@/config/permissions"
import type { WorkspaceRole } from "@/config/permissions"

async function getWorkspaceRole(userId: string, workspaceId: string): Promise<WorkspaceRole> {
  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  })
  return (member?.role ?? "GUEST") as WorkspaceRole
}

async function getProjectWorkspaceId(projectId: string): Promise<string | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { team: { select: { workspaceId: true } } },
  })
  return project?.team?.workspaceId ?? null
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")
    const workspaceId = searchParams.get("workspaceId")
    const status = searchParams.get("status")
    const assigneeId = searchParams.get("assigneeId")
    const my = searchParams.get("my")

    if (my === "true") {
      if (!workspaceId) {
        return NextResponse.json({ success: false, error: "workspaceId is required when my=true" }, { status: 400 })
      }
      const tasks = await getMyTasks(session.user.id, workspaceId)
      return NextResponse.json({ success: true, data: tasks })
    }

    if (projectId) {
      const wsId = await getProjectWorkspaceId(projectId)
      if (!wsId) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
      }
      const role = await getWorkspaceRole(session.user.id, wsId)
      if (!hasPermission(role, "task:view")) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
      }
      const tasks = await getTasksByProject(projectId, session.user.id, role)
      return NextResponse.json({ success: true, data: tasks })
    }

    if (workspaceId) {
      const role = await getWorkspaceRole(session.user.id, workspaceId)
      if (!hasPermission(role, "task:view")) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
      }
      const tasks = await getTasksByWorkspace(workspaceId, { status: status ?? undefined, assigneeId: assigneeId ?? undefined }, session.user.id, role)
      return NextResponse.json({ success: true, data: tasks })
    }

    return NextResponse.json({ success: false, error: "Provide projectId, workspaceId, or my=true" }, { status: 400 })
  } catch (error) {
    console.error("Error listing tasks:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title, description, status, priority, labels, estimatedTime, storyPoints, startDate, assigneeId, reporterId, projectId, parentId, sprintId, dueDate } = body

    if (!title || !projectId) {
      return NextResponse.json({ success: false, error: "Title and projectId are required" }, { status: 400 })
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 })
    }

    const team = await prisma.team.findUnique({ where: { id: project.teamId } })
    if (!team?.workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 })
    }

    const workspaceMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: session.user.id, workspaceId: team.workspaceId } },
    })
    const userRole = (workspaceMember?.role ?? "GUEST") as WorkspaceRole
    if (!hasPermission(userRole, "task:create")) {
      return NextResponse.json({ success: false, error: "Forbidden: You don't have permission to create tasks" }, { status: 403 })
    }

    const task = await createTask({
      title,
      description,
      status,
      priority,
      labels,
      estimatedTime,
      storyPoints,
      startDate,
      assigneeId,
      reporterId,
      projectId,
      parentId,
      sprintId,
      dueDate,
    })

    if (team.workspaceId) {
      try {
        const { getIO, broadcastToUser } = await import("@/lib/socket-server")
        const io = getIO()
        if (io) {
          const safePayload = { id: task.id, projectId: task.projectId, assigneeId: task.assigneeId, reporterId: task.reporterId }
          io.to(`workspace:${team.workspaceId}`).emit("task:created", { id: task.id })
          if (task.assigneeId) broadcastToUser(task.assigneeId, "task:created", safePayload)
          if (task.reporterId && task.reporterId !== task.assigneeId) broadcastToUser(task.reporterId, "task:created", safePayload)
        }
      } catch {}
    }

    return NextResponse.json({ success: true, data: task }, { status: 201 })
  } catch (error) {
    console.error("Error creating task:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
