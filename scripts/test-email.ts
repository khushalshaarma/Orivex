import { sendInvitationEmail, buildInvitationLink, getAppUrl } from "../src/lib/email"

function resetEnv() {
  for (const k of ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM", "APP_URL", "AUTH_URL"]) {
    delete process.env[k]
  }
}

async function run() {
  const results: string[] = []
  const ok = (label: string, cond: boolean, detail?: string) => {
    results.push(`${cond ? "PASS" : "FAIL"}  ${label}${detail ? ` -> ${detail}` : ""}`)
    if (!cond) process.exitCode = 1
  }

  // 1. getAppUrl default
  resetEnv()
  ok("getAppUrl default", getAppUrl() === "http://localhost:3000", getAppUrl())

  // 2. buildInvitationLink format
  resetEnv()
  const link = buildInvitationLink("abc123")
  ok(
    "invitation link format",
    link === "http://localhost:3000/invitations/accept?token=abc123",
    link,
  )

  // 3. Missing env -> graceful failure with meaningful message
  resetEnv()
  const r1 = await sendInvitationEmail({
    to: "new@gmail.com",
    workspaceName: "Acme",
    inviterName: "Owner",
    role: "DEVELOPER",
    token: "tok1",
    expiresAt: new Date(Date.now() + 86400000),
  })
  ok("missing env -> emailSent false", r1.sent === false)
  ok(
    "missing env -> meaningful error",
    !!r1.error && r1.error.includes("Missing email environment variables"),
    r1.error,
  )

  // 4. Invalid port -> meaningful error
  resetEnv()
  process.env.SMTP_HOST = "smtp.gmail.com"
  process.env.SMTP_PORT = "not-a-port"
  process.env.SMTP_USER = "x@gmail.com"
  process.env.SMTP_PASS = "pass"
  process.env.EMAIL_FROM = "x@gmail.com"
  const r2 = await sendInvitationEmail({
    to: "new@gmail.com",
    workspaceName: "Acme",
    inviterName: "Owner",
    role: "DEVELOPER",
    token: "tok2",
    expiresAt: new Date(Date.now() + 86400000),
  })
  ok("invalid port -> emailSent false", r2.sent === false)
  ok("invalid port -> meaningful error", !!r2.error && r2.error.includes("Invalid SMTP_PORT"), r2.error)

  // 5. SMTP connection refused (no server) -> graceful failure (tests failure path)
  resetEnv()
  process.env.SMTP_HOST = "127.0.0.1"
  process.env.SMTP_PORT = "65535"
  process.env.SMTP_USER = "x@gmail.com"
  process.env.SMTP_PASS = "pass"
  process.env.EMAIL_FROM = "x@gmail.com"
  const r3 = await sendInvitationEmail({
    to: "new@gmail.com",
    workspaceName: "Acme",
    inviterName: "Owner",
    role: "DEVELOPER",
    token: "tok3",
    expiresAt: new Date(Date.now() + 86400000),
  })
  ok("connection refused -> emailSent false", r3.sent === false)
  ok("connection refused -> error captured", !!r3.error, r3.error)

  // 6. With valid Gmail config present, verify() would run (no live server here,
  //    so we just assert the config reads correctly when provided).
  resetEnv()
  process.env.SMTP_HOST = "smtp.gmail.com"
  process.env.SMTP_PORT = "587"
  process.env.SMTP_USER = "real@gmail.com"
  process.env.SMTP_PASS = "app-password"
  process.env.EMAIL_FROM = "real@gmail.com"
  process.env.APP_URL = "http://localhost:3000"
  ok("gmail config reads (link)", buildInvitationLink("t").startsWith("http://localhost:3000/invitations/accept"))

  console.log("\n--- Invitation Email Service Tests ---")
  console.log(results.join("\n"))
  console.log(process.exitCode ? "\nSOME TESTS FAILED" : "\nALL TESTS PASSED")
}

run().catch((e) => {
  console.error("Test runner crashed:", e)
  process.exit(1)
})
