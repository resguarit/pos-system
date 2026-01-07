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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
    RefreshCw,
    ArrowUp,
    ArrowDown,
    AlertTriangle,
    Loader2,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';
import {
    UpdateSalePricesService,
    type BatchPriceUpdatePreview,
    type BatchCustomerGroup,
} from '@/lib/services/updateSalePricesService';
import { CurrentAccountUtils } from '@/lib/services/currentAccountService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BatchUpdatePricesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    accountId?: number; // undefined = todos los clientes
    onSuccess: () => void;
}

export function BatchUpdatePricesDialog({
    open,
    onOpenChange,
    accountId,
    onSuccess,
}: BatchUpdatePricesDialogProps) {
    const [preview, setPreview] = useState<BatchPriceUpdatePreview | null>(null);
    const [loading, setLoading] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [selectedSaleIds, setSelectedSaleIds] = useState<Set<number>>(new Set());
    const [expandedCustomers, setExpandedCustomers] = useState<Set<number | string>>(new Set());



    const loadPreview = React.useCallback(async () => {
        try {
            setLoading(true);
            const data = await UpdateSalePricesService.previewBatchPriceUpdate(accountId || null);
            setPreview(data);

            // Auto-select all sales by default
            const allSaleIds = new Set<number>();
            data.customers.forEach((customer) => {
                customer.sales.forEach((sale) => {
                    allSaleIds.add(sale.sale_id);
                });
            });
            setSelectedSaleIds(allSaleIds);

            // Expand all customers by default
            const customerKeys = new Set(data.customers.map((c) => c.customer_id || 'general'));
            setExpandedCustomers(customerKeys);
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error('Error loading batch preview:', error);
            toast.error(error.response?.data?.message || 'Error al cargar vista previa');
            onOpenChange(false);
        } finally {
            setLoading(false);
        }
    }, [accountId, onOpenChange]);

    useEffect(() => {
        if (open) {
            loadPreview();
        } else {
            setPreview(null);
            setSelectedSaleIds(new Set());
            setExpandedCustomers(new Set());
        }
    }, [open, loadPreview]);

    const handleUpdate = async () => {
        if (selectedSaleIds.size === 0) {
            toast.error('Selecciona al menos una venta para actualizar');
            return;
        }

        try {
            setUpdating(true);
            const result = await UpdateSalePricesService.batchUpdatePrices(Array.from(selectedSaleIds));

            if (result.success) {
                toast.success(
                    `${result.updated} ventas actualizadas correctamente. Total: ${CurrentAccountUtils.formatCurrency(result.total_difference)}`
                );
                onSuccess();
                onOpenChange(false);
            } else {
                toast.error(`Se actualizaron ${result.updated} ventas. ${result.failed} fallaron.`);
            }
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error('Error updating prices:', error);
            toast.error(error.response?.data?.message || 'Error al actualizar precios');
        } finally {
            setUpdating(false);
        }
    };

    const toggleSale = (saleId: number) => {
        const newSet = new Set(selectedSaleIds);
        if (newSet.has(saleId)) {
            newSet.delete(saleId);
        } else {
            newSet.add(saleId);
        }
        setSelectedSaleIds(newSet);
    };

    const toggleCustomer = (customer: BatchCustomerGroup) => {
        const customerSaleIds = customer.sales.map((s) => s.sale_id);
        const allSelected = customerSaleIds.every((id) => selectedSaleIds.has(id));

        const newSet = new Set(selectedSaleIds);
        if (allSelected) {
            // Deselect all
            customerSaleIds.forEach((id) => newSet.delete(id));
        } else {
            // Select all
            customerSaleIds.forEach((id) => newSet.add(id));
        }
        setSelectedSaleIds(newSet);
    };

    const toggleSelectAll = () => {
        if (!preview) return;

        const allSaleIds = preview.customers.flatMap((c) => c.sales.map((s) => s.sale_id));
        const allSelected = allSaleIds.every((id) => selectedSaleIds.has(id));

        if (allSelected) {
            setSelectedSaleIds(new Set());
        } else {
            setSelectedSaleIds(new Set(allSaleIds));
        }
    };

    const toggleCustomerExpanded = (customerId: number | string) => {
        const newSet = new Set(expandedCustomers);
        if (newSet.has(customerId)) {
            newSet.delete(customerId);
        } else {
            newSet.add(customerId);
        }
        setExpandedCustomers(newSet);
    };

    const calculateSelectedTotals = () => {
        if (!preview) return { count: 0, difference: 0 };

        let totalDifference = 0;
        let count = 0;

        preview.customers.forEach((customer) => {
            customer.sales.forEach((sale) => {
                if (selectedSaleIds.has(sale.sale_id)) {
                    totalDifference += sale.difference;
                    count++;
                }
            });
        });

        return { count, difference: totalDifference };
    };

    const selectedTotals = calculateSelectedTotals();
    const hasChanges = preview && preview.total_sales_with_changes > 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <RefreshCw className="h-5 w-5" />
                        Actualizar Precios de Ventas Pendientes
                    </DialogTitle>
                    <DialogDescription>
                        Selecciona las ventas que deseas actualizar con los precios actuales de productos
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : preview ? (
                    <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                        {/* Header Info */}
                        <Alert>
                            <AlertDescription className="flex items-center justify-between">
                                <span>
                                    🔍 Se encontraron <strong>{preview.total_sales_with_changes}</strong> ventas con
                                    cambios de precio
                                </span>
                                {preview.customers_affected > 0 && (
                                    <span className="text-sm text-muted-foreground">
                                        {preview.customers_affected} cliente(s) afectado(s)
                                    </span>
                                )}
                            </AlertDescription>
                        </Alert>

                        {/* Select All */}
                        {hasChanges && (
                            <div className="flex items-center justify-between border-b pb-2">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        checked={
                                            preview.customers.length > 0 &&
                                            preview.customers
                                                .flatMap((c) => c.sales.map((s) => s.sale_id))
                                                .every((id) => selectedSaleIds.has(id))
                                        }
                                        onCheckedChange={toggleSelectAll}
                                    />
                                    <span className="text-sm font-medium">Seleccionar todas</span>
                                </div>
                            </div>
                        )}

                        {/* Customer Groups */}
                        <ScrollArea className="flex-1 pr-4">
                            <div className="space-y-3">
                                {preview.customers.map((customer) => {
                                    const customerKey = customer.customer_id || 'general';
                                    const isExpanded = expandedCustomers.has(customerKey);
                                    const customerSaleIds = customer.sales.map((s) => s.sale_id);
                                    const allCustomerSelected = customerSaleIds.every((id) =>
                                        selectedSaleIds.has(id)
                                    );
                                    const someCustomerSelected = customerSaleIds.some((id) =>
                                        selectedSaleIds.has(id)
                                    );

                                    return (
                                        <div key={customerKey} className="border rounded-lg overflow-hidden">
                                            {/* Customer Header */}
                                            <div className="bg-muted/50 p-3 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        checked={allCustomerSelected}
                                                        onCheckedChange={() => toggleCustomer(customer)}
                                                        className={someCustomerSelected && !allCustomerSelected ? 'opacity-50' : ''}
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 px-2"
                                                        onClick={() => toggleCustomerExpanded(customerKey)}
                                                    >
                                                        {isExpanded ? (
                                                            <ChevronDown className="h-4 w-4" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                    <span className="font-medium">{customer.customer_name}</span>
                                                    <Badge variant="secondary">{customer.sales.length} ventas</Badge>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-muted-foreground">Total:</span>
                                                    <Badge
                                                        variant={customer.total_difference > 0 ? 'destructive' : 'default'}
                                                        className="font-semibold"
                                                    >
                                                        {customer.total_difference > 0 ? '+' : ''}
                                                        {CurrentAccountUtils.formatCurrency(customer.total_difference)}
                                                        {customer.total_difference > 0 ? ' ↑' : customer.total_difference < 0 ? ' ↓' : ''}
                                                    </Badge>
                                                </div>
                                            </div>

                                            {/* Sales List */}
                                            {isExpanded && (
                                                <div className="divide-y">
                                                    {customer.sales.map((sale) => {
                                                        const isSelected = selectedSaleIds.has(sale.sale_id);
                                                        const isIncrease = sale.difference > 0;

                                                        return (
                                                            <div
                                                                key={sale.sale_id}
                                                                className={`p-3 flex items-center justify-between hover:bg-muted/30 transition-colors ${isSelected ? 'bg-blue-50/30' : ''
                                                                    }`}
                                                            >
                                                                <div className="flex items-center gap-3 flex-1">
                                                                    <Checkbox
                                                                        checked={isSelected}
                                                                        onCheckedChange={() => toggleSale(sale.sale_id)}
                                                                    />
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-medium">
                                                                                Venta #{sale.receipt_number}
                                                                            </span>
                                                                            <span className="text-sm text-muted-foreground">
                                                                                {sale.date}
                                                                            </span>
                                                                        </div>
                                                                        <div className="text-sm text-muted-foreground mt-1">
                                                                            {CurrentAccountUtils.formatCurrency(sale.old_total)} → {CurrentAccountUtils.formatCurrency(sale.new_total)}
                                                                            <span className="mx-2">•</span>
                                                                            Pendiente: {CurrentAccountUtils.formatCurrency(sale.old_pending)} →{' '}
                                                                            {CurrentAccountUtils.formatCurrency(sale.new_pending)}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {isIncrease ? (
                                                                        <ArrowUp className="h-4 w-4 text-red-600" />
                                                                    ) : (
                                                                        <ArrowDown className="h-4 w-4 text-green-600" />
                                                                    )}
                                                                    <span
                                                                        className={`font-semibold ${isIncrease ? 'text-red-600' : 'text-green-600'
                                                                            }`}
                                                                    >
                                                                        {isIncrease ? '+' : ''}
                                                                        {CurrentAccountUtils.formatCurrency(sale.difference)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>

                        {/* Summary */}
                        <div className="border-t pt-4 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="font-medium">RESUMEN DE ACTUALIZACIÓN:</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    • Ventas seleccionadas: <strong>{selectedTotals.count}</strong> de{' '}
                                    {preview.total_sales_with_changes}
                                </div>
                                <div>
                                    • Cambio total:{' '}
                                    <strong
                                        className={selectedTotals.difference > 0 ? 'text-red-600' : 'text-green-600'}
                                    >
                                        {selectedTotals.difference > 0 ? '+' : ''}
                                        {CurrentAccountUtils.formatCurrency(selectedTotals.difference)}
                                    </strong>
                                </div>
                            </div>

                            {selectedTotals.count > 0 && Math.abs(selectedTotals.difference) > 10000 && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>
                                        <strong>Advertencia:</strong> Esta actualización modificará la deuda total en{' '}
                                        {CurrentAccountUtils.formatCurrency(Math.abs(selectedTotals.difference))}. Esta acción es
                                        irreversible.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    </div>
                ) : null}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updating}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleUpdate}
                        disabled={!hasChanges || loading || updating || selectedSaleIds.size === 0}
                        className="min-w-[200px]"
                    >
                        {updating ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Actualizando...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Actualizar Precios Seleccionados
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
