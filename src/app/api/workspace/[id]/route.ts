import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getWorkspaceById, updateWorkspace, deleteWorkspace } from "@/services/workspace"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const workspace = await getWorkspaceById(id)

  if (!workspace) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: workspace })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  try {
    const workspace = await updateWorkspace(id, body, session.user.id)
    return NextResponse.json({ success: true, data: workspace })
  } catch (error) {
    console.error("Error updating workspace:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    await deleteWorkspace(id, session.user.id)
    return NextResponse.json({ success: true, data: { message: "Workspace deleted" } })
  } catch (error) {
    console.error("Error deleting workspace:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
