import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/config/permissions"
import type { WorkspaceRole } from "@/config/permissions"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { updates } = body

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ success: false, error: "updates array is required" }, { status: 400 })
    }

    const firstUpdate = updates[0]
    const task = await prisma.task.findUnique({
      where: { id: firstUpdate.id, deletedAt: null },
      include: { project: { include: { team: true } } },
    })
    if (!task) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 })
    }

    const workspaceId = task.project.team?.workspaceId
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "No workspace" }, { status: 400 })
    }

    const workspaceMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: session.user.id, workspaceId } },
    })
    if (!workspaceMember) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const role = workspaceMember.role as WorkspaceRole
    const canDragAll = hasPermission(role, "task:update")
    const canDragOwn = role === "DEVELOPER"

    if (!canDragAll && !canDragOwn) {
      return NextResponse.json({ success: false, error: "Forbidden: You cannot move tasks" }, { status: 403 })
    }

    if (canDragOwn) {
      const taskIds = updates.map((u: { id: string }) => u.id)
      const ownedTasks = await prisma.task.count({
        where: { id: { in: taskIds }, assigneeId: session.user.id },
      })
      if (ownedTasks !== taskIds.length) {
        return NextResponse.json({ success: false, error: "Forbidden: You can only move your own tasks" }, { status: 403 })
      }
    }

    await prisma.$transaction(
      updates.map((u: { id: string; status: string; sortOrder: number }) =>
        prisma.task.update({
          where: { id: u.id },
          data: { status: u.status, sortOrder: u.sortOrder },
        })
      )
    )

    try {
      const { getIO } = await import("@/lib/socket-server")
      const io = getIO()
      if (io) {
        const safeUpdates = updates.map((u: { id: string; status: string }) => ({ id: u.id, status: u.status }))
        io.to(`workspace:${workspaceId}`).emit("task:moved", { updates: safeUpdates, userId: session.user.id })
      }
    } catch {}

    return NextResponse.json({ success: true, data: null })
  } catch (error) {
    console.error("Error reordering tasks:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
