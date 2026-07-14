import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { bulkMarkAsRead, bulkArchive, bulkDelete, pinNotification, unpinNotification } from "@/services/notification"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { action, ids } = await request.json()

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ success: false, error: "ids must be a non-empty array" }, { status: 400 })
  }

  switch (action) {
    case "read":
      await bulkMarkAsRead(ids)
      break
    case "archive":
      await bulkArchive(ids)
      break
    case "delete":
      await bulkDelete(ids)
      break
    case "pin":
      await Promise.all(ids.map((id: string) => pinNotification(id)))
      break
    case "unpin":
      await Promise.all(ids.map((id: string) => unpinNotification(id)))
      break
    default:
      return NextResponse.json({ success: false, error: `Invalid action: ${action}` }, { status: 400 })
  }

  return NextResponse.json({ success: true, data: { message: `Bulk ${action} completed` } })
}
