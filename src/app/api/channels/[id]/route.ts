import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getChannelById, updateChannel, deleteChannel } from "@/services/channel"
import { hasPermission } from "@/config/permissions"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    if (!member || !hasPermission(member.role, "channel:view")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: channel })
  } catch (error) {
    console.error("Error getting channel:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    if (!member || !hasPermission(member.role, "channel:update")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const updated = await updateChannel(id, body)
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("Error updating channel:", error)
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    if (!member || !hasPermission(member.role, "channel:delete")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    await deleteChannel(id)

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        workspaceId: channel.workspaceId,
        action: "channel.deleted",
        entity: "channel",
        entityId: id,
        metadata: { name: channel.name },
      } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting channel:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
