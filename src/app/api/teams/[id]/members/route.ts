import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { addTeamMember, removeTeamMember } from "@/services/team"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { userId, role } = body

  if (!userId) {
    return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 })
  }

  try {
    const member = await addTeamMember(id, userId, role)
    return NextResponse.json({ success: true, data: member }, { status: 201 })
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
  const userId = searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 })
  }

  await removeTeamMember(id, userId)

  return NextResponse.json({ success: true, data: { message: "Member removed" } })
}
