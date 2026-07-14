import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getMeetingById, cancelMeeting } from "@/services/meeting"
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
      return NextResponse.json({ success: false, error: "Only the host or an admin can cancel meetings" }, { status: 403 })
    }

    if (meeting.status === "ENDED") {
      return NextResponse.json({ success: false, error: "Cannot cancel a meeting that has already ended" }, { status: 400 })
    }

    if (meeting.status === "CANCELLED") {
      return NextResponse.json({ success: false, error: "Meeting is already cancelled" }, { status: 400 })
    }

    const updated = await cancelMeeting(id)
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("Error cancelling meeting:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
