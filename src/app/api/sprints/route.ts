import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getSprintsByProject, createSprint } from "@/services/sprint"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")
    if (!projectId) {
      return NextResponse.json({ success: false, error: "projectId is required" }, { status: 400 })
    }
    const sprints = await getSprintsByProject(projectId)
    return NextResponse.json({ success: true, data: sprints })
  } catch (error) {
    console.error("Error listing sprints:", error)
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
    const { name, goal, startDate, endDate, projectId, workspaceId } = body

    if (!name || !projectId) {
      return NextResponse.json({ success: false, error: "Name and projectId are required" }, { status: 400 })
    }

    const sprint = await createSprint({ name, goal, startDate, endDate, projectId, workspaceId })

    return NextResponse.json({ success: true, data: sprint }, { status: 201 })
  } catch (error) {
    console.error("Error creating sprint:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
