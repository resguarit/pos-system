import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { sileo } from "sileo"
import { Loader2, TrendingUp, AlertCircle, Tag } from 'lucide-react';
import { getCategories } from '@/lib/api/categoryService';
import { bulkPriceService } from '@/lib/api/bulkPriceService';
import { UpdateTypeSelector } from './UpdateTypeSelector';
import { UpdateValueInput } from './UpdateValueInput';
import { PreviewCard } from './PreviewCard';
import {
  PercentageUpdateStrategy,
  FixedUpdateStrategy,
} from '@/services/products/priceUpdate/PriceUpdateStrategy';

interface Category {
  id: number;
  name: string;
  description?: string;
}

interface UpdateByCategoryProps {
  onSuccess?: () => void;
  onClose: () => void;
}

export const UpdateByCategory: React.FC<UpdateByCategoryProps> = ({ onSuccess, onClose }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<number>>(new Set());
  const [updateType, setUpdateType] = useState<'percentage' | 'fixed'>('percentage');
  const [updateValue, setUpdateValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  // Cargar categorías
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const data = await getCategories();
      const categoryList = Array.isArray(data) ? data : data?.data || [];
      setCategories(categoryList);
    } catch (error) {
      console.error('Error cargando categorías:', error);
      sileo.error({ title: 'Error al cargar categorías' });
    } finally {
      setIsLoading(false);
    }
  };

  // Obtener preview cuando cambian los parámetros
  useEffect(() => {
    if (selectedCategories.size > 0 && updateValue) {
      loadPreview();
    } else {
      setPreviewData(null);
    }
  }, [selectedCategories, updateType, updateValue]);

  const loadPreview = async () => {
    const value = Number(updateValue);
    if (isNaN(value)) return;

    const strategy = updateType === 'percentage'
      ? new PercentageUpdateStrategy(value)
      : new FixedUpdateStrategy(value);

    const validation = strategy.validate();
    if (!validation.isValid) return;

    try {
      const categoryIds = Array.from(selectedCategories);
      const response = await bulkPriceService.searchProducts({
        category_ids: categoryIds,
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
      setPreviewData(null);
    }
  };

  const toggleCategory = (categoryId: number) => {
    setSelectedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedCategories(new Set(categories.map((c) => c.id)));
  };

  const clearSelection = () => {
    setSelectedCategories(new Set());
  };

  const handleUpdate = async () => {
    if (!updateValue || selectedCategories.size === 0) {
      sileo.error({ title: 'Selecciona categorías y especifica un valor' });
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
      const categoryIds = Array.from(selectedCategories);
      const result = await bulkPriceService.updatePricesByCategory(
        categoryIds,
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

      {/* Selección de categorías */}
      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Categorías</CardTitle>
          <CardDescription>
            Selecciona las categorías cuyos productos deseas actualizar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Acciones de selección */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={selectAll} disabled={categories.length === 0}>
              Seleccionar Todas
            </Button>
            <Button variant="outline" onClick={clearSelection} disabled={selectedCategories.size === 0}>
              Limpiar
            </Button>
          </div>

          {/* Contador de selección */}
          <div className="flex items-center justify-between">
            <Badge variant="secondary">
              {selectedCategories.size} de {categories.length} seleccionadas
            </Badge>
          </div>

          {/* Lista de categorías */}
          <ScrollArea className="h-[300px] border rounded-md p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : categories.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <AlertCircle className="w-8 h-8 mb-2" />
                <p>No se encontraron categorías</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => toggleCategory(category.id)}
                  >
                    <Checkbox
                      checked={selectedCategories.has(category.id)}
                      onCheckedChange={() => toggleCategory(category.id)}
                    />
                    <Tag className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="font-medium">{category.name}</p>
                      {category.description && (
                        <p className="text-sm text-gray-500">{category.description}</p>
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
          disabled={selectedCategories.size === 0 || !updateValue || isUpdating}
        >
          {isUpdating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Actualizando...
            </>
          ) : (
            <>
              <TrendingUp className="w-4 h-4 mr-2" />
              Actualizar {selectedCategories.size} Categoría{selectedCategories.size !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
