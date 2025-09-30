
import { useEffect, useState } from "react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent } from "@/components/ui/card"

const data = [
  { name: "Laptops", value: 120, color: "#0ea5e9", stock: 120, valor: 108000 },
  { name: "Monitores", value: 90, color: "#10b981", stock: 90, valor: 22500 },
  { name: "Accesorios", value: 290, color: "#f97316", stock: 290, valor: 14500 },
  { name: "Componentes", value: 215, color: "#8b5cf6", stock: 215, valor: 64500 },
  { name: "Periféricos", value: 125, color: "#ec4899", stock: 125, valor: 37500 },
]

export default function InventoryCategoryChart() {
  const [isMounted, setIsMounted] = useState(false)
  const [viewMode, setViewMode] = useState("stock")

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  // Preparar los datos según el modo de visualización
  const chartData = data.map((item) => ({
    ...item,
    value: viewMode === "stock" ? item.stock : item.valor,
  }))

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("stock")}
            className={`px-3 py-1 text-sm rounded-md ${
              viewMode === "stock" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            Por Cantidad
          </button>
          <button
            onClick={() => setViewMode("valor")}
            className={`px-3 py-1 text-sm rounded-md ${
              viewMode === "valor" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            Por Valor
          </button>
        </div>
      </div>
      <div className="flex flex-col md:flex-row items-center justify-center gap-8">
        <ResponsiveContainer width="100%" height={300} className="max-w-md mx-auto">
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <Card>
                      <CardContent className="py-2 px-3">
                        <p className="text-sm font-medium">{payload[0].name}</p>
                        <p className="text-sm font-bold">
                          {viewMode === "stock"
                            ? `${payload[0].payload.stock} unidades`
                            : `$${payload[0].payload.valor.toLocaleString()}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {Math.round((
                            (typeof payload[0].value === 'number' ? payload[0].value : 0) / 
                            (chartData.reduce((sum, item) => sum + (typeof item.value === 'number' ? item.value : 0), 0) || 1)
                          ) * 100)}%
                          del total
                        </p>
                      </CardContent>
                    </Card>
                  )
                }
                return null
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="grid grid-cols-2 gap-4">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
              <div>
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {viewMode === "stock" ? `${item.stock} unidades` : `$${item.valor.toLocaleString()}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
