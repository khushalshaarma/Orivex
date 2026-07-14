import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getComments, addComment } from "@/services/task"
import { triggerNotification } from "@/services/notification"
import { prisma } from "@/lib/prisma"
import { canViewAllTasks } from "@/config/permissions"
import type { WorkspaceRole } from "@/config/permissions"

async function checkCommentAccess(userId: string, taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId, deletedAt: null },
    select: { id: true, assigneeId: true, reporterId: true, project: { select: { team: { select: { workspaceId: true } } } } },
  })
  if (!task) return false
  const wsId = task.project?.team?.workspaceId
  if (!wsId) return false
  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId: wsId } },
  })
  if (!member) return false
  const role = member.role as WorkspaceRole
  if (canViewAllTasks(role)) return true
  return task.assigneeId === userId || task.reporterId === userId
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const hasAccess = await checkCommentAccess(session.user.id, id)
    if (!hasAccess) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const comments = await getComments(id)
    return NextResponse.json({ success: true, data: comments })
  } catch (error) {
    console.error("Error getting comments:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const hasAccess = await checkCommentAccess(session.user.id, id)
    if (!hasAccess) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { content } = body

    if (!content) {
      return NextResponse.json({ success: false, error: "Content is required" }, { status: 400 })
    }
    const comment = await addComment(id, session.user.id, content)

    try {
      const task2 = await prisma.task.findUnique({
        where: { id },
        select: { title: true, assigneeId: true, reporterId: true, projectId: true },
      })
      const author = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } })
      const task = task2
      if (task) {
        const team = await prisma.project.findUnique({
          where: { id: task.projectId },
          select: { team: { select: { workspaceId: true } } },
        })
        const recipient = task.assigneeId ?? task.reporterId
        if (recipient && recipient !== session.user.id) {
          await triggerNotification({
            userId: recipient,
            workspaceId: team?.team?.workspaceId ?? undefined,
            type: "comment",
            category: "COMMENT",
            priority: "NORMAL",
            title: `New comment on "${task.title}"`,
            message: content.slice(0, 200),
            actorId: session.user.id,
            entityId: id,
            entityType: "task",
            link: `/tasks?task=${id}`,
          })
        }
      }
    } catch {
      // comment notification is best-effort
    }

    try {
      const { getIO } = await import("@/lib/socket-server")
      const io = getIO()
      if (io) {
        const task2 = await prisma.task.findUnique({
          where: { id },
          select: { assigneeId: true, reporterId: true, project: { select: { team: { select: { workspaceId: true } } } } },
        })
        if (task2?.project?.team?.workspaceId) {
          io.to(`workspace:${task2.project.team.workspaceId}`).emit("task:comment", {
            taskId: id,
          })
        }
      }
    } catch {}

    return NextResponse.json({ success: true, data: comment }, { status: 201 })
  } catch (error) {
    console.error("Error adding comment:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
