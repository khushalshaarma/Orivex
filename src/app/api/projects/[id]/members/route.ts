import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const { userId, role } = await request.json()

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 })
    }

    const project = await prisma.project.findUnique({ where: { id } })
    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 })
    }

    const existing = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId, projectId: id } },
    })

    if (existing) {
      return NextResponse.json({ success: false, error: "User is already a member" }, { status: 409 })
    }

    const member = await prisma.projectMember.create({
      data: {
        userId,
        projectId: id,
        role: role ?? "MEMBER",
      },
      include: {
        user: { select: { id: true, name: true, image: true, email: true } },
      },
    })

    return NextResponse.json({ success: true, data: member }, { status: 201 })
  } catch (error) {
    console.error("Error adding project member:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
