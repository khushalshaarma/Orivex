import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getNotificationPreferences, upsertNotificationPreferences } from "@/services/notification"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const prefs = await getNotificationPreferences(session.user.id)
  return NextResponse.json({ success: true, data: prefs })
}

export async function PUT(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const prefs = await upsertNotificationPreferences(session.user.id, {
    settings: body.settings,
    digestFrequency: body.digestFrequency,
    browserEnabled: body.browserEnabled,
    emailEnabled: body.emailEnabled,
  })

  return NextResponse.json({ success: true, data: prefs })
}
