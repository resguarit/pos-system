import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { sileo } from "sileo"
import { Search, Loader2, DollarSign, Percent, TrendingUp, AlertCircle } from 'lucide-react';
import { getProducts, type Product } from '@/lib/api/productService';
import { bulkPriceService } from '@/lib/api/bulkPriceService';
import { UpdateTypeSelector } from './UpdateTypeSelector';
import { UpdateValueInput } from './UpdateValueInput';
import { PreviewCard } from './PreviewCard';
import { 
  PercentageUpdateStrategy, 
  FixedUpdateStrategy 
} from '@/services/products/priceUpdate/PriceUpdateStrategy';

interface UpdateByProductProps {
  onSuccess?: () => void;
  onClose: () => void;
}

export const UpdateByProduct: React.FC<UpdateByProductProps> = ({ onSuccess, onClose }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [updateType, setUpdateType] = useState<'percentage' | 'fixed'>('percentage');
  const [updateValue, setUpdateValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Cargar productos
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const data = await getProducts();
      const productList = Array.isArray(data) ? data : data?.data || [];
      setProducts(productList);
    } catch (error) {
      console.error('Error cargando productos:', error);
      sileo.error({ title: 'Error al cargar productos' });
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar productos por búsqueda
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.description?.toLowerCase().includes(term) ||
        p.name?.toLowerCase().includes(term) ||
        p.code?.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  // Calcular preview de precios
  const previewData = useMemo(() => {
    if (!updateValue || selectedProducts.size === 0) return null;

    const value = Number(updateValue);
    if (isNaN(value)) return null;

    const strategy = updateType === 'percentage'
      ? new PercentageUpdateStrategy(value)
      : new FixedUpdateStrategy(value);

    const validation = strategy.validate();
    if (!validation.isValid) {
      return null;
    }

    const selectedProductsList = products.filter((p) => selectedProducts.has(p.id));
    
    const previews = selectedProductsList.map((product) => {
      const rawPrice = product.unit_price;
      const currentPrice = Number(rawPrice) || 0;
      const newPrice = strategy.calculateNewPrice(currentPrice);
      
      return {
        id: product.id,
        name: product.description || product.name || 'Sin nombre',
        currentPrice,
        newPrice,
        difference: newPrice - currentPrice,
      };
    });

    const totalCurrent = previews.reduce((sum, p) => sum + p.currentPrice, 0);
    const totalNew = previews.reduce((sum, p) => sum + p.newPrice, 0);

    return {
      previews,
      totalCurrent,
      totalNew,
      totalDifference: totalNew - totalCurrent,
      count: previews.length,
    };
  }, [products, selectedProducts, updateType, updateValue]);

  const toggleProduct = (productId: string) => {
    setSelectedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedProducts(new Set(filteredProducts.map((p) => p.id)));
  };

  const clearSelection = () => {
    setSelectedProducts(new Set());
  };

  const handleUpdate = async () => {
    if (!updateValue || selectedProducts.size === 0) {
      sileo.error({ title: 'Selecciona productos y especifica un valor' });
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
      const updates = Array.from(selectedProducts).map((productId) => {
        const product = products.find((p) => p.id === productId);
        if (!product) return null;

        const currentPrice = Number(product.unit_price ?? 0);
        const newPrice = strategy.calculateNewPrice(currentPrice);

        return {
          id: Number(productId),
          unit_price: newPrice,
        };
      }).filter(Boolean) as Array<{ id: number; unit_price: number }>;

      const result = await bulkPriceService.bulkUpdatePrices({ updates });

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
          <UpdateValueInput
            type={updateType}
            value={updateValue}
            onChange={setUpdateValue}
          />
        </CardContent>
      </Card>

      {/* Selección de productos */}
      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Productos</CardTitle>
          <CardDescription>
            Busca y selecciona los productos a actualizar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Búsqueda */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nombre, código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={selectAll} disabled={filteredProducts.length === 0}>
              Seleccionar Todos
            </Button>
            <Button variant="outline" onClick={clearSelection} disabled={selectedProducts.size === 0}>
              Limpiar
            </Button>
          </div>

          {/* Contador de selección */}
          <div className="flex items-center justify-between">
            <Badge variant="secondary">
              {selectedProducts.size} de {filteredProducts.length} seleccionados
            </Badge>
          </div>

          {/* Lista de productos */}
          <ScrollArea className="h-[300px] border rounded-md p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <AlertCircle className="w-8 h-8 mb-2" />
                <p>No se encontraron productos</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => toggleProduct(product.id)}
                  >
                    <Checkbox
                      checked={selectedProducts.has(product.id)}
                      onCheckedChange={() => toggleProduct(product.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{product.description || product.name}</p>
                      <p className="text-sm text-gray-500">Código: {product.code}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${Number(product.unit_price || 0).toFixed(2)}</p>
                      <p className="text-xs text-gray-500">{product.currency || 'ARS'}</p>
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
          disabled={selectedProducts.size === 0 || !updateValue || isUpdating}
        >
          {isUpdating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Actualizando...
            </>
          ) : (
            <>
              <TrendingUp className="w-4 h-4 mr-2" />
              Actualizar {selectedProducts.size} Producto{selectedProducts.size !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
