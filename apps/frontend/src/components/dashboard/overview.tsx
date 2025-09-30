import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { LoadingSkeleton, EmptyState } from "@/components/ui/loading-states"

interface OverviewProps {
  data?: Array<{
    name: string
    total: number
  }>
  isLoading?: boolean
}

export function Overview({ data = [], isLoading = false }: OverviewProps) {
  if (isLoading) {
    return (
      <LoadingSkeleton 
        className="w-full h-[220px] sm:h-[260px] md:h-[300px] lg:h-[340px]"
        items={8}
      />
    )
  }

  if (data.length === 0) {
    return (
      <EmptyState 
        icon="chart"
        title="No hay datos de ventas disponibles"
        className="w-full h-[220px] sm:h-[260px] md:h-[300px] lg:h-[340px]"
      />
    )
  }

  return (
    <div className="w-full h-[220px] sm:h-[260px] md:h-[300px] lg:h-[340px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${value.toLocaleString()}`}
          />
          <Tooltip
            formatter={(value: number) => [
              `$${value.toLocaleString("es-AR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}`,
              "Total"
            ]}
            labelStyle={{ color: "#374151" }}
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "14px"
            }}
          />
          <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

