import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { acceptInvitation } from "@/services/workspace"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { token } = body

  if (!token) {
    return NextResponse.json({ success: false, error: "Token is required" }, { status: 400 })
  }

  try {
    const invitation = await acceptInvitation(token, session.user.id, session.user.email)
    return NextResponse.json({ success: true, data: invitation })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid invitation"
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}
