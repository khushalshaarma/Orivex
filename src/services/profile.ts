import { prisma } from "@/lib/prisma"

export async function getProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      username: true,
      position: true,
      department: true,
      bio: true,
      timezone: true,
      skills: true,
      github: true,
      linkedin: true,
      portfolio: true,
      status: true,
      lastActiveAt: true,
      createdAt: true,
    },
  })
}

export async function updateProfile(
  userId: string,
  data: Partial<{
    name: string
    username: string
    image: string
    position: string
    department: string
    bio: string
    timezone: string
    skills: string[]
    github: string
    linkedin: string
    portfolio: string
    status: "ACTIVE" | "AWAY" | "BUSY" | "OFFLINE"
  }>
) {
  const updateData: Record<string, unknown> = { ...data }
  if (data.skills) {
    updateData.skills = data.skills
  }

  return prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      username: true,
      position: true,
      department: true,
      bio: true,
      timezone: true,
      skills: true,
      github: true,
      linkedin: true,
      portfolio: true,
      status: true,
    },
  })
}

export async function updateLastActive(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { lastActiveAt: new Date() },
  })
}
