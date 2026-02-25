import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { type Product, type ProductCostHistory } from "@/types/product"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResizableTableHeader, ResizableTableCell } from "@/components/ui/resizable-table-header"
import { useResizableColumns } from "@/hooks/useResizableColumns"
import { useBranch } from "@/context/BranchContext"
import { useAuth } from "@/hooks/useAuth"
import { useState, useEffect, useCallback, useMemo } from "react"
import { History, TrendingUp, TrendingDown, Minus, Loader2, AlertCircle } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import useApi from "@/hooks/useApi"
import { sileo } from "sileo"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ViewProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product
}

export function ViewProductDialog({ open, onOpenChange, product }: ViewProductDialogProps) {
  const { branches, allBranches } = useBranch();
  const { hasPermission } = useAuth();
  const { request, loading: loadingHistory } = useApi();
  const canSeePrices = hasPermission('ver_precio_unitario') ||
    hasPermission('crear_productos') ||
    hasPermission('editar_productos') ||
    hasPermission('crear_ordenes_compra') ||
    hasPermission('editar_ordenes_compra');
  // allBranches ya incluye todas las sucursales si el usuario tiene el permiso,
  // o solo las asignadas si no lo tiene (lógica centralizada en BranchContext)
  const stockBranches = allBranches.length > 0 ? allBranches : branches;
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [costHistory, setCostHistory] = useState<ProductCostHistory[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [fullProduct, setFullProduct] = useState<Product | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(false);

  // Load full product data when dialog opens to ensure we have all stocks
  useEffect(() => {
    if (open && product?.id) {
      setLoadingProduct(true);
      request({
        method: 'GET',
        url: `/products/${product.id}`,
      })
        .then((response) => {
          if (response?.id) {
            setFullProduct(response);
          }
        })
        .catch((error) => {
          console.error('Error loading product details:', error);
          // Fallback to passed product if fetch fails
          setFullProduct(product);
        })
        .finally(() => {
          setLoadingProduct(false);
        });
    } else {
      setFullProduct(null);
    }
  }, [open, product?.id, request]);

  // Use fullProduct if available, otherwise fallback to prop product
  const displayProduct = fullProduct || product;

  // Función para formatear el markup
  const formatMarkup = (markup: number | string): string => {
    // El markup viene del backend como decimal (ej: 0.20), convertir a porcentaje (20)
    const num = parseFloat(markup.toString()) * 100;
    if (isNaN(num)) return '0';

    // Si es un número entero, no mostrar decimales
    if (num % 1 === 0) {
      return num.toString();
    }

    // Si tiene decimales, mostrar hasta 2 decimales (eliminar ceros al final)
    return parseFloat(num.toFixed(2)).toString();
  };

  const resolveBranchName = (branchId: number, embedded?: { description?: string; name?: string }) => {
    // Primero intentar con datos embebidos
    if (embedded?.description) return embedded.description;
    if (embedded?.name) return embedded.name;

    // Luego buscar en el array de branches (incluyendo otras sucursales si tiene permiso)
    const b = stockBranches.find((bb) => String(bb.id) === String(branchId));
    if (b?.description) return b.description;
    if ((b as any)?.name) return (b as any).name;

    // Fallback solo si no se encuentra nada
    return `Sucursal ${branchId}`;
  };

  const fetchCostHistory = useCallback(async () => {
    const targetProduct = displayProduct || product;
    if (!targetProduct) return;

    setHistoryError(null);
    try {
      const response = await request({
        method: 'GET',
        url: `/product-cost-history/product/${targetProduct.id}`,
      });

      if (response?.success && response?.data) {
        setCostHistory(response.data.history || []);
      } else {
        throw new Error('Respuesta inválida del servidor');
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Error desconocido al cargar el historial';
      setHistoryError(errorMessage);
      sileo.error({ title: 'Error al cargar el historial de costos',
        description: errorMessage
      });
    }
  }, [displayProduct, product, request]);

  useEffect(() => {
    if (open && (displayProduct || product) && activeTab === 'history') {
      fetchCostHistory();
    }
  }, [open, displayProduct, product, activeTab, fetchCostHistory]);

  const formatCurrency = (amount: number, currency: 'USD' | 'ARS'): string => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSourceTypeLabel = useCallback((sourceType: string | null): string => {
    const labels: Record<string, string> = {
      'purchase_order': 'Orden de Compra',
      'manual': 'Actualización Manual',
      'bulk_update': 'Actualización Masiva',
      'bulk_update_by_category': 'Actualización por Categoría',
      'bulk_update_by_supplier': 'Actualización por Proveedor',
    };
    return labels[sourceType || ''] || 'Desconocido';
  }, []);

  const getChangeIcon = (percentageChange: number | null | undefined) => {
    if (percentageChange === null || percentageChange === undefined) {
      return <Minus className="h-4 w-4 text-gray-400" />;
    }
    if (percentageChange > 0) {
      return <TrendingUp className="h-4 w-4 text-red-500" />;
    }
    if (percentageChange < 0) {
      return <TrendingDown className="h-4 w-4 text-green-500" />;
    }
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getChangeColor = (percentageChange: number | null | undefined): string => {
    if (percentageChange === null || percentageChange === undefined) {
      return 'text-gray-500';
    }
    if (percentageChange > 0) {
      return 'text-red-600';
    }
    if (percentageChange < 0) {
      return 'text-green-600';
    }
    return 'text-gray-500';
  };

  // Configuración de columnas redimensionables para la tabla de historial
  const historyColumnConfig = useMemo(() => [
    { id: 'fecha', minWidth: 150, maxWidth: 250, defaultWidth: 180 },
    { id: 'costo_anterior', minWidth: 120, maxWidth: 200, defaultWidth: 150 },
    { id: 'costo_nuevo', minWidth: 120, maxWidth: 200, defaultWidth: 150 },
    { id: 'cambio', minWidth: 100, maxWidth: 150, defaultWidth: 120 },
    { id: 'origen', minWidth: 150, maxWidth: 250, defaultWidth: 180 },
    { id: 'usuario', minWidth: 120, maxWidth: 200, defaultWidth: 150 },
    { id: 'notas', minWidth: 150, maxWidth: 400, defaultWidth: 250 },
  ], []);

  const {
    getResizeHandleProps,
    getColumnHeaderProps,
    getColumnCellProps,
    tableRef: historyTableRef
  } = useResizableColumns({
    columns: historyColumnConfig,
    storageKey: 'product-cost-history-column-widths',
    defaultWidth: 150
  });

  // Preparar datos para el gráfico
  const chartData = useMemo(() => {
    if (costHistory.length === 0) return [];

    // Ordenar por fecha (más antiguo primero para el gráfico)
    const sortedHistory = [...costHistory].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // Crear puntos de datos
    const dataPoints = sortedHistory.map((item) => {
      const date = new Date(item.created_at);
      const dateLabel = date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      return {
        fecha: dateLabel,
        fechaCompleta: date.toISOString(),
        costo: Number.parseFloat(item.new_cost.toString()),
        costoAnterior: item.previous_cost ? Number.parseFloat(item.previous_cost.toString()) : null,
        cambio: item.percentage_change || 0,
        origen: getSourceTypeLabel(item.source_type),
      };
    });

    // Agregar el costo actual como último punto si difiere del último registro
    const lastHistory = sortedHistory[sortedHistory.length - 1];
    const currentCost = Number.parseFloat(displayProduct.unit_price);
    const lastHistoryCost = lastHistory ? Number.parseFloat(lastHistory.new_cost.toString()) : null;

    if (lastHistoryCost === null || Math.abs(currentCost - lastHistoryCost) > 0.01) {
      dataPoints.push({
        fecha: 'Actual',
        fechaCompleta: new Date().toISOString(),
        costo: currentCost,
        costoAnterior: lastHistoryCost,
        cambio: lastHistoryCost ? ((currentCost - lastHistoryCost) / lastHistoryCost) * 100 : 0,
        origen: 'Actual',
      });
    }

    return dataPoints;
  }, [costHistory, displayProduct.unit_price, getSourceTypeLabel]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex justify-between items-center">
            <span>Detalles del Producto</span>
            <DialogClose className="rounded-full h-6 w-6 p-0 flex items-center justify-center">
            </DialogClose>
          </DialogTitle>
        </DialogHeader>
        {loadingProduct ? (
          <div className="flex items-center justify-center flex-1 h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : displayProduct && (
          <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'details' | 'history')} className="w-full h-full flex flex-col">
              <div className="flex-shrink-0 px-6 pt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="details">Detalles</TabsTrigger>
                  {canSeePrices && (
                    <TabsTrigger value="history" className="flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Historial de Costos
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>

              <TabsContent value="details" className="flex-1 min-h-0 overflow-y-auto px-6 py-4 mt-0">
                <div className="grid gap-2">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="font-medium text-right">Código:</span>
                    <span className="col-span-3">{displayProduct.code}</span>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="font-medium text-right">Descripción:</span>
                    <span className="col-span-3">{displayProduct.description}</span>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="font-medium text-right">Categoría:</span>
                    <span className="col-span-3">{displayProduct.category?.name || displayProduct.category_id}</span>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="font-medium text-right">Unidad de Medida:</span>
                    <span className="col-span-3">{displayProduct.measure?.name || displayProduct.measure_id}</span>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="font-medium text-right">Proveedor:</span>
                    <span className="col-span-3">{displayProduct.supplier?.name || displayProduct.supplier_id}</span>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="font-medium text-right">IVA:</span>
                    <span className="col-span-3">{displayProduct.iva?.rate ? `${displayProduct.iva.rate}%` : '0%'}</span>
                  </div>
                  {canSeePrices && (
                    <>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <span className="font-medium text-right">Precio Unitario:</span>
                        <span className="col-span-3">${Number.parseFloat(displayProduct.unit_price).toFixed(2)} {displayProduct.currency}</span>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <span className="font-medium text-right">Markup (%):</span>
                        <span className="col-span-3">{formatMarkup(displayProduct.markup)}%</span>
                      </div>
                    </>
                  )}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="font-medium text-right">Precio Venta:</span>
                    <span className="col-span-3">${Number.parseFloat(displayProduct.sale_price.toString()).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ARS</span>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="font-medium text-right">Estado:</span>
                    <span className="col-span-3">
                      <Badge
                        variant="outline"
                        className={
                          displayProduct.status
                            ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                            : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                        }
                      >
                        {displayProduct.status ? "Activo" : "Inactivo"}
                      </Badge>
                    </span>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="font-medium text-right">Visible en Web:</span>
                    <span className="col-span-3">{displayProduct.web ? "Sí" : "No"}</span>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="font-medium text-right">Permite descuento:</span>
                    <span className="col-span-3">
                      <Badge
                        variant="outline"
                        className={
                          displayProduct.allow_discount !== false
                            ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                            : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                        }
                      >
                        {displayProduct.allow_discount !== false ? "Sí" : "No"}
                      </Badge>
                    </span>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="font-medium text-right">Observaciones:</span>
                    <span className="col-span-3">{displayProduct.observaciones || '-'}</span>
                  </div>
                  {hasPermission('ver_stock') && (
                    <div className="mt-4">
                      <h3 className="font-semibold mb-2">Stock por Sucursal</h3>
                      <div className="border rounded-md overflow-x-auto max-h-60 overflow-y-auto">
                        <Table>
                          <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                            <TableRow>
                              <TableHead>Sucursal</TableHead>
                              <TableHead>Stock Actual</TableHead>
                              <TableHead>Stock Mínimo</TableHead>
                              <TableHead>Stock Máximo</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {displayProduct.stocks && displayProduct.stocks.length > 0 ? (
                              (() => {
                                // Filtrar solo los stocks que correspondan a sucursales válidas del usuario
                                const validStocks = displayProduct.stocks.filter(stock =>
                                  stockBranches.some(b => String(b.id) === String(stock.branch_id))
                                );

                                if (validStocks.length === 0) {
                                  return (
                                    <TableRow>
                                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                                        No hay información de stock en las sucursales asignadas
                                      </TableCell>
                                    </TableRow>
                                  );
                                }

                                return validStocks.map((stock) => (
                                  <TableRow key={stock.id}>
                                    <TableCell>{resolveBranchName(stock.branch_id, stock.branch)}</TableCell>
                                    <TableCell>{stock.current_stock}</TableCell>
                                    <TableCell>{stock.min_stock}</TableCell>
                                    <TableCell>{stock.max_stock}</TableCell>
                                  </TableRow>
                                ));
                              })()
                            ) : (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center">
                                  No hay información de stock disponible
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {canSeePrices && (
                <TabsContent value="history" className="flex-1 min-h-0 overflow-y-auto px-6 py-4 mt-0" style={{ maxHeight: 'calc(90vh - 180px)' }}>
                  <div className="space-y-4">
                    {loadingHistory ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : historyError ? (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{historyError}</AlertDescription>
                      </Alert>
                    ) : costHistory.length > 0 ? (
                      <>
                        <div className="bg-muted/50 p-4 rounded-lg">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Costo Actual:</span>
                              <p className="font-semibold text-lg">
                                {formatCurrency(Number.parseFloat(displayProduct.unit_price), displayProduct.currency || 'ARS')}
                              </p>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Total de Cambios:</span>
                              <p className="font-semibold">{costHistory.length}</p>
                            </div>
                          </div>
                        </div>

                        {/* Gráfico de evolución de costos */}
                        {chartData.length > 0 && (
                          <Card className="w-full">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg">Evolución del Costo</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart
                                    data={chartData}
                                    margin={{ top: 5, right: 20, left: 10, bottom: 60 }}
                                  >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis
                                      dataKey="fecha"
                                      stroke="#888888"
                                      fontSize={11}
                                      tickLine={false}
                                      angle={-45}
                                      textAnchor="end"
                                      height={80}
                                      interval={0}
                                    />
                                    <YAxis
                                      stroke="#888888"
                                      fontSize={12}
                                      tickLine={false}
                                      tickFormatter={(value) => {
                                        const currency = displayProduct.currency || 'ARS';
                                        return new Intl.NumberFormat('es-AR', {
                                          style: 'currency',
                                          currency: currency,
                                          minimumFractionDigits: 0,
                                          maximumFractionDigits: 0,
                                        }).format(value);
                                      }}
                                    />
                                    <Tooltip
                                      formatter={(value: number) => [
                                        formatCurrency(value, displayProduct.currency || 'ARS'),
                                        'Costo'
                                      ]}
                                      labelStyle={{ color: "#374151", fontWeight: 600 }}
                                      contentStyle={{
                                        backgroundColor: "white",
                                        border: "1px solid #e5e7eb",
                                        borderRadius: "6px",
                                        fontSize: "12px",
                                        padding: "8px"
                                      }}
                                    />
                                    <Line
                                      type="monotone"
                                      dataKey="costo"
                                      stroke="#2563eb"
                                      strokeWidth={2}
                                      dot={{ r: 5, fill: "#2563eb", strokeWidth: 2, stroke: "#fff" }}
                                      activeDot={{ r: 7, strokeWidth: 2, stroke: "#2563eb", fill: "#fff" }}
                                      name="Costo"
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                        <div className="border rounded-md overflow-x-auto overflow-y-auto w-full" style={{ maxHeight: '300px' }}>
                          <Table ref={historyTableRef} className="relative">
                            <TableHeader>
                              <TableRow>
                                <ResizableTableHeader
                                  columnId="fecha"
                                  getResizeHandleProps={getResizeHandleProps}
                                  getColumnHeaderProps={getColumnHeaderProps}
                                >
                                  Fecha
                                </ResizableTableHeader>
                                <ResizableTableHeader
                                  columnId="costo_anterior"
                                  getResizeHandleProps={getResizeHandleProps}
                                  getColumnHeaderProps={getColumnHeaderProps}
                                >
                                  Costo Anterior
                                </ResizableTableHeader>
                                <ResizableTableHeader
                                  columnId="costo_nuevo"
                                  getResizeHandleProps={getResizeHandleProps}
                                  getColumnHeaderProps={getColumnHeaderProps}
                                >
                                  Costo Nuevo
                                </ResizableTableHeader>
                                <ResizableTableHeader
                                  columnId="cambio"
                                  getResizeHandleProps={getResizeHandleProps}
                                  getColumnHeaderProps={getColumnHeaderProps}
                                >
                                  Cambio
                                </ResizableTableHeader>
                                <ResizableTableHeader
                                  columnId="origen"
                                  getResizeHandleProps={getResizeHandleProps}
                                  getColumnHeaderProps={getColumnHeaderProps}
                                >
                                  Origen
                                </ResizableTableHeader>
                                <ResizableTableHeader
                                  columnId="usuario"
                                  getResizeHandleProps={getResizeHandleProps}
                                  getColumnHeaderProps={getColumnHeaderProps}
                                >
                                  Usuario
                                </ResizableTableHeader>
                                <ResizableTableHeader
                                  columnId="notas"
                                  getResizeHandleProps={getResizeHandleProps}
                                  getColumnHeaderProps={getColumnHeaderProps}
                                >
                                  Notas
                                </ResizableTableHeader>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {costHistory.map((item) => (
                                <TableRow key={item.id}>
                                  <ResizableTableCell
                                    columnId="fecha"
                                    getColumnCellProps={getColumnCellProps}
                                    className="whitespace-nowrap"
                                  >
                                    {formatDate(item.created_at)}
                                  </ResizableTableCell>
                                  <ResizableTableCell
                                    columnId="costo_anterior"
                                    getColumnCellProps={getColumnCellProps}
                                  >
                                    {item.previous_cost !== null
                                      ? formatCurrency(item.previous_cost, item.currency)
                                      : '-'}
                                  </ResizableTableCell>
                                  <ResizableTableCell
                                    columnId="costo_nuevo"
                                    getColumnCellProps={getColumnCellProps}
                                    className="font-semibold"
                                  >
                                    {formatCurrency(item.new_cost, item.currency)}
                                  </ResizableTableCell>
                                  <ResizableTableCell
                                    columnId="cambio"
                                    getColumnCellProps={getColumnCellProps}
                                  >
                                    <div className="flex items-center gap-2">
                                      {getChangeIcon(item.percentage_change)}
                                      <span className={getChangeColor(item.percentage_change)}>
                                        {item.percentage_change !== null && item.percentage_change !== undefined
                                          ? `${item.percentage_change > 0 ? '+' : ''}${item.percentage_change.toFixed(2)}%`
                                          : '-'}
                                      </span>
                                    </div>
                                  </ResizableTableCell>
                                  <ResizableTableCell
                                    columnId="origen"
                                    getColumnCellProps={getColumnCellProps}
                                  >
                                    <Badge variant="outline">
                                      {getSourceTypeLabel(item.source_type)}
                                    </Badge>
                                    {item.source_id && item.source_type === 'purchase_order' && (
                                      <span className="text-xs text-muted-foreground ml-1">
                                        #{item.source_id}
                                      </span>
                                    )}
                                  </ResizableTableCell>
                                  <ResizableTableCell
                                    columnId="usuario"
                                    getColumnCellProps={getColumnCellProps}
                                  >
                                    {item.user
                                      ? `${item.user.person?.first_name || ''} ${item.user.person?.last_name || ''}`.trim() || item.user.email
                                      : '-'}
                                  </ResizableTableCell>
                                  <ResizableTableCell
                                    columnId="notas"
                                    getColumnCellProps={getColumnCellProps}
                                    className="truncate"
                                  >
                                    <div title={item.notes || ''} className="truncate w-full">
                                      {item.notes || '-'}
                                    </div>
                                  </ResizableTableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No hay historial de costos disponible para este producto
                      </div>
                    )}
                  </div>
                </TabsContent>
              )}
            </Tabs>

          </div>
        )}
      </DialogContent>
    </Dialog >
  )
}
