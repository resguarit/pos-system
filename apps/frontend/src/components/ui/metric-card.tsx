import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  isLoading?: boolean
  subtitleColor?: string
}

export function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  isLoading = false,
  subtitleColor = "text-muted-foreground"
}: MetricCardProps) {
  return (
    <Card className="border border-gray-200 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-24 mb-1"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold text-gray-900">
              {value}
            </div>
            {subtitle && (
              <p className={`text-xs ${subtitleColor}`}>
                {subtitle}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
