import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Package, Banknote, Info, Loader2 } from "lucide-react"
import { getCancelPreview, cancelPurchaseOrder } from "@/lib/api/purchaseOrderService"
import type { CancelPreviewData } from "@/lib/api/purchaseOrderService"

interface CancelPurchaseOrderDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    orderId: number | null
    orderStatus: string
    onCancelled: () => void
}

export function CancelPurchaseOrderDialog({
    open,
    onOpenChange,
    orderId,
    orderStatus,
    onCancelled,
}: CancelPurchaseOrderDialogProps) {
    const [loading, setLoading] = useState(false)
    const [cancelling, setCancelling] = useState(false)
    const [previewData, setPreviewData] = useState<CancelPreviewData | null>(null)
    const [error, setError] = useState<string | null>(null)

    const isCompleted = orderStatus === 'completed'

    // Fetch preview data when dialog opens for completed orders
    useEffect(() => {
        if (open && orderId && isCompleted) {
            fetchPreview()
        } else if (!open) {
            setPreviewData(null)
            setError(null)
        }
    }, [open, orderId, isCompleted])

    const fetchPreview = async () => {
        if (!orderId) return

        setLoading(true)
        setError(null)

        try {
            const data = await getCancelPreview(orderId)
            setPreviewData(data)
        } catch (err) {
            setError("Error al obtener información de la orden. Por favor intente nuevamente.")
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleConfirmCancel = async () => {
        if (!orderId) return

        setCancelling(true)

        try {
            await cancelPurchaseOrder(orderId)
            onCancelled()
            onOpenChange(false)
        } catch (err) {
            setError("Error al cancelar la orden. Por favor intente nuevamente.")
            console.error(err)
        } finally {
            setCancelling(false)
        }
    }

    const formatCurrency = (amount: number | string, currency: string = 'ARS') => {
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: currency === 'USD' ? 'USD' : 'ARS'
        }).format(numAmount)
    }

    // Simple cancel for pending orders
    if (!isCompleted) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Cancelar Orden de Compra
                        </DialogTitle>
                        <DialogDescription>
                            ¿Está seguro que desea cancelar la orden de compra #{orderId}?
                        </DialogDescription>
                    </DialogHeader>

                    <p className="text-sm text-muted-foreground">
                        Esta orden está pendiente. La cancelación simplemente cambiará su estado a "Cancelada".
                    </p>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={cancelling}
                        >
                            No, Volver
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmCancel}
                            disabled={cancelling}
                        >
                            {cancelling ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Cancelando...
                                </>
                            ) : (
                                "Sí, Cancelar Orden"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )
    }

    // Full cancel dialog for completed orders
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        Cancelar Orden Completada
                    </DialogTitle>
                    <DialogDescription>
                        Esta orden ya fue completada. Cancelarla revertirá los cambios realizados.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-muted-foreground">Cargando información...</span>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                        {error}
                    </div>
                ) : previewData ? (
                    <div className="space-y-4">
                        {/* Order Info */}
                        <div className="bg-muted/50 rounded-lg p-3">
                            <h4 className="font-medium mb-2">Orden #{previewData.order.id}</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <span className="text-muted-foreground">Proveedor:</span>
                                <span>{previewData.order.supplier_name}</span>
                                <span className="text-muted-foreground">Sucursal:</span>
                                <span>{previewData.order.branch_name}</span>
                                <span className="text-muted-foreground">Total:</span>
                                <span className="font-medium">
                                    {formatCurrency(previewData.order.total_amount, previewData.order.currency)}
                                </span>
                            </div>
                        </div>

                        {/* Stock Changes */}
                        <div>
                            <h4 className="font-medium flex items-center gap-2 mb-2">
                                <Package className="h-4 w-4 text-blue-600" />
                                Stock a Revertir ({previewData.stock_changes.length} productos)
                            </h4>
                            <div className="rounded-md border max-h-[200px] overflow-y-auto">
                                <div className="p-3 space-y-2">
                                    {previewData.stock_changes.map((item) => (
                                        <div
                                            key={item.product_id}
                                            className="flex items-center justify-between text-sm py-1 border-b last:border-0"
                                        >
                                            <span className="font-medium truncate max-w-[40%]" title={item.product_name}>
                                                {item.product_name}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-muted-foreground">
                                                    {item.current_stock}
                                                </span>
                                                <span className="text-muted-foreground">→</span>
                                                <span className={item.will_be_negative ? "text-red-600 font-bold" : ""}>
                                                    {item.stock_after_revert}
                                                </span>
                                                <Badge variant="outline" className="text-xs">
                                                    -{item.quantity_to_revert}
                                                </Badge>
                                                {item.will_be_negative && (
                                                    <Badge variant="destructive" className="text-xs">
                                                        ⚠ Negativo
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Cash Movement */}
                        {previewData.cash_movement && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                <h4 className="font-medium flex items-center gap-2 mb-2 text-amber-800">
                                    <Banknote className="h-4 w-4" />
                                    Movimiento de Caja a Eliminar
                                </h4>
                                <div className="text-sm text-amber-700">
                                    <p><strong>Monto:</strong> {formatCurrency(previewData.cash_movement.amount)}</p>
                                    <p><strong>Método de pago:</strong> {previewData.cash_movement.payment_method}</p>
                                    {!previewData.cash_movement.affects_balance && (
                                        <p className="text-xs mt-1 italic">
                                            (Este movimiento no afectaba el balance de caja)
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Warning about costs */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <h4 className="font-medium flex items-center gap-2 text-blue-800">
                                <Info className="h-4 w-4" />
                                Información Importante
                            </h4>
                            <p className="text-sm text-blue-700 mt-1">
                                Los <strong>costos de los productos NO serán revertidos</strong>.
                                Si los precios fueron actualizados por esta orden, deberán ajustarse manualmente si es necesario.
                            </p>
                        </div>
                    </div>
                ) : null}

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={cancelling}
                    >
                        No, Volver
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleConfirmCancel}
                        disabled={cancelling || loading || !!error}
                    >
                        {cancelling ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Revirtiendo...
                            </>
                        ) : (
                            "Confirmar Cancelación"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
