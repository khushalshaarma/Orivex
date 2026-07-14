import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getMeetingById, endMeeting } from "@/services/meeting"
import { hasPermission } from "@/config/permissions"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const meeting = await getMeetingById(id)
    if (!meeting) {
      return NextResponse.json({ success: false, error: "Meeting not found" }, { status: 404 })
    }

    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: session.user.id, workspaceId: meeting.workspaceId } },
    })
    if (!member || !hasPermission(member.role, "project:update")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    if (meeting.creatorId !== session.user.id && member.role !== "OWNER" && member.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Only the host or an admin can end meetings" }, { status: 403 })
    }

    if (meeting.status !== "LIVE") {
      return NextResponse.json({ success: false, error: "Meeting is not live" }, { status: 400 })
    }

    const updated = await endMeeting(id)
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("Error ending meeting:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
