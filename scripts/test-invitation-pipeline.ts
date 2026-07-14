import "dotenv/config"
import { prisma } from "../src/lib/prisma"
import { inviteMember } from "../src/services/workspace"
import { getUnreadCount } from "../src/services/notification"

async function run() {
  const results: string[] = []
  const ok = (label: string, cond: boolean, detail?: string) => {
    results.push(`${cond ? "PASS" : "FAIL"}  ${label}${detail ? ` -> ${detail}` : ""}`)
    if (!cond) process.exitCode = 1
  }

  // Find a seeded workspace + an inviter (use first workspace member).
  const wsMember = await prisma.workspaceMember.findFirst({
    include: { workspace: { select: { id: true, name: true } } },
  })
  if (!wsMember) {
    console.error("No seeded workspace member found. Run npm run db:seed first.")
    process.exit(1)
  }
  const workspaceId = wsMember.workspace.id
  const inviterId = wsMember.userId
  const testEmail = `invite-test-${Date.now()}@example.com`

  const beforeCount = await prisma.notification.count({
    where: { workspaceId, type: "invitation.sent" },
  })

  const result = await inviteMember({
    email: testEmail,
    workspaceId,
    invitedById: inviterId,
    role: "DEVELOPER",
  })

  ok("invitation record created", !!result.id, result.id)
  ok("invitation token present", !!result.token)
  ok("notificationCreated flag true", result.notificationCreated === true, String(result.notificationCreated))
  const smtpConfigured = Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_PORT,
  )
  ok("emailSent reflects SMTP config", result.emailSent === smtpConfigured, `emailSent=${result.emailSent} smtpConfigured=${smtpConfigured}`)

  const afterCount = await prisma.notification.count({
    where: { workspaceId, type: "invitation.sent" },
  })
  ok("notification rows increased", afterCount > beforeCount, `${beforeCount} -> ${afterCount}`)

  const sample = await prisma.notification.findFirst({
    where: { workspaceId, type: "invitation.sent" },
    orderBy: { createdAt: "desc" },
  })
  ok("notification has workspaceId", sample?.workspaceId === workspaceId)
  ok("notification unread (read=false)", sample?.read === false)
  ok("notification category WORKSPACE", sample?.category === "WORKSPACE")

  const inviterUnread = await getUnreadCount(inviterId, workspaceId)
  ok("inviter has unread invitations", inviterUnread > 0, String(inviterUnread))

  // Cleanup created rows.
  await prisma.notification.deleteMany({ where: { type: "invitation.sent", message: { contains: testEmail } } })
  await prisma.invitation.deleteMany({ where: { email: testEmail, workspaceId } })

  console.log("\n--- Invitation + Notification Pipeline Test ---")
  console.log(results.join("\n"))
  console.log(process.exitCode ? "\nSOME TESTS FAILED" : "\nALL TESTS PASSED")
}

run()
  .catch((e) => {
    console.error("Test crashed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
