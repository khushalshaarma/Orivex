import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTaskById } from "@/services/task"
import { addChecklistItem, updateChecklistItem, deleteChecklistItem } from "@/services/task"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const task = await getTaskById(id)
    if (!task) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: task.checklists })
  } catch (error) {
    console.error("Error getting checklists:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const task = await getTaskById(id)
    if (!task) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 })
    }

    const body = await request.json()
    const { title } = body

    if (!title) {
      return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 })
    }

    const item = await addChecklistItem(id, title)
    return NextResponse.json({ success: true, data: item }, { status: 201 })
  } catch (error) {
    console.error("Error adding checklist item:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ success: false, error: "Checklist item id is required" }, { status: 400 })
    }

    const body = await request.json()
    const { title, completed } = body

    const updated = await updateChecklistItem(id, { title, completed })
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("Error updating checklist item:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ success: false, error: "Checklist item id is required" }, { status: 400 })
    }

    await deleteChecklistItem(id)
    return NextResponse.json({ success: true, data: null })
  } catch (error) {
    console.error("Error deleting checklist item:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
