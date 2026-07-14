import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { inviteMember, getPendingInvitations } from "@/services/workspace"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const invitations = await getPendingInvitations(id)

  return NextResponse.json({ success: true, data: invitations })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { email, role } = body

  if (!email) {
    return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 })
  }

  console.log("[invite] API called")
  console.log("[invite] calling workspaceService")

  try {
    const invitation = await inviteMember({
      email,
      workspaceId: id,
      invitedById: session.user.id,
      role: role ?? "DEVELOPER",
    })

    const response: Record<string, unknown> = {
      success: true,
      data: invitation,
      invitationCreated: true,
      invitationId: invitation.id,
      notificationCreated: invitation.notificationCreated ?? false,
      notificationError: invitation.notificationError ?? null,
      emailSent: invitation.emailSent,
      emailError: invitation.emailError ?? null,
      messageId: invitation.emailMessageId ?? null,
    }

    const problems: string[] = []
    if (!invitation.notificationCreated) {
      problems.push(
        `Notification failed: ${invitation.notificationError ?? "unknown error"}`,
      )
    }
    if (!invitation.emailSent) {
      problems.push(`Email delivery failed: ${invitation.emailError ?? "unknown error"}`)
    }

    if (problems.length > 0) {
      response.warning = `Invitation created. ${problems.join(" ")}`
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send invitation"
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}
