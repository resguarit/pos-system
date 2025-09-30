import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Search, Calendar as CalendarIcon, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { purchaseOrderService, type PurchaseOrderItem } from '@/lib/api/purchaseOrderService';
import { getSuppliers } from '@/lib/api/supplierService';
import { getBranches } from '@/lib/api/branchService';
import { getProducts } from '@/lib/api/productService';
import api from '@/lib/api';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import paymentMethodService, { type PaymentMethod } from '@/lib/api/paymentMethodService';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface NewPurchaseOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

interface Supplier {
  id: number;
  name: string;
  contact_name: string;
}

interface Branch {
  id: number;
  description: string;
}

interface Product {
  id: number;
  description: string;
  code: string;
  unit_price: number;
  currency?: string;
  supplier_id?: number | string;
}

export const NewPurchaseOrderDialog = ({ open, onOpenChange, onSaved }: NewPurchaseOrderDialogProps) => {
  const [form, setForm] = useState({
    supplier_id: '',
    branch_id: '',
    order_date: new Date(),
    notes: '',
  });

  const [selectedCurrency, setSelectedCurrency] = useState<'ARS' | 'USD' | ''>(''); // Nueva estado para moneda
  
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [newItem, setNewItem] = useState({
    product_id: '',
    quantity: '',
    purchase_price: '',
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Función helper para prevenir Enter en inputs
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  };

  // Reset form cuando se abre el dialog
  useEffect(() => {
    if (open) {
      setForm({
        supplier_id: '',
        branch_id: '',
        order_date: new Date(),
        notes: '',
      });
      setSelectedCurrency('');
      setItems([]);
      setNewItem({
        product_id: '',
        quantity: '',
        purchase_price: '',
      });
      setError(null);
    }
  }, [open]);
  const [lowStockSuggestions, setLowStockSuggestions] = useState<{
    product: Product;
    stock: number;
    min_stock: number;
    suggestedQty: number;
  }[]>([])

  // Estado para el formulario inline de edición de producto sugerido
  const [editingSuggestion, setEditingSuggestion] = useState<{
    product: Product;
    stock: number;
    min_stock: number;
    suggestedQty: number;
    quantity: number;
    price: number;
  } | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [suppliersData, branchesData, productsData, paymentMethodsData] = await Promise.all([
          getSuppliers(),
          getBranches(),
          getProducts(),
          paymentMethodService.getAll()
        ]);
        setSuppliers(suppliersData as unknown as Supplier[]);
        setBranches(branchesData as unknown as Branch[]);
        setProducts(productsData as unknown as Product[]);
        setPaymentMethods(paymentMethodsData as unknown as PaymentMethod[]);
      } catch (err) {
        // Error loading data
        setError('Error al cargar los datos');
      }
    };
    if (open) {
      loadData();
    }
  }, [open]);

  useEffect(() => {
    if (productSearch && selectedCurrency) {
      const filtered = products.filter(product => 
        // Filtrar por búsqueda de texto
        ((typeof product.description === "string" && product.description.toLowerCase().includes(productSearch.toLowerCase())) ||
        (typeof product.code === "string" && product.code.toLowerCase().includes(productSearch.toLowerCase()))) &&
        // Filtrar por moneda seleccionada
        (product.currency || 'ARS') === selectedCurrency
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts([]);
    }
  }, [productSearch, products, selectedCurrency]);

  useEffect(() => {
    const loadLowStock = async () => {
      try {
        if (!open) return;
        if (!form.supplier_id || !form.branch_id || !selectedCurrency) {
          setLowStockSuggestions([])
          return
        }
        // Traer stock de la sucursal seleccionada
        const resp = await api.get('/stocks', { params: { branch_id: form.branch_id } })
        const stocks: any[] = resp.data?.data || resp.data || []
        const supplierId = String(form.supplier_id)

        // Unir con productos y filtrar por proveedor y stock bajo
        const suggestions = stocks
          .filter(s => typeof s.min_stock !== 'undefined' && s.min_stock != null)
          .map(s => {
            const product = products.find(p => String(p.id) === String(s.product_id ?? s.product?.id))
            const current = Number(
              s.current_stock ?? s.quantity ?? s.stock ?? 0
            )
            const min = Number(s.min_stock ?? 0)
            return { product, stock: current, min_stock: min }
          })
          .filter(x => 
            x.product && 
            String((x.product as any).supplier_id ?? '') === supplierId && 
            x.stock < x.min_stock &&
            (x.product.currency || 'ARS') === selectedCurrency // Filtrar por moneda
          )
          .map(x => ({
            product: x.product as Product,
            stock: x.stock,
            min_stock: x.min_stock,
            suggestedQty: Math.max(x.min_stock - x.stock, 1),
          }))

        setLowStockSuggestions(suggestions)
      } catch (e) {
        // Error cargando sugerencias de stock bajo
        setLowStockSuggestions([])
      }
    }
    loadLowStock()
  }, [open, form.supplier_id, form.branch_id, selectedCurrency, products])

  const handleFormChange = (field: string, value: string | Date) => {
    setForm({ ...form, [field]: value });
  };

  const handleNewItemChange = (field: string, value: string) => {
    setNewItem({ ...newItem, [field]: value });
  };

  const addItem = async () => {
    const { product_id, quantity, purchase_price } = newItem;

    if (product_id && quantity && purchase_price) {
      const newProductId = parseInt(product_id);
      const newQuantity = parseInt(quantity);
      const newPurchasePrice = parseFloat(purchase_price);

      // Obtener el producto seleccionado
      const selectedProduct = products.find(p => p.id === newProductId);
      if (!selectedProduct) {
        setError('Producto no encontrado');
        return;
      }

      // Verificar si el proveedor del producto es diferente al de la orden
      const orderSupplierId = parseInt(form.supplier_id);
      const productSupplierId = selectedProduct.supplier_id;
      
      if (productSupplierId !== orderSupplierId) {
        // Solo mostrar información, NO actualizar el proveedor en el frontend
        // El backend se encargará de actualizar solo el proveedor (no el precio) al crear la orden
        
        // Producto con proveedor diferente - se actualizará automáticamente
      }

      // Si llegamos aquí, los proveedores coinciden, continuar con el flujo normal
      const existingItemIndex = items.findIndex(item => item.product_id === newProductId);

      if (existingItemIndex !== -1) {
        const existingItem = items[existingItemIndex];
        // Si el producto existe, compara el precio
        if (existingItem.purchase_price === newPurchasePrice) {
          // Si el precio es el mismo, suma la cantidad
          const updatedItems = [...items];
          updatedItems[existingItemIndex].quantity += newQuantity;
          setItems(updatedItems);
        } else {
          // Si el precio es diferente, muestra una notificación
          toast.warning("Producto ya agregado con otro precio", {
            description: "No se puede agregar el mismo producto con un precio de compra diferente.",
          });
          return; // No hace nada más
        }
      } else {
        // Si el producto no existe, agrégalo a la lista
        const itemToAdd: PurchaseOrderItem = {
          product_id: newProductId,
          quantity: newQuantity,
          purchase_price: newPurchasePrice,
        };
        setItems([...items, itemToAdd]);
      }
      
      // Limpia los campos del nuevo item
      setNewItem({
        product_id: '',
        quantity: '',
        purchase_price: '',
      });
      setProductSearch('');
      setShowProductSearch(false);
      setError(null);

    } else {
      setError('Complete todos los campos del producto');
    }
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const selectProduct = (product: Product) => {
    setNewItem({
      ...newItem,
      product_id: product.id.toString(),
      purchase_price: product.unit_price.toString(),
    });
    setProductSearch(product.description);
    setShowProductSearch(false);
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => total + (item.quantity * item.purchase_price), 0);
  };

  const getProductName = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product ? product.description : 'Producto no encontrado';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.supplier_id || !form.branch_id || !selectedCurrency || items.length === 0 || !selectedPaymentMethod) {
      setError('Complete todos los campos requeridos (incluyendo moneda), agregue al menos un producto y seleccione método de pago');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await purchaseOrderService.create({
        supplier_id: parseInt(form.supplier_id),
        branch_id: parseInt(form.branch_id),
        currency: selectedCurrency as 'ARS' | 'USD',
        order_date: format(form.order_date, 'yyyy-MM-dd'),
        notes: form.notes || '',
        items: items,
        payment_method_id: parseInt(selectedPaymentMethod),
      });
      toast.success("Orden de compra creada", {
        description: "La orden de compra se creó exitosamente.",
      });
      onSaved();
      onOpenChange(false);
      setForm({
        supplier_id: '',
        branch_id: '',
        order_date: new Date(),
        notes: '',
      });
      setItems([]);
      setNewItem({
        product_id: '',
        quantity: '',
        purchase_price: '',
      });
      setSelectedPaymentMethod('');
    } catch (err: any) {
      if (err?.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err?.message) {
        setError(err.message);
      } else {
        setError('Error al crear la orden de compra');
      }
    } finally {
      setLoading(false);
    }
  };

  const openEditSuggestionForm = (suggestion: {
    product: Product;
    stock: number;
    min_stock: number;
    suggestedQty: number;
  }) => {
    setEditingSuggestion({
      ...suggestion,
      quantity: suggestion.suggestedQty,
      price: Number(suggestion.product.unit_price)
    })
  }

  const addSuggestedProduct = () => {
    if (!editingSuggestion) return
    
    const pid = Number(editingSuggestion.product.id)
    const idx = items.findIndex(i => i.product_id === pid)
    
    if (idx !== -1) {
      toast.warning('Producto ya agregado', { 
        description: 'Este producto ya está en la lista de compra.' 
      })
      return
    }
    
    setItems(prev => [...prev, { 
      product_id: pid, 
      quantity: editingSuggestion.quantity, 
      purchase_price: editingSuggestion.price 
    }])
    
    setEditingSuggestion(null)
    toast.success('Producto agregado', {
      description: `${editingSuggestion.product.description} agregado a la orden.`
    })
  }

  const isProductAlreadyAdded = (productId: number) => {
    return items.some(item => item.product_id === Number(productId))
  }

  const getBranchName = () => {
    const branch = branches.find(b => b.id.toString() === form.branch_id)
    return branch ? branch.description : 'Sucursal seleccionada'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Orden de Compra</DialogTitle>
          <DialogDescription>
            Complete los campos para crear una nueva orden de compra.
          </DialogDescription>
        </DialogHeader>

        <form 
          onSubmit={(e) => {
            // Verificar si el submit viene de un Enter no deseado
            const activeElement = document.activeElement as HTMLElement;
            if (activeElement && activeElement.tagName === 'INPUT') {
              // Si el foco está en un input, NO enviar el formulario
              e.preventDefault();
              return;
            }
            // Solo permitir submit si viene de un botón o acción deliberada
            handleSubmit(e);
          }}
          className="space-y-6"
          onKeyDown={(e) => {
            // Prevenir que cualquier Enter dentro del formulario lo envíe
            if (e.key === 'Enter') {
              const target = e.target as HTMLElement;
              
              // Solo permitir Enter en botones de submit
              if (target.tagName === 'BUTTON' && (target.getAttribute('type') === 'submit' || target.classList.contains('submit-button'))) {
                return;
              }
              
              // Solo permitir Enter en textareas
              if (target.tagName === 'TEXTAREA') {
                return;
              }
              
              // Para todos los demás casos, prevenir completamente
              e.preventDefault();
              e.stopPropagation();
              return false;
            }
          }}
        >
          {/* Sugerencias por stock bajo */}
          {form.supplier_id && form.branch_id && (
            <div className="space-y-2 p-4 border rounded-lg bg-amber-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-amber-800">Sugeridos por stock bajo del proveedor</h3>
                <span className="text-sm text-amber-700">
                  {selectedCurrency ? `Sucursal: ${getBranchName()} - Moneda: ${selectedCurrency}` : getBranchName()}
                </span>
              </div>
              {!selectedCurrency ? (
                <div className="text-sm text-amber-700">
                  Selecciona una moneda para ver los productos sugeridos con stock bajo.
                </div>
              ) : lowStockSuggestions.length === 0 ? (
                <div className="text-sm text-amber-700">
                  No hay productos con stock bajo para este proveedor en esta sucursal con moneda {selectedCurrency}.
                </div>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Mínimo</TableHead>
                        <TableHead>Sugerido</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowStockSuggestions.map((s, i) => {
                        const isAdded = isProductAlreadyAdded(s.product.id)
                        const isEditing = editingSuggestion?.product.id === s.product.id
                        
                        return (
                          <React.Fragment key={i}>
                            <TableRow>
                              <TableCell>{s.product.description}</TableCell>
                              <TableCell>{s.product.code}</TableCell>
                              <TableCell>{s.stock}</TableCell>
                              <TableCell>{s.min_stock}</TableCell>
                              <TableCell>{s.suggestedQty}</TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  type="button" 
                                  size="sm" 
                                  variant={isAdded ? "secondary" : "default"}
                                  disabled={isAdded}
                                  onClick={() => openEditSuggestionForm(s)}
                                >
                                  {isAdded ? (
                                    <>
                                      <Check className="h-4 w-4 mr-2" /> Agregado
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="h-4 w-4 mr-2" /> Agregar
                                    </>
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>
                            {isEditing && (
                              <TableRow className="bg-blue-50">
                                <TableCell colSpan={6} className="p-4">
                                  <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                      <h4 className="font-medium text-blue-900">
                                        Agregar: {s.product.description}
                                      </h4>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setEditingSuggestion(null)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-4">
                                      <div className="space-y-2">
                                        <Label htmlFor={`edit-qty-${i}`}>Cantidad *</Label>
                                        <Input
                                          id={`edit-qty-${i}`}
                                          type="number"
                                          min="1"
                                          value={editingSuggestion.quantity}
                                          onChange={(e) => setEditingSuggestion({
                                            ...editingSuggestion,
                                            quantity: parseInt(e.target.value) || 1
                                          })}
                                          onKeyDown={handleInputKeyDown}
                                          className="bg-white"
                                        />
                                        <p className="text-xs text-gray-500">
                                          Sugerido: {editingSuggestion.suggestedQty}
                                        </p>
                                      </div>

                                      <div className="space-y-2">
                                        <Label htmlFor={`edit-price-${i}`}>Precio Unitario *</Label>
                                        <Input
                                          id={`edit-price-${i}`}
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={editingSuggestion.price}
                                          onChange={(e) => setEditingSuggestion({
                                            ...editingSuggestion,
                                            price: parseFloat(e.target.value) || 0
                                          })}
                                          onKeyDown={handleInputKeyDown}
                                          className="bg-white"
                                        />
                                        <p className="text-xs text-gray-500">
                                          Original: ${editingSuggestion.product.unit_price}
                                        </p>
                                      </div>

                                      <div className="space-y-2">
                                        <Label>Subtotal</Label>
                                        <div className="p-2 bg-white border rounded text-sm font-medium">
                                          ${(editingSuggestion.quantity * editingSuggestion.price).toFixed(2)} {selectedCurrency}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          onClick={addSuggestedProduct}
                                          disabled={editingSuggestion.quantity <= 0 || editingSuggestion.price <= 0}
                                        >
                                          <Plus className="h-4 w-4 mr-2" />
                                          Agregar a la Orden
                                        </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setEditingSuggestion(null)}
                                      >
                                        Cancelar
                                      </Button>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier_id">Proveedor *</Label>
              <Select value={form.supplier_id} onValueChange={(value) => setForm({ ...form, supplier_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch_id">Sucursal *</Label>
              <Select value={form.branch_id} onValueChange={(value) => setForm({ ...form, branch_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Moneda de la Orden *</Label>
              <Select value={selectedCurrency} onValueChange={(value) => setSelectedCurrency(value as 'ARS' | 'USD')}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione la moneda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">ARS - Pesos Argentinos</SelectItem>
                  <SelectItem value="USD">USD - Dólares Americanos</SelectItem>
                </SelectContent>
              </Select>
              {selectedCurrency && (
                <p className="text-sm text-muted-foreground">
                  Solo se mostrarán productos con precios en {selectedCurrency}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="order_date">Fecha de Orden</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !form.order_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {form.order_date ? format(form.order_date, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={form.order_date}
                        onSelect={(date) => handleFormChange('order_date', date instanceof Date ? date : new Date())}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="payment_method_id">Método de Pago *</Label>
                  <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                    <SelectTrigger className="w-full min-w-0">
                      <SelectValue placeholder="Seleccione un método de pago" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((pm) => (
                        <SelectItem key={pm.id} value={pm.id.toString()}>
                          {pm.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => handleFormChange('notes', e.target.value)}
              placeholder="Observaciones adicionales..."
              rows={3}
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Productos</h3>
            
            <div className="grid grid-cols-4 gap-4 p-4 border rounded-lg">
              <div className="space-y-2">
                <Label>Producto *</Label>
                <div className="relative">
                  <Input
                    placeholder="Buscar producto..."
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setShowProductSearch(true);
                    }}
                    onFocus={() => setShowProductSearch(true)}
                    onKeyDown={(e) => {
                      // Prevenir que el Enter de la pistola de código de barras envíe el formulario
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // Si hay productos filtrados, seleccionar el primero
                        if (filteredProducts.length > 0) {
                          selectProduct(filteredProducts[0]);
                          
                          // Si ya hay cantidad y precio, agregar automáticamente el producto
                          if (newItem.quantity && newItem.purchase_price) {
                            addItem();
                          }
                        }
                      }
                    }}
                  />
                  <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                  
                  {showProductSearch && filteredProducts.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredProducts.map((product) => (
                        <div
                          key={product.id}
                          className="p-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => selectProduct(product)}
                        >
                          <div className="font-medium">{product.description}</div>
                          <div className="text-sm text-gray-500">Código: {product.code}</div>
                          <div className="text-sm text-blue-600">Precio actual: ${Number(product.unit_price).toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cantidad *</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newItem.quantity}
                  onChange={(e) => handleNewItemChange('quantity', e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  min="1"
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Precio de Compra *
                  {newItem.product_id && (
                    <span className="text-muted-foreground ml-1">
                      ({selectedCurrency})
                    </span>
                  )}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={`0.00 ${selectedCurrency}`}
                  value={newItem.purchase_price}
                  onChange={(e) => handleNewItemChange('purchase_price', e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button type="button" onClick={addItem} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar
                </Button>
              </div>
            </div>

            {items.length > 0 && (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Precio Unit.</TableHead>
                      <TableHead>Subtotal</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => {
                      const product = products.find(p => p.id === item.product_id);
                      const currentPrice = product ? Number(product.unit_price) : 0;
                      const orderPrice = item.purchase_price;
                      const isPriceChanged = Math.abs(currentPrice - orderPrice) > 0.01;
                      
                      return (
                        <TableRow key={index}>
                          <TableCell>
                            <div>
                              <div>{getProductName(item.product_id)}</div>
                              {isPriceChanged && (
                                <div className="text-xs text-gray-500">
                                  Precio actual: ${currentPrice.toFixed(2)}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="relative inline-block cursor-help">
                                    <span className={isPriceChanged ? "bg-orange-50 px-2 py-1 rounded border border-orange-200" : ""}>
                                      ${orderPrice.toFixed(2)} {selectedCurrency}
                                    </span>
                                    {isPriceChanged && (
                                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full"></div>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                {isPriceChanged && (
                                  <TooltipContent side="top" className="max-w-xs">
                                    <div className="space-y-1">
                                      <div className="font-semibold text-orange-600">Precio Tentativo</div>
                                      <div className="text-sm">Precio actual: ${currentPrice.toFixed(2)}</div>
                                      <div className="text-sm">Precio orden: ${orderPrice.toFixed(2)}</div>
                                      <div className="text-xs text-muted-foreground">Se aplicará al completar la orden</div>
                                    </div>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell>${(item.quantity * item.purchase_price).toFixed(2)} {selectedCurrency}</TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-semibold">
                        Total:
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${calculateTotal().toFixed(2)} {selectedCurrency}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || items.length === 0}>
              {loading ? 'Guardando...' : 'Crear Orden de Compra'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

    </Dialog>
  );
};

export default NewPurchaseOrderDialog;