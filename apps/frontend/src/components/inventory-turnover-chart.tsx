import type React from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"

interface SalesStatisticsChartProps {
  data: {
    name: string
    ventas: number
  }[]
}

const SalesStatisticsChart: React.FC<SalesStatisticsChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="ventas" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => {
            let fillColor = "rgb(239, 68, 68)" // Rojo por defecto
            if (entry.ventas > 1000) {
              fillColor = "rgb(34, 197, 94)" // Verde
            } else if (entry.ventas >= 500) {
              fillColor = "rgb(245, 158, 11)" // Ámbar
            }
            return <Cell key={`cell-${index}`} fill={fillColor} />
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export default SalesStatisticsChart