"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"

type Status = "loading" | "authenticating" | "success" | "error"

function AcceptInvitationContent() {
  const searchParams = useSearchParams()
  const { status: sessionStatus } = useSession()
  const token = searchParams.get("token")

  const [status, setStatus] = useState<Status>("loading")
  const [message, setMessage] = useState<string>("")

  useEffect(() => {
    if (!token || sessionStatus !== "authenticated") return

    let cancelled = false

    async function accept() {
      setStatus("authenticating")
      try {
        const res = await fetch("/api/invitations/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        })
        const json = await res.json()
        if (cancelled) return
        if (res.ok && json.success) {
          setStatus("success")
        } else {
          setStatus("error")
          setMessage(json.error || "We could not accept this invitation.")
        }
      } catch {
        if (cancelled) return
        setStatus("error")
        setMessage("Network error while accepting the invitation.")
      }
    }

    accept()
    return () => {
      cancelled = true
    }
  }, [token, sessionStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  const callbackUrl = `/invitations/accept?token=${token ?? ""}`

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Workspace Invitation
          </h1>
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">
            This invitation link is missing a token.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
          >
            Back to app
          </Link>
        </div>
      </main>
    )
  }

  if (sessionStatus === "unauthenticated") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Workspace Invitation
          </h1>
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            Please sign in or create an account to accept this invitation.
          </p>
          <div className="mt-4 flex gap-3">
            <Link
              href={`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
            >
              Sign in
            </Link>
            <Link
              href={`/auth/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
            >
              Create account
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Workspace Invitation
        </h1>

        {status === "loading" || status === "authenticating" ? (
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            {status === "authenticating"
              ? "Accepting your invitation…"
              : "Checking your invitation…"}
          </p>
        ) : null}

        {status === "success" ? (
          <div className="mt-4">
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              You&apos;re in! Redirecting you to your workspace…
            </p>
            <Link
              href="/dashboard"
              className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : null}

        {status === "error" ? (
          <div className="mt-4">
            <p className="text-sm text-red-600 dark:text-red-400">
              {message || "This invitation could not be accepted."}
            </p>
            <Link
              href="/dashboard"
              className="mt-4 inline-block rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
            >
              Back to app
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  )
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={null}>
      <AcceptInvitationContent />
    </Suspense>
  )
}
