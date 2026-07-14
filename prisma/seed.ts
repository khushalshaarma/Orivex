import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg(process.env.DATABASE_URL!)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("Seeding database...")

  const passwordHash = await bcrypt.hash("password123", 12)

  const owner = await prisma.user.upsert({
    where: { email: "owner@collab.io" },
    update: {},
    create: {
      name: "Alex Owner",
      email: "owner@collab.io",
      passwordHash,
    },
  })

  const admin = await prisma.user.upsert({
    where: { email: "admin@collab.io" },
    update: {},
    create: {
      name: "Jordan Admin",
      email: "admin@collab.io",
      passwordHash,
    },
  })

  const member = await prisma.user.upsert({
    where: { email: "member@collab.io" },
    update: {},
    create: {
      name: "Taylor Member",
      email: "member@collab.io",
      passwordHash,
    },
  })

  const team = await prisma.team.upsert({
    where: { slug: "acme-corp" },
    update: {},
    create: {
      name: "Acme Corp",
      slug: "acme-corp",
      members: {
        create: [
          { userId: owner.id, role: "OWNER" },
          { userId: admin.id, role: "ADMIN" },
          { userId: member.id, role: "MEMBER" },
        ],
      },
    },
  })

  const project = await prisma.project.upsert({
    where: { teamId_slug: { teamId: team.id, slug: "platform-v2" } },
    update: {},
    create: {
      name: "Platform v2",
      slug: "platform-v2",
      description: "The next generation of our platform",
      color: "#6366f1",
      teamId: team.id,
      ownerId: owner.id,
      members: {
        create: [
          { userId: owner.id, role: "OWNER" },
          { userId: admin.id, role: "ADMIN" },
          { userId: member.id, role: "MEMBER" },
        ],
      },
    },
  })

  await prisma.task.createMany({
    data: [
      {
        title: "Set up CI/CD pipeline",
        description: "Configure GitHub Actions for automated deployment",
        status: "todo",
        priority: "high",
        projectId: project.id,
        assigneeId: admin.id,
        sortOrder: 1,
      },
      {
        title: "Design new dashboard",
        description: "Create wireframes for the new analytics dashboard",
        status: "in_progress",
        priority: "medium",
        projectId: project.id,
        assigneeId: member.id,
        sortOrder: 2,
      },
      {
        title: "Write API documentation",
        description: "Document all REST endpoints with examples",
        status: "backlog",
        priority: "low",
        projectId: project.id,
        sortOrder: 3,
      },
      {
        title: "Implement user authentication",
        description: "Add OAuth and JWT-based authentication",
        status: "review",
        priority: "urgent",
        projectId: project.id,
        assigneeId: admin.id,
        sortOrder: 4,
      },
      {
        title: "Write unit tests for core modules",
        description: "Cover auth, API, and database modules",
        status: "testing",
        priority: "high",
        projectId: project.id,
        assigneeId: member.id,
        sortOrder: 5,
      },
      {
        title: "Fix navigation bug on mobile",
        status: "done",
        priority: "high",
        projectId: project.id,
        assigneeId: owner.id,
        sortOrder: 6,
      },
    ],
  })

  console.log("Seed completed successfully!")
  console.log("Login credentials:")
  console.log("  owner@collab.io / password123")
  console.log("  admin@collab.io / password123")
  console.log("  member@collab.io / password123")
}

main()
  .catch((e) => {
    console.error("Seed error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })