import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

export type ServicesStatusCardProps = {
    title: string
    icon?: ReactNode
    value: string | number
    subtitle?: string
    loading?: boolean
    className?: string
    onClick?: () => void
}

export default function ServicesStatusCard({
    title,
    icon,
    value,
    subtitle,
    loading,
    className,
    onClick,
}: ServicesStatusCardProps) {
    return (
        <Card
            className={cn(
                "transition-all duration-200",
                onClick && "cursor-pointer hover:shadow-md hover:scale-[1.02]",
                className
            )}
            onClick={onClick}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className={cn("text-2xl font-bold", loading && "opacity-60")}>
                    {loading ? "..." : value}
                </div>
                {subtitle && (
                    <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
                )}
            </CardContent>
        </Card>
    )
}
