import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { sileo } from 'sileo';
import { RefreshCw } from 'lucide-react';
import type { PendingDebtItem } from '@/types/currentAccount';
import { CurrentAccountUtils } from '@/lib/services/currentAccountService';
import { UpdateSalePriceDialog } from './UpdateSalePriceDialog';

interface PendingDebtItemsTableProps {
  items: PendingDebtItem[];
  accountId: number;
  onSuccess: () => void;
}

export function PendingDebtItemsTable({ items, accountId, onSuccess }: PendingDebtItemsTableProps) {
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);

  const handleUpdatePrice = (saleId: number) => {
    setSelectedSaleId(saleId);
    setShowUpdateDialog(true);
  };

  const handleSuccess = () => {
    sileo.success({ title: 'Precio actualizado correctamente' });
    setShowUpdateDialog(false);
    setSelectedSaleId(null);
    onSuccess();
  };

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pendientes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No hay ventas ni reparaciones pendientes de pago
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
            <span>Ventas y reparaciones pendientes</span>
            <Badge variant="secondary">{items.length} pendientes</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2 font-medium">Origen</th>
                  <th className="text-left p-2 font-medium">Documento</th>
                  <th className="text-left p-2 font-medium">Fecha</th>
                  <th className="text-right p-2 font-medium">Total</th>
                  <th className="text-right p-2 font-medium">Pagado</th>
                  <th className="text-right p-2 font-medium">Pendiente</th>
                  <th className="text-center p-2 font-medium">Estado</th>
                  <th className="text-right p-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => (
                  <tr key={`${item.kind}-${item.id}`} className="hover:bg-muted/30">
                    <td className="p-2">
                      <Badge variant={item.kind === 'repair' ? 'outline' : 'secondary'}>
                        {item.source_label}
                      </Badge>
                    </td>
                    <td className="p-2 font-medium">{item.code}</td>
                    <td className="p-2 text-muted-foreground">{item.date}</td>
                    <td className="p-2 text-right">{CurrentAccountUtils.formatCurrency(item.total)}</td>
                    <td className="p-2 text-right text-green-600">
                      {CurrentAccountUtils.formatCurrency(item.paid_amount)}
                    </td>
                    <td className="p-2 text-right font-semibold text-red-600">
                      {CurrentAccountUtils.formatCurrency(item.pending_amount)}
                    </td>
                    <td className="p-2 text-center">
                      <Badge
                        variant={
                          item.payment_status === 'pending'
                            ? 'destructive'
                            : item.payment_status === 'partial'
                              ? 'secondary'
                              : 'default'
                        }
                        className="text-xs"
                      >
                        {item.payment_status === 'pending'
                          ? 'Pendiente'
                          : item.payment_status === 'partial'
                            ? 'Parcial'
                            : 'Pagado'}
                      </Badge>
                    </td>
                    <td className="p-2 text-right">
                      {item.kind === 'sale' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUpdatePrice(item.id)}
                          disabled={item.payment_status === 'paid'}
                          title="Actualizar deuda con precios actuales"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin acciones</span>
                      )}
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
