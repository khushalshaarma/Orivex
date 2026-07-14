import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getMeetingById, startMeeting } from "@/services/meeting"
import { hasPermission } from "@/config/permissions"
import { triggerNotification } from "@/services/notification"

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
      return NextResponse.json({ success: false, error: "Only the host or an admin can start meetings" }, { status: 403 })
    }

    if (meeting.status === "LIVE") {
      return NextResponse.json({ success: false, error: "Meeting is already live" }, { status: 400 })
    }

    if (meeting.status === "ENDED" || meeting.status === "CANCELLED") {
      return NextResponse.json({ success: false, error: "Cannot start a meeting that has ended or been cancelled" }, { status: 400 })
    }

    const updated = await startMeeting(id)

    const creator = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    })

    const link = meeting.meetingLink || `/meetings/${id}`

    for (const m of meeting.members) {
      if (m.userId === session.user.id) continue
      await triggerNotification({
        userId: m.userId,
        workspaceId: meeting.workspaceId,
        type: "meeting.started",
        category: "WORKSPACE",
        priority: "URGENT",
        title: `Meeting started: ${meeting.title}`,
        message: `${creator?.name ?? "The host"} has started the meeting. Join now!`,
        actorId: session.user.id,
        entityId: id,
        entityType: "meeting",
        link: meeting.meetingProvider === "collab" ? `/meetings/${id}` : link,
      })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("Error starting meeting:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
