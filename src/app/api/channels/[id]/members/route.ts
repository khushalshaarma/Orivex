import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getChannelById, getChannelMembers, addChannelMember } from "@/services/channel"
import { hasPermission } from "@/config/permissions"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const members = await getChannelMembers(id)
    return NextResponse.json({ success: true, data: members })
  } catch (error) {
    console.error("Error getting channel members:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

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
    if (!member || !hasPermission(member.role, "channel:invite")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { userId, role } = body

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 })
    }

    const added = await addChannelMember(id, userId, role ?? "MEMBER")
    return NextResponse.json({ success: true, data: added }, { status: 201 })
  } catch (error) {
    console.error("Error adding channel member:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
