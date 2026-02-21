import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Trash2, Search, Calendar as CalendarIcon, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { purchaseOrderService } from '@/lib/api/purchaseOrderService'
import { getBranches } from '@/lib/api/branchService'
import { getProducts } from '@/lib/api/productService'
import api from '@/lib/api'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import paymentMethodService from '@/lib/api/paymentMethodService';
import type { PaymentMethod } from '@/lib/api/paymentMethodService';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PurchaseOrderPaymentSection, PAYMENT_VALIDATION_TOLERANCE, type PurchaseOrderPaymentState } from './purchase-order-payment-section';
import { useAuth } from '@/hooks/useAuth';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import exchangeRateService from '@/lib/api/exchangeRateService';
import { formatCurrency } from '@/utils/sale-calculations';
import { createWildcardMatcher } from '@/utils/searchUtils';

/** Tasa fallback cuando falla la carga de USD→ARS; evita mezclar unidades (1:1 solo para consistencia). */
const FALLBACK_USD_TO_ARS = 1;

interface Supplier { id: number; name: string; contact_name?: string }
interface Branch { id: number; description: string; color?: string }
interface Product { id: number; description: string; code: string; unit_price: number; currency?: string }

export interface EditPurchaseOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  purchaseOrderId: number
  onSaved: () => void
}

// Interface local para permitir edición con strings vacíos
interface EditablePurchaseOrderItem {
  product_id: number;
  quantity: number | string;
  purchase_price: number | string;
  product?: Product;
}

/** Respuesta de la API al obtener una orden de compra (campos usados en loadData) */
interface PurchaseOrderApiResponse {
  status?: string;
  supplier_id?: number;
  supplier?: { id: number };
  branch_id?: number;
  branch?: { id: number };
  order_date?: string;
  created_at?: string;
  notes?: string;
  affects_cash_register?: boolean;
  items?: Array<{ product_id?: number; product?: { id: number }; quantity: number; purchase_price: number }>;
  currency?: string;
  payments?: Array<{ payment_method_id: number; amount: number }>;
  payment_method_id?: number;
  payment_method?: { id: number };
  total_amount?: number;
}

export default function EditPurchaseOrderDialog({ open, onOpenChange, purchaseOrderId, onSaved }: EditPurchaseOrderDialogProps) {
  const { hasPermission } = useAuth();
  const [form, setForm] = useState({
    supplier_id: '',
    branch_id: '',
    order_date: new Date(),
    notes: '',
  })
  const [orderStatus, setOrderStatus] = useState<string>('pending')
  const isReadOnly = orderStatus !== 'pending'
  const [items, setItems] = useState<EditablePurchaseOrderItem[]>([])
  const [newItem, setNewItem] = useState({ product_id: '', quantity: '', purchase_price: '' })
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [showProductSearch, setShowProductSearch] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [payments, setPayments] = useState<PurchaseOrderPaymentState[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [affectsCashRegister, setAffectsCashRegister] = useState(true); // Por defecto true
  const { rate: exchangeRate } = useExchangeRate({ fromCurrency: 'USD', toCurrency: 'ARS' });

  // Función helper para prevenir Enter en inputs
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [suppliersData, branchesData, productsData, order, paymentMethodsData] = await Promise.all([
          api.get('/suppliers?per_page=10000000').then(res => res.data.data || res.data), // Obtener todos los proveedores
          getBranches(),
          getProducts({ per_page: 10000000 }),
          purchaseOrderService.getById(purchaseOrderId),
          paymentMethodService.getAll(),
        ])
        setSuppliers(suppliersData as unknown as Supplier[])
        setBranches(branchesData as unknown as Branch[])
        setProducts(productsData as unknown as Product[])
        const orderData = order as PurchaseOrderApiResponse;
        setOrderStatus(orderData.status || 'pending')
        setForm({
          supplier_id: String(orderData.supplier_id ?? orderData.supplier?.id ?? ''),
          branch_id: String(orderData.branch_id ?? orderData.branch?.id ?? ''),
          order_date: orderData.order_date ? new Date(orderData.order_date) : (orderData.created_at ? new Date(orderData.created_at) : new Date()),
          notes: orderData.notes || '',
        })
        setAffectsCashRegister(orderData.affects_cash_register !== false); // Por defecto true si no existe
        setPaymentMethods(paymentMethodsData as unknown as PaymentMethod[]);

        const orderItems = orderData.items || [];
        const productsArr = productsData as Product[];
        const mapped: EditablePurchaseOrderItem[] = orderItems.map((it) => ({
          product_id: Number(it.product_id || it.product?.id),
          quantity: Number(it.quantity),
          purchase_price: Number(it.purchase_price),
          product: productsArr.find((p) => p.id === Number(it.product_id || it.product?.id))
        }))
        setItems(mapped)

        const firstProduct = mapped.length > 0 ? productsArr.find((p) => p.id === mapped[0].product_id) : null;
        const orderCurrency = orderData.currency ?? firstProduct?.currency ?? 'ARS';
        setSelectedCurrency(orderCurrency);

        // Cargar pagos: en la UI siempre se trabaja en ARS; si la orden es en USD, convertir al cargar
        const orderPayments = orderData.payments || [];
        if (orderPayments.length > 0) {
          if (orderCurrency === 'USD') {
            let rate: number;
            try {
              rate = await exchangeRateService.getCurrentRate('USD', 'ARS');
            } catch {
              rate = FALLBACK_USD_TO_ARS;
              toast.warning('Tasa de cambio no disponible', {
                description: 'Se usó 1:1 para mostrar los montos en ARS. Verifique los valores antes de guardar.',
              });
            }
            setPayments(orderPayments.map((p) => ({
              payment_method_id: String(p.payment_method_id),
              amount: String((Number(p.amount) * rate).toFixed(2))
            })));
          } else {
            setPayments(orderPayments.map((p) => ({
              payment_method_id: String(p.payment_method_id),
              amount: String(p.amount)
            })));
          }
        } else {
          const legacyPmId = orderData.payment_method_id ?? orderData.payment_method?.id;
          if (legacyPmId) {
            const amt = Number(orderData.total_amount || 0);
            let amountStr: string;
            if (orderCurrency === 'USD') {
              let r: number;
              try {
                r = await exchangeRateService.getCurrentRate('USD', 'ARS');
              } catch {
                r = FALLBACK_USD_TO_ARS;
                toast.warning('Tasa de cambio no disponible', {
                  description: 'Se usó 1:1 para mostrar el monto en ARS. Verifique antes de guardar.',
                });
              }
              amountStr = String((amt * r).toFixed(2));
            } else {
              amountStr = String(amt);
            }
            setPayments([{ payment_method_id: String(legacyPmId), amount: amountStr }]);
          } else {
            setPayments([]);
          }
        }
      } catch {
        setError('Error al cargar datos')
      }
    }
    if (open && purchaseOrderId) loadData()
  }, [open, purchaseOrderId])

  useEffect(() => {
    if (productSearch) {
      const matcher = createWildcardMatcher(productSearch);
      const filtered = products
        .filter(p => p.currency === selectedCurrency || (!p.currency && selectedCurrency === 'ARS'))
        .filter(p => matcher(p.description || '') || matcher(p.code || ''))
      setFilteredProducts(filtered)
    } else {
      setFilteredProducts([])
    }
  }, [productSearch, products, selectedCurrency])

  const addItem = async () => {
    const { product_id, quantity, purchase_price } = newItem
    if (product_id && quantity && purchase_price) {
      const pid = parseInt(product_id)
      const qty = parseInt(quantity)
      const price = parseFloat(purchase_price)

      // Obtener el producto seleccionado
      const selectedProduct = products.find(p => p.id === pid);
      if (!selectedProduct) {
        setError('Producto no encontrado');
        return;
      }

      // Verificar si el proveedor del producto es diferente al de la orden
      const orderSupplierId = form.supplier_id;
      const productSupplierId = (selectedProduct as Product & { supplier_id?: number }).supplier_id;

      if (orderSupplierId && productSupplierId !== orderSupplierId) {
        // Solo mostrar información, NO actualizar el proveedor en el frontend
        // El backend se encargará de actualizar solo el proveedor (no el precio) al editar la orden

        // Producto con proveedor diferente - se actualizará automáticamente
      }

      // Si llegamos aquí, los proveedores coinciden, continuar con el flujo normal
      const idx = items.findIndex(i => i.product_id === pid)
      if (idx !== -1) {
        const updated = [...items]
        updated[idx].quantity = Number(updated[idx].quantity || 0) + qty
        setItems(updated)
      } else {
        setItems(prev => [...prev, { product_id: pid, quantity: qty, purchase_price: price }])
      }
      setNewItem({ product_id: '', quantity: '', purchase_price: '' })
      setProductSearch('')
      setShowProductSearch(false)
      setError(null)
    } else {
      setError('Complete todos los campos del producto')
    }
  }

  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index))

  const selectProduct = (product: Product) => {
    setNewItem({ product_id: String(product.id), quantity: '', purchase_price: String(product.unit_price) })
    setProductSearch(product.description)
    setShowProductSearch(false)
  }

  const calculateTotal = () => {
    return items.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.purchase_price || 0)), 0);
  };

  const getProductName = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product ? product.description : 'Producto';
  };

  const getProductCurrency = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product ? (product.currency || 'ARS') : 'ARS';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.supplier_id || !form.branch_id || !selectedCurrency || items.length === 0 || payments.length === 0) {
      setError('Seleccione proveedor, sucursal, moneda, agregue al menos un producto y un pago')
      return
    }

    // Con orden en USD se requiere tasa de cambio para convertir y validar en ARS
    if (selectedCurrency === 'USD' && (!exchangeRate || exchangeRate <= 0)) {
      setError('No se pudo cargar la tasa de cambio USD→ARS. Espere un momento e intente de nuevo.');
      return;
    }

    // Los pagos se ingresan siempre en ARS; validamos contra el total en ARS
    const totalOrderInOrderCurrency = calculateTotal();
    const totalOrderArs = selectedCurrency === 'USD' && exchangeRate && exchangeRate > 0
      ? totalOrderInOrderCurrency * exchangeRate
      : totalOrderInOrderCurrency;
    const totalPaymentsArs = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    if (Math.abs(totalOrderArs - totalPaymentsArs) > PAYMENT_VALIDATION_TOLERANCE) {
      if (totalPaymentsArs < totalOrderArs) {
        setError(`Falta cubrir ${formatCurrency(totalOrderArs - totalPaymentsArs, 'ARS')} para completar el total de la orden.`);
      } else {
        setError(`El total de pagos excede el monto de la orden por ${formatCurrency(totalPaymentsArs - totalOrderArs, 'ARS')}.`);
      }
      return;
    }

    setLoading(true)
    setError(null)
    try {
      const payload: {
        supplier_id: number;
        branch_id: number;
        order_date: string;
        notes: string;
        payments: Array<{ payment_method_id: number; amount: number }>;
        affects_cash_register: boolean;
        items?: Array<{ product_id: number; quantity: number; purchase_price: number }>;
      } = {
        supplier_id: parseInt(form.supplier_id, 10),
        branch_id: parseInt(form.branch_id, 10),
        order_date: format(form.order_date, 'yyyy-MM-dd'),
        notes: form.notes || '',
        payments: payments.map(p => {
          const amountArs = parseFloat(p.amount) || 0;
          const amountInOrderCurrency = selectedCurrency === 'USD' && exchangeRate && exchangeRate > 0
            ? amountArs / exchangeRate
            : amountArs;
          return {
            payment_method_id: parseInt(p.payment_method_id),
            amount: Math.round(amountInOrderCurrency * 100) / 100
          };
        }),
        affects_cash_register: affectsCashRegister,
      }
      if (items.length > 0) {
        payload.items = items.map(item => ({
          product_id: item.product_id,
          quantity: Number(item.quantity) || 0,
          purchase_price: Number(item.purchase_price) || 0
        })).filter((item) => item.quantity > 0)
      }
      await purchaseOrderService.update(purchaseOrderId, payload)
      toast.success('Orden de compra actualizada', { description: 'Los cambios fueron guardados.' })
      onSaved()
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string }; }; message?: string }).response?.data?.message
        : (err as { message?: string })?.message;
      setError(msg || 'Error al actualizar la orden de compra')
    } finally {
      setLoading(false)
    }
  }

  // Helpers to update existing items inline
  const updateItemField = (index: number, field: 'quantity' | 'purchase_price', value: number | string) => {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, [field]: value } : it))
  }

  const canSeePrices = hasPermission('ver_precio_unitario') ||
    hasPermission('crear_ordenes_compra') ||
    hasPermission('editar_ordenes_compra');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Editar Orden de Compra
          </DialogTitle>
          <DialogDescription>
            {isReadOnly ? 'Esta orden no es editable porque no está Pendiente.' : 'Modifique los campos y guarde los cambios.'}
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
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier_id">Proveedor *</Label>
              <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })} disabled={isReadOnly}>
                <SelectTrigger disabled={isReadOnly}>
                  <SelectValue placeholder="Seleccione un proveedor" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch_id">Sucursal *</Label>
              <Select value={form.branch_id} onValueChange={(v) => setForm({ ...form, branch_id: v })} disabled={isReadOnly}>
                <SelectTrigger disabled={isReadOnly}>
                  <SelectValue placeholder="Seleccione una sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Moneda *</Label>
              <Select value={selectedCurrency} onValueChange={(value: 'ARS' | 'USD') => setSelectedCurrency(value)} disabled={isReadOnly}>
                <SelectTrigger disabled={isReadOnly}>
                  <SelectValue placeholder="Seleccione una moneda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">ARS - Peso Argentino</SelectItem>
                  <SelectItem value="USD">USD - Dólar Estadounidense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="order_date">Fecha de Orden</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn('w-full justify-start text-left font-normal', !form.order_date && 'text-muted-foreground')} disabled={isReadOnly}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.order_date ? format(form.order_date, 'dd/MM/yyyy', { locale: es }) : <span>Seleccione una fecha</span>}
                  </Button>
                </PopoverTrigger>
                {!isReadOnly && (
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={form.order_date}
                      onSelect={(d) => setForm({ ...form, order_date: d instanceof Date ? d : new Date() })}
                      initialFocus
                    />
                  </PopoverContent>
                )}
              </Popover>
            </div>

          </div>



          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} disabled={isReadOnly} />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Productos</h3>
            <div className={cn("grid gap-4 p-4 border rounded-lg", canSeePrices ? "grid-cols-4" : "grid-cols-3")}>
              <div className="space-y-2">
                <Label>Producto *</Label>
                <div className="relative">
                  <Input
                    placeholder="Buscar producto..."
                    value={productSearch}
                    onChange={(e) => { setProductSearch(e.target.value); setShowProductSearch(true) }}
                    onFocus={() => setShowProductSearch(true)}
                    disabled={isReadOnly}
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
                  {!isReadOnly && showProductSearch && filteredProducts.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredProducts.map(p => (
                        <div key={p.id} className="p-2 hover:bg-gray-100 cursor-pointer" onClick={() => selectProduct(p)}>
                          <div className="font-medium">{p.description}</div>
                          <div className="text-sm text-gray-500">Código: {p.code}</div>
                          <div className="text-sm text-gray-500">Código: {p.code}</div>
                          {canSeePrices && (
                            <div className="text-sm text-blue-600">Precio actual: ${Number(p.unit_price).toFixed(2)}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cantidad *</Label>
                <Input type="number" min="1" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })} onKeyDown={handleInputKeyDown} disabled={isReadOnly} />
              </div>
              {canSeePrices && (
                <div className="space-y-2">
                  <Label>
                    Precio de Compra *
                    {newItem.product_id && (
                      <span className="text-muted-foreground ml-1">
                        ({getProductCurrency(Number(newItem.product_id))})
                      </span>
                    )}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={`0.00 ${newItem.product_id ? getProductCurrency(Number(newItem.product_id)) : ''}`}
                    value={newItem.purchase_price}
                    onChange={(e) => setNewItem({ ...newItem, purchase_price: e.target.value })}
                    onKeyDown={handleInputKeyDown}
                    disabled={isReadOnly}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button type="button" onClick={addItem} className="w-full" disabled={isReadOnly}><Plus className="h-4 w-4 mr-2" />Agregar</Button>
              </div>
            </div>
            {items.length > 0 && (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Cantidad</TableHead>
                      {canSeePrices && <TableHead>Precio Unit.</TableHead>}
                      {canSeePrices && <TableHead>Subtotal</TableHead>}
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => {
                      const product = item.product || products.find(p => p.id === item.product_id);
                      const currentPrice = product ? Number(product.unit_price) : 0;
                      const orderPrice = item.purchase_price;
                      const isPriceChanged = Math.abs(currentPrice - Number(orderPrice)) > 0.01;

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
                          <TableCell>
                            {isReadOnly ? (
                              item.quantity
                            ) : (
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  // Permitir vacío o números positivos
                                  if (val === '' || (!isNaN(Number(val)) && Number(val) >= 0)) {
                                    updateItemField(index, 'quantity', val === '' ? '' : Number(val))
                                  }
                                }}
                              />
                            )}
                          </TableCell>
                          {canSeePrices && (
                            <TableCell>
                              {isReadOnly ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="relative inline-block cursor-help">
                                        <span className={isPriceChanged ? "bg-orange-50 px-2 py-1 rounded border border-orange-200" : ""}>
                                          ${Number(item.purchase_price).toFixed(2)} {getProductCurrency(item.product_id)}
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
                                          <div className="text-sm">Precio orden: ${Number(orderPrice).toFixed(2)}</div>
                                          <div className="text-xs text-muted-foreground">Se aplicará al completar la orden</div>
                                        </div>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="relative flex-1">
                                          <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={item.purchase_price}
                                            onChange={(e) => {
                                              const val = e.target.value
                                              // Permitir vacío o números positivos
                                              if (val === '' || (!isNaN(Number(val)) && Number(val) >= 0)) {
                                                updateItemField(index, 'purchase_price', val === '' ? '' : val)
                                              }
                                            }}
                                            className={isPriceChanged ? "border-orange-300 bg-orange-50" : ""}
                                          />
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
                                            <div className="text-sm">Precio orden: ${Number(orderPrice).toFixed(2)}</div>
                                            <div className="text-xs text-muted-foreground">Se aplicará al completar la orden</div>
                                          </div>
                                        </TooltipContent>
                                      )}
                                    </Tooltip>
                                  </TooltipProvider>
                                  <span className="text-sm text-muted-foreground">
                                    {getProductCurrency(item.product_id)}
                                  </span>
                                </div>
                              )}
                            </TableCell>
                          )}
                          {canSeePrices && (
                            <TableCell>${(Number(item.quantity || 0) * Number(item.purchase_price || 0)).toFixed(2)} {getProductCurrency(item.product_id)}</TableCell>
                          )}
                          <TableCell>
                            <Button type="button" variant="outline" size="sm" onClick={() => removeItem(index)} disabled={isReadOnly}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {items.length > 0 && canSeePrices && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-right font-semibold">
                          Total:
                        </TableCell>
                        <TableCell className="font-semibold">
                          ${calculateTotal().toFixed(2)} {selectedCurrency}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="space-y-4 pt-4 border-t mt-4">
            <h3 className="text-lg font-semibold">Pagos</h3>
            <PurchaseOrderPaymentSection
              payments={payments}
              paymentMethods={paymentMethods}
              total={calculateTotal()}
              currency={selectedCurrency}
              exchangeRate={selectedCurrency === 'USD' ? exchangeRate : undefined}
              onAddPayment={() => setPayments([...payments, { payment_method_id: '', amount: '' }])}
              onRemovePayment={(idx) => setPayments(payments.filter((_, i) => i !== idx))}
              onUpdatePayment={(idx, field, value) => {
                const newPayments = [...payments]
                newPayments[idx] = { ...newPayments[idx], [field]: value }
                setPayments(newPayments)
              }}
              readOnly={isReadOnly}
            />

            {/* Checkbox para afectar caja registradora */}
            <div className="flex items-center gap-2 mt-2">
              <Checkbox
                id="affects_cash_register"
                checked={affectsCashRegister}
                onCheckedChange={(checked) => setAffectsCashRegister(checked === true)}
                className={cn(
                  "data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 data-[state=checked]:text-white",
                  !affectsCashRegister && "border-red-600"
                )}
                disabled={isReadOnly}
              />
              <Label
                htmlFor="affects_cash_register"
                className="text-sm cursor-pointer"
              >
                {affectsCashRegister ? (
                  <span className="text-green-700 font-medium">Esta orden afecta el balance de caja</span>
                ) : (
                  <span className="text-red-600 font-medium">Esta orden NO afecta el balance de caja</span>
                )}
              </Label>
            </div>
          </div>

          {error && <div className="text-red-500 text-sm">{error}</div>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
            <Button type="submit" disabled={isReadOnly || loading}>{isReadOnly ? 'Sólo lectura' : (loading ? 'Guardando...' : 'Guardar cambios')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )

}
