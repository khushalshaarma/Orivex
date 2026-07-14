import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendTestEmail } from "@/lib/email"

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ success: false, error: "Not available in production" }, { status: 404 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const isOwner = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id, role: "OWNER" },
  })
  if (!isOwner) {
    return NextResponse.json({ success: false, error: "Forbidden: owners only" }, { status: 403 })
  }

  try {
    const result = await sendTestEmail()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const err = error as {
      message?: string
      code?: string
      command?: string
      response?: string
      responseCode?: number
    }
    return NextResponse.json(
      {
        success: false,
        smtpConnected: false,
        messageSent: false,
        error: err.message ?? String(error),
        code: err.code ?? null,
        command: err.command ?? null,
        response: err.response ?? null,
        responseCode: err.responseCode ?? null,
      },
      { status: 200 },
    )
  }
}
