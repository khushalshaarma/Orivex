import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canViewAllTasks } from "@/config/permissions"
import type { WorkspaceRole } from "@/config/permissions"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get("workspaceId")
  const query = searchParams.get("q")

  if (!workspaceId || !query) {
    return NextResponse.json({ success: false, error: "workspaceId and q are required" }, { status: 400 })
  }

  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId } },
  })
  if (!member) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const role = member.role as WorkspaceRole
  const taskWhere: Record<string, unknown> = {
    project: { team: { workspaceId } },
    deletedAt: null,
    title: { contains: query, mode: "insensitive" },
  }
  if (!canViewAllTasks(role)) {
    taskWhere.OR = [{ assigneeId: session.user.id }, { reporterId: session.user.id }]
  }

  try {
    const [projects, tasks, members, channels, messages, meetings] = await Promise.all([
      prisma.project.findMany({
        where: {
          team: { workspaceId },
          deletedAt: null,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: { id: true, name: true, color: true, icon: true },
      }),
      prisma.task.findMany({
        where: taskWhere,
        take: 5,
        select: { id: true, title: true, status: true, priority: true, projectId: true },
      }),
      prisma.workspaceMember.findMany({
        where: {
          workspaceId,
          user: {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          },
        },
        take: 5,
        select: { user: { select: { id: true, name: true, image: true, email: true } } },
      }),
      prisma.channel.findMany({
        where: {
          workspaceId,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: { id: true, name: true, slug: true },
      }),
      prisma.message.findMany({
        where: { workspaceId, content: { contains: query, mode: "insensitive" }, deleted: false },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, content: true, createdAt: true, sender: { select: { id: true, name: true } } },
      }),
      prisma.meeting.findMany({
        where: {
          workspaceId,
          title: { contains: query, mode: "insensitive" },
        },
        take: 5,
        select: { id: true, title: true, date: true, time: true },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        projects,
        tasks,
        members: members.map((m) => m.user),
        channels,
        messages,
        meetings,
      },
    })
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
