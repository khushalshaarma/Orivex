import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-indigo-500/50 dark:focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 selection:bg-indigo-500/20 selection:text-zinc-900 dark:selection:bg-indigo-500/40 dark:selection:text-white caret-zinc-900 dark:caret-zinc-100",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
