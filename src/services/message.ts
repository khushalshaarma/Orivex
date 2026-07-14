import { prisma } from "@/lib/prisma"

interface CreateMessageData {
  workspaceId: string
  channelId?: string | null
  conversationId?: string | null
  senderId: string
  content: string
  type?: "TEXT" | "IMAGE" | "FILE" | "SYSTEM"
  parentId?: string | null
  fileUrls?: string[]
}

const messageInclude = {
  sender: { select: { id: true, name: true, image: true } },
  attachments: true,
  reactions: {
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  },
  _count: { select: { replies: true } },
} as const

export async function getMessagesByChannel(channelId: string, options?: { limit?: number; before?: string }) {
  const where: Record<string, unknown> = { channelId, deleted: false, parentId: null }
  if (options?.before) {
    const cursor = await prisma.message.findUnique({ where: { id: options.before }, select: { createdAt: true } })
    if (cursor) where.createdAt = { lt: cursor.createdAt }
  }

  return prisma.message.findMany({
    where,
    include: messageInclude,
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 50,
  })
}

export async function getMessagesByConversation(conversationId: string, options?: { limit?: number; before?: string }) {
  const where: Record<string, unknown> = { conversationId, deleted: false, parentId: null }
  if (options?.before) {
    const cursor = await prisma.message.findUnique({ where: { id: options.before }, select: { createdAt: true } })
    if (cursor) where.createdAt = { lt: cursor.createdAt }
  }

  return prisma.message.findMany({
    where,
    include: messageInclude,
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 50,
  })
}

export async function getThreadReplies(parentId: string) {
  return prisma.message.findMany({
    where: { parentId, deleted: false },
    include: {
      sender: { select: { id: true, name: true, image: true } },
      attachments: true,
      reactions: {
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  })
}

export async function createMessage(data: CreateMessageData) {
  let content = data.content
  if (data.fileUrls?.length) {
    const filesSection = data.fileUrls.map((u) => u).join("\n")
    content = content ? `${content}\n\n${filesSection}` : filesSection
  }
  const msg = await prisma.message.create({
    data: {
      workspaceId: data.workspaceId,
      channelId: data.channelId,
      conversationId: data.conversationId,
      senderId: data.senderId,
      content,
      type: data.type ?? "TEXT",
      parentId: data.parentId,
    },
    include: messageInclude,
  })

  if (data.parentId) {
    await prisma.message.update({
      where: { id: data.parentId },
      data: { replyCount: { increment: 1 } },
    })
  }

  return msg
}

export async function updateMessage(id: string, content: string) {
  const prev = await prisma.message.findUnique({ where: { id }, select: { content: true } })
  if (prev && prev.content !== content) {
    await prisma.messageEdit.create({
      data: { messageId: id, content: prev.content },
    })
  }

  return prisma.message.update({
    where: { id },
    data: { content, edited: true },
    include: messageInclude,
  })
}

export async function deleteMessage(id: string) {
  return prisma.message.update({
    where: { id },
    data: { deleted: true, content: "" },
  })
}

export async function pinMessage(id: string) {
  return prisma.message.update({ where: { id }, data: { pinned: true } })
}

export async function unpinMessage(id: string) {
  return prisma.message.update({ where: { id }, data: { pinned: false } })
}

export async function addReaction(messageId: string, emoji: string, userId: string) {
  const existing = await prisma.messageReaction.findUnique({
    where: { messageId_userId_emoji: { messageId, userId, emoji } },
  })
  if (existing) {
    await prisma.messageReaction.delete({ where: { id: existing.id } })
    return { removed: true, emoji, userId }
  }

  return prisma.messageReaction.create({
    data: { messageId, emoji, userId },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  })
}

export async function getPinnedMessages(channelId: string) {
  return prisma.message.findMany({
    where: { channelId, pinned: true, deleted: false },
    include: messageInclude,
    orderBy: { createdAt: "desc" },
  })
}

export async function updateMessageStatus(id: string, status: "SENT" | "DELIVERED" | "READ") {
  return prisma.message.update({
    where: { id },
    data: { status },
  })
}
