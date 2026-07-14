"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Camera, Loader2, Save, Globe, Code2, Share2 } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ListSkeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Profile {
  id: string
  name: string | null
  email: string
  image: string | null
  username: string | null
  position: string | null
  department: string | null
  bio: string | null
  timezone: string | null
  skills: string[] | null
  github: string | null
  linkedin: string | null
  portfolio: string | null
  status: string
}

const timezones = [
  "UTC-8 (PST)", "UTC-7 (MST)", "UTC-6 (CST)", "UTC-5 (EST)",
  "UTC+0 (GMT)", "UTC+1 (CET)", "UTC+2 (EET)", "UTC+5:30 (IST)",
  "UTC+8 (CST)", "UTC+9 (JST)", "UTC+10 (AEST)", "UTC+12 (NZST)",
]

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession()
  const [, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    name: "",
    username: "",
    image: "",
    position: "",
    department: "",
    bio: "",
    timezone: "",
    github: "",
    linkedin: "",
    portfolio: "",
    status: "ACTIVE" as string,
  })
  const [skillInput, setSkillInput] = useState("")
  const [skills, setSkills] = useState<string[]>([])

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((json) => {
        const p = json.data as Profile
        setProfile(p)
        setForm({
          name: p.name ?? "",
          username: p.username ?? "",
          image: p.image ?? "",
          position: p.position ?? "",
          department: p.department ?? "",
          bio: p.bio ?? "",
          timezone: p.timezone ?? "",
          github: p.github ?? "",
          linkedin: p.linkedin ?? "",
          portfolio: p.portfolio ?? "",
          status: p.status ?? "ACTIVE",
        })
        setSkills((p.skills as string[]) ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, skills }),
      })
      if (res.ok) {
        setSaved(true)
        if (form.name !== session?.user?.name) {
          updateSession()
        }
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {
    } finally {
      setSaving(false)
    }
  }

  function addSkill() {
    const s = skillInput.trim()
    if (s && !skills.includes(s)) {
      setSkills([...skills, s])
      setSkillInput("")
    }
  }

  function removeSkill(s: string) {
    setSkills(skills.filter((x) => x !== s))
  }

  if (loading) return <ListSkeleton items={6} />

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader title="Profile" description="Manage your personal information" />

      {/* Avatar Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Avatar className="h-20 w-20">
                <AvatarImage src={form.image || undefined} />
                <AvatarFallback className="text-2xl">
                  {form.name?.charAt(0)?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <button className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-5 w-5 text-white" />
              </button>
            </div>
            <div className="flex-1">
              <Input
                placeholder="Avatar URL"
                value={form.image}
                onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))}
                className="text-sm"
              />
              <p className="text-xs text-zinc-400 mt-1">Paste an image URL for your avatar</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Position</Label>
              <Input
                placeholder="e.g. Senior Engineer"
                value={form.position}
                onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input
                placeholder="e.g. Engineering"
                value={form.department}
                onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Bio</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10"
              placeholder="Tell us about yourself"
              value={form.bio}
              onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select value={form.timezone} onValueChange={(v) => setForm((p) => ({ ...p, timezone: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Skills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-3">
            <Input
              placeholder="Add a skill"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
            />
            <Button variant="outline" onClick={addSkill}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <Badge key={s} variant="secondary" className="gap-1">
                {s}
                <button onClick={() => removeSkill(s)} className="ml-1 hover:text-red-500">&times;</button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Social Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Social Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Code2 className="h-4 w-4" /> GitHub</Label>
              <Input
                placeholder="https://github.com/username"
                value={form.github}
                onChange={(e) => setForm((p) => ({ ...p, github: e.target.value }))}
              />
            </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Share2 className="h-4 w-4" /> LinkedIn</Label>
            <Input
              placeholder="https://linkedin.com/in/username"
              value={form.linkedin}
              onChange={(e) => setForm((p) => ({ ...p, linkedin: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Globe className="h-4 w-4" /> Portfolio</Label>
            <Input
              placeholder="https://your-portfolio.com"
              value={form.portfolio}
              onChange={(e) => setForm((p) => ({ ...p, portfolio: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saved ? "Saved!" : "Save Changes"}
        </Button>
      </div>
    </div>
  )
}
