import { prisma } from "@/lib/prisma"
import slugify from "@/lib/slugify"

export async function getTeams(workspaceId: string) {
  return prisma.team.findMany({
    where: { workspaceId, deletedAt: null },
    include: {
      _count: { select: { members: true, projects: true } },
      lead: { select: { id: true, name: true, image: true, email: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, image: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  })
}

export async function getTeamById(teamId: string) {
  return prisma.team.findUnique({
    where: { id: teamId, deletedAt: null },
    include: {
      _count: { select: { members: true, projects: true } },
      lead: { select: { id: true, name: true, image: true, email: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, image: true, email: true, position: true } },
        },
      },
    },
  })
}

export async function createTeam(data: {
  name: string
  description?: string
  color?: string
  icon?: string
  leadId?: string
  workspaceId: string
}) {
  const slug = slugify(data.name)

  const team = await prisma.team.create({
    data: {
      name: data.name,
      slug,
      description: data.description,
      color: data.color,
      icon: data.icon,
      leadId: data.leadId,
      workspaceId: data.workspaceId,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: data.leadId,
      workspaceId: data.workspaceId,
      teamId: team.id,
      action: "team.created",
      entity: "team",
      entityId: team.id,
      metadata: { name: data.name },
    } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
  })

  return team
}

export async function updateTeam(
  teamId: string,
  data: Partial<{
    name: string
    description: string
    color: string
    icon: string
    leadId: string
  }>,
  actorId: string
) {
  const updateData: Record<string, unknown> = { ...data }
  if (data.name) {
    updateData.slug = slugify(data.name)
  }

  const team = await prisma.team.update({
    where: { id: teamId },
    data: updateData as any, // eslint-disable-line @typescript-eslint/no-explicit-any
  })

  const wsId = team.workspaceId
  await prisma.auditLog.create({
    data: {
      userId: actorId,
      workspaceId: wsId,
      teamId,
      action: "team.updated",
      entity: "team",
      entityId: teamId,
      metadata: data,
    } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
  })

  return team
}

export async function archiveTeam(teamId: string, actorId: string) {
  const team = await prisma.team.update({
    where: { id: teamId },
    data: { deletedAt: new Date() },
  })

  await prisma.auditLog.create({
    data: {
      userId: actorId,
      workspaceId: team.workspaceId! as string,
      teamId,
      action: "team.archived",
      entity: "team",
      entityId: teamId,
    } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
  })

  return team
}

export async function deleteTeam(teamId: string, actorId: string) {
  const team = await prisma.team.findUnique({ where: { id: teamId } })

  await prisma.team.delete({ where: { id: teamId } })

  await prisma.auditLog.create({
    data: {
      userId: actorId,
      workspaceId: team?.workspaceId ?? undefined,
      action: "team.deleted",
      entity: "team",
      entityId: teamId,
    } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
  })
}

export async function addTeamMember(teamId: string, userId: string, role: "MEMBER" | "ADMIN" = "MEMBER") {
  return prisma.teamMember.create({
    data: { teamId, userId, role },
  })
}

export async function removeTeamMember(teamId: string, userId: string) {
  return prisma.teamMember.delete({
    where: { userId_teamId: { userId, teamId } },
  })
}

export async function updateTeamMemberRole(teamId: string, userId: string, role: "MEMBER" | "ADMIN") {
  return prisma.teamMember.update({
    where: { userId_teamId: { userId, teamId } },
    data: { role },
  })
}
