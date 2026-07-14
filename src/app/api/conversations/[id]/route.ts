import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getConversationById } from "@/services/conversation"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const conversation = await getConversationById(id)
    if (!conversation) {
      return NextResponse.json({ success: false, error: "Conversation not found" }, { status: 404 })
    }

    const isMember = conversation.members.some((m) => m.userId === session.user.id)
    if (!isMember) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: conversation })
  } catch (error) {
    console.error("Error getting conversation:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
