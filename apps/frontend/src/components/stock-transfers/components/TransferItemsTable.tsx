/**
 * TransferItemsTable Component
 * Displays the list of items to be transferred with stock info
 * Supports inline quantity editing
 */

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TransferItem } from '../types';

interface TransferItemsTableProps {
  items: TransferItem[];
  onRemoveItem: (index: number) => void;
  onUpdateQuantity?: (index: number, quantity: number) => void;
  disabled?: boolean;
}

export function TransferItemsTable({
  items,
  onRemoveItem,
  onUpdateQuantity,
  disabled = false,
}: TransferItemsTableProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">
        No hay productos agregados
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead className="text-center w-28">Stock Origen</TableHead>
            <TableHead className="text-right w-24">Cantidad</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => {
            const hasEnoughStock = (item.availableStock ?? 0) >= item.quantity;
            
            return (
              <TableRow key={`${item.product_id}-${index}`}>
                <TableCell>
                  <div>
                    <div className="font-medium">
                      {item.product?.description ?? 'Producto desconocido'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.product?.code || item.product?.barcode || '-'}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center text-muted-foreground text-sm">
                  {item.availableStock ?? 0}
                </TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => {
                      const qty = parseInt(e.target.value) || 0;
                      if (qty > 0 && onUpdateQuantity) {
                        onUpdateQuantity(index, qty);
                      }
                    }}
                    min="1"
                    disabled={disabled}
                    className={cn(
                      "w-20 text-right h-8",
                      !hasEnoughStock && "border-red-300 text-red-600"
                    )}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveItem(index)}
                    disabled={disabled}
                    className="hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      
      {/* Summary */}
      <div className="px-4 py-2 bg-white border-t text-sm text-muted-foreground">
        Total: {items.length} producto{items.length !== 1 ? 's' : ''}, {' '}
        {items.reduce((sum, item) => sum + item.quantity, 0)} unidades
      </div>
    </div>
  );
}
