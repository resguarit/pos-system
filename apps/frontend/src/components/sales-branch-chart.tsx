
import { useEffect, useState } from "react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent } from "@/components/ui/card"

const data = [
  { name: "Central", value: 18500, color: "#0ea5e9" },
  { name: "Norte", value: 12300, color: "#10b981" },
  { name: "Sur", value: 9800, color: "#f97316" },
  { name: "Este", value: 7600, color: "#8b5cf6" },
]

export default function SalesBranchChart() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-8">
      <ResponsiveContainer width="100%" height={300} className="max-w-md mx-auto">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <Card>
                    <CardContent className="py-2 px-3">
                      <p className="text-sm font-medium">{payload[0].payload.name}</p>
                      <p className="text-sm font-bold">${payload[0].value}</p>
                      {typeof payload[0].value === 'number' && (
                        <p className="text-xs text-muted-foreground">
                          {Math.round((payload[0].value / data.reduce((sum, item) => sum + item.value, 0)) * 100)}% del total
                        </p>
                      )}
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
              <p className="text-xs text-muted-foreground">${item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

