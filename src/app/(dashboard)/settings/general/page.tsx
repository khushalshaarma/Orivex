"use client"

import { useState, useEffect } from "react"
import { useWorkspace } from "@/hooks/use-workspace"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Save } from "lucide-react"

export default function SettingsGeneralPage() {
  const { workspace } = useWorkspace()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({ name: "", slug: "", industry: "", companySize: "", timezone: "" })

  useEffect(() => {
    if (workspace) {
      setForm({ // eslint-disable-line react-hooks/set-state-in-effect
        name: workspace.name ?? "",
        slug: workspace.slug ?? "",
        industry: workspace.industry ?? "",
        companySize: workspace.companySize ?? "",
        timezone: workspace.timezone ?? "",
      })
    }
  }, [workspace])

  async function handleSave() {
    if (!workspace?.id) return
    setSaving(true)
    try {
      const res = await fetch(`/api/workspace/${workspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">General</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm(p => ({...p, name: e.target.value}))} />
          </div>
          <div className="space-y-2">
            <Label>Slug</Label>
            <Input value={form.slug} onChange={(e) => setForm(p => ({...p, slug: e.target.value}))} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Industry</Label>
            <Input value={form.industry} onChange={(e) => setForm(p => ({...p, industry: e.target.value}))} />
          </div>
          <div className="space-y-2">
            <Label>Company Size</Label>
            <Input value={form.companySize} onChange={(e) => setForm(p => ({...p, companySize: e.target.value}))} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Timezone</Label>
          <Input value={form.timezone} onChange={(e) => setForm(p => ({...p, timezone: e.target.value}))} />
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saved ? "Saved!" : "Save Changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
