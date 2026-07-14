import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { v4 as uuidv4 } from "uuid"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const taskId = formData.get("taskId") as string | null
    const projectId = formData.get("projectId") as string | null

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 })
    }

    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ success: false, error: "File too large. Max 50MB" }, { status: 400 })
    }

    const ext = file.name.split(".").pop() ?? "bin"
    const fileName = `${uuidv4()}.${ext}`
    const uploadDir = join(process.cwd(), "public", "uploads")
    const filePath = join(uploadDir, fileName)

    await mkdir(uploadDir, { recursive: true })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    const url = `/uploads/${fileName}`

    let attachment = null
    if (taskId || projectId) {
      attachment = await prisma.attachment.create({
        data: {
          name: file.name,
          url,
          type: file.type,
          size: file.size,
          taskId: taskId || null,
          projectId: projectId || null,
          uploadedById: session.user.id,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: attachment ?? {
        id: uuidv4(),
        name: file.name,
        url,
        type: file.type,
        size: file.size,
      },
      url,
      filename: file.name,
      size: file.size,
      type: file.type,
    })
  } catch (error) {
    console.error("Error uploading file:", error)
    return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 })
  }
}
