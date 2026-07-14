import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { duplicateProject } from "@/services/project"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { id } = await params
    const project = await duplicateProject(id, session.user.id)
    return NextResponse.json({ success: true, data: project }, { status: 201 })
  } catch (error) {
    console.error("Error duplicating project:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
