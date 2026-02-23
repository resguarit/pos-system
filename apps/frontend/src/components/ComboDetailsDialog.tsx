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
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
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
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-0.5">Precio Base:</p>
                  <p className="text-base font-semibold text-gray-900">{formatCurrency(priceDetails.base_price)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-600 mb-0.5">Descuento:</p>
                  <p className="text-base font-semibold text-red-600">-{formatCurrency(priceDetails.discount_amount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600 mb-0.5">Precio Final:</p>
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(priceDetails.final_price)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Layout en dos columnas: Componentes + Descuento */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
          {/* Columna Izquierda: Componentes y Grupos */}
          <div className="space-y-4">
            {/* Componentes del combo */}
            {combo.combo_items && combo.combo_items.length > 0 && (
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-base">Componentes Fijos del Combo</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0">
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
                          <TableCell className="font-medium py-2">
                            {item.product?.description || 'Producto no disponible'}
                          </TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline">{item.quantity}</Badge>
                          </TableCell>
                          <TableCell className="py-2">{formatCurrency(item.product?.sale_price || 0)}</TableCell>
                          <TableCell className="py-2">{formatCurrency((item.product?.sale_price || 0) * item.quantity)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Grupos personalizables */}
            {combo.groups && combo.groups.length > 0 && (
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-base">Grupos Personalizables (Opciones)</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0 space-y-3">
                  {combo.groups.map((group, index) => (
                    <div key={index} className="border rounded-md p-3 bg-gray-50/50">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-sm text-gray-900">{group.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          Elegir {group.required_quantity}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {group.options && group.options.length > 0 ? (
                          group.options.map((opt, optIndex) => (
                            <Badge key={optIndex} variant="outline" className="bg-white text-gray-700">
                              {opt.product?.description || 'Producto no disponible'}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground italic text-xs">Sin opciones configuradas</span>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Información del descuento */}
          <Card className="md:w-64 h-fit">
            <CardHeader className="py-3 px-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calculator className="h-4 w-4" />
                Descuento
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center gap-4">
                  <span className="text-muted-foreground">Tipo:</span>
                  <Badge variant="secondary">
                    {combo.discount_type === 'percentage' ? 'Porcentaje' : 'Monto Fijo'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <span className="text-muted-foreground">Valor:</span>
                  <span className="text-red-600 font-medium">
                    {combo.discount_type === 'percentage'
                      ? `${combo.discount_value}%`
                      : formatCurrency(combo.discount_value)}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <span className="text-muted-foreground">Estado:</span>
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
        </div>

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
      </DialogContent>
    </Dialog>
  );
};
