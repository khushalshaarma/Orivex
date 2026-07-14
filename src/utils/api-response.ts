import { NextResponse } from "next/server"

export type ApiResponse<T = unknown> = {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function errorResponse(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status })
}

export function unauthorizedResponse() {
  return errorResponse("Unauthorized", 401)
}

export function forbiddenResponse() {
  return errorResponse("Forbidden", 403)
}

export function notFoundResponse(entity = "Resource") {
  return errorResponse(`${entity} not found`, 404)
}