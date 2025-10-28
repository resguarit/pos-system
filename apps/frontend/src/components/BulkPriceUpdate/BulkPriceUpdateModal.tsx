import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Tag, Building2 } from 'lucide-react';
import { UpdateByProduct } from './UpdateByProduct';
import { UpdateByCategory } from './UpdateByCategory';
import { UpdateBySupplier } from './UpdateBySupplier';

interface BulkPriceUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const BulkPriceUpdateModal: React.FC<BulkPriceUpdateModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'product' | 'category' | 'supplier'>('product');

  // Resetear al tab inicial cuando se cierra el modal
  useEffect(() => {
    if (!open) {
      setActiveTab('product');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Actualización Masiva de Precios
          </DialogTitle>
          <DialogDescription>
            Selecciona el método de actualización y configura los parámetros
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="product" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Por Producto
            </TabsTrigger>
            <TabsTrigger value="category" className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Por Categoría
            </TabsTrigger>
            <TabsTrigger value="supplier" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Por Proveedor
            </TabsTrigger>
          </TabsList>

          <TabsContent value="product" className="mt-6">
            <UpdateByProduct onSuccess={onSuccess} onClose={() => onOpenChange(false)} />
          </TabsContent>

          <TabsContent value="category" className="mt-6">
            <UpdateByCategory onSuccess={onSuccess} onClose={() => onOpenChange(false)} />
          </TabsContent>

          <TabsContent value="supplier" className="mt-6">
            <UpdateBySupplier onSuccess={onSuccess} onClose={() => onOpenChange(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
