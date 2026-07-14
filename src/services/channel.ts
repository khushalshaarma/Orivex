import { prisma } from "@/lib/prisma"
import slugify from "@/lib/slugify"
import { notifyWorkspace } from "@/services/notification"

interface CreateChannelData {
  name: string
  description?: string
  icon?: string
  color?: string
  type?: "PUBLIC" | "PRIVATE" | "ANNOUNCEMENT"
  workspaceId: string
  createdBy: string
}

export async function getChannelsByWorkspace(workspaceId: string) {
  return prisma.channel.findMany({
    where: { workspaceId, archived: false },
    include: {
      _count: { select: { members: true, messages: true } },
      members: {
        where: { role: "OWNER" },
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
        take: 1,
      },
    },
    orderBy: { createdAt: "asc" },
  })
}

export async function getChannelById(id: string) {
  return prisma.channel.findUnique({
    where: { id },
    include: {
      _count: { select: { members: true, messages: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, image: true, email: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  })
}

export async function getChannelBySlug(workspaceId: string, slug: string) {
  return prisma.channel.findUnique({
    where: { workspaceId_slug: { workspaceId, slug } },
  })
}

export async function createChannel(data: CreateChannelData) {
  const slug = slugify(data.name)

  const existing = await getChannelBySlug(data.workspaceId, slug)
  if (existing) throw new Error("A channel with this name already exists")

  const channel = await prisma.channel.create({
    data: {
      name: data.name,
      slug,
      description: data.description,
      icon: data.icon,
      color: data.color,
      type: data.type ?? "PUBLIC",
      workspaceId: data.workspaceId,
      createdBy: data.createdBy,
    },
  })

  await prisma.channelMember.create({
    data: {
      channelId: channel.id,
      userId: data.createdBy,
      role: "OWNER",
    },
  })

  await notifyWorkspace(data.workspaceId, {
    type: "channel.created",
    category: "MESSAGE",
    priority: "NORMAL",
    title: `New channel: #${channel.name}`,
    message: `A new channel was created`,
    actorId: data.createdBy,
    entityId: channel.id,
    entityType: "channel",
    link: `/messages/${channel.id}`,
    excludeUserId: data.createdBy,
  })

  return channel
}

export async function updateChannel(id: string, data: {
  name?: string
  description?: string | null
  icon?: string | null
  color?: string | null
  type?: "PUBLIC" | "PRIVATE" | "ANNOUNCEMENT"
}) {
  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) {
    updateData.name = data.name
    updateData.slug = slugify(data.name)
  }
  if (data.description !== undefined) updateData.description = data.description
  if (data.icon !== undefined) updateData.icon = data.icon
  if (data.color !== undefined) updateData.color = data.color
  if (data.type !== undefined) updateData.type = data.type

  return prisma.channel.update({ where: { id }, data: updateData })
}

export async function archiveChannel(id: string, actorId?: string) {
  const channel = await prisma.channel.update({ where: { id }, data: { archived: true } })

  await notifyWorkspace(channel.workspaceId, {
    type: "channel.archived",
    category: "MESSAGE",
    priority: "NORMAL",
    title: `Channel archived: #${channel.name}`,
    message: `The channel was archived`,
    actorId,
    entityId: id,
    entityType: "channel",
    link: `/messages/${id}`,
    excludeUserId: actorId,
  })

  return channel
}

export async function restoreChannel(id: string, actorId?: string) {
  const channel = await prisma.channel.update({ where: { id }, data: { archived: false } })

  await notifyWorkspace(channel.workspaceId, {
    type: "channel.restored",
    category: "MESSAGE",
    priority: "NORMAL",
    title: `Channel restored: #${channel.name}`,
    message: `The channel was restored`,
    actorId,
    entityId: id,
    entityType: "channel",
    link: `/messages/${id}`,
    excludeUserId: actorId,
  })

  return channel
}

export async function deleteChannel(id: string) {
  return prisma.channel.delete({ where: { id } })
}

export async function getChannelMembers(channelId: string) {
  return prisma.channelMember.findMany({
    where: { channelId },
    include: {
      user: { select: { id: true, name: true, image: true, email: true } },
    },
    orderBy: { joinedAt: "asc" },
  })
}

export async function addChannelMember(channelId: string, userId: string, role: "OWNER" | "MODERATOR" | "MEMBER" = "MEMBER") {
  const existing = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId, userId } },
  })
  if (existing) return existing

  return prisma.channelMember.create({
    data: { channelId, userId, role },
    include: {
      user: { select: { id: true, name: true, image: true, email: true } },
    },
  })
}

export async function updateChannelMemberRole(channelId: string, userId: string, role: "OWNER" | "MODERATOR" | "MEMBER") {
  return prisma.channelMember.update({
    where: { channelId_userId: { channelId, userId } },
    data: { role },
  })
}

export async function removeChannelMember(channelId: string, userId: string) {
  return prisma.channelMember.delete({
    where: { channelId_userId: { channelId, userId } },
  })
}

export async function isChannelMember(channelId: string, userId: string) {
  const member = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId, userId } },
  })
  return !!member
}
