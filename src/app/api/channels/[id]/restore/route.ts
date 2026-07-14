import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getChannelById, restoreChannel } from "@/services/channel"
import { hasPermission } from "@/config/permissions"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const channel = await getChannelById(id)
    if (!channel) {
      return NextResponse.json({ success: false, error: "Channel not found" }, { status: 404 })
    }

    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: session.user.id, workspaceId: channel.workspaceId } },
    })
    if (!member || !hasPermission(member.role, "channel:archive")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const updated = await restoreChannel(id, session.user.id)
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("Error restoring channel:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
