// components/ComboDetailsDialog.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Calculator, Package, ShoppingCart } from 'lucide-react';
import { calculateComboPrice } from '@/lib/api/comboService';
import type { Combo } from '@/types/combo';

interface ComboDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  combo: Combo | null;
  onAddToCart?: (combo: Combo) => void;
  formatCurrency?: (amount: number) => string;
}

export const ComboDetailsDialog: React.FC<ComboDetailsDialogProps> = ({
  open,
  onOpenChange,
  combo,
  onAddToCart,
  formatCurrency = (amount) => `$${amount.toFixed(2)}`
}) => {
  const [priceDetails, setPriceDetails] = useState<{
    base_price: number;
    discount_amount: number;
    final_price: number;
  } | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);

  useEffect(() => {
    if (combo && open) {
      const fetchPrice = async () => {
        try {
          setLoadingPrice(true);
          const details = await calculateComboPrice(combo.id);
          setPriceDetails({
            base_price: details.base_price,
            discount_amount: details.discount_amount,
            final_price: details.final_price,
          });
        } catch (error) {
          console.error('Error calculating combo price:', error);
        } finally {
          setLoadingPrice(false);
        }
      };
      fetchPrice();
    }
  }, [combo, open]);

  if (!combo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {combo.name}
          </DialogTitle>
          <DialogDescription>
            {combo.description || 'Detalles del combo y componentes incluidos'}
          </DialogDescription>
        </DialogHeader>

        {/* Precio Final del Combo */}
        {priceDetails && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Precio Base:</p>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(priceDetails.base_price)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Descuento:</p>
                  <p className="text-lg font-semibold text-red-600">-{formatCurrency(priceDetails.discount_amount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 mb-1">Precio Final:</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(priceDetails.final_price)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {combo.description && (
            <p className="text-muted-foreground">{combo.description}</p>
          )}

          {/* Componentes del combo */}
          {combo.combo_items && combo.combo_items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Componentes del Combo</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Precio Unit.</TableHead>
                      <TableHead>Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {combo.combo_items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {item.product?.description || 'Producto no disponible'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.quantity}</Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(item.product?.sale_price || 0)}</TableCell>
                        <TableCell>{formatCurrency((item.product?.sale_price || 0) * item.quantity)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Información del descuento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Información del Descuento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Tipo de Descuento:</span>
                  <Badge variant="secondary">
                    {combo.discount_type === 'percentage' ? 'Porcentaje' : 'Monto Fijo'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Valor del Descuento:</span>
                  <span className="text-red-600">
                    {combo.discount_type === 'percentage' 
                      ? `${combo.discount_value}%` 
                      : formatCurrency(combo.discount_value)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Estado:</span>
                  <Badge 
                    variant={combo.is_active ? "default" : "destructive"}
                    className={combo.is_active ? "bg-green-100 text-green-800" : ""}
                  >
                    {combo.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botón para agregar al carrito */}
          {onAddToCart && combo.is_active && (
            <div className="flex justify-end">
              <Button 
                variant="outline"
                onClick={() => onAddToCart(combo)}
                className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-gray-900"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Agregar al Carrito
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
