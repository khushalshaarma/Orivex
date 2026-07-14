import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { markAllAsRead } from "@/services/notification"

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  await markAllAsRead(session.user.id)

  return NextResponse.json({ success: true, data: { message: "All notifications marked as read" } })
}
