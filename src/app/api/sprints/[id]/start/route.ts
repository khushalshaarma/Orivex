import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { startSprint } from "@/services/sprint"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const sprint = await startSprint(id, session.user.id)

    return NextResponse.json({ success: true, data: sprint })
  } catch (error) {
    console.error("Error starting sprint:", error)
    const message = error instanceof Error ? error.message : "Internal server error"
    const status = message === "Sprint not found" ? 404 : 500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
