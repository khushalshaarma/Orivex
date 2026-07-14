import dns from "node:dns"
import nodemailer, { type Transporter } from "nodemailer"

// Force Node to prefer IPv4 when resolving SMTP hosts. On some machines
// smtp.gmail.com resolves to an unreachable IPv6 address, causing
// ENETUNREACH. This makes IPv4 the default for the whole process.
dns.setDefaultResultOrder("ipv4first")

const REQUIRED_EMAIL_ENV = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "EMAIL_FROM",
] as const

type EmailConfig = {
  host: string
  port: number
  user: string
  pass: string
  from: string
}

let cachedTransporter: Transporter | null = null
let transporterVerified = false
let startupLogged = false

function logEmailStartup(): void {
  if (startupLogged) return
  startupLogged = true
  const has = (k: string) => (process.env[k] ? "OK" : "MISSING")
  console.log("[email][startup] SMTP environment check:")
  console.log(`  SMTP_HOST  : ${has("SMTP_HOST")}`)
  console.log(`  SMTP_PORT  : ${has("SMTP_PORT")}`)
  console.log(`  SMTP_USER  : ${has("SMTP_USER")}`)
  console.log(`  SMTP_PASS  : ${process.env.SMTP_PASS ? `OK (length=${process.env.SMTP_PASS.length})` : "MISSING"}`)
  console.log(`  EMAIL_FROM : ${has("EMAIL_FROM")}`)
  console.log(`  APP_URL    : ${has("APP_URL")}`)
}

function validateEmailConfig(): EmailConfig {
  logEmailStartup()

  const missing = REQUIRED_EMAIL_ENV.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`Missing email environment variables: ${missing.join(", ")}`)
  }

  const port = Number(process.env.SMTP_PORT)
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid SMTP_PORT: ${process.env.SMTP_PORT}`)
  }

  return {
    host: process.env.SMTP_HOST as string,
    port,
    user: process.env.SMTP_USER as string,
    pass: process.env.SMTP_PASS as string,
    from: process.env.EMAIL_FROM as string,
  }
}

async function getTransporter(): Promise<Transporter> {
  if (cachedTransporter && transporterVerified) {
    return cachedTransporter
  }

  const config = validateEmailConfig()

  // Gmail App Passwords are 16-character strings with no spaces. Trim any
  // accidental whitespace introduced when copying credentials into .env.
  const password = config.pass.replace(/\s+/g, "")

  const secure = config.port === 465

  const makeTransporter = (): Transporter =>
    nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure,
      // Enforce STARTTLS on submission ports (587) so credentials are never
      // sent in clear text — required by Gmail.
      requireTLS: config.port === 587,
      auth: {
        user: config.user,
        pass: password,
      },
      tls: {
        rejectUnauthorized: true,
      },
    })

  if (process.env.NODE_ENV !== "production") {
    console.log("[email] Transporter configuration:")
    console.log(`  host    : ${config.host}`)
    console.log(`  port    : ${config.port}`)
    console.log(`  secure  : ${secure}`)
    console.log(`  requireTLS: ${config.port === 587}`)
    console.log(`  auth.user: ${config.user}`)
    console.log("  lookup  : forced IPv4 (family 4)")
    // Never log auth.pass
  }

  // DNS resolution debug — IPv4 only (no IPv6 should appear).
  try {
    const all = await dns.promises.lookup(config.host, { all: true })
    const ipv4 = all.filter((a) => a.family === 4)
    console.log("[email] DNS Resolution (IPv4):")
    console.table(ipv4.length ? ipv4 : all)
  } catch (dnsError) {
    console.error("[email] DNS lookup failed:", dnsError instanceof Error ? dnsError.message : dnsError)
  }

  const verifyOnce = async (): Promise<Transporter> => {
    const transporter = makeTransporter()
    console.log("[email] Starting SMTP verify...")
    await transporter.verify()
    console.log("[email] SMTP verify completed")
    return transporter
  }

  try {
    const transporter = await verifyOnce()
    transporterVerified = true
    cachedTransporter = transporter
    if (process.env.NODE_ENV !== "production") {
      console.log(`[email] SMTP verified — transport connected (${config.host}:${config.port})`)
    }
    return transporter
  } catch (error) {
    const code = (error as { code?: string }).code

    // Retry once on network-level failures (unreachable socket / ENETUNREACH).
    // Never retry authentication failures.
    if (code === "ENETUNREACH" || code === "ESOCKET") {
      console.warn(`[email] ${code} during verify — retrying once after 1s...`)
      await new Promise((resolve) => setTimeout(resolve, 1000))
      try {
        const transporter = await verifyOnce()
        transporterVerified = true
        cachedTransporter = transporter
        console.log(`[email] SMTP verified on retry (${config.host}:${config.port})`)
        return transporter
      } catch (retryError) {
        cachedTransporter = null
        transporterVerified = false
        const reason = retryError instanceof Error ? retryError.message : String(retryError)
        throw new Error(`SMTP verification failed after retry: ${reason}`)
      }
    }

    cachedTransporter = null
    transporterVerified = false
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`SMTP verification failed: ${reason}`)
  }
}

export function getAppUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.AUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/, "")
}

export function buildInvitationLink(token: string): string {
  return `${getAppUrl()}/invitations/accept?token=${token}`
}

export type InvitationEmailInput = {
  to: string
  workspaceName: string
  inviterName: string
  role: string
  token: string
  expiresAt: Date
  workspaceLogo?: string | null
}

export type EmailResult = {
  sent: boolean
  messageId?: string
  error?: string
}

export type InvitationEmailTemplateData = {
  to: string
  workspaceName: string
  inviterName: string
  role: string
  acceptUrl: string
  fallbackUrl: string
  expiration: string
  workspaceLogo?: string | null
}

function buildInvitationHtml(data: InvitationEmailTemplateData): string {
  const logo = data.workspaceLogo
    ? `<img src="${data.workspaceLogo}" alt="${data.workspaceName}" height="40" style="border-radius:8px;" />`
    : `<div style="font:600 20px/1 Arial,sans-serif;color:#6366f1;letter-spacing:-0.5px;">Collab</div>`

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>You've been invited to ${data.workspaceName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${data.inviterName} invited you to join ${data.workspaceName} on Collab.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding:32px 32px 16px 32px;background-color:#ffffff;">
              ${logo}
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 8px 32px;">
              <h1 style="margin:0;font-size:24px;line-height:1.3;color:#18181b;font-weight:700;">You're invited to <span style="color:#6366f1;">${data.workspaceName}</span></h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 24px 32px;font-size:16px;line-height:1.6;color:#52525b;">
              <strong style="color:#27272a;">${data.inviterName}</strong> invited you to collaborate as
              <strong style="color:#27272a;">${data.role}</strong>. Join your team's workspace to start working on projects, tasks, and conversations.
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:8px 32px 24px 32px;">
              <a href="${data.acceptUrl}" target="_blank" rel="noopener"
                 style="display:inline-block;background-color:#6366f1;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 32px;border-radius:10px;">
                Accept Invitation
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px 32px;font-size:14px;line-height:1.6;color:#71717a;">
              This invitation expires on <strong style="color:#3f3f46;">${data.expiration}</strong>. If the button doesn't work, copy and paste this link into your browser:
              <br />
              <a href="${data.fallbackUrl}" style="color:#6366f1;word-break:break-all;">${data.fallbackUrl}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 32px 32px;border-top:1px solid #ececef;font-size:12px;line-height:1.5;color:#a1a1aa;">
              You received this email because you were invited to a Collab workspace. If you weren't expecting this, you can safely ignore this message.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildInvitationText(data: InvitationEmailTemplateData): string {
  return [
    `${data.inviterName} invited you to join ${data.workspaceName} on Collab as ${data.role}.`,
    "",
    "Accept your invitation by opening this link:",
    data.acceptUrl,
    "",
    `This invitation expires on ${data.expiration}.`,
    "",
    "If the link above doesn't work, copy and paste it into your browser:",
    data.fallbackUrl,
    "",
    "You received this email because you were invited to a Collab workspace.",
  ].join("\n")
}

export async function sendInvitationEmail(input: InvitationEmailInput): Promise<EmailResult> {
  const acceptUrl = buildInvitationLink(input.token)
  const fallbackUrl = acceptUrl
  const expiration = input.expiresAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const subject = `You've been invited to ${input.workspaceName} on Collab`

  const templateData: InvitationEmailTemplateData = {
    to: input.to,
    workspaceName: input.workspaceName,
    inviterName: input.inviterName,
    role: input.role,
    acceptUrl,
    fallbackUrl,
    expiration,
    workspaceLogo: input.workspaceLogo ?? null,
  }

  // Gmail requires the From address to match the authenticated account (or a
  // verified alias). Default to SMTP_USER when EMAIL_FROM is not set.
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER

  console.log("[email] Sending invitation email...")
  console.log(`[email] SMTP host : ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`)
  console.log(`[email] SMTP user : ${process.env.SMTP_USER}`)
  console.log(`[email] From      : ${from}`)
  console.log(`[email] Recipient : ${input.to}`)
  console.log(`[email] Subject   : ${subject}`)

  try {
    const transporter = await getTransporter()

    console.log("[email] Starting sendMail...")
    const info = await transporter.sendMail({
      from,
      to: input.to,
      subject,
      text: buildInvitationText(templateData),
      html: buildInvitationHtml(templateData),
    })
    console.log("[email] sendMail completed")

    console.log("[email] Email accepted by SMTP server")
    console.log(`[email] Accepted  : ${(info.accepted ?? []).join(", ") || "none"}`)
    console.log(`[email] Rejected  : ${(info.rejected ?? []).join(", ") || "none"}`)
    console.log(`[email] Response  : ${info.response ?? "n/a"}`)
    console.log(`[email] Envelope  : ${JSON.stringify(info.envelope)}`)
    console.log(`[email] Message ID: ${info.messageId}`)
    console.log("[email] Email delivered successfully")

    return { sent: true, messageId: info.messageId }
  } catch (error) {
    const err = error as {
      message?: string
      code?: string
      command?: string
      response?: string
      responseCode?: number
      stack?: string
    }

    // Resolve the SMTP host to IPv4 for diagnostics.
    let resolvedAddress: string | undefined
    let resolvedFamily: number | undefined
    try {
      const addrs = await dns.promises.lookup(process.env.SMTP_HOST ?? "", { all: true })
      const v4 = addrs.find((a) => a.family === 4) ?? addrs[0]
      if (v4) {
        resolvedAddress = v4.address
        resolvedFamily = v4.family
      }
    } catch {
      // ignore resolution failure in error path
    }

    console.error("[email] SMTP Error")
    console.error(`[email] hostname    : ${process.env.SMTP_HOST ?? "n/a"}`)
    console.error(`[email] resolved    : ${resolvedAddress ?? "n/a"} (family ${resolvedFamily ?? "n/a"})`)
    console.error(`[email] SMTP host   : ${process.env.SMTP_HOST ?? "n/a"}`)
    console.error(`[email] SMTP port   : ${process.env.SMTP_PORT ?? "n/a"}`)
    console.error(`[email] recipient   : ${input.to}`)
    console.error(`[email] from        : ${from}`)
    console.error(`[email] Code        : ${err.code ?? "n/a"}`)
    console.error(`[email] Command     : ${err.command ?? "n/a"}`)
    console.error(`[email] Response    : ${err.response ?? "n/a"}`)
    console.error(`[email] ResponseCode: ${err.responseCode ?? "n/a"}`)
    if (err.stack) console.error(`[email] Stack: ${err.stack}`)
    console.error(`[email] Recipient : ${input.to}`)
    console.error(`[email] Workspace : ${input.workspaceName}`)
    console.error(`[email] Invitation Token: ${input.token}`)

    return {
      sent: false,
      error: err.message ?? String(error),
    }
  }
}

export type TestEmailResult = {
  smtpConnected: boolean
  messageSent: boolean
  messageId?: string
  accepted?: string[]
  rejected?: string[]
  response?: string
  envelope?: unknown
}

/**
 * Sends a test email to the configured SMTP_USER. Used by the dev-only debug
 * endpoint and scripts/test-smtp.ts to isolate the email pipeline from the
 * rest of the application.
 */
export async function sendTestEmail(): Promise<TestEmailResult> {
  const config = validateEmailConfig()
  const transporter = await getTransporter()

  const from = process.env.EMAIL_FROM || config.user

  console.log("[email][test] Sending test email to SMTP_USER:", config.user)

  const info = await transporter.sendMail({
    from,
    to: config.user,
    subject: "Collab SMTP Test Email",
    text: "This is a test email from Collab to verify SMTP delivery.",
    html: "<p>This is a test email from <strong>Collab</strong> to verify SMTP delivery.</p>",
  })

  return {
    smtpConnected: true,
    messageSent: true,
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response,
    envelope: info.envelope,
  }
}
