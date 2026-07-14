import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getNotifications, createNotification } from "@/services/notification"
import type { NotificationFilter } from "@/services/notification"
import type { NotificationCategory, NotificationPriority } from "@prisma/client"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const read = searchParams.get("read")
  const archived = searchParams.get("archived")
  const pinned = searchParams.get("pinned")
  const category = searchParams.get("category")
  const priority = searchParams.get("priority")
  const search = searchParams.get("search")
  const workspaceId = searchParams.get("workspaceId")
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")
  const page = parseInt(searchParams.get("page") ?? "1")
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20")

  const filter: NotificationFilter = { userId: session.user.id }
  if (read !== null) filter.read = read === "true"
  if (archived !== null) filter.archived = archived === "true"
  if (pinned !== null) filter.pinned = pinned === "true"
  if (category) filter.category = category as NotificationCategory | NotificationCategory[]
  if (priority) filter.priority = priority as NotificationPriority | NotificationPriority[]
  if (search) filter.search = search
  if (workspaceId) filter.workspaceId = workspaceId
  if (startDate) filter.startDate = new Date(startDate)
  if (endDate) filter.endDate = new Date(endDate)

  const result = await getNotifications(filter, { page, pageSize })

  return NextResponse.json({ success: true, data: result })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const notification = await createNotification(body)

  return NextResponse.json({ success: true, data: notification }, { status: 201 })
}
