
import { useEffect, useState } from "react"
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent } from "@/components/ui/card"

const data = [
  { date: "01/03", ventas: 2400 },
  { date: "02/03", ventas: 1398 },
  { date: "03/03", ventas: 3800 },
  { date: "04/03", ventas: 3908 },
  { date: "05/03", ventas: 4800 },
  { date: "06/03", ventas: 3800 },
  { date: "07/03", ventas: 4300 },
  { date: "08/03", ventas: 5300 },
  { date: "09/03", ventas: 4900 },
  { date: "10/03", ventas: 3900 },
  { date: "11/03", ventas: 4800 },
  { date: "12/03", ventas: 5200 },
  { date: "13/03", ventas: 5600 },
  { date: "14/03", ventas: 6700 },
  { date: "15/03", ventas: 7200 },
  { date: "16/03", ventas: 6300 },
  { date: "17/03", ventas: 6000 },
  { date: "18/03", ventas: 5400 },
  { date: "19/03", ventas: 5800 },
  { date: "20/03", ventas: 6000 },
  { date: "21/03", ventas: 6300 },
  { date: "22/03", ventas: 6500 },
  { date: "23/03", ventas: 7500 },
]

export default function SalesChart() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} />
        <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `$${value.toLocaleString("es-AR")}`} tickMargin={10} />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <Card>
                  <CardContent className="py-2 px-3">
                    <p className="text-sm font-medium">{payload[0].payload.date}</p>
                    <p className="text-sm font-bold">${typeof payload[0].value === 'number' ? payload[0].value.toLocaleString("es-AR") : payload[0].value}</p>
                  </CardContent>
                </Card>
              )
            }
            return null
          }}
        />
        <Line
          type="monotone"
          dataKey="ventas"
          stroke="#0ea5e9"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

