import * as React from "react"
import { cn } from "../../lib/utils"

const Popover = ({ children, open, onOpenChange }) => {
  const [isOpen, setIsOpen] = React.useState(open || false)

  React.useEffect(() => {
    setIsOpen(open)
  }, [open])

  const handleToggle = () => {
    const newState = !isOpen
    setIsOpen(newState)
    if (onOpenChange) {
      onOpenChange(newState)
    }
  }

  return (
    <div className="relative inline-block">
      {React.Children.map(children, child => {
        if (child.type === PopoverTrigger) {
          return React.cloneElement(child, { onClick: handleToggle })
        }
        if (child.type === PopoverContent) {
          return isOpen ? child : null
        }
        return child
      })}
    </div>
  )
}

const PopoverTrigger = React.forwardRef(({ className, children, onClick, ...props }, ref) => {
  return (
    <div ref={ref} onClick={onClick} className={cn("cursor-pointer", className)} {...props}>
      {children}
    </div>
  )
})
PopoverTrigger.displayName = "PopoverTrigger"

const PopoverContent = React.forwardRef(({ className, children, align = "center", ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 mt-2 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95",
        align === "start" && "left-0",
        align === "center" && "left-1/2 -translate-x-1/2",
        align === "end" && "right-0",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
PopoverContent.displayName = "PopoverContent"

export { Popover, PopoverTrigger, PopoverContent }
