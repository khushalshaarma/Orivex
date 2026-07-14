import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      activeWorkspaceId?: string | null
    }
  }

  interface User {
    activeWorkspaceId?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    activeWorkspaceId?: string | null
  }
}
