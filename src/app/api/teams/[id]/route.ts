import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTeamById, updateTeam, archiveTeam, deleteTeam } from "@/services/team"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const team = await getTeamById(id)

  if (!team) {
    return NextResponse.json({ success: false, error: "Team not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: team })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  try {
    const team = await updateTeam(id, body, session.user.id)
    return NextResponse.json({ success: true, data: team })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const archive = searchParams.get("archive") === "true"

  if (archive) {
    await archiveTeam(id, session.user.id)
  } else {
    await deleteTeam(id, session.user.id)
  }

  return NextResponse.json({ success: true, data: { message: "Team deleted" } })
}
