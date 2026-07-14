export type {
  WorkspaceRole,
  InvitationStatus,
  UserStatus,
} from "@prisma/client"

export type { Role } from "@prisma/client"

export interface SessionUser {
  id: string
  email: string
  name?: string | null
  image?: string | null
}

export interface ActionResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type AsyncAction<T = unknown> = Promise<ActionResponse<T>>
