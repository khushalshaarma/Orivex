import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getProjectStats } from "@/services/project"
import { prisma } from "@/lib/prisma"
import type { WorkspaceRole } from "@/config/permissions"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { id } = await params
    const project = await prisma.project.findUnique({
      where: { id },
      select: { team: { select: { workspaceId: true } } },
    })
    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 })
    }
    const wsId = project.team?.workspaceId
    let role: WorkspaceRole = "GUEST"
    if (wsId) {
      const member = await prisma.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId: session.user.id, workspaceId: wsId } },
      })
      role = (member?.role ?? "GUEST") as WorkspaceRole
    }
    const stats = await getProjectStats(id, session.user.id, role)
    return NextResponse.json({ success: true, data: stats })
  } catch (error) {
    console.error("Error getting project stats:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
