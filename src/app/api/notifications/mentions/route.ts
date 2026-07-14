import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getMentionNotifications } from "@/services/notification"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get("page") ?? "1")
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20")

  const result = await getMentionNotifications(session.user.id, { page, pageSize })

  return NextResponse.json({ success: true, data: result })
}
