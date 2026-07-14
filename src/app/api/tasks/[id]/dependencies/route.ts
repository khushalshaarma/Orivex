import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getDependencies, getDependents, addDependency, removeDependency } from "@/services/task-dependency"
import { prisma } from "@/lib/prisma"
import { canViewAllTasks } from "@/config/permissions"
import type { WorkspaceRole } from "@/config/permissions"

async function checkDepAccess(userId: string, taskId: string): Promise<boolean> {
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
    const hasAccess = await checkDepAccess(session.user.id, id)
    if (!hasAccess) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const [dependencies, dependents] = await Promise.all([
      getDependencies(id),
      getDependents(id),
    ])
    return NextResponse.json({ success: true, data: { dependencies, dependents } })
  } catch (error) {
    console.error("Error getting dependencies:", error)
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
    const hasAccess = await checkDepAccess(session.user.id, id)
    if (!hasAccess) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { dependencyId } = body

    if (!dependencyId) {
      return NextResponse.json({ success: false, error: "dependencyId is required" }, { status: 400 })
    }

    const dep = await addDependency(id, dependencyId)
    return NextResponse.json({ success: true, data: dep }, { status: 201 })
  } catch (error) {
    console.error("Error adding dependency:", error)
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const dependencyId = searchParams.get("dependencyId")

    if (!dependencyId) {
      return NextResponse.json({ success: false, error: "dependencyId query param is required" }, { status: 400 })
    }

    await removeDependency(id, dependencyId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing dependency:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
