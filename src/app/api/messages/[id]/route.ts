import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { updateMessage, deleteMessage, addReaction } from "@/services/message"
import { triggerNotification } from "@/services/notification"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/config/permissions"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const message = await prisma.message.findUnique({ where: { id } })
    if (!message || message.deleted) {
      return NextResponse.json({ success: false, error: "Message not found" }, { status: 404 })
    }

    const body = await request.json()

    if (body.content !== undefined) {
      if (message.senderId !== session.user.id) {
        const member = await prisma.workspaceMember.findUnique({
          where: { userId_workspaceId: { userId: session.user.id, workspaceId: message.workspaceId } },
        })
        if (!member || !hasPermission(member.role, "message:edit")) {
          return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
        }
      }
      const updated = await updateMessage(id, body.content)
      return NextResponse.json({ success: true, data: updated })
    }

    if (body.emoji !== undefined) {
      const reaction = await addReaction(id, body.emoji, session.user.id)

      try {
        const [sender, reactor] = await Promise.all([
          prisma.message.findUnique({ where: { id }, select: { senderId: true, workspaceId: true, channelId: true, conversationId: true } }),
          prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } }),
        ])
        if (sender && sender.senderId !== session.user.id) {
          await triggerNotification({
            userId: sender.senderId,
            workspaceId: sender.workspaceId,
            type: "reaction",
            category: "REACTION",
            priority: "LOW",
            title: `${reactor?.name ?? "A member"} reacted with ${body.emoji}`,
            actorId: session.user.id,
            entityId: id,
            entityType: "message",
            link: sender.channelId ? `/messages/${sender.channelId}` : `/messages?conversation=${sender.conversationId}`,
          })
        }
      } catch {
        // reaction notification is best-effort
      }

      return NextResponse.json({ success: true, data: reaction })
    }

    return NextResponse.json({ success: false, error: "No valid fields to update" }, { status: 400 })
  } catch (error) {
    console.error("Error updating message:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const message = await prisma.message.findUnique({ where: { id } })
    if (!message || message.deleted) {
      return NextResponse.json({ success: false, error: "Message not found" }, { status: 404 })
    }

    if (message.senderId !== session.user.id) {
      const member = await prisma.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId: session.user.id, workspaceId: message.workspaceId } },
      })
      if (!member || !hasPermission(member.role, "message:delete")) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
      }
    }

    await deleteMessage(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting message:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
