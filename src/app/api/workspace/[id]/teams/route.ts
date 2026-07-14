import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getWorkspaceTeams } from "@/services/workspace"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const teams = await getWorkspaceTeams(id)

  return NextResponse.json({ success: true, data: teams })
}
