import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DEFAULT_RECEIPT_TYPES, findReceiptTypeByAfipCode, type ReceiptType } from '@/lib/constants/afipCodes'
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import useApi from "@/hooks/useApi"
import { useBranch } from "@/context/BranchContext"
import { useAuth } from "@/context/AuthContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import SaleReceiptPreviewDialog from "@/components/SaleReceiptPreviewDialog"
import CashRegisterStatusBadge from "@/components/cash-register-status-badge"
import CashRegisterProtectedButton from "@/components/cash-register-protected-button"
import { useCashRegisterStatus } from "@/hooks/useCashRegisterStatus"
import CustomerForm from "@/components/customers/customer-form"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useExchangeRateUpdates } from "@/hooks/useExchangeRateUpdates"
import MultipleBranchesCashStatus from "@/components/cash-register-multiple-branches-status"
import { Building, Minus, Plus, Search, ShoppingCart, Trash2, X, Barcode, Info, Loader2, AlertTriangle, Package } from "lucide-react"
import { ComboSection } from "@/components/ComboSection"
import { useCombosInPOS } from "@/hooks/useCombosInPOS"
import { useIsMobile } from "@/hooks/useIsMobile"
import { CartFloatingButton } from "@/components/pos/CartFloatingButton"
import type { Combo, CartItem } from "@/types/combo"
import { useCustomerCredit } from "@/hooks/useCustomerCredit"

interface CustomerOption {
  id: number;
  name: string;
  dni: string;
  cuit?: string;
  fiscal_condition_id?: number;
  fiscal_condition_name?: string;
}

export default function POSPage() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  // Mapa de stock por producto en la sucursal seleccionada
  const [stocksMap, setStocksMap] = useState<Record<number, { current: number; min: number }>>({})
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const { request } = useApi()
  const { selectedBranch, selectionChangeToken, selectedBranchIds, branches, setSelectedBranchIds } = useBranch()
  const { user, hasPermission } = useAuth()

  // Funciones para manejar localStorage del carrito
  const CART_STORAGE_KEY = 'pos_cart'
  
  // Estado para manejar memoria de sucursales (igual que en Caja)
  const [originalBranchSelection, setOriginalBranchSelection] = useState<string[]>([])
  
  const saveCartToStorage = (cartData: CartItem[]) => {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartData))
 
  }
  
  const loadCartFromStorage = (): CartItem[] => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY)
      if (savedCart) {
        return JSON.parse(savedCart)
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error)
    }
    return []
  }
  
  const clearCartFromStorage = () => {
    try {
      localStorage.removeItem(CART_STORAGE_KEY)
    } catch (error) {
      console.error('Error clearing cart from localStorage:', error)
    }
  }

  

  // Cash register validation hook y refresco manual
  const { validateCashRegisterForOperation } = useCashRegisterStatus(Number(selectedBranch?.id) || 1)

  // Función para cambiar sucursal desde el POS
  const handleBranchChange = (branchId: string) => {
    if (!branchId) return;
    setSelectedBranchIds([branchId]);
    toast.success('Sucursal cambiada', {
      description: `Ahora trabajas en ${branches.find(b => b.id.toString() === branchId)?.description || 'la sucursal seleccionada'}`
    });
  };


  const [productCodeInput, setProductCodeInput] = useState("")

  // Nueva: cantidad por selección de producto
  const [addQtyPerClick, setAddQtyPerClick] = useState<number>(1)
  const [qtySelectorOpen, setQtySelectorOpen] = useState<boolean>(false)

  const [receiptTypes, setReceiptTypes] = useState<ReceiptType[]>([]);

  const [showAdvancedSaleModal, setShowAdvancedSaleModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [showCustomerOptions, setShowCustomerOptions] = useState(false);
  const [receiptTypeId, setReceiptTypeId] = useState<number | undefined>(undefined);
  const [payments, setPayments] = useState<{ payment_method_id: string; amount: string }[]>([{ payment_method_id: '', amount: '' }]);
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false);
  const [isProcessingSale, setIsProcessingSale] = useState(false);

  // Estados para el comprobante
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);

  // Crédito a favor del cliente usando hook personalizado
  const {
    availableCredit: availableFavorCredit,
    currentAccountId,
    isLoading: isLoadingCredit,
    calculateCreditToApply,
    resetCredit: resetCreditState,
  } = useCustomerCredit({
    customerId: selectedCustomer?.id || null,
    enabled: !!selectedCustomer,
  });

  // Descuento global (opcional)
  const [globalDiscountType, setGlobalDiscountType] = useState<'percent' | 'amount' | ''>('')
  const [globalDiscountValue, setGlobalDiscountValue] = useState<string>('')

  // Hook para manejar combos en POS
  const { getComboPriceDetails } = useCombosInPOS()

  // Ref para almacenar la función fetchProducts
  const fetchProductsRef = useRef<(() => Promise<void>) | null>(null);

  // Estado para controlar el Sheet del carrito
  const [cartSheetOpen, setCartSheetOpen] = useState(false)
  
  // Hooks personalizados para responsabilidades separadas
  const isMobile = useIsMobile()

  // Función estable para recargar productos cuando se actualice la tasa de cambio
  const handleExchangeRateUpdate = useCallback(() => {
    // Ejecutar fetchProducts y LUEGO mostrar el toast cuando termine con éxito.
    fetchProducts().then(() => {
      toast.success("Precios actualizados", {
        description: "Los precios se han actualizado con la nueva tasa de cambio"
      });
    });

  }, []); // fetchProducts es estable por useCallback

  // Recargar productos cuando se actualice la tasa de cambio
  useExchangeRateUpdates(handleExchangeRateUpdate);

  const addPayment = () => setPayments([...payments, { payment_method_id: '', amount: '' }]);
  const removePayment = (idx: number) => setPayments(payments.filter((_, i) => i !== idx));
  const updatePayment = (idx: number, field: string, value: string) => {
    setPayments(payments.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  // Cargar carrito desde localStorage al montar el componente
  useEffect(() => {
    const savedCart = loadCartFromStorage()
    if (savedCart.length > 0) {
      setCart(savedCart)
      toast.info(`Carrito restaurado: ${savedCart.length} producto${savedCart.length > 1 ? 's' : ''} encontrado${savedCart.length > 1 ? 's' : ''}`)
    }
  }, [])

  // Efecto para manejar memoria de sucursales (igual que en Caja)
  useEffect(() => {
    // Si hay múltiples sucursales seleccionadas, guardar la selección original
    if (selectedBranchIds.length > 1 && originalBranchSelection.length === 0) {
      setOriginalBranchSelection([...selectedBranchIds])
    }
    
    // Si no hay sucursal seleccionada y tenemos selección original, restaurar
    if (selectedBranchIds.length === 0 && originalBranchSelection.length > 0) {
      setSelectedBranchIds([...originalBranchSelection])
    }
  }, [selectedBranchIds, originalBranchSelection])

  // Efecto para detectar cuando el usuario sale del POS y restaurar selección original
  useEffect(() => {
    // Si estamos en una sola sucursal pero tenemos selección original guardada con múltiples sucursales,
    // significa que el usuario está trabajando en el POS
    // Cuando el componente se desmonte (navegación a otra página), restaurar la selección
    if (selectedBranchIds.length === 1 && originalBranchSelection.length > 1) {
      // Función de cleanup que se ejecutará cuando el componente se desmonte
      const cleanup = () => {
        setSelectedBranchIds([...originalBranchSelection])
        setOriginalBranchSelection([])
      }
      
      // Agregar listener para detectar navegación
      const handleBeforeUnload = () => {
        cleanup()
      }
      
      window.addEventListener('beforeunload', handleBeforeUnload)
      
      // Cleanup del listener cuando el componente se desmonte
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload)
        cleanup() // Ejecutar cleanup al desmontar
      }
    }
  }, [selectedBranchIds.length, originalBranchSelection])

  // Guardar carrito en localStorage cada vez que cambie
  useEffect(() => {
    if (cart.length > 0) {
      saveCartToStorage(cart)
    } else {
      clearCartFromStorage()
    }
  }, [cart])

  useEffect(() => {
    fetchCategories();
    fetchProducts();
    fetchPaymentMethods();
    fetchReceiptTypes();
  }, []);

  const fetchPaymentMethods = useCallback(async () => {
    try {
      const response = await request({ method: 'GET', url: '/pos/payment-methods' });
      const apiData = Array.isArray(response) ? response : 
                     Array.isArray(response?.data?.data) ? response.data.data :
                     Array.isArray(response?.data) ? response.data : [];
      
      // Filtrar métodos de pago según condiciones
      let filteredMethods = apiData.map((item: any) => ({ 
        id: item.id, 
        name: item.name || item.description 
      }));
      
      // Filtrar "Crédito a favor": solo mostrarlo si el cliente tiene crédito disponible
      if (availableFavorCredit <= 0) {
        filteredMethods = filteredMethods.filter(m => m.name !== 'Crédito a favor');
      }
      
      setPaymentMethods(filteredMethods);
    } catch (err) {
      setPaymentMethods([]);
      toast.error("Error al cargar los métodos de pago.");
    }
  }, [availableFavorCredit, request]);

  const fetchReceiptTypes = async () => {
    try {
      const response = await request({ method: 'GET', url: '/receipt-types' });
      const apiData = Array.isArray(response) ? response : 
                     Array.isArray(response?.data?.data) ? response.data.data :
                     Array.isArray(response?.data) ? response.data : [];
      const mappedData = apiData.map((item: any) => ({ 
        id: item.id, 
        name: item.description || item.name,
        afip_code: item.afip_code || item.code
      }));
      
      setReceiptTypes(mappedData);
      
      const defaultReceipt = findReceiptTypeByAfipCode(mappedData, DEFAULT_RECEIPT_TYPES.DEFAULT_SALE);
      if (defaultReceipt) {
        setReceiptTypeId(defaultReceipt.id);
      }
    } catch (err) {
      setReceiptTypes([]);
      toast.error("Error al cargar los tipos de comprobante.");
    }
  };

  useEffect(() => {
    // No mostrar ni buscar si el dropdown está cerrado
    if (!showCustomerOptions) {
      setCustomerOptions([]);
      return;
    }
    if (customerSearch.length < 3) {
      setCustomerOptions([]);
      return;
    }
    const fetchCustomers = async () => {
      try {
        const response = await request({ method: 'GET', url: `/customers?search=${encodeURIComponent(customerSearch)}` });
        const customers = Array.isArray(response) ? response : response?.data ?? [];
        const mappedCustomers = customers.map((customer: any) => {
          // Determinar qué documento mostrar: CUIT tiene prioridad, luego DNI
          const hasCuit = customer.person?.cuit;
          const hasDni = customer.person?.documento;
          
          return {
            id: customer.id,
            name: customer.person ? `${customer.person.first_name} ${customer.person.last_name}`.trim() : `Cliente ${customer.id}`,
            dni: hasDni ? customer.person.documento : null,
            cuit: hasCuit ? customer.person.cuit : null,
            fiscal_condition_id: customer.person?.fiscal_condition_id || null,
            fiscal_condition_name: customer.person?.fiscal_condition?.description || customer.person?.fiscal_condition?.name || null,
          };
        });
        setCustomerOptions(mappedCustomers);
      } catch {
        setCustomerOptions([]);
      }
    };
    fetchCustomers();
  }, [customerSearch, showCustomerOptions, request]);

  const fetchCategories = async () => {
    try {
      const response = await request({ method: "GET", url: "/categories" })
      // La API devuelve datos paginados: response.data.data contiene el array de categorías
      const categoriesData = Array.isArray(response) ? response : 
                            Array.isArray(response?.data?.data) ? response.data.data :
                            Array.isArray(response?.data) ? response.data : [];
      setCategories(categoriesData)
    } catch (err) {
      console.error("Error fetching categories:", err);
      setCategories([])
    }
  }

  const fetchProducts = useCallback(async () => {
    try {
      const response = await request({ method: "GET", url: "/products?include=category,iva" })
      // Manejar estructura paginada para productos también
      const productData = Array.isArray(response) ? response : 
                         Array.isArray(response?.data?.data) ? response.data.data :
                         Array.isArray(response?.data) ? response.data : [];
      const mappedProducts = productData.map((p: any) => {
        const salePriceWithIva = p.sale_price || 0;
        const ivaRate = p.iva?.rate || 0;
        
        // El sale_price de la API YA INCLUYE IVA, necesitamos calcular el precio sin IVA
        // Redondeamos a 2 decimales porque la división puede generar errores de precisión
        const priceWithoutIva = ivaRate > 0 
          ? Math.round((salePriceWithIva / (1 + ivaRate / 100) + Number.EPSILON) * 100) / 100
          : salePriceWithIva;

        const result = {
          ...p,
          name: p.description,
          price: priceWithoutIva // Precio sin IVA para cálculos (ya redondeado)
          , sale_price: salePriceWithIva // Precio original con IVA
          , iva_rate: ivaRate
          , price_with_iva: salePriceWithIva // Este es el precio final
          , iva: p.iva
        };


        return result;
      });
      setProducts(mappedProducts)
    } catch (err) {
      setProducts([])
    }
  }, [request]); // Dependencia estable

  // Función para refrescar productos (para usar en el callback de exchange rate)
  const refreshProducts = useCallback(async () => {
    return fetchProducts();
  }, [fetchProducts]);

  // Almacenar la función de refresh en el ref
  useEffect(() => {
    fetchProductsRef.current = refreshProducts;
  }, [refreshProducts]);

  // Cargar stocks para la sucursal seleccionada
  const fetchStocks = async () => {
    try {
      if (!selectedBranch?.id) { setStocksMap({}); return; }
      const resp = await request({ method: 'GET', url: `/stocks?branch_id=${selectedBranch.id}` })
      const data = Array.isArray(resp) ? resp : resp?.data ?? []
      const map: Record<number, { current: number; min: number }> = {}
      data.forEach((s: any) => {
        // s puede venir como objeto plano o dentro de data
        const pid = Number(s.product_id ?? s.product?.id)
        if (!isNaN(pid)) {
          map[pid] = {
            current: Number(s.current_stock ?? 0),
            min: Number(s.min_stock ?? 0),
          }
        }
      })
      setStocksMap(map)
    } catch (err) {
      setStocksMap({})
    }
  }

  // Efecto: cargar stocks al cambiar sucursal o al montar
  useEffect(() => {
    fetchStocks()
  }, [selectedBranch])

  // Reaccionar a cambios de sucursal: stocks, productos, métodos de pago y tipos de comprobante si corresponde
  useEffect(() => {
    // Al cambiar de sucursal, refrescar stocks y otros catálogos si dependen de sucursal
    fetchStocks()
    // Si el pricing/productos dependen de sucursal, descomentar:
    // fetchProducts()
    // fetchPaymentMethods()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch?.id, selectionChangeToken])

  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === "all" || product.category_id?.toString() === selectedCategory;
    const matchesSearch =
      !productCodeInput ||
      product.description?.toLowerCase().includes(productCodeInput.toLowerCase()) ||
      product.code?.toString().includes(productCodeInput);
    return matchesCategory && matchesSearch;
  });

  // Helper para clases de card según stock (fondo en contenido y color de borde)
  const getStockUi = (productId: number) => {
    const info = stocksMap[productId]
    if (!info) return { card: '', content: '', dot: 'bg-gray-200', button: '' }
    const st = info.current
    const min = info.min || 0
    if (st <= 0) return { card: 'border-2 border-red-500 ring-1 ring-red-300', content: 'bg-red-50', dot: 'bg-red-500', button: 'border-red-300' }
    if (min > 0 && st < min) return { card: 'border-2 border-yellow-500 ring-1 ring-yellow-300', content: 'bg-yellow-50', dot: 'bg-yellow-500', button: 'border-yellow-300' }
    return { card: 'border-2 border-green-500 ring-1 ring-green-300', content: 'bg-green-50', dot: 'bg-green-500', button: 'border-green-300' }
  }

  // Actualizar para respetar la cantidad por click
  const addToCart = (product: CartItem, qty?: number) => {
    const quantityToAdd = Math.max(1, Number(qty ?? addQtyPerClick) || 1)
    
    setCart((prevCart) => {
      // ✅ Solo buscar productos individuales (no de combos) con el mismo ID
      const existingIndividualItem = prevCart.find((item) => 
        item.id === product.id && !item.is_from_combo
      );
      
      if (existingIndividualItem) {
        return prevCart.map((item) => 
          item.id === product.id && !item.is_from_combo
            ? { ...item, quantity: item.quantity + quantityToAdd } 
            : item
        );
      } else {
        // ✅ Asegurar que siempre tenga product_id y que sea un producto individual
        const cartItem: CartItem = { 
          ...product, 
          quantity: quantityToAdd,
          product_id: product.product_id || parseInt(product.id), // Fallback si no tiene product_id
          is_from_combo: false, // ✅ Asegurar que sea un producto individual
          // ✅ Limpiar cualquier descuento que pueda haber heredado
          discount_type: undefined,
          discount_value: undefined,
          combo_id: undefined,
          combo_name: undefined,
          original_combo_price: undefined,
          combo_discount_applied: undefined
        }
        return [...prevCart, cartItem]
      }
    })
  }

  /**
   * Agregar combo al carrito descomponiéndolo en productos individuales
   * Cada producto del combo se agrega con descuento pre-configurado
   * 
   * @param combo - El combo a agregar
   * @param quantity - Cantidad del combo a agregar
   */
  const addComboToCart = async (combo: Combo, quantity: number) => {
    try {
      // Obtener detalles de precio del combo
      const priceDetails = await getComboPriceDetails(combo.id);
      
      // Calcular el descuento total aplicado
      const totalDiscount = priceDetails.discount_amount;
      const totalBasePrice = priceDetails.base_price;
      
      // Calcular el factor de descuento proporcional
      const discountFactor = totalBasePrice > 0 ? totalDiscount / totalBasePrice : 0;
      
      // Agregar cada producto del combo al carrito con descuento aplicado
      const comboItems = priceDetails.items_breakdown.map((item) => {
        // Calcular precio con descuento proporcional aplicado
        const discountedPrice = item.total_price * (1 - discountFactor);
        const discountedUnitPrice = item.unit_price * (1 - discountFactor);
        
        // Calcular el porcentaje de descuento aplicado a este producto
        const itemDiscountPercentage = item.unit_price > 0 ? 
          ((item.unit_price - discountedUnitPrice) / item.unit_price) * 100 : 0;
        
        return {
          id: `combo-${combo.id}-${item.product.id}`,
          product_id: item.product.id, // ✅ Campo requerido para el backend
          code: item.product.code || item.product.id.toString(),
          name: item.product.description,
          price: item.unit_price, // Precio original sin descuento
          price_with_iva: item.unit_price, // Precio original sin descuento
          sale_price: discountedUnitPrice, // Precio con descuento aplicado
          iva_rate: 0, // Se puede obtener del producto si es necesario
          quantity: item.quantity * quantity, // Multiplicar por la cantidad del combo
          image: '', // Se puede obtener del producto si tiene imagen
          currency: 'ARS', // Se puede obtener del producto
          // Campos de descuento para el formulario de venta
          discount_type: 'percent' as const,
          discount_value: itemDiscountPercentage,
          // Campos específicos para identificar que viene de un combo
          is_from_combo: true,
          combo_id: combo.id,
          combo_name: combo.name,
          original_combo_price: item.total_price,
          combo_discount_applied: item.total_price - discountedPrice
        };
      });

      // Agregar cada producto al carrito
      setCart((prevCart) => {
        let newCart = [...prevCart];
        
        comboItems.forEach((comboItem) => {
          // ✅ Solo buscar items de combos con el mismo ID exacto
          const existingComboItem = newCart.find((item) => 
            item.id === comboItem.id && item.is_from_combo
          );
          
          if (existingComboItem) {
            // Si el producto de combo ya existe, sumar la cantidad
            newCart = newCart.map((item) =>
              item.id === comboItem.id
                ? { ...item, quantity: item.quantity + comboItem.quantity, product_id: comboItem.product_id }
                : item
            );
          } else {
            // Si no existe, agregarlo como nuevo item de combo
            newCart.push(comboItem);
          }
        });
        
        return newCart;
      });

      toast.success("Combo agregado al carrito", {
        description: `${combo.name} x${quantity} se descompuso en ${comboItems.length} productos con descuento aplicado.`,
      });
    } catch (error) {
      console.error("Error adding combo to cart:", error);
      toast.error("Error al agregar combo al carrito");
    }
  }

  const searchAndAddProduct = () => {
    const code = productCodeInput.trim();
    if (!code) return;

    const foundProduct = products.find(p =>
      String(p.code).toLowerCase() === code.toLowerCase() ||
      p.code?.toString() === code ||
      (p.description || '').toLowerCase().includes(code.toLowerCase())
    );

    if (foundProduct) {
      addToCart(foundProduct, addQtyPerClick);
      toast.success("Producto agregado", {
        description: `${foundProduct.description} x${Math.max(1, addQtyPerClick)} se agregó al carrito.`,
      });
      setProductCodeInput("");
    } else {
      toast.error("Producto no encontrado", {
        description: `No se encontró ningún producto con "${code}".`,
      });
      setProductCodeInput("");
    }
  };

  const handleProductCodeSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchAndAddProduct();
    }
  };

  const removeFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId))
  }

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return
    setCart((prevCart) => prevCart.map((item) => (item.id === productId ? { ...item, quantity: newQuantity } : item)))
  }

  const clearCart = () => {
    setCart([])
    clearCartFromStorage()
  }

  // Utilidades de redondeo y moneda (2 decimales)
  const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100
  const currencyFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // Calcular totales aplicando descuentos por ítem y global ANTES del IVA (2 decimales)
  const computeTotals = () => {
    const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

    // 1. APLICAR DESCUENTOS POR ÍTEM - USANDO SALE_PRICE (CON IVA)
    const prepared = cart.map((item) => {
      const unit_with_iva = Number(item.price_with_iva || item.sale_price || 0);
      const qty = Math.max(1, Number(item.quantity || 0));
      const ivaRate = (item.iva_rate || 0) / 100;

      const unit_without_iva = ivaRate > 0 ? unit_with_iva / (1 + ivaRate) : unit_with_iva;
      const base_without_iva = unit_without_iva * qty;

      let itemDiscount_on_base = 0; // Este es el descuento que se aplicará al subtotal (sin IVA)
      const dv = Number(item.discount_value ?? 0);

      if (item.discount_type && dv > 0) {
        if (item.discount_type === 'percent') {
          // El descuento por % siempre se calcula sobre la base sin IVA.
          itemDiscount_on_base = (base_without_iva * (dv / 100));
        } else { // discount_type === 'amount'
          // El descuento por monto se interpreta como un descuento al precio final.
          // Calculamos cuánto de ese descuento corresponde a la base sin IVA.
          itemDiscount_on_base = (dv / (1 + ivaRate));
        }
      }
      
      itemDiscount_on_base = Math.max(0, Math.min(itemDiscount_on_base, base_without_iva));
      const netBase = (base_without_iva - itemDiscount_on_base);
      return { item, netBase };
    });

    const subtotalAfterItemDiscounts = (prepared.reduce((s, x) => s + x.netBase, 0));

    // 2. CALCULAR IVA SOBRE EL SUBTOTAL SIN DESCUENTO GLOBAL
    let totalIva = 0;
    prepared.forEach((row) => {
      const ivaForItem = (row.netBase * ((row.item.iva_rate || 0) / 100));
      totalIva += ivaForItem;
    });
    totalIva = round2(totalIva);

    // 3. APLICAR DESCUENTO GLOBAL SOBRE EL TOTAL CON IVA
    const subtotalConIva = round2(subtotalAfterItemDiscounts + totalIva);
    let globalDiscountAmount = 0;
    const gVal = Number(globalDiscountValue);

    if (globalDiscountType && gVal > 0) {
      if (globalDiscountType === 'percent') {
        globalDiscountAmount = round2(subtotalConIva * (gVal / 100));
      } else { // globalDiscountType === 'amount'
        globalDiscountAmount = round2(gVal);
      }
      // Limitar el descuento al total con IVA para que no sea negativo
      globalDiscountAmount = Math.max(0, Math.min(globalDiscountAmount, subtotalConIva));
    }

    // 4. CALCULAR TOTALES FINALES
    const total = Math.max(0, round2(subtotalConIva - globalDiscountAmount));
    
    // 5. Calcular crédito a favor aplicado desde los pagos (si el usuario seleccionó "Crédito a favor")
    const favorCreditPayment = payments.find(p => {
      const paymentMethod = paymentMethods.find(pm => pm.id.toString() === p.payment_method_id);
      return paymentMethod?.name === 'Crédito a favor';
    });
    const favorCreditToApply = favorCreditPayment ? parseFloat(favorCreditPayment.amount || '0') || 0 : 0;
    
    const totalItemDiscount = prepared.reduce((s, p, i) => {
        const originalBase = round2((cart[i].price || 0) * (cart[i].quantity || 0));
        return s + Math.max(0, originalBase - p.netBase); // Asegurar que nunca sea negativo
    }, 0);

    return {
      totalItemDiscount: round2(totalItemDiscount),
      globalDiscountAmount: globalDiscountAmount,
      subtotalNet: round2(subtotalAfterItemDiscounts),
      totalIva: round2(totalIva),
      total,
      favorCreditToApply: round2(favorCreditToApply),
      totalAfterCredit: Math.max(0, round2(total - favorCreditToApply)),
    };
  };

  const { totalItemDiscount, globalDiscountAmount, subtotalNet, totalIva, total, favorCreditToApply, totalAfterCredit } = computeTotals()

  // Recargar métodos de pago cuando cambia el crédito disponible (para mostrar/ocultar "Crédito a favor")
  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  // Validar que el monto de crédito a favor no exceda el disponible
  useEffect(() => {
    const favorCreditPayment = payments.find(p => {
      const paymentMethod = paymentMethods.find(pm => pm.id.toString() === p.payment_method_id);
      return paymentMethod?.name === 'Crédito a favor';
    });
    
    if (favorCreditPayment && availableFavorCredit > 0) {
      const amount = parseFloat(favorCreditPayment.amount || '0') || 0;
      if (amount > availableFavorCredit) {
        toast.warning(`El monto de crédito a favor no puede exceder ${formatCurrency(availableFavorCredit)}`);
        updatePayment(
          payments.indexOf(favorCreditPayment),
          'amount',
          availableFavorCredit.toFixed(2)
        );
      }
    }
  }, [payments, availableFavorCredit, paymentMethods]);

  // Funciones auxiliares para el comprobante
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('es-AR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'N/A';
    }
  };

  const formatCurrency = (amount: number | null | undefined, currency: string = 'ARS') => {
    const v = Number(amount || 0);
    if (currency === 'USD') {
      return `$ ${round2(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
    }
    return currencyFormatter.format(round2(v)) + ' ARS';
  };

  const getCustomerName = (sale: any) => {
    if (!sale?.customer) return 'Consumidor Final';
    const customer = sale.customer;
    if (customer.person) {
      return `${customer.person.first_name || ''} ${customer.person.last_name || ''}`.trim();
    }
    return customer.name || 'Cliente';
  };

  const handleConfirmSale = async () => {
    if (isProcessingSale) return; // Prevenir doble envío
    
    // Validar que hay una sucursal seleccionada
    if (!selectedBranch) {
      toast.error('Debe seleccionar una sucursal antes de realizar la venta', {
        description: 'Use el selector de sucursal en la parte superior del POS'
      });
      return;
    }
    
    setIsProcessingSale(true);
    
    try {
      // Validar que la caja esté abierta antes de proceder
      const isValid = await validateCashRegisterForOperation('realizar ventas');
      if (!isValid) {
        setIsProcessingSale(false); // Resetear el estado si la validación falla
        return; // La función validateCashRegisterForOperation ya muestra el toast de error
      }

      if (!user || !selectedBranch) {
        toast.error("Error de sesión o sucursal. Recargue la página.");
        setIsProcessingSale(false); // Resetear el estado si hay error
        return;
      }

    // Payload con estructura esperada
    // Obtener fecha y hora local actual (sin conversiones de zona horaria)
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const argDateString = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    // Verificar si hay un pago con método "Crédito a favor"
    const favorCreditPayment = payments.find(p => {
      const paymentMethod = paymentMethods.find(pm => pm.id.toString() === p.payment_method_id);
      return paymentMethod?.name === 'Crédito a favor';
    });

    const saleData: any = {
      branch_id: selectedBranch.id,
      customer_id: selectedCustomer?.id || null,
      sale_document_number: selectedCustomer?.cuit || selectedCustomer?.dni || null,
      receipt_type_id: receiptTypeId,
      sale_fiscal_condition_id: selectedCustomer?.fiscal_condition_id || null,
      sale_date: argDateString, // Fecha y hora local de Argentina
      // Enviar los totales calculados por el frontend
      subtotal_net: subtotalNet,
      total_iva: totalIva,
      total: total,
      total_discount: Math.max(0, totalItemDiscount + globalDiscountAmount), // Total de descuentos (items + global)
      ...(globalDiscountType && Number(globalDiscountValue) > 0
        ? { discount_type: globalDiscountType, discount_value: Number(globalDiscountValue) }
        : {}),
      // Metadata para crédito a favor (solo si hay un pago con método "Crédito a favor")
      ...(favorCreditPayment && favorCreditToApply > 0 && currentAccountId ? {
        metadata: {
          use_favor_credit: true,
          favor_credit_amount: favorCreditToApply,
          current_account_id: currentAccountId
        }
      } : {}),
      items: cart.map((item, index) => {
        // ✅ Función robusta para extraer product_id
        let productId: number;
        
        if (item.product_id && !isNaN(item.product_id)) {
          // Si ya tiene product_id válido, usarlo
          productId = item.product_id;
        } else if (item.id.startsWith('combo-')) {
          // Si es un producto de combo, extraer el product_id del ID
          // Formato: combo-{comboId}-{productId}
          const parts = item.id.split('-');
          if (parts.length >= 3) {
            productId = parseInt(parts[2]); // Tercera parte es el product_id
          } else {
            productId = parseInt(parts[parts.length - 1]); // Fallback: última parte
          }
        } else {
          // Si es un producto individual, parsear el ID
          productId = parseInt(item.id);
        }
        
        // Validar que productId sea válido
        if (isNaN(productId) || productId <= 0) {
          console.error(`Invalid product_id for item ${item.id}:`, productId);
          throw new Error(`Invalid product_id for item ${item.id}`);
        }
        
        const mappedItem = {
          product_id: productId,
          quantity: item.quantity,
          unit_price: Number(item.price || 0),
          ...(item.discount_type && (item.discount_value ?? 0) > 0
            ? { discount_type: item.discount_type, discount_value: Number(item.discount_value) }
            : {}),
        };
        
        return mappedItem;
      }),
      payments: payments.map(p => ({
        payment_method_id: parseInt(p.payment_method_id),
        amount: parseFloat(p.amount || '0') || 0, // Sin round2, usar el monto exacto
      })),
    };

      const saleResponse = await request({ url: '/pos/sales', method: 'POST', data: saleData });
      toast.success('¡Venta realizada con éxito!');
      
      // Actualizar productos y stocks inmediatamente después de la venta exitosa
      await Promise.all([
        fetchProducts(),
        fetchStocks()
      ]);
      
      try {
        const saleId = (saleResponse as any)?.id || (saleResponse as any)?.data?.id;
        if (saleId) {
          const saleDetails = await request({ 
            method: 'GET', 
            url: `/sales/${saleId}?include=items,customer,receipt_type,saleFiscalCondition,branch,saleIvas` 
          });
          const normalizedSale = (saleDetails as any)?.data ?? saleDetails;
          setCompletedSale(normalizedSale);
          // setShowReceiptPreview(true); // Oculto por solicitud del usuario
        }
      } catch (err) {
        console.error('Error al obtener detalles de la venta:', err);
      }
      
      clearCart();
      setPayments([{ payment_method_id: '', amount: '' }]);
      setShowAdvancedSaleModal(false);
      setSelectedCustomer(null);
      setCustomerSearch('');
      resetCreditState();
      const defaultReceipt = findReceiptTypeByAfipCode(receiptTypes, DEFAULT_RECEIPT_TYPES.DEFAULT_SALE);
      setReceiptTypeId(defaultReceipt ? defaultReceipt.id : undefined);

    } catch (err: any) {
      console.error("Error del backend:", err?.response?.data);
      const errors = err?.response?.data?.errors;
      let errorMessage = 'Ocurrió un error inesperado.';
      if (errors) {
        errorMessage = Object.keys(errors).map(key => {
          return `${key}: ${errors[key].join(', ')}`;
        }).join('; ');
      } else if(err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      toast.error('Error al procesar la venta', {
        description: errorMessage,
        duration: 9000,
      });
    } finally {
      setIsProcessingSale(false);
    }
  };

  const allPaymentsValid = payments
    .filter(p => p.amount && parseFloat(p.amount || '0') > 0)
    .every(p => p.payment_method_id);

  // Validar si hay pagos a cuenta corriente sin cliente seleccionado
  const hasCurrentAccountPayment = payments.some(p => {
    const paymentMethod = paymentMethods.find(pm => pm.id.toString() === p.payment_method_id);
    return paymentMethod && paymentMethod.name === 'Cuenta Corriente' && parseFloat(p.amount || '0') > 0;
  });

  const currentAccountPaymentValid = !hasCurrentAccountPayment || selectedCustomer !== null;

  // Componente del contenido del carrito (reutilizable para desktop y mobile)
  const CartContent = () => (
    <>
      {/* Header del carrito - Fijo */}
      <div className="flex items-center justify-between border-b p-2 sm:p-3 lg:p-4 flex-shrink-0">
        <div className="flex items-center flex-1 min-w-0">
          <ShoppingCart className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 flex-shrink-0" />
          <h2 className="text-xs sm:text-sm lg:text-base font-semibold">Carrito</h2>
          <Badge variant="secondary" className="ml-1 sm:ml-2 flex-shrink-0 text-xs">
            {cart.length}
          </Badge>
          {cart.length > 0 && !isMobile && (
            <span className="ml-1 sm:ml-2 text-xs text-muted-foreground hidden lg:inline">
              (guardado automáticamente)
            </span>
          )}
        </div>
        {cart.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearCart} className="flex-shrink-0 h-6 sm:h-7 px-1 sm:px-2">
            <X className="h-3 w-3" />
            <span className="hidden sm:inline ml-1">Limpiar</span>
          </Button>
        )}
      </div>

      {/* Contenido del carrito - Deslizable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground py-6 sm:py-12 lg:py-16">
            <div className="mb-3 sm:mb-4 lg:mb-6 p-3 sm:p-4 lg:p-6 bg-gray-50 rounded-full">
              <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-gray-400" />
            </div>
            <h3 className="text-sm sm:text-base lg:text-lg font-medium text-gray-600 mb-2">Tu carrito está vacío</h3>
            <p className="text-xs sm:text-sm lg:text-base text-gray-500 leading-relaxed px-2">Agrega productos o combos para comenzar tu venta</p>
          </div>
        ) : (
          <div className="p-2 sm:p-4 lg:p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px] sm:min-w-[120px] text-xs sm:text-sm">Producto</TableHead>
                  <TableHead className="text-center w-[60px] sm:w-[80px] text-xs sm:text-sm">Cant.</TableHead>
                  <TableHead className="text-right w-[80px] sm:w-[100px] text-xs sm:text-sm">Total</TableHead>
                  <TableHead className="w-[40px] sm:w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.map((item, index) => {
                  return (
                    <TableRow key={`${item.id}-${index}`}>
                      <TableCell className="font-medium py-1 sm:py-2">
                        <div className="text-xs sm:text-sm truncate">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(item.sale_price)} c/u
                          {item.discount_type && (item.discount_value ?? 0) > 0 && (
                            <span className="ml-1 sm:ml-2 text-amber-700 text-xs">Desc: {item.discount_type === 'percent' ? `${item.discount_value}%` : `${formatCurrency(Number(item.discount_value))}`}</span>
                          )}
                          {item.is_from_combo && (
                            <div className="text-xs text-blue-600 mt-1">
                              <Package className="h-3 w-3 inline mr-1" />
                              De combo: {item.combo_name}
                              {item.combo_discount_applied && item.combo_discount_applied > 0 && (
                                <span className="ml-1 text-green-600">
                                  (Descuento: {formatCurrency(item.combo_discount_applied)})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-1 sm:py-2">
                        <div className="flex items-center justify-center">
                          <Button variant="outline" size="icon" className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                            <Minus className="h-2 w-2 sm:h-3 sm:w-3" />
                          </Button>
                          <span className="w-5 sm:w-6 lg:w-8 text-center text-xs sm:text-sm">{item.quantity}</span>
                          <Button variant="outline" size="icon" className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                            <Plus className="h-2 w-2 sm:h-3 sm:w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm py-1 sm:py-2">{formatCurrency(item.sale_price * item.quantity)}</TableCell>
                      <TableCell className="py-1 sm:py-2">
                        <Button variant="ghost" size="icon" className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" onClick={() => removeFromCart(item.id)}>
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Resumen y botón - Fijo */}
      <div className="border-t p-2 sm:p-4 lg:p-6 flex-shrink-0">
        <div className="space-y-1 sm:space-y-2 lg:space-y-3">
          <div className="flex justify-between py-1">
            <span className="text-xs sm:text-sm text-gray-600">Subtotal (sin IVA)</span>
            <span className="text-xs sm:text-sm font-medium">{formatCurrency(subtotalNet)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-xs sm:text-sm text-gray-600">Impuestos (IVA)</span>
            <span className="text-xs sm:text-sm font-medium">{formatCurrency(totalIva)}</span>
          </div>
          <div className="flex justify-between py-1 text-xs sm:text-sm text-muted-foreground">
            <span>Descuentos</span>
            <span>- {formatCurrency(round2(totalItemDiscount + globalDiscountAmount))}</span>
          </div>
          <div className="border-t pt-2 sm:pt-3 mt-2 sm:mt-3">
            <div className="flex justify-between text-sm sm:text-base lg:text-lg font-bold">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <Button className="mt-3 sm:mt-4 lg:mt-6 w-full cursor-pointer" size="sm" disabled={cart.length === 0} onClick={() => {
          setShowAdvancedSaleModal(true)
          if (isMobile) setCartSheetOpen(false)
        }}>
          Completar Venta
        </Button>
      </div>
    </>
  )

  return (
    <ProtectedRoute permissions={['crear_ventas']} requireAny={true}>
      <div className="flex h-[calc(100vh-4rem)] flex-col lg:flex-row relative">
        {/* Área de productos - Siempre visible */}
        <div className="flex-1 overflow-auto p-2 sm:p-4 pb-20 lg:pb-4">
          {/* Branch Selector for POS */}
          <div className="mb-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-muted-foreground" />
              <Label className="text-sm font-medium">Sucursal:</Label>
            </div>
            <Select
              value={selectedBranch?.id?.toString() ?? ''}
              onValueChange={handleBranchChange}
              disabled={!branches || branches.length <= 1}
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Seleccionar sucursal" />
              </SelectTrigger>
              <SelectContent>
                {branches?.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id.toString()}>
                    <div className="flex items-center gap-2">
                      {branch.color && (
                        <div 
                          className="w-3 h-3 rounded-full border"
                          style={{ backgroundColor: branch.color }}
                        />
                      )}
                      <span>{branch.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cash Register Status - Show appropriate component based on selection */}
          {selectedBranchIds.length > 1 ? (
            <MultipleBranchesCashStatus 
              className="mb-2"
              showOpenButton={true}
              compact={false}
            />
          ) : (
            <CashRegisterStatusBadge 
              branchId={Number(selectedBranch?.id) || 1}
              compact={false}
              showOperator={true}
              showOpenTime={true}
              showRefreshButton={true}
              className="mb-2"
            />
          )}
            
            <div className="mb-4 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-full sm:w-auto sm:flex-grow flex">
                    <Barcode className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                    <Input
                        type="text"
                        placeholder="Escanear o buscar producto..."
                        className="w-full pl-8 pr-12"
                        value={productCodeInput}
                        onChange={(e) => setProductCodeInput(e.target.value)}
                        onKeyDown={handleProductCodeSubmit}
                        autoFocus
                    />
                    <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-8 w-8 p-0"
                    onClick={searchAndAddProduct}
                    disabled={!productCodeInput.trim()}
                    >
                    <Search className="h-4 w-4" />
                    </Button>
                </div>

                {/* Cantidad por selección (selector único) */}
                <div className="flex items-center gap-2">
                  <Popover open={qtySelectorOpen} onOpenChange={setQtySelectorOpen}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="min-w-[110px] justify-between">
                        Cant. x{Math.max(1, addQtyPerClick)}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" style={{ maxHeight: 300, overflowY: 'auto' }}>
                      <div className="space-y-2">
                        <Label className="text-xs">Cantidad</Label>
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          value={addQtyPerClick}
                          onChange={(e) => {
                            const v = Math.floor(Number(e.target.value))
                            setAddQtyPerClick(isNaN(v) ? 1 : Math.max(1, v))
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') setQtySelectorOpen(false)
                          }}
                        />
                        <div className="grid grid-cols-3 gap-2 pt-1">
                          {[1, 2, 3, 5, 10, 20].map((n) => (
                            <Button
                              key={n}
                              type="button"
                              variant={addQtyPerClick === n ? 'default' : 'outline'}
                              size="sm"
                              className="w-full"
                              onClick={() => { setAddQtyPerClick(n); setQtySelectorOpen(false) }}
                            >
                              x{n}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent style={{ maxHeight: 300, overflowY: 'auto' }}>
                    <SelectItem value="all">Todas</SelectItem>
                    {Array.isArray(categories) && categories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                        </SelectItem>
                    ))}
                    {(!Array.isArray(categories) || categories.length === 0) && (
                        <SelectItem value="no-categories" disabled>
                        No hay categorías disponibles
                        </SelectItem>
                    )}
                    </SelectContent>
                </Select>
            </div>

            {/* Espaciado adicional */}
            <div className="mb-6"></div>

            {/* Sección de Combos - Movida al principio para mejor visibilidad */}
            <ComboSection
              branchId={selectedBranch?.id || null}
              addQtyPerClick={addQtyPerClick}
              formatCurrency={formatCurrency}
              onComboAdded={addComboToCart}
            />

            {/* Separador visual */}
            <div className="my-8 border-t border-gray-200"></div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredProducts.map((product) => {
              const ui = getStockUi(product.id)
              return (
                <Card 
                  key={product.id} 
                  className={`flex flex-col h-full overflow-hidden cursor-pointer hover:border-primary border ${ui.card}`}
                  onClick={() => addToCart(product, addQtyPerClick)}
                >
                  <CardContent className={`p-3 flex-1 ${ui.content}`}>
                    <h3 className="font-medium text-sm mb-1 leading-tight">{product.description}</h3>
                    <p className="text-muted-foreground text-sm mb-2 font-semibold">{formatCurrency(product.sale_price)}</p>
                    {/* Mostrar stock con indicador */}
                    <p className="text-xs flex items-center">
                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${ui.dot}`} />
                      Stock: {stocksMap[product.id]?.current ?? 'N/D'}
                    </p>
                  </CardContent>
                  <CardFooter className="p-3 pt-2 mt-auto">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className={`w-full h-8 cursor-pointer ${ui.button}`} 
                      onClick={(e) => { e.stopPropagation(); addToCart(product, addQtyPerClick); }}
                    >
                      Agregar x{Math.max(1, addQtyPerClick)}
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
            </div>
        </div>

        {/* Carrito en desktop - Panel lateral */}
        {!isMobile && (
          <div className="hidden lg:flex w-full lg:w-[400px] xl:w-[500px] border-t lg:border-l lg:border-t-0 h-full flex flex-col">
            <CartContent />
          </div>
        )}

        {/* Botón flotante del carrito en móvil */}
        {isMobile && (
          <>
            <CartFloatingButton
              itemCount={cart.length}
              onClick={() => setCartSheetOpen(true)}
            />

            {/* Sheet del carrito en móvil */}
            <Sheet open={cartSheetOpen} onOpenChange={setCartSheetOpen}>
              <SheetContent side="bottom" className="h-[90vh] flex flex-col p-0 [&>button]:hidden">
                <CartContent />
              </SheetContent>
            </Sheet>
          </>
        )}
      </div>

      {/* Dialogs fuera del contenedor principal */}
      <Dialog open={showAdvancedSaleModal} onOpenChange={setShowAdvancedSaleModal}>
              <DialogContent className="max-w-4xl w-full p-0 flex flex-col max-h-[85vh]">
                <DialogHeader className="px-6 pt-4 pb-2 shrink-0">
                   <DialogTitle>Completar Venta</DialogTitle>
                   <DialogDescription>
                     Completa los detalles de la venta y selecciona los métodos de pago.
                   </DialogDescription>
                 </DialogHeader>
                <div className="overflow-y-auto px-6 py-4 grow">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                       <div className="mb-4">
                         <div className="flex items-end justify-between gap-2">
                           <div className="flex-1">
                             <Label>Buscar cliente (DNI o nombre)</Label>
                             <div className="relative">
                               <Input
                                 value={customerSearch}
                                 onChange={e => {
                                   const v = e.target.value;
                                   setCustomerSearch(v);
                                   setShowCustomerOptions(!!v && v.length >= 1);
                                   if (!v) {
                                     setSelectedCustomer(null);
                                   }
                                 }}
                                 onFocus={() => setShowCustomerOptions(customerSearch.length >= 1)}
                                 onBlur={() => setTimeout(() => setShowCustomerOptions(false), 120)}
                                 onKeyDown={(e) => {
                                   if (e.key === 'Escape') setShowCustomerOptions(false);
                                 }}
                                 placeholder="Ingrese para buscar..."
                               />
                               {customerOptions.length > 0 && showCustomerOptions && (
                                 <div className="absolute left-0 right-0 border rounded bg-white mt-1 max-h-40 overflow-auto z-50 shadow">
                                   {customerOptions.map((c) => (
                                     <div
                                       key={c.id}
                                       className="p-2 cursor-pointer hover:bg-gray-100"
                                       role="button"
                                       tabIndex={0}
                                       onMouseDown={(e) => {
                                         e.preventDefault();
                                         e.stopPropagation();
                                         setSelectedCustomer(c);
                                         setCustomerSearch(`${c.name}`);
                                         setCustomerOptions([]);
                                         setShowCustomerOptions(false);
                                         const el = document.activeElement as HTMLElement | null;
                                         if (el && typeof el.blur === 'function') el.blur();
                                       }}
                                     >
                                       {c.name}
                                     </div>
                                   ))}
                                 </div>
                               )}
                             </div>
                           </div>
                           <Button className="mt-6 whitespace-nowrap" variant="outline" onClick={() => setShowNewCustomerDialog(true)}>+</Button>
                         </div>
                       </div>
                       <div className="mb-4">
                         <Label>Tipo de comprobante</Label>
                         <Select value={receiptTypeId?.toString() || ''} onValueChange={val => setReceiptTypeId(Number(val))}>
                             <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                             <SelectContent className="max-h-60 overflow-y-auto" style={{ maxHeight: 300, overflowY: 'auto' }}>
                             {receiptTypes.map(rt => (
                                 <SelectItem key={rt.id} value={rt.id.toString()}>{rt.name}</SelectItem>
                             ))}
                             </SelectContent>
                         </Select>
                       </div>
                       {/* Descuento global */}
                       {hasPermission('aplicar_descuentos') && (
                       <div className="mb-4 grid grid-cols-4 gap-2 items-end">
                         <Label className="col-span-4">Descuento global</Label>
                         <Select value={globalDiscountType} onValueChange={(v) => setGlobalDiscountType(v as any)}>
                           <SelectTrigger className="col-span-2"><SelectValue placeholder="Tipo" /></SelectTrigger>
                           <SelectContent style={{ maxHeight: 300, overflowY: 'auto' }}>
                             <SelectItem value="percent">Porcentaje %</SelectItem>
                             <SelectItem value="amount">Monto $</SelectItem>
                           </SelectContent>
                         </Select>
                         <Input
                           className="col-span-2"
                           type="number"
                           min={0}
                           step={0.01}
                           placeholder={'0.00'}
                           value={globalDiscountValue}
                           onChange={(e) => setGlobalDiscountValue(e.target.value)}
                         />
                       </div>
                       )}
                       {selectedCustomer && (
                         <div className="space-y-3">
                             <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                 <h4 className="text-sm font-medium text-blue-900 mb-2">Información del Cliente</h4>
                                <div className="grid grid-cols-1 gap-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-blue-700">Nombre:</span>
                                        <span className="font-medium text-blue-900">{selectedCustomer.name}</span>
                                    </div>
                                    {/* Mostrar solo CUIT o DNI si existe, no mostrar nada si no hay ninguno */}
                                    {selectedCustomer.cuit && (
                                        <div className="flex justify-between">
                                            <span className="text-blue-700">CUIT:</span>
                                            <span className="font-medium text-blue-900">{selectedCustomer.cuit}</span>
                                        </div>
                                    )}
                                    {selectedCustomer.dni && !selectedCustomer.cuit && (
                                        <div className="flex justify-between">
                                            <span className="text-blue-700">DNI:</span>
                                            <span className="font-medium text-blue-900">{selectedCustomer.dni}</span>
                                        </div>
                                    )}
                                    {selectedCustomer.fiscal_condition_name && (
                                        <div className="flex justify-between">
                                            <span className="text-blue-700">Condición Fiscal:</span>
                                            <span className="font-medium text-blue-900">{selectedCustomer.fiscal_condition_name}</span>
                                        </div>
                                    )}
                                    {/* Mostrar crédito disponible si existe */}
                                    {isLoadingCredit ? (
                                        <div className="flex justify-between pt-2 border-t border-blue-200">
                                            <span className="text-blue-700 font-medium">Crédito a favor:</span>
                                            <span className="text-blue-700">Cargando...</span>
                                        </div>
                                    ) : availableFavorCredit > 0 ? (
                                        <div className="flex justify-between pt-2 border-t border-blue-200">
                                            <span className="text-blue-700 font-medium">Crédito a favor:</span>
                                            <span className="font-bold text-green-700">{formatCurrency(availableFavorCredit)}</span>
                                        </div>
                                    ) : null}
                                </div>
                             </div>
                         </div>
                       )}
                     </div>

                     <div>
                       <div className="mb-2 flex flex-col gap-2">
                         {/* Resumen para no duplicar: Subtotal, IVA, Descuentos, Total y Falta en un solo bloque */}
                         <div className="space-y-1.5 text-sm">
                           <div className="flex justify-between">
                             <span>Subtotal (sin IVA)</span>
                             <span>{formatCurrency(subtotalNet)}</span>
                           </div>
                           <div className="flex justify-between">
                             <span>Impuestos (IVA)</span>
                             <span>{formatCurrency(totalIva)}</span>
                           </div>
                           <div className="flex justify-between text-muted-foreground">
                             <span>Descuentos</span>
                             <span>- {formatCurrency(round2(totalItemDiscount + globalDiscountAmount))}</span>
                           </div>
                         </div>
                         <div className="flex justify-between text-base font-semibold">
                           <div className="flex items-center gap-1">
                             <span>Total</span>
                             < TooltipProvider>
                               <Tooltip>
                                 <TooltipTrigger asChild>
                                   <span className="inline-flex items-center text-muted-foreground cursor-help">
                                     <Info className="h-4 w-4" />
                                   </span>
                                 </TooltipTrigger>
                                 <TooltipContent>
                                   <p>Precio unitario sin IVA. Descuentos antes del IVA. Cálculo con hasta 2 decimales.</p>
                                 </TooltipContent>
                               </Tooltip>
                             </TooltipProvider>
                           </div>
                           <span>{formatCurrency(total)}</span>
                         </div>
                         {favorCreditToApply > 0 && (
                           <div className="flex justify-between text-sm text-green-700 bg-green-50 p-2 rounded">
                             <span className="font-medium">Crédito a favor aplicado:</span>
                             <span className="font-bold">- {formatCurrency(favorCreditToApply)}</span>
                           </div>
                         )}
                         <div className="flex justify-between text-base">
                           <span>Falta:</span>
                           {(() => {
                             // Calcular pagos excluyendo "Crédito a favor" porque ya está restado en totalAfterCredit
                             const paid = payments.reduce((s, p) => {
                               const paymentMethod = paymentMethods.find(pm => pm.id.toString() === p.payment_method_id);
                               // Si es "Crédito a favor", no incluirlo en los pagos porque ya está restado en totalAfterCredit
                               if (paymentMethod?.name === 'Crédito a favor') {
                                 return s;
                               }
                               return s + (parseFloat(p.amount || '0') || 0);
                             }, 0);
                             const diff = round2(totalAfterCredit - paid);
                             return (
                               <span className={diff > 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                                 {formatCurrency(Math.max(0, diff))}
                               </span>
                             );
                           })()}
                         </div>
                       </div>
                       <div className="space-y-4">
                           {payments.map((payment, idx) => (
                           <div key={idx} className="flex gap-2 items-center">
                               <Select value={payment.payment_method_id} onValueChange={val => updatePayment(idx, 'payment_method_id', val)}>
                                   <SelectTrigger className="w-40"><SelectValue placeholder="Método" /></SelectTrigger>
                                   <SelectContent style={{ maxHeight: 300, overflowY: 'auto' }}>
                                       {paymentMethods.map((pm: any) => (
                                       <SelectItem key={pm.id} value={pm.id.toString()}>{pm.name}</SelectItem>
                                       ))}
                                   </SelectContent>
                               </Select>
                               <Input
                                   type="number"
                                   min="0"
                                   step="0.01"
                                   placeholder="Monto"
                                   value={payment.amount}
                                   onChange={e => updatePayment(idx, 'amount', e.target.value)}
                                   className="w-32"
                               />
                               {payments.length > 1 && (
                               <Button variant="ghost" size="icon" onClick={() => removePayment(idx)}>
                                   <Trash2 className="h-4 w-4" />
                               </Button>
                               )}
                           </div>
                           ))}
                           <Button variant="outline" onClick={addPayment}>Agregar método de pago</Button>
                       </div>
                       
                       {/* Mensaje de error para cuenta corriente sin cliente */}
                       {hasCurrentAccountPayment && !selectedCustomer && (
                         <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mt-2">
                           <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                           <p>Para usar "Cuenta Corriente" como método de pago, debes seleccionar un cliente.</p>
                         </div>
                       )}
                     </div>
                   </div>

                   <div className="mt-6">
                     <h3 className="font-semibold mb-2">Productos en la venta</h3>
                     {/* Aclaración de precios y cálculo */}
                     <p className="text-xs text-muted-foreground mb-2">
                       El precio unitario ingresado o editado se interpreta sin IVA. Los descuentos por ítem se aplican antes del IVA, el descuento global se aplica sobre el total con IVA. Cálculo con hasta 2 decimales.
                     </p>
                     {!hasPermission('aplicar_descuentos') && (
                       <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2 mb-2">
                         <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                         <p>No tienes permiso para aplicar descuentos. Los campos de descuento están deshabilitados.</p>
                       </div>
                     )}
                     <Table>
                     <TableHeader>
                         <TableRow>
                         <TableHead>Producto</TableHead>
                         <TableHead className="text-center">Cant.</TableHead>
                         <TableHead className="text-right">P. Unit (sin IVA)</TableHead>
                         <TableHead className="text-right">Subt. (sin IVA)</TableHead>
                         <TableHead className="text-right">Desc. (importe)</TableHead>
                         <TableHead className="text-right">IVA</TableHead>
                         <TableHead className="text-right">Total</TableHead>
                         <TableHead className="text-right">Desc. Tipo</TableHead>
                         <TableHead className="text-right">Desc. Valor</TableHead>
                         </TableRow>
                     </TableHeader>
                     <TableBody>
                         {cart.map((item, idx) => {
                         const base = round2((item.price || 0) * item.quantity)
                         const itemDiscRaw = item.discount_type === 'percent' ? round2(base * ((item.discount_value || 0) / 100)) : round2(Number(item.discount_value || 0))
                         const safeDisc = Math.max(0, Math.min(itemDiscRaw, base))
                         const net = round2(base - safeDisc)
                         const iva = round2(net * ((item.iva_rate || 0) / 100))
                         const tot = round2(net + iva)
                         return (
                             <TableRow key={item.id}>
                             <TableCell>{item.name}</TableCell>
                             <TableCell className="text-center">{item.quantity}</TableCell>
                             <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                             <TableCell className="text-right">{formatCurrency(base)}</TableCell>
                             <TableCell className="text-right">{formatCurrency(safeDisc)}</TableCell>
                             <TableCell className="text-right">{formatCurrency(iva)}</TableCell>
                             <TableCell className="text-right">{formatCurrency(tot)}</TableCell>
                             <TableCell className="text-right">
                               <Select
                                 value={item.discount_type || ''}
                                 onValueChange={(v) => {
                                   setCart((prev) => prev.map((ci, i) => i === idx ? { ...ci, discount_type: v as any, discount_value: ci.discount_value ?? 0 } : ci))
                                 }}
                                 disabled={!hasPermission('aplicar_descuentos')}
                               >
                                 <SelectTrigger className="w-[130px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
                                 <SelectContent style={{ maxHeight: 300, overflowY: 'auto' }}>
                                   <SelectItem value="percent">% Porcentaje</SelectItem>
                                   <SelectItem value="amount">$ Monto</SelectItem>
                                 </SelectContent>
                               </Select>
                             </TableCell>
                             <TableCell className="text-right">
                               <Input
                                 className="w-[120px] ml-auto"
                                 type="number"
                                 min={0}
                                 step={item.discount_type === 'percent' ? 0.01 : 0.01}
                                 placeholder={item.discount_type === 'percent' ? '0.00' : '0.00'}
                                 value={item.discount_value?.toString() || ''}
                                 onChange={(e) => {
                                   const val = e.target.value
                                   setCart((prev) => prev.map((ci, i) => i === idx ? { ...ci, discount_value: val === '' ? undefined : Number(val) } : ci))
                                 }}
                                 disabled={!hasPermission('aplicar_descuentos')}
                               />
                             </TableCell>
                             </TableRow>
                         );
                         })}
                     </TableBody>
                     </Table>
                   </div>
                 </div>
                <DialogFooter className="px-6 py-3 shrink-0">
                   <Button variant="outline" onClick={() => setShowAdvancedSaleModal(false)}>Cancelar</Button>
                   <CashRegisterProtectedButton 
                     branchId={Number(selectedBranch?.id) || 1} 
                     operationName="realizar ventas"
                   >
                     {(() => {
                       // Calcular pagos excluyendo "Crédito a favor" porque ya está restado en totalAfterCredit
                       const paid = payments.reduce((s, p) => {
                         const paymentMethod = paymentMethods.find(pm => pm.id.toString() === p.payment_method_id);
                         // Si es "Crédito a favor", no incluirlo en los pagos porque ya está restado en totalAfterCredit
                         if (paymentMethod?.name === 'Crédito a favor') {
                           return s;
                         }
                         return s + (parseFloat(p.amount || '0') || 0);
                       }, 0);
                       // Usar totalAfterCredit para la validación (total después de aplicar crédito a favor)
                       const diff = round2(totalAfterCredit - paid);
                       const canConfirm = (cart.length > 0 && receiptTypeId !== undefined && diff === 0 && allPaymentsValid && currentAccountPaymentValid && selectedBranch);
                       return (
                         <Button 
                           className="cursor-pointer" 
                           onClick={handleConfirmSale} 
                           disabled={!canConfirm || isProcessingSale}
                         >
                           {isProcessingSale ? (
                             <>
                               <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                               Procesando...
                             </>
                           ) : (
                             'Confirmar y Pagar'
                           )}
                         </Button>
                       );
                     })()}
                   </CashRegisterProtectedButton>
                 </DialogFooter>
               </DialogContent>
             </Dialog>


      {/* Dialog para crear cliente desde POS */}
      <Dialog open={showNewCustomerDialog} onOpenChange={setShowNewCustomerDialog}>
        <DialogContent className="max-w-4xl w-full" noOverlay>
          <CustomerForm 
            disableNavigate
            onCancel={() => setShowNewCustomerDialog(false)}
            onSuccess={(cust: any) => {
              // Determinar qué documento mostrar: CUIT tiene prioridad, luego DNI
              const hasCuit = cust.person?.cuit;
              const hasDni = cust.person?.documento;
              
              const opt: CustomerOption = {
                id: cust.id,
                name: `${cust.person?.first_name ?? ''} ${cust.person?.last_name ?? ''}`.trim() || `Cliente ${cust.id}`,
                dni: hasDni ? cust.person.documento : null,
                cuit: hasCuit ? cust.person.cuit : null,
                fiscal_condition_id: cust.person?.fiscal_condition_id || null,
                fiscal_condition_name: cust.person?.fiscal_condition?.description || cust.person?.fiscal_condition?.name || null,
              }
              setSelectedCustomer(opt)
              setCustomerSearch(opt.name)
              setCustomerOptions([])
              setShowNewCustomerDialog(false)
              toast.success("Cliente agregado y seleccionado")
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Comprobante de venta */}
      <SaleReceiptPreviewDialog
        open={showReceiptPreview}
        onOpenChange={setShowReceiptPreview}
        sale={completedSale}
        customerName={completedSale ? getCustomerName(completedSale) : ''}
        customerCuit={completedSale?.customer?.person?.cuit}
        formatDate={formatDate}
        formatCurrency={formatCurrency}
      />
    </ProtectedRoute>
  );
}