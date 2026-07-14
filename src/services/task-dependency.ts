import { prisma } from "@/lib/prisma"

export async function getDependencies(taskId: string) {
  const rows = await prisma.taskDependency.findMany({
    where: { taskId },
    include: {
      dependency: {
        select: { id: true, title: true, status: true, priority: true, assigneeId: true },
      },
    },
  })
  return rows.map((r) => r.dependency)
}

export async function getDependents(taskId: string) {
  const rows = await prisma.taskDependency.findMany({
    where: { dependencyId: taskId },
    include: {
      task: {
        select: { id: true, title: true, status: true, priority: true, assigneeId: true },
      },
    },
  })
  return rows.map((r) => r.task)
}

export async function addDependency(taskId: string, dependencyId: string) {
  if (taskId === dependencyId) throw new Error("A task cannot depend on itself")

  const existing = await prisma.taskDependency.findUnique({
    where: { taskId_dependencyId: { taskId, dependencyId } },
  })
  if (existing) return existing

  return prisma.taskDependency.create({
    data: { taskId, dependencyId },
  })
}

export async function removeDependency(taskId: string, dependencyId: string) {
  return prisma.taskDependency.delete({
    where: { taskId_dependencyId: { taskId, dependencyId } },
  })
}
