
import { useEffect, useState } from 'react'
import { usePrimaryColor } from '@/hooks/usePrimaryColor'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent } from '@/components/ui/card'

interface ProductData {
  name: string
  cantidad: number
  ingresos: number
}

interface ProductsChartProps {
  data: ProductData[]
}

export default function ProductsChart({ data }: ProductsChartProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [metric, setMetric] = useState('cantidad')
  const primaryColor = usePrimaryColor()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setMetric('cantidad')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${metric === 'cantidad'
              ? 'text-white'
              : 'bg-muted text-muted-foreground'
              }`}
            style={{
              backgroundColor: metric === 'cantidad' ? primaryColor : undefined
            }}
          >
            Cantidad
          </button>
          <button
            onClick={() => setMetric('ingresos')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${metric === 'ingresos'
              ? 'text-white'
              : 'bg-muted text-muted-foreground'
              }`}
            style={{
              backgroundColor: metric === 'ingresos' ? primaryColor : undefined
            }}
          >
            Ingresos
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 40, bottom: 60 }}>
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            angle={-45}
            textAnchor="end"
            height={100}
            interval={0}
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => value.length > 20 ? `${value.substring(0, 20)}...` : value}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => metric === 'ingresos' ? `$${value.toLocaleString("es-AR")}` : value.toLocaleString("es-AR")}
            tickMargin={10}
            width={80}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <Card>
                    <CardContent className="py-2 px-3">
                      <p className="text-sm font-medium">{payload[0].payload.name}</p>
                      <p className="text-sm font-bold">
                        {metric === 'ingresos'
                          ? `$${payload[0].payload.ingresos.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : `${payload[0].payload.cantidad.toLocaleString("es-AR")} unidades`}
                      </p>
                    </CardContent>
                  </Card>
                )
              }
              return null
            }}
          />
          <Bar
            dataKey={metric}
            fill={primaryColor}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
