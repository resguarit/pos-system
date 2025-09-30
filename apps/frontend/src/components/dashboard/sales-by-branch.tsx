
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { LoadingSkeleton, EmptyState } from "@/components/ui/loading-states"
import { Building2 } from "lucide-react"

interface SalesByBranchData {
  branch_id: number
  branch_name: string
  total: number
  count: number
}

interface SalesByBranchProps {
  data?: SalesByBranchData[]
  isLoading?: boolean
}

export function SalesByBranch({ data = [], isLoading = false }: SalesByBranchProps) {
  // Forzar estado vacío para probar
  if (true) {
    return (
      <div className="h-[350px] flex flex-col items-center justify-center text-center">
        <Building2 className="h-8 w-8 text-gray-400 mb-4" />
        <p className="text-sm text-gray-500">No hay datos de ventas por sucursal disponibles</p>
        <p className="text-xs text-gray-400 mt-1">No se encontraron ventas para mostrar en el período seleccionado</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <LoadingSkeleton 
        className="h-[350px] w-full"
        items={6}
      />
    )
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState 
        icon={<Building2 className="h-8 w-8 text-gray-400" />}
        title="No hay datos de ventas por sucursal disponibles"
        description="No se encontraron ventas para mostrar en el período seleccionado"
        className="h-[350px]"
      />
    )
  }

  // Transformar los datos para el gráfico
  const chartData = data.map(item => ({
    name: item.branch_name,
    total: item.total,
    count: item.count
  }))

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={chartData}>
        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${value.toLocaleString()}`}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            name === "total" 
              ? `$${value.toLocaleString("es-AR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}`
              : value,
            name === "total" ? "Total Ventas" : name
          ]}
          labelStyle={{ color: "#374151" }}
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            fontSize: "14px"
          }}
        />
        <Bar
          dataKey="total"
          radius={[4, 4, 0, 0]}
          fill="#2563eb"
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
