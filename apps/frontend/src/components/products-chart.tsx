
import { useEffect, useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent } from '@/components/ui/card'

const data = [
  { name: 'Laptop HP 15', cantidad: 42, ingresos: 37799.58 },
  { name: 'Teclado Mecánico RGB', cantidad: 38, ingresos: 3419.62 },
  { name: 'Auriculares Bluetooth', cantidad: 35, ingresos: 2099.65 },
  { name: 'Monitor Samsung 24', cantidad: 29, ingresos: 7249.71 },
  { name: 'Tableta Grafica', cantidad: 24, ingresos: 2399.76 },
  { name: 'Mouse Inalámbrico', cantidad: 22, ingresos: 659.78 },
  { name: 'Impresora Epson', cantidad: 18, ingresos: 3599.82 },
]

export default function ProductsChart() {
  const [isMounted, setIsMounted] = useState(false)
  const [metric, setMetric] = useState('cantidad')

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
            className={`px-3 py-1 text-sm rounded-md ${
              metric === 'cantidad' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground'
            }`}
          >
            Cantidad
          </button>
          <button
            onClick={() => setMetric('ingresos')}
            className={`px-3 py-1 text-sm rounded-md ${
              metric === 'ingresos' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground'
            }`}
          >
            Ingresos
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
          <XAxis 
            dataKey="name" 
            tickLine={false} 
            axisLine={false} 
            tickMargin={10}
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => metric === 'ingresos' ? `$${value.toLocaleString("es-AR")}` : value.toLocaleString("es-AR")}
            tickMargin={10}
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
            fill="#10b981" 
            radius={[4, 4, 0, 0]} 
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
