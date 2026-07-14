import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { updateMemberRole } from "@/services/workspace"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { workspaceId, role } = body

  if (!workspaceId || !role) {
    return NextResponse.json({ success: false, error: "workspaceId and role are required" }, { status: 400 })
  }

  try {
    const member = await updateMemberRole(workspaceId, id, role, session.user.id)
    return NextResponse.json({ success: true, data: member })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
