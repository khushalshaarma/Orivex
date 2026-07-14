import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getMeetingById, addMeetingMember } from "@/services/meeting"

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
    if (!member) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    await addMeetingMember(id, session.user.id)
    return NextResponse.json({ success: true, data: { meetingId: id, userId: session.user.id } })
  } catch (error) {
    console.error("Error joining meeting:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
