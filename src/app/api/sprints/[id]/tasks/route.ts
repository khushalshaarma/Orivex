import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { addTasksToSprint } from "@/services/sprint"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { taskIds } = body

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ success: false, error: "taskIds must be a non-empty array" }, { status: 400 })
    }

    await addTasksToSprint(id, taskIds)

    return NextResponse.json({ success: true, data: null })
  } catch (error) {
    console.error("Error adding tasks to sprint:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
