import { prisma } from "@/lib/prisma"
import { triggerNotification } from "@/services/notification"
import type { MeetingStatus, Prisma } from "@prisma/client"

interface CreateMeetingData {
  title: string
  date: string
  time: string
  description?: string
  duration?: number
  meetingProvider?: string
  workspaceId: string
  creatorId: string
  memberIds?: string[]
}

export type MeetingWithRelations = Prisma.MeetingGetPayload<{
  include: {
    creator: { select: { id: true; name: true; image: true } }
    members: { include: { user: { select: { id: true; name: true; image: true } } } }
  }
}>

function generateMeetingLink(provider?: string): { link: string; code: string } {
  const base = provider?.toLowerCase() ?? "google"
  const code = crypto.randomUUID().slice(0, 8)
  switch (base) {
    case "zoom":
      return { link: `https://zoom.us/j/${Date.now().toString(36)}?pwd=${code}`, code }
    case "teams":
      return { link: `https://teams.microsoft.com/l/meetup-join/${code}`, code }
    case "collab":
      return { link: "", code }
    case "google":
    default:
      return { link: `https://meet.google.com/${code}`, code }
  }
}

const meetingInclude = {
  creator: { select: { id: true, name: true, image: true } },
  members: { include: { user: { select: { id: true, name: true, image: true } } } },
} as const

export async function createMeeting(data: CreateMeetingData) {
  const { link, code } = generateMeetingLink(data.meetingProvider)

  const meeting = await prisma.$transaction(async (tx) => {
    const m = await tx.meeting.create({
      data: {
        title: data.title,
        date: data.date,
        time: data.time,
        description: data.description,
        duration: data.duration,
        meetingProvider: data.meetingProvider ?? "google",
        meetingLink: link,
        meetingCode: code,
        status: "SCHEDULED",
        workspaceId: data.workspaceId,
        creatorId: data.creatorId,
        members: data.memberIds?.length
          ? { create: data.memberIds.map((userId: string) => ({ userId })) }
          : undefined,
      },
      include: meetingInclude,
    })

    await tx.auditLog.create({
      data: {
        userId: data.creatorId,
        workspaceId: data.workspaceId,
        action: "meeting.created",
        entity: "meeting",
        entityId: m.id,
        metadata: { title: data.title, date: data.date, time: data.time, provider: data.meetingProvider },
      },
    })

    return m
  })

  // Fire-and-forget notifications so they never block the response
  const recipients = data.memberIds?.filter((id) => id !== data.creatorId) ?? []
  if (recipients.length > 0) {
    prisma.user.findUnique({
      where: { id: data.creatorId },
      select: { name: true },
    }).then((creator) => {
      Promise.allSettled(recipients.map((userId) =>
        triggerNotification({
          userId,
          workspaceId: data.workspaceId,
          type: "meeting.created",
          category: "WORKSPACE",
          priority: "HIGH",
          title: `New meeting: ${data.title}`,
          message: `${creator?.name ?? "Someone"} invited you to a meeting on ${data.date} at ${data.time}`,
          actorId: data.creatorId,
          entityId: meeting.id,
          entityType: "meeting",
          link: `/meetings`,
        })
      ))
    })
  }

  return meeting
}

export async function getMeetingsByWorkspace(workspaceId: string) {
  return prisma.meeting.findMany({
    where: { workspaceId },
    include: meetingInclude,
    orderBy: [{ date: "asc" }, { time: "asc" }],
  })
}

export async function getUpcomingMeetings(workspaceId: string, limit = 5) {
  const today = new Date().toISOString().split("T")[0]
  return prisma.meeting.findMany({
    where: { workspaceId, date: { gte: today }, status: { not: "ENDED" as MeetingStatus } },
    include: meetingInclude,
    orderBy: { date: "asc" },
    take: limit,
  })
}

export async function getLiveMeetings(workspaceId: string) {
  return prisma.meeting.findMany({
    where: { workspaceId, status: "LIVE" as MeetingStatus },
    include: meetingInclude,
    orderBy: { startedAt: "desc" },
  })
}

export async function getTodayMeetings(workspaceId: string) {
  const today = new Date().toISOString().split("T")[0]
  return prisma.meeting.findMany({
    where: { workspaceId, date: today },
    include: meetingInclude,
    orderBy: { time: "asc" },
  })
}

export async function getMeetingById(id: string) {
  return prisma.meeting.findUnique({
    where: { id },
    include: meetingInclude,
  })
}

export async function updateMeeting(id: string, data: {
  title?: string
  description?: string | null
  date?: string
  time?: string
  duration?: number | null
  meetingProvider?: string
}) {
  const updateData: Record<string, unknown> = {}
  if (data.title !== undefined) updateData.title = data.title
  if (data.description !== undefined) updateData.description = data.description
  if (data.date !== undefined) updateData.date = data.date
  if (data.time !== undefined) updateData.time = data.time
  if (data.duration !== undefined) updateData.duration = data.duration
  if (data.meetingProvider !== undefined) {
    updateData.meetingProvider = data.meetingProvider
    const { link, code } = generateMeetingLink(data.meetingProvider)
    updateData.meetingLink = link
    updateData.meetingCode = code
  }

  return prisma.meeting.update({
    where: { id },
    data: updateData,
    include: meetingInclude,
  })
}

export async function deleteMeeting(id: string) {
  return prisma.meeting.delete({ where: { id } })
}

export async function startMeeting(id: string) {
  return prisma.meeting.update({
    where: { id },
    data: { status: "LIVE" as MeetingStatus, startedAt: new Date() },
    include: meetingInclude,
  })
}

export async function endMeeting(id: string) {
  return prisma.meeting.update({
    where: { id },
    data: { status: "ENDED" as MeetingStatus, endedAt: new Date() },
    include: meetingInclude,
  })
}

export async function cancelMeeting(id: string) {
  return prisma.meeting.update({
    where: { id },
    data: { status: "CANCELLED" as MeetingStatus },
    include: meetingInclude,
  })
}

export async function addMeetingMember(meetingId: string, userId: string) {
  const existing = await prisma.meetingMember.findUnique({
    where: { meetingId_userId: { meetingId, userId } },
  })
  if (existing) return existing

  return prisma.meetingMember.create({
    data: { meetingId, userId },
    include: { user: { select: { id: true, name: true, image: true } } },
  })
}

export async function removeMeetingMember(meetingId: string, userId: string) {
  return prisma.meetingMember.delete({
    where: { meetingId_userId: { meetingId, userId } },
  })
}
