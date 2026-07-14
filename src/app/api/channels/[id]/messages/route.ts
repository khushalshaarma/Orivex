import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getMessagesByChannel, createMessage } from "@/services/message"
import { getChannelById } from "@/services/channel"
import { hasPermission } from "@/config/permissions"
import { processMessageMentions } from "@/services/notification"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined
    const before = searchParams.get("before") ?? undefined

    const messages = await getMessagesByChannel(id, { limit, before })
    return NextResponse.json({ success: true, data: messages })
  } catch (error) {
    console.error("Error getting messages:", error)
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
    if (!member || !hasPermission(member.role, "message:send")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { content, fileUrls } = body

    if (!content?.trim() && (!fileUrls || fileUrls.length === 0)) {
      return NextResponse.json({ success: false, error: "Content or file is required" }, { status: 400 })
    }

    const message = await createMessage({
      workspaceId: channel.workspaceId,
      channelId: id,
      senderId: session.user.id,
      content: content?.trim() ?? "",
      fileUrls: fileUrls as string[] | undefined,
    })

    try {
      const sender = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true },
      })
      const everyoneAllowed = member.role === "OWNER" || member.role === "ADMIN"
      await processMessageMentions({
        content: content.trim(),
        workspaceId: channel.workspaceId,
        senderId: session.user.id,
        senderName: sender?.name ?? "A member",
        messageId: message.id,
        channelId: id,
        link: `/messages/${id}`,
        everyoneAllowed,
      })
    } catch {
      // mention notifications are best-effort
    }

    return NextResponse.json({ success: true, data: message }, { status: 201 })
  } catch (error) {
    console.error("Error creating message:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
