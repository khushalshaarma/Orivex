import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { registerSchema } from "@/schemas/auth"
import { successResponse, errorResponse } from "@/utils/api-response"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Validation failed"
      return errorResponse(firstError, 422)
    }

    const { name, email, password } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return errorResponse("An account with this email already exists", 409)
    }

    const passwordHash = await bcrypt.hash(password, 12)

    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    })

    return successResponse({ message: "Account created successfully" }, 201)
  } catch (error) {
    console.error("Registration error:", error)
    return errorResponse("Internal server error", 500)
  }
}