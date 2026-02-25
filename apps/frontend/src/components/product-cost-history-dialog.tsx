import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { type Product, type ProductCostHistory } from "@/types/product"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import useApi from "@/hooks/useApi"
import { sileo } from "sileo"
import { Alert, AlertDescription } from "@/components/ui/alert"

import { useAuth } from "@/hooks/useAuth"

interface ProductCostHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
}

const getSourceTypeLabel = (sourceType: string | null): string => {
  const labels: Record<string, string> = {
    'purchase_order': 'Orden de Compra',
    'manual': 'Actualización Manual',
    'bulk_update': 'Actualización Masiva',
    'bulk_update_by_category': 'Actualización por Categoría',
    'bulk_update_by_supplier': 'Actualización por Proveedor',
  }
  return labels[sourceType || ''] || 'Desconocido'
}

const getSourceTypeBadgeVariant = (sourceType: string | null): "default" | "secondary" | "destructive" | "outline" => {
  if (sourceType === 'purchase_order') return 'default'
  if (sourceType === 'manual') return 'secondary'
  return 'outline'
}

export function ProductCostHistoryDialog({ open, onOpenChange, product }: ProductCostHistoryDialogProps) {
  const { hasPermission } = useAuth()
  const canSeePrices = hasPermission('ver_precio_unitario') ||
    hasPermission('crear_productos') ||
    hasPermission('editar_productos') ||
    hasPermission('crear_ordenes_compra') ||
    hasPermission('editar_ordenes_compra');
  const { request, loading } = useApi()
  const [history, setHistory] = useState<ProductCostHistory[]>([])
  const [productInfo, setProductInfo] = useState<{
    id: number
    description: string
    code: string
    current_cost: number
    currency: 'USD' | 'ARS'
  } | null>(null)
  const [error, setError] = useState<string | null>(null)


  const fetchHistory = useCallback(async () => {
    if (!product) return

    setError(null)
    try {
      const response = await request({
        method: 'GET',
        url: `/product-cost-history/product/${product.id}`,
      })

      if (response?.success && response?.data) {
        setProductInfo(response.data.product)
        setHistory(response.data.history || [])
      } else {
        throw new Error('Respuesta inválida del servidor')
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Error desconocido al cargar el historial'
      setError(errorMessage)
      sileo.error({ title: 'Error al cargar el historial de costos',
        description: errorMessage
      })
    }
  }, [product, request])

  useEffect(() => {
    if (open && product) {
      fetchHistory()
    } else {
      // Limpiar estado al cerrar
      setHistory([])
      setProductInfo(null)
      setError(null)
    }
  }, [open, product, fetchHistory])

  const formatCurrency = (amount: number, currency: 'USD' | 'ARS'): string => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getChangeIcon = (percentageChange: number | null | undefined) => {
    if (percentageChange === null || percentageChange === undefined) {
      return <Minus className="h-4 w-4 text-gray-400" />
    }
    if (percentageChange > 0) {
      return <TrendingUp className="h-4 w-4 text-red-500" />
    }
    if (percentageChange < 0) {
      return <TrendingDown className="h-4 w-4 text-green-500" />
    }
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  const getChangeColor = (percentageChange: number | null | undefined): string => {
    if (percentageChange === null || percentageChange === undefined) {
      return 'text-gray-500'
    }
    if (percentageChange > 0) {
      return 'text-red-600'
    }
    if (percentageChange < 0) {
      return 'text-green-600'
    }
    return 'text-gray-500'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span>Historial de Costos</span>
            <DialogClose className="rounded-full h-6 w-6 p-0 flex items-center justify-center">
            </DialogClose>
          </DialogTitle>
        </DialogHeader>

        {!canSeePrices ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive opacity-20" />
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Acceso Restringido</h3>
              <p className="text-muted-foreground max-w-sm">
                No tienes permisos para ver el historial de costos de los productos.
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : productInfo ? (
          <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
            {/* Información del producto */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Producto:</span>
                  <p className="font-semibold">{productInfo.description}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Código:</span>
                  <p className="font-semibold">{productInfo.code}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Costo Actual:</span>
                  <p className="font-semibold text-lg">
                    {formatCurrency(productInfo.current_cost, productInfo.currency)}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Total de Cambios:</span>
                  <p className="font-semibold">{history.length}</p>
                </div>
              </div>
            </div>

            {/* Tabla de historial */}
            {history.length > 0 ? (
              <div className="border rounded-md overflow-x-auto overflow-y-scroll max-h-[400px] w-full" style={{ maxHeight: '400px' }}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Costo Anterior</TableHead>
                      <TableHead>Costo Nuevo</TableHead>
                      <TableHead>Cambio</TableHead>
                      <TableHead>Origen</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Notas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(item.created_at)}
                        </TableCell>
                        <TableCell>
                          {item.previous_cost !== null
                            ? formatCurrency(item.previous_cost, item.currency)
                            : '-'}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(item.new_cost, item.currency)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getChangeIcon(item.percentage_change)}
                            <span className={getChangeColor(item.percentage_change)}>
                              {item.percentage_change !== null && item.percentage_change !== undefined
                                ? `${item.percentage_change > 0 ? '+' : ''}${item.percentage_change.toFixed(2)}%`
                                : '-'}
                            </span>
                            {item.absolute_change !== undefined && (
                              <span className="text-xs text-muted-foreground">
                                ({item.absolute_change > 0 ? '+' : ''}{formatCurrency(item.absolute_change, item.currency)})
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getSourceTypeBadgeVariant(item.source_type)}>
                            {getSourceTypeLabel(item.source_type)}
                          </Badge>
                          {item.source_id && item.source_type === 'purchase_order' && (
                            <span className="text-xs text-muted-foreground ml-1">
                              #{item.source_id}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.user
                            ? `${item.user.person?.first_name || ''} ${item.user.person?.last_name || ''}`.trim() || item.user.email
                            : '-'}
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={item.notes || ''}>
                          {item.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No hay historial de costos disponible para este producto
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No se pudo cargar la información del producto
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

