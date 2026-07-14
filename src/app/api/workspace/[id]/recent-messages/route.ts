import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/config/permissions"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId: id } },
  })
  if (!member || !hasPermission(member.role, "message:send")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const limit = parseInt(request.nextUrl.searchParams.get("limit") ?? "8")

  const messages = await prisma.message.findMany({
    where: { workspaceId: id, deleted: false, parentId: null },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      sender: { select: { id: true, name: true, image: true } },
      channel: { select: { id: true, name: true } },
      conversation: { select: { id: true } },
    },
  })

  return NextResponse.json({ success: true, data: messages })
}
