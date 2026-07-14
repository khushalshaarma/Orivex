export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code?: string
  ) {
    super(message)
    this.name = "AppError"
  }
}

export class NotFoundError extends AppError {
  constructor(entity = "Resource") {
    super(`${entity} not found`, 404, "NOT_FOUND")
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super("Unauthorized", 401, "UNAUTHORIZED")
  }
}

export class ForbiddenError extends AppError {
  constructor() {
    super("Forbidden", 403, "FORBIDDEN")
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 422, "VALIDATION_ERROR")
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof AppError) {
    return {
      success: false as const,
      error: error.message,
      status: error.statusCode,
    }
  }

  console.error("Unhandled API error:", error)
  return {
    success: false as const,
    error: "Internal server error",
    status: 500,
  }
}