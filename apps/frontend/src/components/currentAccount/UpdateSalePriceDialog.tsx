import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { sileo } from "sileo"
import { RefreshCw, ArrowUp, ArrowDown, AlertTriangle, Loader2 } from 'lucide-react';
import {
    UpdateSalePricesService,
    type PriceUpdatePreview,
} from '@/lib/services/updateSalePricesService';
import { CurrentAccountUtils } from '@/lib/services/currentAccountService';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface UpdateSalePriceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    accountId: number;
    saleId: number;
    onSuccess: () => void;
}

export function UpdateSalePriceDialog({
    open,
    onOpenChange,
    accountId,
    saleId,
    onSuccess,
}: UpdateSalePriceDialogProps) {
    const [preview, setPreview] = useState<PriceUpdatePreview | null>(null);
    const [loading, setLoading] = useState(false);
    const [updating, setUpdating] = useState(false);



    const loadPreview = React.useCallback(async () => {
        try {
            setLoading(true);
            const data = await UpdateSalePricesService.previewSalePriceUpdate(accountId, saleId);
            setPreview(data);
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error('Error loading price preview:', error);
            sileo.error({ title: error.response?.data?.message || 'Error al cargar vista previa' });
            onOpenChange(false);
        } finally {
            setLoading(false);
        }
    }, [accountId, saleId, onOpenChange]);

    useEffect(() => {
        if (open) {
            loadPreview();
        } else {
            setPreview(null);
        }
    }, [open, loadPreview]);

    const handleUpdate = async () => {
        if (!preview) return;

        try {
            setUpdating(true);
            const result = await UpdateSalePricesService.updateSalePrice(accountId, saleId);

            sileo.success({ title: `Precio actualizado correctamente. ${result.difference > 0 ? 'Aumento' : 'Descenso'}: ${CurrentAccountUtils.formatCurrency(Math.abs(result.difference))}` });

            onSuccess();
            onOpenChange(false);
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error('Error updating price:', error);
            sileo.error({ title: error.response?.data?.message || 'Error al actualizar precio' });
        } finally {
            setUpdating(false);
        }
    };

    const hasChanges = preview && Math.abs(preview.difference) > 0.01;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <RefreshCw className="h-5 w-5" />
                        Actualizar Precio de Venta #{preview?.receipt_number || saleId}
                    </DialogTitle>
                    <DialogDescription>
                        Vista previa de los cambios de precio con precios actuales de productos
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : preview ? (
                    <div className="space-y-4">
                        {/* Cliente */}
                        <div className="bg-muted/50 p-3 rounded-md">
                            <p className="text-sm font-medium">Cliente: {preview.customer_name}</p>
                        </div>

                        {/* Tabla de Items */}
                        <div className="border rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted">
                                        <tr>
                                            <th className="text-left p-2 font-medium">Producto</th>
                                            <th className="text-right p-2 font-medium">Cant.</th>
                                            <th className="text-right p-2 font-medium">Precio Actual</th>
                                            <th className="text-right p-2 font-medium">Precio Nuevo</th>
                                            <th className="text-right p-2 font-medium">Cambio</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {preview.items.map((item) => {
                                            const hasItemChange = Math.abs(item.price_change) > 0.01;
                                            const isIncrease = item.price_change > 0;

                                            return (
                                                <tr key={item.id} className={hasItemChange ? 'bg-yellow-50/50' : ''}>
                                                    <td className="p-2">{item.product_name}</td>
                                                    <td className="p-2 text-right">{item.quantity}</td>
                                                    <td className="p-2 text-right">{CurrentAccountUtils.formatCurrency(item.old_price)}</td>
                                                    <td className="p-2 text-right font-semibold">
                                                        {CurrentAccountUtils.formatCurrency(item.new_price)}
                                                    </td>
                                                    <td className="p-2 text-right">
                                                        {hasItemChange ? (
                                                            <div className="flex items-center justify-end gap-1">
                                                                {isIncrease ? (
                                                                    <ArrowUp className="h-3 w-3 text-red-600" />
                                                                ) : (
                                                                    <ArrowDown className="h-3 w-3 text-green-600" />
                                                                )}
                                                                <span className={isIncrease ? 'text-red-600' : 'text-green-600'}>
                                                                    {isIncrease ? '+' : ''}
                                                                    {item.price_change_percentage.toFixed(1)}%
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Resumen */}
                        <div className="grid grid-cols-2 gap-4 border-t pt-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Total Actual:</span>
                                    <span className="font-medium">{CurrentAccountUtils.formatCurrency(preview.old_total)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Pagado:</span>
                                    <span className="font-medium">{CurrentAccountUtils.formatCurrency(preview.paid_amount)}</span>
                                </div>
                                <div className="flex justify-between text-sm font-semibold">
                                    <span>Pendiente Actual:</span>
                                    <span className="text-red-600">{CurrentAccountUtils.formatCurrency(preview.old_pending)}</span>
                                </div>
                            </div>

                            <div className="space-y-2 border-l pl-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Total Nuevo:</span>
                                    <span className="font-semibold text-blue-600">
                                        {CurrentAccountUtils.formatCurrency(preview.new_total)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Diferencia:</span>
                                    <Badge
                                        variant={preview.difference > 0 ? 'destructive' : 'default'}
                                        className="font-semibold"
                                    >
                                        {preview.difference > 0 ? '+' : ''}
                                        {CurrentAccountUtils.formatCurrency(preview.difference)}
                                        {preview.difference > 0 ? ' ↑' : preview.difference < 0 ? ' ↓' : ''}
                                    </Badge>
                                </div>
                                <div className="flex justify-between text-sm font-semibold">
                                    <span>Pendiente Nuevo:</span>
                                    <span className="text-red-600">{CurrentAccountUtils.formatCurrency(preview.new_pending)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Advertencias */}
                        {!hasChanges && (
                            <Alert>
                                <AlertDescription>
                                    No hay cambios de precio. Los precios actuales son los mismos que los de la venta.
                                </AlertDescription>
                            </Alert>
                        )}

                        {hasChanges && Math.abs(preview.difference) > 10000 && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    <strong>Advertencia:</strong> Esta actualización modificará la deuda en{' '}
                                    {CurrentAccountUtils.formatCurrency(Math.abs(preview.difference))}. Esta acción es irreversible.
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                ) : null}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updating}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleUpdate}
                        disabled={!hasChanges || loading || updating}
                        className="min-w-[140px]"
                    >
                        {updating ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Actualizando...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Aplicar Cambios
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
