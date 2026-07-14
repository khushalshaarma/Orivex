import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getSprintById, updateSprint, deleteSprint } from "@/services/sprint"
import { prisma } from "@/lib/prisma"
import type { WorkspaceRole } from "@/config/permissions"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const sprint = await prisma.sprint.findUnique({
      where: { id, deletedAt: null },
      select: { project: { select: { team: { select: { workspaceId: true } } } } },
    })

    if (!sprint) {
      return NextResponse.json({ success: false, error: "Sprint not found" }, { status: 404 })
    }

    const wsId = sprint.project?.team?.workspaceId
    let role: WorkspaceRole = "GUEST"
    if (wsId) {
      const member = await prisma.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId: session.user.id, workspaceId: wsId } },
      })
      role = (member?.role ?? "GUEST") as WorkspaceRole
    }

    const sprintWithTasks = await getSprintById(id, session.user.id, role)
    return NextResponse.json({ success: true, data: sprintWithTasks })
  } catch (error) {
    console.error("Error getting sprint:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()

    const sprint = await updateSprint(id, body)

    return NextResponse.json({ success: true, data: sprint })
  } catch (error) {
    console.error("Error updating sprint:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    await deleteSprint(id)

    return NextResponse.json({ success: true, data: null })
  } catch (error) {
    console.error("Error deleting sprint:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
