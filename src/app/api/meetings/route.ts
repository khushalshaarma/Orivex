import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createMeeting, getMeetingsByWorkspace } from "@/services/meeting"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get("workspaceId")

  if (!workspaceId) {
    return NextResponse.json({ success: false, error: "workspaceId required" }, { status: 400 })
  }

  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId } },
  })
  if (!member) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  try {
    const meetings = await getMeetingsByWorkspace(workspaceId)
    return NextResponse.json({ success: true, data: meetings })
  } catch (error) {
    console.error("Error fetching meetings:", error)
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
    const { title, date, time, description, duration, workspaceId, memberIds, meetingProvider } = body

    if (!title || !date || !time) {
      return NextResponse.json({ success: false, error: "Title, date, and time are required" }, { status: 400 })
    }

    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: session.user.id, workspaceId } },
    })
    if (!member) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const meeting = await createMeeting({
      title,
      date,
      time,
      description,
      duration,
      workspaceId,
      creatorId: session.user.id,
      memberIds,
      meetingProvider,
    })

    return NextResponse.json({ success: true, data: meeting }, { status: 201 })
  } catch (error) {
    console.error("Error creating meeting:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
