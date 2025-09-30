import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

export type RepairsStatusCardProps = {
  title: string
  icon?: ReactNode
  count: number
  loading?: boolean
  // Optional footer actions (e.g., Ver todas)
  footer?: ReactNode
}

export default function RepairsStatusCard({ title, icon, count, loading, footer }: RepairsStatusCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", loading && "opacity-60")}>{loading ? "..." : count}</div>
        {footer}
      </CardContent>
    </Card>
  )
}
