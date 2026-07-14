import { Fragment } from "react"
import { AtSign } from "lucide-react"
import { cn } from "@/lib/utils"

const MENTION_TOKEN = /(@[A-Za-z0-9_][A-Za-z0-9_ -]*?(?=\s|$|[.,!?:;]))/g

interface MentionTextProps {
  content: string
  className?: string
}

/**
 * Renders message content with @mentions highlighted. Mentions are stored as
 * `@Full Name` (or `@everyone` / `@team`). Purely visual; hover reveals intent.
 */
export function MentionText({ content, className }: MentionTextProps) {
  const parts = content.split(MENTION_TOKEN)

  return (
    <span className={cn("whitespace-pre-wrap break-words", className)}>
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          return (
            <span
              key={i}
              className="inline-flex items-center gap-0.5 rounded bg-blue-100 dark:bg-blue-900/30 px-1 font-medium text-blue-600 dark:text-blue-400"
            >
              <AtSign className="h-3 w-3" />
              {part.slice(1)}
            </span>
          )
        }
        return <Fragment key={i}>{part}</Fragment>
      })}
    </span>
  )
}
