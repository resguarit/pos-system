
import { useEffect, useState } from "react"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent } from "@/components/ui/card"

const data = [
  { name: "Semana 1", actual: 4200, anterior: 3800 },
  { name: "Semana 2", actual: 5100, anterior: 4300 },
  { name: "Semana 3", actual: 4800, anterior: 4100 },
  { name: "Semana 4", actual: 6300, anterior: 5200 },
]

export default function SalesComparisonChart() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" />
        <YAxis tickFormatter={(value) => `$${value.toLocaleString("es-AR")}`} />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const actual = payload[0].payload.actual;
              const anterior = payload[0].payload.anterior;
              const diferencia = actual - anterior;
              return (
                <Card>
                  <CardContent className="py-2 px-3">
                    <p className="text-sm font-medium">{payload[0].payload.name}</p>
                    <div className="space-y-1 mt-2">
                      <p className="text-xs flex items-center justify-between">
                        <span className="flex items-center">
                          <span className="w-2 h-2 rounded-full bg-[#0ea5e9] mr-1"></span>
                          Período actual:
                        </span>
                        <span className="font-bold">${actual.toLocaleString("es-AR")}</span>
                      </p>
                      <p className="text-xs flex items-center justify-between">
                        <span className="flex items-center">
                          <span className="w-2 h-2 rounded-full bg-[#94a3b8] mr-1"></span>
                          Período anterior:
                        </span>
                        <span className="font-bold">${anterior.toLocaleString("es-AR")}</span>
                      </p>
                      <p className="text-xs flex items-center justify-between mt-1 pt-1 border-t">
                        <span>Diferencia:</span>
                        <span
                          className={`font-bold ${diferencia > 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {diferencia > 0 ? "+" : ""}${diferencia.toLocaleString("es-AR")}
                        </span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )
            }
            return null
          }}
        />
        <Legend />
        <Bar dataKey="anterior" name="Período Anterior" fill="#94a3b8" radius={[4, 4, 0, 0]} />
        <Bar dataKey="actual" name="Período Actual" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

