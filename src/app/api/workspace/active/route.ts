import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getActiveWorkspace } from "@/services/workspace"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const workspace = await getActiveWorkspace(session.user.id)

  if (!workspace) {
    return NextResponse.json({ success: false, error: "No workspace found" }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: workspace })
}
