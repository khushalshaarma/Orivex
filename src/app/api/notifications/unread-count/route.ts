import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getUnreadCount, getUnreadMentionsCount } from "@/services/notification"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const [unread, mentions] = await Promise.all([
    getUnreadCount(session.user.id),
    getUnreadMentionsCount(session.user.id),
  ])

  return NextResponse.json({ success: true, data: { unread, mentions } })
}
