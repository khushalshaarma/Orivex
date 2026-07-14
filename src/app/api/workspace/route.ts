import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createWorkspace, getWorkspaceBySlug } from "@/services/workspace"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, slug, logo, industry, companySize, timezone } = body

    if (!name || !slug) {
      return NextResponse.json({ success: false, error: "Name and slug are required" }, { status: 400 })
    }

    const existing = await getWorkspaceBySlug(slug)
    if (existing) {
      return NextResponse.json({ success: false, error: "A workspace with this slug already exists" }, { status: 409 })
    }

    const workspace = await createWorkspace({
      name,
      slug,
      logo,
      industry,
      companySize,
      timezone,
      ownerId: session.user.id,
    })

    return NextResponse.json({ success: true, data: workspace }, { status: 201 })
  } catch (error) {
    console.error("Error creating workspace:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
