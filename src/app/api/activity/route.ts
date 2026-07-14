import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getActivityTimeline } from "@/services/notification"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get("workspaceId")
  const cursor = searchParams.get("cursor")
  const limit = parseInt(searchParams.get("limit") ?? "20")

  if (!workspaceId) {
    return NextResponse.json({ success: false, error: "workspaceId is required" }, { status: 400 })
  }

  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId } },
  })
  if (!member) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const result = await getActivityTimeline(workspaceId, { cursor: cursor ?? undefined, limit })

  return NextResponse.json({
    success: true,
    data: {
      items: result,
      nextCursor: result.length === limit ? result[result.length - 1]?.id ?? null : null,
    },
  })
}
