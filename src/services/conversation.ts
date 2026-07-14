import { prisma } from "@/lib/prisma"

export async function getConversationsByWorkspace(workspaceId: string, userId: string) {
  return prisma.conversation.findMany({
    where: {
      workspaceId,
      members: { some: { userId } },
    },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, image: true, email: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, createdAt: true, senderId: true, type: true },
      },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
  })
}

export async function getConversationById(id: string) {
  return prisma.conversation.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, image: true, email: true } },
        },
      },
    },
  })
}

export async function findExistingConversation(workspaceId: string, userIds: string[]) {
  const sortedIds = [...userIds].sort()
  const conversations = await prisma.conversation.findMany({
    where: { workspaceId },
    include: {
      members: { select: { userId: true } },
    },
  })

  for (const conv of conversations) {
    const convUserIds = conv.members.map((m) => m.userId).sort()
    if (convUserIds.length === sortedIds.length && convUserIds.every((id, i) => id === sortedIds[i])) {
      return conv
    }
  }
  return null
}

export async function createConversation(workspaceId: string, userIds: string[]) {
  const existing = await findExistingConversation(workspaceId, userIds)
  if (existing) {
    return getConversationById(existing.id)!
  }

  const conversation = await prisma.conversation.create({
    data: {
      workspaceId,
      members: {
        create: userIds.map((userId) => ({ userId })),
      },
    },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, image: true, email: true } },
        },
      },
    },
  })

  return conversation
}

export async function addConversationMember(conversationId: string, userId: string) {
  const existing = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  })
  if (existing) return existing

  return prisma.conversationMember.create({
    data: { conversationId, userId },
    include: {
      user: { select: { id: true, name: true, image: true, email: true } },
    },
  })
}

export async function archiveConversation(conversationId: string) {
  return prisma.conversation.delete({ where: { id: conversationId } })
}
