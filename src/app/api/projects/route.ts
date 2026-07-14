import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getProjectsByWorkspace, createProject } from "@/services/project"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "workspaceId is required" }, { status: 400 })
    }
    const projects = await getProjectsByWorkspace(workspaceId)
    return NextResponse.json({ success: true, data: projects })
  } catch (error) {
    console.error("Error listing projects:", error)
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
    let { teamId } = body
    const { name, slug, description, color, icon, workspaceId, visibility, startDate, dueDate } = body

    if (!name || !slug) {
      return NextResponse.json({ success: false, error: "Name and slug are required" }, { status: 400 })
    }

    if (!teamId && workspaceId) {
      const team = await prisma.team.findFirst({
        where: { workspaceId, deletedAt: null },
        orderBy: { createdAt: "asc" },
      })
      if (team) teamId = team.id
    }

    if (!teamId) {
      return NextResponse.json({ success: false, error: "No team available. Create a team first." }, { status: 400 })
    }

    const project = await createProject({
      name,
      slug,
      description,
      color,
      icon,
      teamId,
      ownerId: session.user.id,
      visibility,
      startDate: startDate || null,
      dueDate: dueDate || null,
    })

    return NextResponse.json({ success: true, data: project }, { status: 201 })
  } catch (error) {
    console.error("Error creating project:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
