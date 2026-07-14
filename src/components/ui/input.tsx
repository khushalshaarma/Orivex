import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-offset-zinc-950 dark:placeholder:text-zinc-500 dark:focus-visible:ring-indigo-500 dark:focus-visible:border-indigo-500 selection:bg-indigo-500/20 selection:text-zinc-900 dark:selection:bg-indigo-500/40 dark:selection:text-white caret-zinc-900 dark:caret-zinc-100 autofill:bg-white dark:autofill:bg-zinc-900 autofill:text-zinc-900 dark:autofill:text-zinc-100 autofill:shadow-[inset_0_0_0px_1000px_rgb(255,255,255)] dark:autofill:shadow-[inset_0_0_0px_1000px_rgb(24,24,27)]",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }