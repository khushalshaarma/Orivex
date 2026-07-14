import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getChannelById, updateChannelMemberRole, removeChannelMember } from "@/services/channel"
import { hasPermission } from "@/config/permissions"
import { prisma } from "@/lib/prisma"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id, userId } = await params
    const channel = await getChannelById(id)
    if (!channel) {
      return NextResponse.json({ success: false, error: "Channel not found" }, { status: 404 })
    }

    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: session.user.id, workspaceId: channel.workspaceId } },
    })
    if (!member || !hasPermission(member.role, "channel:manage_roles")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { role } = body

    if (!role) {
      return NextResponse.json({ success: false, error: "role is required" }, { status: 400 })
    }

    const updated = await updateChannelMemberRole(id, userId, role)
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("Error updating channel member role:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id, userId } = await params
    const channel = await getChannelById(id)
    if (!channel) {
      return NextResponse.json({ success: false, error: "Channel not found" }, { status: 404 })
    }

    const isSelfRemoval = session.user.id === userId
    if (!isSelfRemoval) {
      const member = await prisma.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId: session.user.id, workspaceId: channel.workspaceId } },
      })
      if (!member || !hasPermission(member.role, "channel:remove_member")) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
      }
    }

    await removeChannelMember(id, userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing channel member:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
