
import { useEffect, useState } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent } from '@/components/ui/card'

const data = [
  { date: '01/01', valor: 220000 },
  { date: '15/01', valor: 225000 },
  { date: '01/02', valor: 232000 },
  { date: '15/02', valor: 238000 },
  { date: '01/03', valor: 242000 },
  { date: '15/03', valor: 248000 },
  { date: '30/03', valor: 252000 },
]

export default function InventoryValueChart() {
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
        <XAxis 
          dataKey="date" 
          tickLine={false} 
          axisLine={false} 
          tickMargin={10}
        />
        <YAxis 
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${value/1000}k`}
          tickMargin={10}
        />
        <Tooltip 
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <Card>
                  <CardContent className="py-2 px-3">
                    <p className="text-sm font-medium">{payload[0].payload.date}</p>
                    {payload[0].value && (
                      <p className="text-sm font-bold">${payload[0].value.toLocaleString()}</p>
                    )}
                    {payload[0].payload.date !== '01/01' && typeof payload[0].value === 'number' && (
                      <p className="text-xs text-green-600">
                        +${(payload[0].value - data[data.findIndex(item => item.date === payload[0].payload.date) - 1].valor).toLocaleString()} desde la medición anterior
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            }
            return null
          }}
        />
        <Line 
          type="monotone" 
          dataKey="valor" 
          stroke="#10b981" 
          strokeWidth={2} 
          dot={{ fill: '#10b981', r: 4 }} 
          activeDot={{ r: 6, strokeWidth: 0 }} 
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
