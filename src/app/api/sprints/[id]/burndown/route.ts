import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getSprintBurndown } from "@/services/sprint"
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

    const burndown = await getSprintBurndown(id, session.user.id, role)
    return NextResponse.json({ success: true, data: burndown })
  } catch (error) {
    console.error("Error getting sprint burndown:", error)
    const message = error instanceof Error ? error.message : "Internal server error"
    const status = message === "Sprint not found" ? 404 : 500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
