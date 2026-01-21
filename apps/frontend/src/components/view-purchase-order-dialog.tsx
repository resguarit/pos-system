import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDays, Building2, User, Package, DollarSign, Printer, CheckCircle, AlertCircle } from "lucide-react"
import { type PurchaseOrder } from "@/lib/api/purchaseOrderService"
import { getPurchaseOrderById, openPurchaseOrderPdf } from "@/lib/api/purchaseOrderService"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"

interface ViewPurchaseOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  purchaseOrderId: number | null
}

export function ViewPurchaseOrderDialog({ open, onOpenChange, purchaseOrderId }: ViewPurchaseOrderDialogProps) {
  const { hasPermission } = useAuth()
  const canSeePrices = hasPermission('ver_precio_unitario') ||
    hasPermission('crear_ordenes_compra') ||
    hasPermission('editar_ordenes_compra');
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPrices, setShowPrices] = useState(false)

  useEffect(() => {
    if (open) {
      setShowPrices(canSeePrices)
    }
  }, [open, canSeePrices])

  // Debug: mostrar el ID recibido y el resultado
  useEffect(() => {
    if (open && purchaseOrderId) {
    }
  }, [open, purchaseOrderId]);

  useEffect(() => {
    if (open && purchaseOrderId) {
      loadPurchaseOrderDetails()
    }
  }, [open, purchaseOrderId])

  const loadPurchaseOrderDetails = async () => {
    if (!purchaseOrderId) return
    setLoading(true)
    try {
      const order = await getPurchaseOrderById(purchaseOrderId)
      setPurchaseOrder(order)
    } catch (error) {
      console.error('Error loading purchase order details:', error)
      toast.error("Error al cargar los detalles de la orden de compra")
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 hover:bg-yellow-50 hover:text-yellow-700'
      case 'completed':
        return 'bg-green-50 text-green-700 hover:bg-green-50 hover:text-green-700'
      case 'cancelled':
        return 'bg-red-50 text-red-700 hover:bg-red-50 hover:text-red-700'
      default:
        return 'bg-gray-50 text-gray-700 hover:bg-gray-50 hover:text-gray-700'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente'
      case 'completed':
        return 'Completada'
      case 'cancelled':
        return 'Cancelada'
      default:
        return status
    }
  }

  const calculateTotal = () => {
    if (!purchaseOrder?.items) return 0;
    return purchaseOrder.items.reduce((acc, item) => acc + (item.quantity * item.purchase_price), 0);
  };

  const getProductCurrency = (item: any) => {
    return item.product?.currency || 'ARS';
  };

  const getOrderCurrency = () => {
    if (!purchaseOrder?.items || purchaseOrder.items.length === 0) return 'ARS';
    return getProductCurrency(purchaseOrder.items[0]);
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cargando detalles...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Cargando información de la orden de compra...</div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!purchaseOrder) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="text-muted-foreground">No se pudo cargar la información de la orden de compra</div>
            <div className="text-xs text-muted-foreground mt-2">ID recibido: {purchaseOrderId?.toString() ?? 'N/A'}</div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Orden de Compra #{purchaseOrder.id}
          </DialogTitle>
          <DialogDescription>
            Detalles completos de la orden de compra y sus productos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {canSeePrices && (
              <>
                <Checkbox id="showPrices" checked={showPrices} onCheckedChange={(v) => setShowPrices(Boolean(v))} />
                <label htmlFor="showPrices" className="text-sm">Mostrar precios y totales</label>
              </>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => openPurchaseOrderPdf(purchaseOrder.id!, { showPrices: showPrices && canSeePrices })}>
            <Printer className="h-4 w-4 mr-2" /> Imprimir PDF
          </Button>
        </div>

        <div className="space-y-6">
          {/* Información General */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estado</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Badge variant="outline" className={getStatusBadgeColor(purchaseOrder.status!)}>
                  {getStatusLabel(purchaseOrder.status!)}
                </Badge>
              </CardContent>
            </Card>

            {showPrices && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="text-lg font-bold">
                      ${calculateTotal().toLocaleString('es-ES', { minimumFractionDigits: 2 })} {getOrderCurrency()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fecha</CardTitle>
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  {purchaseOrder.created_at ? new Date(purchaseOrder.created_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'N/A'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pagos */}
          <div className="grid grid-cols-1 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pagos</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {purchaseOrder.payments && purchaseOrder.payments.length > 0 ? (
                  <div className="space-y-2">
                    {purchaseOrder.payments.map((payment, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0">
                        <span className="font-medium">{payment.payment_method?.name || 'Método desconocido'}</span>
                        <span>${parseFloat(payment.amount.toString()).toLocaleString('es-ES', { minimumFractionDigits: 2 })} {getOrderCurrency()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm font-medium">
                    {purchaseOrder.payment_method?.name || 'N/A'} (Legacy)
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Afecta Caja */}
          <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-base font-semibold">¿Afecta el balance de la caja?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Esta orden {(purchaseOrder as any).affects_cash_register !== false ? 'SÍ impacta' : 'NO impacta'} en el saldo de la caja registradora
                </p>
              </div>
              <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 ${(purchaseOrder as any).affects_cash_register !== false
                ? "bg-green-50 border-green-300"
                : "bg-orange-50 border-orange-300"
                }`}>
                {(purchaseOrder as any).affects_cash_register !== false ? (
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-orange-600 flex-shrink-0" />
                )}
                <span className={`font-semibold text-base ${(purchaseOrder as any).affects_cash_register !== false
                  ? "text-green-700"
                  : "text-orange-700"
                  }`}>
                  {(purchaseOrder as any).affects_cash_register !== false ? "SÍ afecta" : "NO afecta"}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Información del Proveedor y Sucursal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium">Proveedor</h3>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="font-medium">{purchaseOrder.supplier?.name || 'N/A'}</div>
                {purchaseOrder.supplier?.contact_name && (
                  <div className="text-sm text-muted-foreground">
                    Contacto: {purchaseOrder.supplier.contact_name}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium">Sucursal</h3>
              </div>              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="font-medium">{purchaseOrder.branch?.description || 'N/A'}</div>
              </div>
            </div>
          </div>

          {/* Notas */}
          {purchaseOrder.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-medium">Notas</h3>
                <div className="bg-muted/50 p-4 rounded-lg text-sm">
                  {purchaseOrder.notes}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Items de la Orden */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Productos ({purchaseOrder.items?.length || 0} items)
            </h3>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-center">Cantidad</TableHead>
                    {showPrices && (
                      <>
                        <TableHead className="text-right">Precio Unitario</TableHead>
                        <TableHead className="text-right">Subtotal ({getOrderCurrency()})</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrder.items && purchaseOrder.items.length > 0 ? (
                    purchaseOrder.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {(item as any).product?.description}
                        </TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        {showPrices && (
                          <>
                            <TableCell className="text-right">
                              ${parseFloat(item.purchase_price.toString()).toLocaleString('es-ES', { minimumFractionDigits: 2 })} {(item as any).product?.currency || 'ARS'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ${(item.quantity * parseFloat(item.purchase_price.toString())).toLocaleString('es-ES', { minimumFractionDigits: 2 })} {(item as any).product?.currency || 'ARS'}
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={showPrices ? 4 : 2} className="text-center py-8 text-muted-foreground">
                        No hay productos en esta orden
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Total */}
          {showPrices && (
            <div className="flex justify-end">
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-primary">Total:</span>
                    <span className="text-xl font-bold text-primary">
                      ${calculateTotal().toLocaleString('es-ES', { minimumFractionDigits: 2 })} {getOrderCurrency()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
