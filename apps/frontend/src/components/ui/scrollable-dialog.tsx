import * as React from "react"
import { DialogContent as BaseDialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface ScrollableDialogContentProps extends React.ComponentProps<typeof BaseDialogContent> {
  maxHeight?: string;
}

const ScrollableDialogContent = React.forwardRef<
  React.ElementRef<typeof BaseDialogContent>,
  ScrollableDialogContentProps
>(({ className, maxHeight = "90vh", children, ...props }, ref) => (
  <BaseDialogContent
    ref={ref}
    className={cn(
      "max-h-[90vh] overflow-hidden flex flex-col",
      className
    )}
    style={{ maxHeight }}
    {...props}
  >
    <div className="flex-1 overflow-y-auto scrollbar-hide">
      {children}
    </div>
  </BaseDialogContent>
))

ScrollableDialogContent.displayName = "ScrollableDialogContent"

export { ScrollableDialogContent }
