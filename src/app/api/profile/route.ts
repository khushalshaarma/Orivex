import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getProfile, updateProfile } from "@/services/profile"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const profile = await getProfile(session.user.id)

  if (!profile) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: profile })
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()

  try {
    const profile = await updateProfile(session.user.id, body)
    return NextResponse.json({ success: true, data: profile })
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      const prismaError = error as Error & { code: string }
      if (prismaError.code === "P2002") {
        return NextResponse.json({ success: false, error: "Username already taken" }, { status: 409 })
      }
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
