import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getWorkspaceMembers } from "@/services/workspace"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const members = await getWorkspaceMembers(id)

  return NextResponse.json({ success: true, data: members })
}
