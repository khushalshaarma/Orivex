import * as React from "react"
import { Root as LabelPrimitiveRoot } from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
)

interface LabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitiveRoot>,
    VariantProps<typeof labelVariants> {}

const Label = React.forwardRef<React.ElementRef<typeof LabelPrimitiveRoot>, LabelProps>(
  ({ className, ...props }, ref) => (
    <LabelPrimitiveRoot ref={ref} className={cn(labelVariants(), className)} {...props} />
  )
)
Label.displayName = "Label"

export { Label }