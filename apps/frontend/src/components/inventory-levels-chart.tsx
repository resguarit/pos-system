
import { useEffect, useState } from "react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent } from "@/components/ui/card"

const data = [
  { date: "01/03", laptops: 120, monitores: 85, accesorios: 240, componentes: 180, perifericos: 95 },
  { date: "05/03", laptops: 132, monitores: 78, accesorios: 258, componentes: 195, perifericos: 102 },
  { date: "10/03", laptops: 125, monitores: 82, accesorios: 270, componentes: 188, perifericos: 110 },
  { date: "15/03", laptops: 118, monitores: 88, accesorios: 265, componentes: 201, perifericos: 105 },
  { date: "20/03", laptops: 110, monitores: 92, accesorios: 282, componentes: 210, perifericos: 115 },
  { date: "25/03", laptops: 105, monitores: 96, accesorios: 278, componentes: 205, perifericos: 120 },
  { date: "30/03", laptops: 115, monitores: 90, accesorios: 290, componentes: 215, perifericos: 125 },
]

export default function InventoryLevelsChart() {
  const [isMounted, setIsMounted] = useState(false)
  const [activeCategory, setActiveCategory] = useState("all")

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  const categories = [
    { id: "all", name: "Todas", color: "#0ea5e9" },
    { id: "laptops", name: "Laptops", color: "#0ea5e9" },
    { id: "monitores", name: "Monitores", color: "#10b981" },
    { id: "accesorios", name: "Accesorios", color: "#f97316" },
    { id: "componentes", name: "Componentes", color: "#8b5cf6" },
    { id: "perifericos", name: "Periféricos", color: "#ec4899" },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-3 py-1 text-sm rounded-md ${
                activeCategory === category.id || (activeCategory === "all" && category.id !== "all")
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <Card>
                    <CardContent className="py-2 px-3">
                      <p className="text-sm font-medium">{label}</p>
                      <div className="space-y-1 mt-2">
                        {payload.map((entry, index) => (
                          <p key={`item-${index}`} className="text-xs flex items-center justify-between">
                            <span className="flex items-center">
                              <span
                                className="w-2 h-2 rounded-full mr-1"
                                style={{ backgroundColor: entry.color }}
                              ></span>
                              {entry.name}:
                            </span>
                            <span className="font-bold">{entry.value} unidades</span>
                          </p>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              }
              return null
            }}
          />
          {(activeCategory === "all" || activeCategory === "laptops") && (
            <Area type="monotone" dataKey="laptops" name="Laptops" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.2} />
          )}
          {(activeCategory === "all" || activeCategory === "monitores") && (
            <Area
              type="monotone"
              dataKey="monitores"
              name="Monitores"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.2}
            />
          )}
          {(activeCategory === "all" || activeCategory === "accesorios") && (
            <Area
              type="monotone"
              dataKey="accesorios"
              name="Accesorios"
              stroke="#f97316"
              fill="#f97316"
              fillOpacity={0.2}
            />
          )}
          {(activeCategory === "all" || activeCategory === "componentes") && (
            <Area
              type="monotone"
              dataKey="componentes"
              name="Componentes"
              stroke="#8b5cf6"
              fill="#8b5cf6"
              fillOpacity={0.2}
            />
          )}
          {(activeCategory === "all" || activeCategory === "perifericos") && (
            <Area
              type="monotone"
              dataKey="perifericos"
              name="Periféricos"
              stroke="#ec4899"
              fill="#ec4899"
              fillOpacity={0.2}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

