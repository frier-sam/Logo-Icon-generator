import * as React from "react"
import { Check } from "lucide-react"

import { cn } from "../../lib/utils"

const Checkbox = React.forwardRef(({ className, checked, onCheckedChange, ...props }, ref) => {
  const handleClick = () => {
    if (onCheckedChange) {
      onCheckedChange(!checked)
    }
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      ref={ref}
      className={cn(
        "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary text-primary-foreground" : "bg-background",
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {checked && (
        <Check className="h-4 w-4" />
      )}
    </button>
  )
})
Checkbox.displayName = "Checkbox"

export { Checkbox }
