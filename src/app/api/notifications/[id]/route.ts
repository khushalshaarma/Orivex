import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getNotification, markAsRead, archiveNotification, pinNotification, unpinNotification, deleteNotification } from "@/services/notification"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const notification = await getNotification(id)

  if (!notification) {
    return NextResponse.json({ success: false, error: "Notification not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: notification })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  if (body.read === true) {
    await markAsRead(id)
  }
  if (body.archived === true) {
    await archiveNotification(id)
  }
  if (body.pinned === true) {
    await pinNotification(id)
  } else if (body.pinned === false) {
    await unpinNotification(id)
  }

  const notification = await getNotification(id)
  return NextResponse.json({ success: true, data: notification })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  await deleteNotification(id)

  return NextResponse.json({ success: true, data: { message: "Notification deleted" } })
}
