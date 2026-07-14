import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getChannelsByWorkspace, createChannel } from "@/services/channel"
import { hasPermission } from "@/config/permissions"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get("workspaceId")

  if (!workspaceId) {
    return NextResponse.json({ success: false, error: "workspaceId is required" }, { status: 400 })
  }

  try {
    const channels = await getChannelsByWorkspace(workspaceId)
    return NextResponse.json({ success: true, data: channels })
  } catch (error) {
    console.error("Error getting channels:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { workspaceId, name, description, icon, color, type } = body

    console.log("[POST /api/channels] Request", {
      body: { workspaceId, name, description, type },
      userId: session.user.id,
    })

    if (!workspaceId || !name?.trim()) {
      console.warn("[POST /api/channels] Missing fields", { workspaceId, name })
      return NextResponse.json({ success: false, error: "workspaceId and name are required" }, { status: 400 })
    }

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } })
    if (!workspace) {
      console.warn("[POST /api/channels] Workspace not found", { workspaceId })
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 })
    }

    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: session.user.id, workspaceId } },
    })
    if (!member) {
      console.warn("[POST /api/channels] User is not a workspace member", { userId: session.user.id, workspaceId })
      return NextResponse.json({ success: false, error: "You are not a member of this workspace" }, { status: 403 })
    }
    if (!hasPermission(member.role, "channel:create")) {
      console.warn("[POST /api/channels] Insufficient permissions", { userId: session.user.id, role: member.role })
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const channel = await createChannel({
      name: name.trim(),
      description,
      icon,
      color,
      type,
      workspaceId,
      createdBy: session.user.id,
    })

    console.log("[POST /api/channels] Channel created", {
      channelId: channel.id,
      name: channel.name,
      slug: channel.slug,
      workspaceId,
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        workspaceId,
        action: "channel.created",
        entity: "channel",
        entityId: channel.id,
        metadata: { name: channel.name, type: channel.type },
      } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    })

    return NextResponse.json({ success: true, data: channel }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/channels] Error:", error)
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}
