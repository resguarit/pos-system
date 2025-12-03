import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableHeader, TableRow } from "@/components/ui/table"
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { ResizableTableHeader, ResizableTableCell } from '@/components/ui/resizable-table-header';
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, BarChart3, Box, Download, FileBarChart, Search, TrendingDown, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import InventoryLevelsChart from "@/components/inventory-levels-chart"
import InventoryValueChart from "@/components/inventory-value-chart"
import InventoryCategoryChart from "@/components/inventory-category-chart"
import { Progress } from "@/components/ui/progress"
import Pagination from "@/components/ui/pagination"

export default function ReportesInventarioPage() {
  const [period, setPeriod] = useState("month")
  const [category, setCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [lowStockPage, setLowStockPage] = useState(1)
  const [topValuePage, setTopValuePage] = useState(1)
  const perPage = 5

  // Referencias para las tablas

  // Configuración de columnas redimensionables para tabla de stock bajo
  const lowStockColumnConfig = [
    { id: 'product', minWidth: 200, maxWidth: 400, defaultWidth: 250 },
    { id: 'sku', minWidth: 120, maxWidth: 200, defaultWidth: 150 },
    { id: 'stock', minWidth: 100, maxWidth: 150, defaultWidth: 120 },
    { id: 'status', minWidth: 80, maxWidth: 120, defaultWidth: 100 }
  ];

  // Configuración de columnas redimensionables para tabla de mayor valor
  const topValueColumnConfig = [
    { id: 'product', minWidth: 200, maxWidth: 400, defaultWidth: 250 },
    { id: 'stock', minWidth: 80, maxWidth: 120, defaultWidth: 100 },
    { id: 'value', minWidth: 100, maxWidth: 150, defaultWidth: 120 },
    { id: 'turnover', minWidth: 100, maxWidth: 150, defaultWidth: 120 }
  ];

  const {
    getResizeHandleProps: getLowStockResizeHandleProps,
    getColumnHeaderProps: getLowStockColumnHeaderProps,
    getColumnCellProps: getLowStockColumnCellProps
  } = useResizableColumns({
    storageKey: 'reportes-low-stock-column-widths',
    columns: lowStockColumnConfig,
  });

  const {
    getResizeHandleProps: getTopValueResizeHandleProps,
    getColumnHeaderProps: getTopValueColumnHeaderProps,
    getColumnCellProps: getTopValueColumnCellProps
  } = useResizableColumns({
    storageKey: 'reportes-top-value-column-widths',
    columns: topValueColumnConfig,
  });

  const lowStockProducts = [
    {
      id: "PRD001",
      name: "Laptop HP 15",
      sku: "LAP-HP15-001",
      stock: 5,
      minStock: 10,
      status: "crítico",
      lastRestock: "15/03/2023",
    },
    {
      id: "PRD003",
      name: "Teclado Mecánico RGB",
      sku: "TEC-MEC-003",
      stock: 8,
      minStock: 15,
      status: "bajo",
      lastRestock: "18/03/2023",
    },
    {
      id: "PRD005",
      name: "Auriculares Bluetooth",
      sku: "AUR-BT-005",
      stock: 7,
      minStock: 12,
      status: "bajo",
      lastRestock: "12/03/2023",
    },
    {
      id: "PRD007",
      name: "Tableta Grafica",
      sku: "TAB-GRA-007",
      stock: 3,
      minStock: 8,
      status: "crítico",
      lastRestock: "10/03/2023",
    },
    {
      id: "PRD009",
      name: "Disco Duro Externo 1TB",
      sku: "HDD-EXT-009",
      stock: 6,
      minStock: 10,
      status: "bajo",
      lastRestock: "20/03/2023",
    },
  ]

  const topInventoryProducts = [
    {
      id: "PRD002",
      name: "Monitor Samsung 24",
      sku: "MON-SAM-002",
      stock: 42,
      value: 10499.58,
      turnover: 2.8,
    },
    {
      id: "PRD004",
      name: "Mouse Inalámbrico",
      sku: "MOU-INL-004",
      stock: 65,
      value: 1949.35,
      turnover: 3.5,
    },
    {
      id: "PRD006",
      name: "Impresora Epson",
      sku: "IMP-EPS-006",
      stock: 28,
      value: 5599.72,
      turnover: 1.9,
    },
    {
      id: "PRD008",
      name: "Memoria RAM 16GB",
      sku: "RAM-16G-008",
      stock: 53,
      value: 4239.47,
      turnover: 2.3,
    },
    {
      id: "PRD010",
      name: "Webcam HD",
      sku: "WEB-HD-010",
      stock: 37,
      value: 2219.63,
      turnover: 2.7,
    },
  ]
  const lowStockTotalPages = Math.ceil(lowStockProducts.length / perPage)
  const topValueTotalPages = Math.ceil(topInventoryProducts.length / perPage)

  const pagedLowStock = lowStockProducts.slice((lowStockPage - 1) * perPage, lowStockPage * perPage)
  const pagedTopValue = topInventoryProducts.slice((topValuePage - 1) * perPage, topValuePage * perPage)

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Reportes de Inventario</h2>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exportar Informe
        </Button>
      </div>

      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex flex-1 items-center space-x-2">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar productos..."
              className="w-full pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent style={{ maxHeight: 300, overflowY: 'auto' }}>
              <SelectItem value="week">Esta semana</SelectItem>
              <SelectItem value="month">Este mes</SelectItem>
              <SelectItem value="quarter">Este trimestre</SelectItem>
              <SelectItem value="year">Este año</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent style={{ maxHeight: 300, overflowY: 'auto' }}>
              <SelectItem value="all">Todas las categorías</SelectItem>
              <SelectItem value="laptops">Laptops</SelectItem>
              <SelectItem value="monitors">Monitores</SelectItem>
              <SelectItem value="accessories">Accesorios</SelectItem>
              <SelectItem value="components">Componentes</SelectItem>
              <SelectItem value="peripherals">Periféricos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total de Inventario</CardTitle>
            <BarChart3 className="h-4 w-4 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$248,293.45</div>
            <p className="text-xs text-muted-foreground">+5.2% respecto al período anterior</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos en Stock</CardTitle>
            <Box className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,248</div>
            <p className="text-xs text-muted-foreground">+32 respecto al período anterior</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rotación de Inventario</CardTitle>
            <TrendingUp className="h-4 w-4 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.4</div>
            <p className="text-xs text-muted-foreground">+0.3 respecto al período anterior</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos con Stock Bajo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
            <p className="text-xs text-muted-foreground text-red-500">+5 respecto al período anterior</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="niveles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="niveles">Niveles de Inventario</TabsTrigger>
          <TabsTrigger value="valor">Valor de Inventario</TabsTrigger>
          <TabsTrigger value="rotacion">Rotación</TabsTrigger>
          <TabsTrigger value="categorias">Categorías</TabsTrigger>
          <TabsTrigger value="ventas">Ventas</TabsTrigger>
        </TabsList>
        <TabsContent value="niveles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Niveles de Inventario por Tiempo</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <InventoryLevelsChart />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="valor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Valor de Inventario por Tiempo</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <InventoryValueChart />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="rotacion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rotación de Inventario</CardTitle>
            </CardHeader>
          </Card>
        </TabsContent>
        <TabsContent value="categorias" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventario por Categoría</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <InventoryCategoryChart />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="ventas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Estadísticas de Ventas</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Productos con Stock Bajo</CardTitle>
            <Badge variant="destructive" className="ml-2">
              Atención Requerida
            </Badge>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <ResizableTableHeader
                    columnId="product"
                    getResizeHandleProps={getLowStockResizeHandleProps}
                    getColumnHeaderProps={getLowStockColumnHeaderProps}
                  >
                    Producto
                  </ResizableTableHeader>
                  <ResizableTableHeader
                    columnId="sku"
                    getResizeHandleProps={getLowStockResizeHandleProps}
                    getColumnHeaderProps={getLowStockColumnHeaderProps}
                    className="hidden md:table-cell"
                  >
                    SKU
                  </ResizableTableHeader>
                  <ResizableTableHeader
                    columnId="stock"
                    getResizeHandleProps={getLowStockResizeHandleProps}
                    getColumnHeaderProps={getLowStockColumnHeaderProps}
                    className="text-center"
                  >
                    Stock
                  </ResizableTableHeader>
                  <ResizableTableHeader
                    columnId="status"
                    getResizeHandleProps={getLowStockResizeHandleProps}
                    getColumnHeaderProps={getLowStockColumnHeaderProps}
                    className="text-right"
                  >
                    Estado
                  </ResizableTableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedLowStock.map((product) => (
                  <TableRow key={product.id}>
                    <ResizableTableCell
                      columnId="product"
                      getColumnCellProps={getLowStockColumnCellProps}
                      className="font-medium"
                    >
                      <span className="truncate" title={product.name}>
                        {product.name}
                      </span>
                    </ResizableTableCell>
                    <ResizableTableCell
                      columnId="sku"
                      getColumnCellProps={getLowStockColumnCellProps}
                      className="hidden md:table-cell"
                    >
                      <span className="truncate" title={product.sku}>
                        {product.sku}
                      </span>
                    </ResizableTableCell>
                    <ResizableTableCell
                      columnId="stock"
                      getColumnCellProps={getLowStockColumnCellProps}
                      className="text-center"
                    >
                      <div className="flex flex-col items-center">
                        <span className="mb-1">
                          {product.stock}/{product.minStock}
                        </span>
                        <Progress
                          value={(product.stock / product.minStock) * 100}
                          className={`h-2 w-24 ${product.status === "crítico" ? "bg-red-500" : "bg-amber-500"}`}
                        />
                      </div>
                    </ResizableTableCell>
                    <ResizableTableCell
                      columnId="status"
                      getColumnCellProps={getLowStockColumnCellProps}
                      className="text-right"
                    >
                      <Badge
                        variant="outline"
                        className={`${product.status === "crítico" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                          } hover:bg-opacity-100 truncate`}
                      >
                        {product.status}
                      </Badge>
                    </ResizableTableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination
              currentPage={lowStockPage}
              lastPage={lowStockTotalPages}
              total={lowStockProducts.length}
              itemName="productos"
              onPageChange={setLowStockPage}
              disabled={false}
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Productos con Mayor Valor</CardTitle>
            <FileBarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <ResizableTableHeader
                    columnId="product"
                    getResizeHandleProps={getTopValueResizeHandleProps}
                    getColumnHeaderProps={getTopValueColumnHeaderProps}
                  >
                    Producto
                  </ResizableTableHeader>
                  <ResizableTableHeader
                    columnId="stock"
                    getResizeHandleProps={getTopValueResizeHandleProps}
                    getColumnHeaderProps={getTopValueColumnHeaderProps}
                    className="hidden md:table-cell"
                  >
                    Stock
                  </ResizableTableHeader>
                  <ResizableTableHeader
                    columnId="value"
                    getResizeHandleProps={getTopValueResizeHandleProps}
                    getColumnHeaderProps={getTopValueColumnHeaderProps}
                    className="text-right"
                  >
                    Valor
                  </ResizableTableHeader>
                  <ResizableTableHeader
                    columnId="turnover"
                    getResizeHandleProps={getTopValueResizeHandleProps}
                    getColumnHeaderProps={getTopValueColumnHeaderProps}
                    className="hidden md:table-cell text-right"
                  >
                    Rotación
                  </ResizableTableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedTopValue.map((product) => (
                  <TableRow key={product.id}>
                    <ResizableTableCell
                      columnId="product"
                      getColumnCellProps={getTopValueColumnCellProps}
                      className="font-medium"
                    >
                      <span className="truncate" title={product.name}>
                        {product.name}
                      </span>
                    </ResizableTableCell>
                    <ResizableTableCell
                      columnId="stock"
                      getColumnCellProps={getTopValueColumnCellProps}
                      className="hidden md:table-cell"
                    >
                      <span className="truncate" title={product.stock.toString()}>
                        {product.stock}
                      </span>
                    </ResizableTableCell>
                    <ResizableTableCell
                      columnId="value"
                      getColumnCellProps={getTopValueColumnCellProps}
                      className="text-right"
                    >
                      <span className="truncate" title={`$${product.value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                        ${product.value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </ResizableTableCell>
                    <ResizableTableCell
                      columnId="turnover"
                      getColumnCellProps={getTopValueColumnCellProps}
                      className="hidden md:table-cell text-right"
                    >
                      <div className="flex items-center justify-end">
                        <span className="truncate">{product.turnover}</span>
                        {product.turnover > 2.5 ? (
                          <TrendingUp className="ml-1 h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="ml-1 h-4 w-4 text-amber-500" />
                        )}
                      </div>
                    </ResizableTableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination
              currentPage={topValuePage}
              lastPage={topValueTotalPages}
              total={topInventoryProducts.length}
              itemName="productos"
              onPageChange={setTopValuePage}
              disabled={false}
              className="mt-2"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
