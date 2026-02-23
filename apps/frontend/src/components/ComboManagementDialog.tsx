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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Search, Barcode, X } from 'lucide-react';
import { toast } from 'sonner';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { createCombo, updateCombo } from '@/lib/api/comboService';
import type { Combo, ComboItemForm } from '@/types/combo';
import type { Product } from '@/types/product';

export interface ComboGroupForm {
  name: string;
  required_quantity: number | '';
  options: { product_id: number; product?: Product }[];
}

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
  onSaved = () => { }
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed_amount'>('percentage');
  const [discountValue, setDiscountValue] = useState(0);
  const [items, setItems] = useState<ComboItemForm[]>([]);
  const [groups, setGroups] = useState<ComboGroupForm[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [addTarget, setAddTarget] = useState<string>('fixed');
  const [loading, setLoading] = useState(false);

  // Estados para el buscador
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  const {
    results: filteredProducts,
    isSearching,
    search: searchProductsDebounced,
    clear: clearSearchDebounced,
  } = useDebouncedSearch<Product>({
    endpoint: '/products',
    extraParams: { per_page: '20' },
    extractData: (res: any) => {
      const data = res?.data?.data || res?.data || (Array.isArray(res) ? res : []);
      return (Array.isArray(data) ? data : []).map((product: any) => ({
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
    }
  });

  const isEditing = !!combo;

  useEffect(() => {
    if (open) {
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

        const mappedGroups = combo.groups?.map(group => ({
          name: group.name,
          required_quantity: group.required_quantity,
          options: group.options?.map(opt => ({
            product_id: opt.product_id,
            product: opt.product
          })) || []
        })) || [];
        setGroups(mappedGroups);
      } else {
        resetForm();
      }
    }
  }, [open, combo]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setDiscountType('percentage');
    setDiscountValue(0);
    setItems([]);
    setGroups([]);
    setSelectedProduct(null);
    setAddTarget('fixed');
    setSearchQuery('');
    clearSearchDebounced();
    setShowSearchResults(false);
  };

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
      clearSearchDebounced();
      setShowSearchResults(false);
    } else {
      searchProductsDebounced(value);
      setShowSearchResults(true);
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
    clearSearchDebounced();
    setShowSearchResults(false);
  };

  const addItemToTarget = () => {
    if (!selectedProduct) {
      toast.error('Selecciona un producto');
      return;
    }

    if (addTarget === 'fixed') {
      const existingItem = items.find(item => item.product_id === selectedProduct.id);
      if (existingItem) {
        toast.error('Este producto ya está en el combo');
        return;
      }

      setItems(prev => [...prev, {
        product_id: selectedProduct.id,
        quantity: 1,
        product: selectedProduct,
      }]);
    } else if (addTarget.startsWith('group-')) {
      const groupIndex = parseInt(addTarget.split('-')[1]);
      const group = groups[groupIndex];
      if (!group) return;

      const existingOption = group.options.find(opt => opt.product_id === selectedProduct.id);
      if (existingOption) {
        toast.error('Esta opción ya está en el grupo');
        return;
      }

      setGroups(prev => {
        const next = [...prev];
        next[groupIndex] = {
          ...next[groupIndex],
          options: [
            ...next[groupIndex].options,
            {
              product_id: selectedProduct.id,
              product: selectedProduct
            }
          ]
        };
        return next;
      });
    }

    // Limpiar el buscador después de agregar
    handleClearSearch();

    toast.success('Producto agregado');
  };

  const addGroup = () => {
    setGroups(prev => [...prev, { name: '', required_quantity: 1, options: [] }]);
  };

  const removeGroup = (index: number) => {
    setGroups(prev => prev.filter((_, i) => i !== index));
    if (addTarget === `group-${index}`) setAddTarget('fixed');
  };

  const updateGroup = (index: number, field: keyof ComboGroupForm, value: any) => {
    setGroups(prev => prev.map((g, i) => i === index ? { ...g, [field]: value } : g));
  };

  const removeGroupOption = (groupIndex: number, optionIndex: number) => {
    setGroups(prev => {
      const next = [...prev];
      next[groupIndex] = {
        ...next[groupIndex],
        options: next[groupIndex].options.filter((_, i) => i !== optionIndex)
      };
      return next;
    });
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

    if (items.length === 0 && groups.length === 0) {
      toast.error('Debe agregar al menos un producto o grupo de opciones al combo');
      return;
    }

    // validate groups
    const emptyGrps = groups.filter(g => !g.name.trim() || g.options.length === 0);
    if (emptyGrps.length > 0) {
      toast.error('Todos los grupos deben tener un nombre y al menos una opción.');
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
        })),
        groups: groups.map(group => ({
          name: group.name,
          required_quantity: Number(group.required_quantity) || 1,
          options: group.options.map(opt => ({ product_id: opt.product_id }))
        }))
      };

      if (isEditing && combo) {
        await updateCombo(combo.id, { ...comboData, id: combo.id });
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
              <Select value={discountType} onValueChange={(value: 'percentage' | 'fixed_amount') => setDiscountType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Porcentaje</SelectItem>
                  <SelectItem value="fixed_amount">Monto Fijo</SelectItem>
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
                <div className="flex gap-2">
                  <Select value={addTarget} onValueChange={setAddTarget}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Destino..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Item Fijo</SelectItem>
                      {groups.map((g, i) => (
                        <SelectItem key={i} value={`group-${i}`}>
                          Grupo: {g.name || `#${i + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={addItemToTarget} disabled={!selectedProduct}>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar
                  </Button>
                </div>
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

          {/* Grupos personalizables */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <Label className="text-lg">Grupos Personalizables (Opciones)</Label>
              <Button variant="outline" size="sm" onClick={addGroup}>
                <Plus className="h-4 w-4 mr-2" />
                Añadir Grupo
              </Button>
            </div>
            {groups.map((group, groupIndex) => (
              <div key={groupIndex} className="p-4 border rounded-lg bg-gray-50 relative space-y-4">
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute top-2 right-2 h-8 w-8 p-0 shrink-0 border border-transparent shadow-none bg-transparent hover:bg-red-50 text-red-500 hover:text-red-700"
                  onClick={() => removeGroup(groupIndex)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-10">
                  <div className="space-y-2">
                    <Label>Nombre del Grupo</Label>
                    <Input
                      placeholder="Ej: Sabores de Empanadas"
                      value={group.name}
                      onChange={(e) => updateGroup(groupIndex, 'name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cantidad Requerida</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Ej: 3"
                      value={group.required_quantity}
                      onChange={(e) => updateGroup(groupIndex, 'required_quantity', e.target.value === '' ? '' : parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <Label>Opciones del grupo</Label>
                  {group.options.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      Utilice el buscador superior para agregar productos al destino "Grupo: {group.name}".
                    </p>
                  ) : (
                    <div className="flex gap-2 flex-wrap">
                      {group.options.map((opt, optIndex) => (
                        <Badge key={optIndex} variant="secondary" className="flex items-center gap-1.5 py-1.5 px-3">
                          <span className="max-w-[150px] truncate" title={opt.product?.description}>
                            {opt.product?.description}
                          </span>
                          <X
                            className="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-red-500 transition-colors"
                            onClick={() => removeGroupOption(groupIndex, optIndex)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
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