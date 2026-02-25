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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { sileo } from "sileo"
import { Loader2, Calculator, Percent, DollarSign, Package } from 'lucide-react';
import { bulkPriceService } from '@/lib/api/bulkPriceService';
import { calculateNewPrice } from '@/utils/priceCalculations';
import { getProducts, type Product } from '@/lib/api/productService';
import { getCategories } from '@/lib/api/categoryService';
import { useBranch } from '@/context/BranchContext';

interface BulkPriceUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPricesUpdated?: () => void;
}

interface Category {
  id: number;
  name: string;
}

type UpdateType = 'percentage' | 'fixed' | 'category';

export const BulkPriceUpdateDialog: React.FC<BulkPriceUpdateDialogProps> = ({
  open,
  onOpenChange,
  onPricesUpdated,
}) => {
  const { selectedBranch, branches } = useBranch();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [updateType, setUpdateType] = useState<UpdateType>('percentage');
  const [updateValue, setUpdateValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [filterText, setFilterText] = useState('');

  // Cargar productos y categorías
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [productsData, categoriesData] = await Promise.all([
        getProducts(), // Obtener todos los productos
        getCategories()
      ]);

      if (Array.isArray(productsData)) {
        setProducts(productsData);
      } else if (productsData && typeof productsData === 'object' && 'data' in productsData) {
        setProducts((productsData as { data: Product[] }).data);
      }

      if (Array.isArray(categoriesData)) {
        setCategories(categoriesData);
      } else if (categoriesData && typeof categoriesData === 'object' && 'data' in categoriesData) {
        setCategories((categoriesData as { data: Category[] }).data);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      sileo.error({ title: 'Error al cargar productos y categorías' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedProducts([]);
    setSelectedCategories([]);
    setUpdateValue('');
    setFilterText('');
    onOpenChange(false);
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const toggleCategory = (categoryId: number) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const selectAllProducts = () => {
    const filteredProducts = getFilteredProducts();
    setSelectedProducts(filteredProducts.map(p => p.id));
  };

  const clearSelection = () => {
    setSelectedProducts([]);
    setSelectedCategories([]);
  };

  const getFilteredProducts = () => {
    return products.filter(product => {
      const matchesText = (product.description || product.name || '').toLowerCase().includes(filterText.toLowerCase());
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(Number(product.category_id));
      return matchesText && matchesCategory;
    });
  };

  const getSelectedProductsForUpdate = () => {
    if (selectedCategories.length > 0) {
      // Si hay categorías seleccionadas, usar productos de esas categorías
      return products.filter(p => selectedCategories.includes(Number(p.category_id)));
    }
    return products.filter(p => selectedProducts.includes(p.id));
  };

  // Usar función centralizada para evitar duplicación

  const handleUpdate = async () => {
    if (!updateValue || isNaN(Number(updateValue))) {
      sileo.error({ title: 'Por favor ingresa un valor válido' });
      return;
    }

    const productsToUpdate = getSelectedProductsForUpdate();
    if (productsToUpdate.length === 0) {
      sileo.error({ title: 'Selecciona al menos un producto para actualizar' });
      return;
    }

    const value = Number(updateValue);
    if (updateType === 'percentage' && (value < -100 || value > 1000)) {
      sileo.error({ title: 'El porcentaje debe estar entre -100% y 1000%' });
      return;
    }

    setIsUpdating(true);
    try {
      const updates = productsToUpdate.map(product => ({
        id: Number(product.id),
        unit_price: calculateNewPrice(product.unit_price || 0, updateType, value)
      }));

      const result = await bulkPriceService.bulkUpdatePrices({ updates });
      
      if (result.success) {
        sileo.success({ title: result.message });
        if (result.failed_updates && result.failed_updates.length > 0) {
          sileo.warning({ title: `${result.failed_updates.length} productos no se pudieron actualizar` });
        }
      } else {
        sileo.error({ title: result.message || 'Error al actualizar precios' });
      }
      
      handleClose();
      onPricesUpdated?.(); // Refrescar la lista de productos
    } catch (error: unknown) {
      console.error('Error actualizando precios:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar precios';
      sileo.error({ title: errorMessage });
    } finally {
      setIsUpdating(false);
    }
  };

  const getCurrentBranchName = () => {
    if (!selectedBranch) return 'Sucursal no seleccionada';
    return selectedBranch.description || selectedBranch.name || 'Sucursal actual';
  };

  const getBranchInfo = () => {
    if (!branches || branches.length <= 1) return null;
    return {
      current: getCurrentBranchName(),
      total: branches.length
    };
  };

  const filteredProducts = getFilteredProducts();
  const productsToUpdate = getSelectedProductsForUpdate();
  const branchInfo = getBranchInfo();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Actualización Masiva de Precios
          </DialogTitle>
          <DialogDescription>
            Selecciona productos y configura cómo quieres actualizar sus precios.
          </DialogDescription>
        </DialogHeader>

        {branchInfo && (
          <div className="mx-6 mb-4 p-2 bg-blue-50 rounded-md text-blue-800 text-sm flex-shrink-0">
            <strong>ℹ️ Información:</strong> Los precios se actualizarán <strong>globalmente</strong> para todos los productos.
            {branchInfo.total > 1 && ` Trabajando desde la sucursal ${branchInfo.current}.`}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
          {/* Panel de selección */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Filtros</Label>
              <div className="space-y-2 mt-2">
                <Input
                  placeholder="Buscar productos..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                />
                
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Categorías (opcional)</Label>
                  <div className="h-32 border rounded-md p-2 overflow-y-auto">
                    <div className="space-y-1">
                      {categories.map(category => (
                        <div key={category.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`category-${category.id}`}
                            checked={selectedCategories.includes(category.id)}
                            onCheckedChange={() => toggleCategory(category.id)}
                          />
                          <Label htmlFor={`category-${category.id}`} className="text-sm">
                            {category.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Productos ({filteredProducts.length})</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllProducts}
                    disabled={filteredProducts.length === 0}
                  >
                    Seleccionar Todos
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSelection}
                  >
                    Limpiar
                  </Button>
                </div>
              </div>
              
              <div className="h-64 border rounded-md overflow-y-auto">
                <div className="p-2 space-y-1">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="ml-2">Cargando productos...</span>
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No se encontraron productos
                    </div>
                  ) : (
                    filteredProducts.map(product => (
                      <div
                        key={product.id}
                        className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded"
                      >
                        <Checkbox
                          id={`product-${product.id}`}
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={() => toggleProduct(product.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <Label htmlFor={`product-${product.id}`} className="text-sm font-medium truncate">
                            {product.description || product.name}
                          </Label>
                          <div className="text-xs text-gray-500">
                            {`Categoría ${product.category_id}`} • ${Number(product.unit_price || 0).toFixed(2)} {product.currency || 'ARS'}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Panel de configuración */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Tipo de Actualización</Label>
              <Select value={updateType} onValueChange={(value: UpdateType) => setUpdateType(value)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      Porcentaje
                    </div>
                  </SelectItem>
                  <SelectItem value="fixed">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Valor Fijo
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">
                {updateType === 'percentage' ? 'Porcentaje (%)' : 'Valor Fijo ($)'}
              </Label>
              <Input
                type="number"
                placeholder={updateType === 'percentage' ? 'Ej: 10 (para +10%)' : 'Ej: 100 (para +$100)'}
                value={updateValue}
                onChange={(e) => setUpdateValue(e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                {updateType === 'percentage' 
                  ? 'Valores positivos aumentan, negativos disminuyen'
                  : 'Valores positivos aumentan, negativos disminuyen'
                }
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-sm font-medium">Resumen</Label>
              <div className="bg-gray-50 p-3 rounded-md space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Productos a actualizar:</span>
                  <Badge variant="secondary">{productsToUpdate.length}</Badge>
                </div>
                
                {updateValue && !isNaN(Number(updateValue)) && productsToUpdate.length > 0 && (
                  <div className="text-xs space-y-1">
                    <div className="font-medium">Ejemplo de cambios:</div>
                    {productsToUpdate.slice(0, 3).map(product => {
                      const currentPrice = Number(product.unit_price || 0);
                      const newPrice = calculateNewPrice(currentPrice, updateType, Number(updateValue));
                      return (
                        <div key={product.id} className="flex justify-between">
                          <span className="truncate">{product.description || product.name}</span>
                          <span>
                            ${currentPrice.toFixed(2)} {product.currency || 'ARS'} → ${newPrice.toFixed(2)} {product.currency || 'ARS'}
                          </span>
                        </div>
                      );
                    })}
                    {productsToUpdate.length > 3 && (
                      <div className="text-gray-500">... y {productsToUpdate.length - 3} más</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={handleClose} disabled={isUpdating}>
            Cancelar
          </Button>
          <Button 
            onClick={handleUpdate} 
            disabled={isUpdating || productsToUpdate.length === 0 || !updateValue}
            className="min-w-[120px]"
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Actualizando...
              </>
            ) : (
              <>
                <Package className="h-4 w-4 mr-2" />
                Actualizar {productsToUpdate.length} Productos
                {branchInfo && (
                  <span className="ml-1 text-xs opacity-75">
                    (Global)
                  </span>
                )}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
