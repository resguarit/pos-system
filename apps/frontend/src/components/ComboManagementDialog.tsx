import React, { useState, useEffect, useCallback } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Search, Barcode, X } from 'lucide-react';
import { toast } from 'sonner';
import { getProducts } from '@/lib/api/productService';
import { createCombo, updateCombo } from '@/lib/api/comboService';
import type { Combo, ComboItemForm } from '@/types/combo';
import type { Product } from '@/types/product';

interface ComboManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  combo?: Combo | null;
  onSaved?: () => void;
}

export const ComboManagementDialog: React.FC<ComboManagementDialogProps> = ({
  open,
  onOpenChange,
  combo,
  onSaved = () => {}
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState(0);
  const [items, setItems] = useState<ComboItemForm[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Estados para el buscador
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const isEditing = !!combo;

  useEffect(() => {
    if (open) {
      loadProducts();
      if (combo) {
        setName(combo.name);
        setDescription(combo.description || '');
        setDiscountType(combo.discount_type);
        setDiscountValue(combo.discount_value);
        
        const mappedItems = combo.combo_items?.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          product: item.product
        })) || [];
        
        setItems(mappedItems);
      } else {
        resetForm();
      }
    }
  }, [open, combo]);

  const loadProducts = async () => {
    try {
      const productsData = await getProducts();
      // Convert the products to match our Product type
      const convertedProducts: Product[] = productsData.map((product: any) => ({
        id: parseInt(product.id),
        description: product.name || product.description || '',
        code: product.code || product.sku || product.id.toString(),
        measure_id: product.measure_id || 1,
        unit_price: product.unit_price || product.sale_price || '0',
        currency: product.currency || 'ARS',
        markup: product.markup || '0',
        category_id: product.category_id || 1,
        iva_id: product.iva_id || 1,
        image_id: product.image_id || null,
        supplier_id: product.supplier_id || 1,
        status: product.status || true,
        web: product.web || false,
        observaciones: product.observaciones || null,
        created_at: product.created_at || new Date().toISOString(),
        updated_at: product.updated_at || new Date().toISOString(),
        deleted_at: product.deleted_at || null,
        sale_price: product.sale_price || parseFloat(product.unit_price) || 0,
        measure: product.measure || { id: 1, name: 'Unidad', created_at: '', updated_at: '', deleted_at: null },
        category: product.category || { id: 1, name: 'General', description: '', parent_id: null, created_at: '', updated_at: '', deleted_at: null },
        iva: product.iva || { id: 1, name: 'IVA', rate: 0, created_at: '', updated_at: '', deleted_at: null },
        supplier: product.supplier || { id: 1, name: 'General', contact_name: null, phone: '', email: '', cuit: '', address: '', status: 'active', created_at: '', updated_at: '', deleted_at: null },
        stocks: product.stocks || []
      }));
      setProducts(convertedProducts);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Error al cargar productos');
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setDiscountType('percentage');
    setDiscountValue(0);
    setItems([]);
    setSelectedProduct(null);
    setSearchQuery('');
    setFilteredProducts([]);
    setShowSearchResults(false);
  };

  // Función para filtrar productos con debounce
  const searchProducts = useCallback((query: string) => {
    if (!query.trim()) {
      setFilteredProducts([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    
    const filtered = products.filter(product => {
      const searchLower = query.toLowerCase();
      const nameMatch = product.description.toLowerCase().includes(searchLower);
      const codeMatch = product.code.toLowerCase().includes(searchLower);
      
      return nameMatch || codeMatch;
    });

    setFilteredProducts(filtered);
    setShowSearchResults(true);
    setIsSearching(false);
  }, [products]);

  // Debounce para la búsqueda
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchProducts(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchProducts]);

  // Cerrar resultados cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.search-container')) {
        setShowSearchResults(false);
      }
    };

    if (showSearchResults) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSearchResults]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (!value.trim()) {
      setSelectedProduct(null);
    }
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setSearchQuery(product.description);
    setShowSearchResults(false);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedProduct(null);
    setShowSearchResults(false);
  };

  const addItem = () => {
    if (!selectedProduct) {
      toast.error('Selecciona un producto');
      return;
    }

    const existingItem = items.find(item => item.product_id === selectedProduct.id);
    if (existingItem) {
      toast.error('Este producto ya está en el combo');
      return;
    }

    const newItem: ComboItemForm = {
      product_id: selectedProduct.id,
      quantity: 1,
      product: selectedProduct,
    };

    setItems(prev => [...prev, newItem]);
    
    // Limpiar el buscador después de agregar
    handleClearSearch();
    
    toast.success('Producto agregado al combo');
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    const integerQuantity = Math.floor(Math.max(1, quantity));
    
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, quantity: integerQuantity } : item
    ));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('El nombre del combo es requerido');
      return;
    }

    if (items.length === 0) {
      toast.error('Debe agregar al menos un producto al combo');
      return;
    }

    setLoading(true);
    try {
      const comboData = {
        name: name.trim(),
        description: description.trim(),
        discount_type: discountType,
        discount_value: discountValue,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity
        }))
      };

      if (isEditing && combo) {
        await updateCombo(combo.id, comboData);
        toast.success('Combo actualizado exitosamente');
      } else {
        await createCombo(comboData);
        toast.success('Combo creado exitosamente');
      }

      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving combo:', error);
      toast.error(error.message || 'Error al guardar combo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Combo' : 'Crear Nuevo Combo'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Modifica los detalles del combo existente' 
              : 'Crea un nuevo combo con productos y descuentos'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Combo *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Combo Emprendedor"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción del combo"
              />
            </div>
          </div>

          {/* Descuento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discountType">Tipo de Descuento</Label>
              <Select value={discountType} onValueChange={(value: 'percentage' | 'fixed') => setDiscountType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Porcentaje</SelectItem>
                  <SelectItem value="fixed">Monto Fijo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discountValue">Valor del Descuento</Label>
              <Input
                id="discountValue"
                type="number"
                min="0"
                step={discountType === 'percentage' ? '0.01' : '0.01'}
                value={discountValue}
                onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                placeholder={discountType === 'percentage' ? 'Ej: 20' : 'Ej: 1000'}
              />
            </div>
          </div>

          {/* Agregar productos */}
          <div className="space-y-4">
            <Label>Productos del Combo</Label>
            
            {/* Buscador de productos */}
            <div className="relative search-container">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar por nombre o código de producto..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10 pr-10"
                    onFocus={() => {
                      if (searchQuery.trim()) {
                        setShowSearchResults(true);
                      }
                    }}
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                      onClick={handleClearSearch}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Button onClick={addItem} disabled={!selectedProduct}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar
                </Button>
              </div>

              {/* Resultados de búsqueda */}
              {showSearchResults && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-3 text-center text-sm text-muted-foreground">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto mb-2"></div>
                      Buscando productos...
                    </div>
                  ) : filteredProducts.length > 0 ? (
                    <div className="py-1">
                      {filteredProducts.map((product) => (
                        <div
                          key={product.id}
                          className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          onClick={() => handleProductSelect(product)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {product.description}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex items-center gap-1">
                                  <Barcode className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">
                                    {product.code}
                                  </span>
                                </div>
                                <span className="text-xs text-green-600 font-medium">
                                  ${product.sale_price.toFixed(2)}
                                </span>
                              </div>
                            </div>
                            {selectedProduct?.id === product.id && (
                              <div className="ml-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : searchQuery.trim() ? (
                    <div className="p-3 text-center text-sm text-muted-foreground">
                      No se encontraron productos que coincidan con "{searchQuery}"
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Producto seleccionado */}
            {selectedProduct && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      {selectedProduct.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        <Barcode className="h-3 w-3 text-blue-600" />
                        <span className="text-xs text-blue-700">
                          {selectedProduct.code}
                        </span>
                      </div>
                      <span className="text-xs text-blue-600 font-medium">
                        ${selectedProduct.sale_price.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSearch}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Lista de productos */}
          {items.length > 0 && (
            <div className="space-y-2">
              <Label>Productos Incluidos</Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {item.product?.description || `Product ID: ${item.product_id}`}
                      </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};