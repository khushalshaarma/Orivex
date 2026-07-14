import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notifyWorkspace } from "@/services/notification"
import { writeFile } from "fs/promises"
import { join } from "path"
import { v4 as uuidv4 } from "uuid"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { id } = await params
    const attachments = await prisma.attachment.findMany({
      where: { projectId: id },
      include: {
        uploadedBy: { select: { id: true, name: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json({ success: true, data: attachments })
  } catch (error) {
    console.error("Error getting project attachments:", error)
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
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 })
    }

    const ext = file.name.split(".").pop() ?? "bin"
    const fileName = `${uuidv4()}.${ext}`
    const uploadDir = join(process.cwd(), "public", "uploads")
    const filePath = join(uploadDir, fileName)

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    try {
      await writeFile(filePath, buffer)
    } catch {
      const { mkdir } = await import("fs/promises")
      await mkdir(uploadDir, { recursive: true })
      await writeFile(filePath, buffer)
    }

    const attachment = await prisma.attachment.create({
      data: {
        name: file.name,
        url: `/uploads/${fileName}`,
        type: file.type,
        size: file.size,
        projectId: id,
        uploadedById: session.user.id,
      },
      include: {
        uploadedBy: { select: { id: true, name: true, image: true } },
      },
    })

    try {
      const project = await prisma.project.findUnique({
        where: { id },
        select: { name: true, team: { select: { workspaceId: true } } },
      })
      if (project?.team.workspaceId) {
        await notifyWorkspace(project.team.workspaceId, {
          type: "attachment.uploaded",
          category: "PROJECT",
          priority: "LOW",
          title: `New file in ${project.name}`,
          message: `${attachment.uploadedBy?.name ?? "A member"} uploaded ${file.name}`,
          actorId: session.user.id,
          entityId: attachment.id,
          entityType: "attachment",
          link: `/projects/${id}`,
          excludeUserId: session.user.id,
        })
      }
    } catch {
      // attachment notification is best-effort
    }

    return NextResponse.json({ success: true, data: attachment }, { status: 201 })
  } catch (error) {
    console.error("Error uploading file:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
