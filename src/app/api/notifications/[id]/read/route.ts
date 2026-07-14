import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { markAsRead } from "@/services/notification"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  await markAsRead(id)

  return NextResponse.json({ success: true, data: { message: "Notification marked as read" } })
}
