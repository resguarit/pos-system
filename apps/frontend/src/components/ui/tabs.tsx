

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { usePrimaryColor } from "@/hooks/usePrimaryColor"
import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & { children?: React.ReactNode }
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & { children?: React.ReactNode }
>(({ className, style, ...props }, ref) => {
  const primaryColor = usePrimaryColor()

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      style={{
        ...style,
        "--tab-primary-color": primaryColor,
        "--tab-primary-foreground": "hsl(var(--primary-foreground, 0 0% 100%))",
      } as React.CSSProperties}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        "data-[state=active]:bg-[color:var(--tab-primary-color)] data-[state=active]:text-[color:var(--tab-primary-foreground)] data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-[color:var(--tab-primary-color)] data-[state=active]:ring-offset-1 data-[state=active]:ring-offset-background",
        className
      )}
      {...props}
    />
  )
})
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content> & { children?: React.ReactNode }
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
