"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { useWorkspace } from "@/hooks/use-workspace"
import { useCurrentMemberRole } from "@/hooks/use-permissions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Skull, Download } from "lucide-react"
import { hasPermission } from "@/config/permissions"

export default function SettingsDangerPage() {
  const router = useRouter()
  const { workspace } = useWorkspace()
  const { role } = useCurrentMemberRole(workspace?.id)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const canDelete = workspace && hasPermission(role, "workspace:delete")
  const canExport = workspace && hasPermission(role, "workspace:export")
  const canTransfer = workspace && hasPermission(role, "workspace:transfer_ownership")

  async function handleDelete() {
    if (!workspace?.id) return
    setDeleting(true)
    try {
      await fetch(`/api/workspace/${workspace.id}`, { method: "DELETE" })
      await signOut({ redirect: false })
      router.push("/auth/login")
    } catch {
    } finally {
      setDeleting(false)
    }
  }

  if (!canDelete && !canExport && !canTransfer) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-zinc-500">You don&apos;t have permission to access this section.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {canExport && (
        <Card className="border-red-200 dark:border-red-900/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Workspace
            </CardTitle>
            <CardDescription>
              Download all workspace data as a JSON archive.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>
          </CardContent>
        </Card>
      )}

      {canDelete && (
        <Card className="border-red-200 dark:border-red-900/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-red-600 dark:text-red-400">
              <Skull className="h-4 w-4" />
              Delete Workspace
            </CardTitle>
            <CardDescription>
              Permanently delete this workspace and all its data. This action cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Skull className="mr-2 h-4 w-4" />
              Delete Workspace
            </Button>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete workspace?"
        description={`Type "${workspace?.name}" to confirm deletion. This cannot be undone.`}
        confirmLabel={deleting ? "Deleting..." : "Delete Forever"}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
