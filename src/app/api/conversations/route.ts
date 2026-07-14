import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getConversationsByWorkspace, createConversation } from "@/services/conversation"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get("workspaceId")

  if (!workspaceId) {
    return NextResponse.json({ success: false, error: "workspaceId is required" }, { status: 400 })
  }

  try {
    const conversations = await getConversationsByWorkspace(workspaceId, session.user.id)
    return NextResponse.json({ success: true, data: conversations })
  } catch (error) {
    console.error("Error getting conversations:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { workspaceId, userIds } = body

    if (!workspaceId || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ success: false, error: "workspaceId and userIds are required" }, { status: 400 })
    }

    const allUserIds = [...new Set([session.user.id, ...userIds])]

    const conversation = await createConversation(workspaceId, allUserIds)
    return NextResponse.json({ success: true, data: conversation }, { status: 201 })
  } catch (error) {
    console.error("Error creating conversation:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
