import "dotenv/config"
import dns from "node:dns"
import nodemailer from "nodemailer"

// Force IPv4 so smtp.gmail.com does not resolve to an unreachable IPv6 address.
dns.setDefaultResultOrder("ipv4first")

const host = process.env.SMTP_HOST
const port = Number(process.env.SMTP_PORT)
const user = process.env.SMTP_USER
const pass = (process.env.SMTP_PASS ?? "").replace(/\s+/g, "")
const from = process.env.EMAIL_FROM || user

console.log("=== SMTP Environment Check ===")
console.log(`SMTP_HOST  : ${host ? "OK" : "MISSING"}`)
console.log(`SMTP_PORT  : ${port ? "OK" : "MISSING"}`)
console.log(`SMTP_USER  : ${user ? "OK" : "MISSING"}`)
console.log(`SMTP_PASS  : ${pass ? `OK (length=${pass.length})` : "MISSING"}`)
console.log(`EMAIL_FROM : ${from ? "OK" : "MISSING"}`)
console.log(`APP_URL    : ${process.env.APP_URL ? "OK" : "MISSING"}`)

if (!host || !port || !user || !pass) {
  console.error("\nMissing required SMTP environment variables. Stopping.")
  process.exit(1)
}

const secure = port === 465
const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  requireTLS: port === 587,
  auth: { user, pass },
  tls: { rejectUnauthorized: true },
})

console.log("\n=== Transporter Configuration ===")
console.log(`host       : ${host}`)
console.log(`port       : ${port}`)
console.log(`secure     : ${secure}`)
console.log(`requireTLS : ${port === 587}`)
console.log(`auth.user  : ${user}`)

async function main() {
  console.log("\n=== SMTP verify() ===")
  try {
    const ok = await transporter.verify()
    console.log("verify result:", ok)
  } catch (error) {
    const err = error as { message?: string; code?: string; command?: string; response?: string; responseCode?: number }
    console.error("verify FAILED:")
    console.error("  code        :", err.code ?? "n/a")
    console.error("  command     :", err.command ?? "n/a")
    console.error("  response    :", err.response ?? "n/a")
    console.error("  responseCode:", err.responseCode ?? "n/a")
    console.error("  message     :", err.message ?? String(error))
    process.exit(1)
  }

  console.log("\n=== sendMail() to SMTP_USER ===")
  try {
    const info = await transporter.sendMail({
      from,
      to: user,
      subject: "Collab SMTP Isolation Test",
      text: "This is an isolated SMTP test email from Collab.",
      html: "<p>This is an isolated <strong>SMTP</strong> test email from Collab.</p>",
    })
    console.log("accepted    :", info.accepted)
    console.log("rejected    :", info.rejected)
    console.log("response    :", info.response)
    console.log("envelope    :", JSON.stringify(info.envelope))
    console.log("messageId   :", info.messageId)
    console.log("\nSMTP TEST PASSED")
  } catch (error) {
    const err = error as { message?: string; code?: string; command?: string; response?: string; responseCode?: number }
    console.error("sendMail FAILED:")
    console.error("  code        :", err.code ?? "n/a")
    console.error("  command     :", err.command ?? "n/a")
    console.error("  response    :", err.response ?? "n/a")
    console.error("  responseCode:", err.responseCode ?? "n/a")
    console.error("  message     :", err.message ?? String(error))
    process.exit(1)
  }
}

main().catch((e) => {
  console.error("Unexpected error:", e)
  process.exit(1)
})
