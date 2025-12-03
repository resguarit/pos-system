import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, ChevronDown, Download, LineChart, TrendingUp, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import SalesChart from "@/components/sales-chart"
import ProductsChart from "@/components/products-chart"
import SalesBranchChart from "@/components/sales-branch-chart"

export default function AnalisisVentasPage() {
  const [period, setPeriod] = useState("month")
  const [branch, setBranch] = useState("all")

  const topProducts = [
    {
      id: "PRD001",
      name: "Laptop HP 15",
      quantity: 42,
      revenue: 37799.58,
      growth: 12.5,
    },
    {
      id: "PRD003",
      name: "Teclado Mecánico RGB",
      quantity: 38,
      revenue: 3419.62,
      growth: 8.3,
    },
    {
      id: "PRD005",
      name: "Auriculares Bluetooth",
      quantity: 35,
      revenue: 2099.65,
      growth: 15.2,
    },
    {
      id: "PRD002",
      name: "Monitor Samsung 24",
      quantity: 29,
      revenue: 7249.71,
      growth: -2.1,
    },
    {
      id: "PRD007",
      name: "Tableta Grafica",
      quantity: 24,
      revenue: 2399.76,
      growth: 5.7,
    },
  ]

  const topCustomers = [
    {
      id: "CLT001",
      name: "Juan Pérez",
      purchases: 8,
      total: 4589.92,
      lastPurchase: "23/03/2023",
    },
    {
      id: "CLT002",
      name: "María González",
      purchases: 6,
      total: 3297.50,
      lastPurchase: "22/03/2023",
    },
    {
      id: "CLT003",
      name: "Carlos Rodríguez",
      purchases: 5,
      total: 2449.95,
      lastPurchase: "21/03/2023",
    },
    {
      id: "CLT004",
      name: "Ana Martínez",
      purchases: 4,
      total: 1899.96,
      lastPurchase: "20/03/2023",
    },
    {
      id: "CLT005",
      name: "Roberto López",
      purchases: 3,
      total: 1259.97,
      lastPurchase: "19/03/2023",
    },
  ]

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Análisis de Ventas</h2>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exportar Informe
        </Button>
      </div>

      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex flex-1 items-center space-x-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent style={{ maxHeight: 300, overflowY: 'auto' }}>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="yesterday">Ayer</SelectItem>
              <SelectItem value="week">Esta semana</SelectItem>
              <SelectItem value="month">Este mes</SelectItem>
              <SelectItem value="quarter">Este trimestre</SelectItem>
              <SelectItem value="year">Este año</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sucursal" />
            </SelectTrigger>
            <SelectContent style={{ maxHeight: 300, overflowY: 'auto' }}>
              <SelectItem value="all">Todas las sucursales</SelectItem>
              <SelectItem value="central">Central</SelectItem>
              <SelectItem value="norte">Norte</SelectItem>
              <SelectItem value="sur">Sur</SelectItem>
              <SelectItem value="este">Este</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
            <LineChart className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$48,293.45</div>
            <p className="text-xs text-muted-foreground">+18.2% respecto al período anterior</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transacciones</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">548</div>
            <p className="text-xs text-muted-foreground">+12.5% respecto al período anterior</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
            <Calendar className="h-4 w-4 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$88.13</div>
            <p className="text-xs text-muted-foreground">+5.1% respecto al período anterior</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
            <Users className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">312</div>
            <p className="text-xs text-muted-foreground">+8.3% respecto al período anterior</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="ventas" className="space-y-4">
        <TabsList className="w-fit">
          <TabsTrigger value="ventas">Ventas</TabsTrigger>
          <TabsTrigger value="productos">Productos</TabsTrigger>
          <TabsTrigger value="sucursales">Sucursales</TabsTrigger>
          <TabsTrigger value="comparativa">Comparativa</TabsTrigger>
        </TabsList>
        <TabsContent value="ventas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tendencia de Ventas</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <SalesChart />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="productos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rendimiento de Productos</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <ProductsChart />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="sucursales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ventas por Sucursal</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <SalesBranchChart />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="comparativa" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comparativa de Períodos</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Productos Más Vendidos</CardTitle>
            <Select defaultValue="quantity">
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quantity">Por cantidad</SelectItem>
                <SelectItem value="revenue">Por ingresos</SelectItem>
                <SelectItem value="growth">Por crecimiento</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="hidden md:table-cell">Cantidad</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                  <TableHead className="text-right">Crecimiento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{product.quantity}</TableCell>
                    <TableCell className="text-right">${product.revenue.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={`${product.growth >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"} hover:bg-opacity-100`}>
                        {product.growth >= 0 ? "+" : ""}{product.growth}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Mejores Clientes</CardTitle>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Compras</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="hidden md:table-cell">Última Compra</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{customer.purchases}</TableCell>
                    <TableCell className="text-right">${customer.total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="hidden md:table-cell">{customer.lastPurchase}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
