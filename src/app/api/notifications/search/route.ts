import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { searchNotifications } from "@/services/notification"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")
  const page = parseInt(searchParams.get("page") ?? "1")
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20")

  if (!q) {
    return NextResponse.json({ success: false, error: "Query parameter q is required" }, { status: 400 })
  }

  const result = await searchNotifications(session.user.id, q, { page, pageSize })

  return NextResponse.json({ success: true, data: result })
}
