import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getThreadReplies, createMessage } from "@/services/message"
import { processMessageMentions, triggerNotification } from "@/services/notification"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const replies = await getThreadReplies(id)
    return NextResponse.json({ success: true, data: replies })
  } catch (error) {
    console.error("Failed to fetch thread replies:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch thread replies" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const { content } = body

  if (!content?.trim()) {
    return NextResponse.json({ success: false, error: "Content is required" }, { status: 400 })
  }

  try {
    const { prisma } = await import("@/lib/prisma")
    const parent = await prisma.message.findUnique({ where: { id }, select: { workspaceId: true, channelId: true, conversationId: true } })
    if (!parent) {
      return NextResponse.json({ success: false, error: "Parent message not found" }, { status: 404 })
    }

    const reply = await createMessage({
      workspaceId: parent.workspaceId,
      channelId: parent.channelId,
      conversationId: parent.conversationId,
      senderId: session.user.id,
      content: content.trim(),
      parentId: id,
    })

    try {
      const { prisma: p } = await import("@/lib/prisma")
      const [sender, parentMsg] = await Promise.all([
        p.user.findUnique({ where: { id: session.user.id }, select: { name: true } }),
        p.message.findUnique({
          where: { id },
          select: { senderId: true, workspaceId: true, channelId: true, conversationId: true },
        }),
      ])

      if (parentMsg && parentMsg.senderId !== session.user.id) {
        await triggerNotification({
          userId: parentMsg.senderId,
          workspaceId: parent.workspaceId,
          type: "reply",
          category: "REPLY",
          priority: "NORMAL",
          title: `${sender?.name ?? "A member"} replied to your message`,
          message: content.trim().slice(0, 200),
          actorId: session.user.id,
          entityId: reply.id,
          entityType: "message",
          link: parent.channelId
            ? `/messages/${parent.channelId}`
            : `/messages?conversation=${parent.conversationId}`,
        })
      }

      await processMessageMentions({
        content: content.trim(),
        workspaceId: parent.workspaceId,
        senderId: session.user.id,
        senderName: sender?.name ?? "A member",
        messageId: reply.id,
        channelId: parent.channelId,
        conversationId: parent.conversationId,
        link: parent.channelId
          ? `/messages/${parent.channelId}`
          : `/messages?conversation=${parent.conversationId}`,
        everyoneAllowed: false,
      })
    } catch {
      // reply notifications are best-effort
    }

    return NextResponse.json({ success: true, data: reply })
  } catch (error) {
    console.error("Failed to create thread reply:", error)
    return NextResponse.json({ success: false, error: "Failed to create thread reply" }, { status: 500 })
  }
}
