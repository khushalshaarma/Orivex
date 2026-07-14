import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { completeSprint } from "@/services/sprint"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const sprint = await completeSprint(id, session.user.id)

    return NextResponse.json({ success: true, data: sprint })
  } catch (error) {
    console.error("Error completing sprint:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
