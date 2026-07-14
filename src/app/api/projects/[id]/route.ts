import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getProjectById, updateProject, archiveProject } from "@/services/project"

async function checkProjectAccess(userId: string, projectId: string): Promise<{ allowed: boolean; role?: string }> {
  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
  })
  if (member) return { allowed: true, role: member.role }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { team: { select: { workspaceId: true } } },
  })
  if (!project) return { allowed: false }

  const teamMember = await prisma.teamMember.findUnique({
    where: { userId_teamId: { userId, teamId: project.teamId } },
  })
  if (teamMember) return { allowed: true, role: "MEMBER" }

  if (project.team?.workspaceId) {
    const workspaceMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: project.team.workspaceId } },
    })
    if (workspaceMember) return { allowed: true, role: workspaceMember.role }
  }

  return { allowed: false }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { id } = await params
    const { allowed } = await checkProjectAccess(session.user.id, id)
    if (!allowed) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }
    const project = await getProjectById(id)
    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: project })
  } catch (error) {
    console.error("Error getting project:", error)
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
    const { allowed } = await checkProjectAccess(session.user.id, id)
    if (!allowed) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }
    const body = await request.json()
    const project = await updateProject(id, body, session.user.id)
    return NextResponse.json({ success: true, data: project })
  } catch (error) {
    console.error("Error updating project:", error)
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
    const { allowed } = await checkProjectAccess(session.user.id, id)
    if (!allowed) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }
    const project = await archiveProject(id, session.user.id)
    return NextResponse.json({ success: true, data: project })
  } catch (error) {
    console.error("Error archiving project:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
