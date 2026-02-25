import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { sileo } from "sileo"
import { Loader2, TrendingUp, AlertCircle, Building2 } from 'lucide-react';
import { getSuppliers } from '@/lib/api/supplierService';
import { bulkPriceService } from '@/lib/api/bulkPriceService';
import { UpdateTypeSelector } from './UpdateTypeSelector';
import { UpdateValueInput } from './UpdateValueInput';
import { PreviewCard } from './PreviewCard';
import {
  PercentageUpdateStrategy,
  FixedUpdateStrategy,
} from '@/services/products/priceUpdate/PriceUpdateStrategy';

interface Supplier {
  id: number;
  name: string;
  description?: string;
  email?: string;
  phone?: string;
}

interface UpdateBySupplierProps {
  onSuccess?: () => void;
  onClose: () => void;
}

export const UpdateBySupplier: React.FC<UpdateBySupplierProps> = ({ onSuccess, onClose }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<number>>(new Set());
  const [updateType, setUpdateType] = useState<'percentage' | 'fixed'>('percentage');
  const [updateValue, setUpdateValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  // Cargar proveedores
  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setIsLoading(true);
    try {
      const data = await getSuppliers();
      const supplierList = Array.isArray(data) ? data : data?.data || [];
      setSuppliers(supplierList);
    } catch (error) {
      console.error('Error cargando proveedores:', error);
      sileo.error({ title: 'Error al cargar proveedores' });
    } finally {
      setIsLoading(false);
    }
  };

  // Obtener preview cuando cambian los parámetros
  useEffect(() => {
    if (selectedSuppliers.size > 0 && updateValue) {
      loadPreview();
    } else {
      setPreviewData(null);
    }
  }, [selectedSuppliers, updateType, updateValue]);

  const loadPreview = async () => {
    const value = Number(updateValue);
    if (isNaN(value)) return;

    const strategy = updateType === 'percentage'
      ? new PercentageUpdateStrategy(value)
      : new FixedUpdateStrategy(value);

    const validation = strategy.validate();
    if (!validation.isValid) return;

    try {
      const supplierIds = Array.from(selectedSuppliers);
      const response = await bulkPriceService.searchProducts({
        supplier_ids: supplierIds,
      });

      if (response.data && response.data.length > 0) {
        const products = response.data;
        const totalCurrent = products.reduce((sum, p) => {
          const price = Number(p.unit_price ?? 0);
          return sum + price;
        }, 0);
        const totalNew = products.reduce((sum, p) => {
          const currentPrice = Number(p.unit_price ?? 0);
          return sum + strategy.calculateNewPrice(currentPrice);
        }, 0);

        setPreviewData({
          count: products.length,
          totalCurrent,
          totalNew,
          totalDifference: totalNew - totalCurrent,
        });
      } else {
        setPreviewData(null);
      }
    } catch (error) {
      console.error('Error obteniendo preview:', error);
    }
  };

  const toggleSupplier = (supplierId: number) => {
    setSelectedSuppliers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(supplierId)) {
        newSet.delete(supplierId);
      } else {
        newSet.add(supplierId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedSuppliers(new Set(suppliers.map((s) => s.id)));
  };

  const clearSelection = () => {
    setSelectedSuppliers(new Set());
  };

  const handleUpdate = async () => {
    if (!updateValue || selectedSuppliers.size === 0) {
      sileo.error({ title: 'Selecciona proveedores y especifica un valor' });
      return;
    }

    const value = Number(updateValue);
    if (isNaN(value)) {
      sileo.error({ title: 'Valor inválido' });
      return;
    }

    const strategy = updateType === 'percentage'
      ? new PercentageUpdateStrategy(value)
      : new FixedUpdateStrategy(value);

    const validation = strategy.validate();
    if (!validation.isValid) {
      sileo.error({ title: validation.error || 'Error de validación' });
      return;
    }

    setIsUpdating(true);
    try {
      const supplierIds = Array.from(selectedSuppliers);
      const result = await bulkPriceService.updatePricesBySupplier(
        supplierIds,
        updateType,
        value
      );

      if (result.success) {
        sileo.success({ title: result.message });
        onSuccess?.();
        onClose();
      } else {
        sileo.error({ title: result.message || 'Error al actualizar precios' });
      }
    } catch (error) {
      console.error('Error actualizando precios:', error);
      sileo.error({ title: 'Error al actualizar precios' });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuración de actualización */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Actualización</CardTitle>
          <CardDescription>
            Selecciona el tipo de actualización y el valor a aplicar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <UpdateTypeSelector value={updateType} onChange={setUpdateType} />
          <UpdateValueInput type={updateType} value={updateValue} onChange={setUpdateValue} />
        </CardContent>
      </Card>

      {/* Selección de proveedores */}
      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Proveedores</CardTitle>
          <CardDescription>
            Selecciona los proveedores cuyos productos deseas actualizar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Acciones de selección */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={selectAll} disabled={suppliers.length === 0}>
              Seleccionar Todos
            </Button>
            <Button variant="outline" onClick={clearSelection} disabled={selectedSuppliers.size === 0}>
              Limpiar
            </Button>
          </div>

          {/* Contador de selección */}
          <div className="flex items-center justify-between">
            <Badge variant="secondary">
              {selectedSuppliers.size} de {suppliers.length} seleccionados
            </Badge>
          </div>

          {/* Lista de proveedores */}
          <ScrollArea className="h-[300px] border rounded-md p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : suppliers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <AlertCircle className="w-8 h-8 mb-2" />
                <p>No se encontraron proveedores</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {suppliers.map((supplier) => (
                  <div
                    key={supplier.id}
                    className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => toggleSupplier(supplier.id)}
                  >
                    <Checkbox
                      checked={selectedSuppliers.has(supplier.id)}
                      onCheckedChange={() => toggleSupplier(supplier.id)}
                    />
                    <Building2 className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="font-medium">{supplier.name}</p>
                      {supplier.email && (
                        <p className="text-sm text-gray-500">{supplier.email}</p>
                      )}
                      {supplier.phone && (
                        <p className="text-xs text-gray-400">{supplier.phone}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Preview */}
      {previewData && (
        <PreviewCard
          count={previewData.count}
          totalCurrent={previewData.totalCurrent}
          totalNew={previewData.totalNew}
          totalDifference={previewData.totalDifference}
          updateType={updateType}
        />
      )}

      {/* Acciones */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} disabled={isUpdating}>
          Cancelar
        </Button>
        <Button
          onClick={handleUpdate}
          disabled={selectedSuppliers.size === 0 || !updateValue || isUpdating}
        >
          {isUpdating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Actualizando...
            </>
          ) : (
            <>
              <TrendingUp className="w-4 h-4 mr-2" />
              Actualizar {selectedSuppliers.size} Proveedor{selectedSuppliers.size !== 1 ? 'es' : ''}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
