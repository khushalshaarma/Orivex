import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { transferOwnership } from "@/services/workspace"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { workspaceId } = body

  if (!workspaceId) {
    return NextResponse.json({ success: false, error: "workspaceId is required" }, { status: 400 })
  }

  try {
    await transferOwnership(workspaceId, id, session.user.id)
    return NextResponse.json({ success: true, data: { message: "Ownership transferred" } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
