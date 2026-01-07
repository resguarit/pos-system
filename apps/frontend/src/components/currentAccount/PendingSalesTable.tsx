import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import type { PendingSale } from '@/types/currentAccount';
import { CurrentAccountUtils } from '@/lib/services/currentAccountService';
import { UpdateSalePriceDialog } from './UpdateSalePriceDialog';

interface PendingSalesTableProps {
    sales: PendingSale[];
    accountId: number;
    onSuccess: () => void;
}

export function PendingSalesTable({ sales, accountId, onSuccess }: PendingSalesTableProps) {
    const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
    const [showUpdateDialog, setShowUpdateDialog] = useState(false);

    const handleUpdatePrice = (saleId: number) => {
        setSelectedSaleId(saleId);
        setShowUpdateDialog(true);
    };

    const handleSuccess = () => {
        toast.success('Precio actualizado correctamente');
        setShowUpdateDialog(false);
        setSelectedSaleId(null);
        onSuccess();
    };

    if (sales.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Ventas Pendientes</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-muted-foreground py-8">
                        No hay ventas pendientes de pago
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Ventas Pendientes</span>
                        <Badge variant="secondary">{sales.length} ventas</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="text-left p-2 font-medium">Venta #</th>
                                    <th className="text-left p-2 font-medium">Fecha</th>
                                    <th className="text-right p-2 font-medium">Total</th>
                                    <th className="text-right p-2 font-medium">Pagado</th>
                                    <th className="text-right p-2 font-medium">Pendiente</th>
                                    <th className="text-center p-2 font-medium">Estado</th>
                                    <th className="text-right p-2 font-medium">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {sales.map((sale) => (
                                    <tr key={sale.id} className="hover:bg-muted/30">
                                        <td className="p-2 font-medium">{sale.receipt_number}</td>
                                        <td className="p-2 text-muted-foreground">{sale.date}</td>
                                        <td className="p-2 text-right">{CurrentAccountUtils.formatCurrency(sale.total)}</td>
                                        <td className="p-2 text-right text-green-600">
                                            {CurrentAccountUtils.formatCurrency(sale.paid_amount)}
                                        </td>
                                        <td className="p-2 text-right font-semibold text-red-600">
                                            {CurrentAccountUtils.formatCurrency(sale.pending_amount)}
                                        </td>
                                        <td className="p-2 text-center">
                                            <Badge
                                                variant={
                                                    sale.payment_status === 'pending'
                                                        ? 'destructive'
                                                        : sale.payment_status === 'partial'
                                                            ? 'secondary'
                                                            : 'default'
                                                }
                                                className="text-xs"
                                            >
                                                {sale.payment_status === 'pending'
                                                    ? 'Pendiente'
                                                    : sale.payment_status === 'partial'
                                                        ? 'Parcial'
                                                        : sale.payment_status}
                                            </Badge>
                                        </td>
                                        <td className="p-2 text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleUpdatePrice(sale.id)}
                                                disabled={sale.payment_status === 'paid'}
                                                title="Actualizar deuda con precios actuales"
                                            >
                                                <RefreshCw className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {selectedSaleId && (
                <UpdateSalePriceDialog
                    open={showUpdateDialog}
                    onOpenChange={setShowUpdateDialog}
                    accountId={accountId}
                    saleId={selectedSaleId}
                    onSuccess={handleSuccess}
                />
            )}
        </>
    );
}
