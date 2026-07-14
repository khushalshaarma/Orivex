import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createTeam } from "@/services/team"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { name, description, color, icon, leadId, workspaceId } = body

  if (!name || !workspaceId) {
    return NextResponse.json({ success: false, error: "Name and workspaceId are required" }, { status: 400 })
  }

  try {
    const team = await createTeam({ name, description, color, icon, leadId, workspaceId })
    return NextResponse.json({ success: true, data: team }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
