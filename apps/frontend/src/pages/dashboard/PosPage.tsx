import { useState, useEffect, useCallback, useRef } from "react"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { useNavigate, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { sileo } from "sileo"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import useApi from "@/hooks/useApi"
import { useBranch } from "@/context/BranchContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import CashRegisterStatusBadge from "@/components/cash-register-status-badge"
import { useExchangeRateUpdates } from "@/hooks/useExchangeRateUpdates"

import MultipleBranchesCashStatus from "@/components/cash-register-multiple-branches-status"
import { Building, Minus, Plus, Search, ShoppingCart, Trash2, X, Barcode, Package, Loader2 } from "lucide-react"
import { ComboSection } from "@/components/ComboSection"
import { useCombosInPOS } from "@/hooks/useCombosInPOS"
import { useIsMobile } from "@/hooks/useIsMobile"
import { CartFloatingButton } from "@/components/pos/CartFloatingButton"
import type { Combo, CartItem } from "@/types/combo"
import { matchesWildcard } from "@/utils/searchUtils"
import { usePosCategories } from "@/hooks/usePosCategories"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { formatCurrency, roundToTwoDecimals } from '@/utils/sale-calculations'
import { useSaleTotals } from '@/hooks/useSaleTotals'
import SaleReceiptPreviewDialog from "@/components/SaleReceiptPreviewDialog"
import type { SaleHeader } from '@/types/sale'

const SMALL_CATALOG_THRESHOLD = 300


export default function POSPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [cart, setCart] = useState<CartItem[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [products, setProducts] = useState<any[]>([])
  // Mapa de stock por producto en la sucursal seleccionada
  const [stocksMap, setStocksMap] = useState<Record<number, { current: number; min: number }>>({})

  // Hook de categorías/subcategorías en cascada
  const {
    parentCategories,
    subcategories,
    selectedCategoryId,
    selectedSubcategoryId,
    loadingSubcategories,
    setSelectedCategoryId,
    setSelectedSubcategoryId,
    filterCategoryIds,
  } = usePosCategories()
  const { request } = useApi()
  const { selectedBranch, selectionChangeToken, selectedBranchIds, branches, setSelectedBranchIds } = useBranch()

  // Estado para el diálogo de recibo
  const [showReceiptPreview, setShowReceiptPreview] = useState(false)
  const [completedSale, setCompletedSale] = useState<SaleHeader | null>(null)

  // Estado para manejar conversión de presupuesto
  const [convertedFromBudgetId, setConvertedFromBudgetId] = useState<number | null>(null)

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


  // Función para cambiar sucursal desde el POS
  const handleBranchChange = (branchId: string) => {
    if (!branchId) return;

    // Si hay productos en el carrito, advertir al usuario
    if (cart.length > 0) {
      const confirmChange = window.confirm(
        'Al cambiar de sucursal se vaciará el carrito actual. ¿Deseas continuar?'
      );
      if (!confirmChange) {
        return;
      }
      // Limpiar el carrito
      setCart([]);
      clearCartFromStorage();
    }

    setSelectedBranchIds([branchId]);
    sileo.success({
      title: 'Sucursal cambiada',
      description: `Ahora trabajas en ${branches.find(b => b.id.toString() === branchId)?.description || 'la sucursal seleccionada'}`
    });
  };


  const [productCodeInput, setProductCodeInput] = useState("")
  const [isSearchingProduct, setIsSearchingProduct] = useState(false)
  const [productSearchMode, setProductSearchMode] = useState<'local-cache' | 'server-on-demand'>('server-on-demand')
  const [activeProductsCount, setActiveProductsCount] = useState<number | null>(null)
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false)

  // Nueva: cantidad por selección de producto
  const [addQtyPerClick, setAddQtyPerClick] = useState<number>(1)
  const [qtySelectorOpen, setQtySelectorOpen] = useState<boolean>(false)


  // Hook para manejar combos en POS
  const { getComboPriceDetails } = useCombosInPOS()

  // Ref para almacenar la función fetchProducts
  const fetchProductsRef = useRef<(() => Promise<void>) | null>(null);

  // Estado para controlar el Sheet del carrito
  const [cartSheetOpen, setCartSheetOpen] = useState(false)

  // Hooks personalizados para responsabilidades separadas
  const isMobile = useIsMobile()

  // fetchCategories ya no es necesario: usePosCategories se encarga

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapProductForPos = useCallback((p: any) => {
    const salePriceWithIva = p.sale_price || 0;
    const ivaRate = p.iva?.rate || 0;

    const priceWithoutIva = ivaRate > 0
      ? Math.round((salePriceWithIva / (1 + ivaRate / 100) + Number.EPSILON) * 100) / 100
      : salePriceWithIva;

    return {
      ...p,
      name: p.description,
      allow_discount: p.allow_discount !== false,
      price: priceWithoutIva,
      sale_price: salePriceWithIva,
      iva_rate: ivaRate,
      price_with_iva: salePriceWithIva,
      iva: p.iva
    };
  }, [])

  const fetchProducts = useCallback(async (perPage = SMALL_CATALOG_THRESHOLD) => {
    try {
      const response = await request({ method: "GET", url: `/products?include=category,iva&per_page=${perPage}&status=active` })
      // Manejar estructura paginada para productos también
      const productData = Array.isArray(response) ? response :
        Array.isArray(response?.data?.data) ? response.data.data :
          Array.isArray(response?.data) ? response.data : [];
      const mappedProducts = productData.map(mapProductForPos);
      setProducts(mappedProducts)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      setProducts([])
    }
  }, [request, mapProductForPos]); // Dependencia estable

  const initializeProductCatalogMode = useCallback(async () => {
    if (!selectedBranch?.id) {
      setProducts([])
      setActiveProductsCount(null)
      setProductSearchMode('server-on-demand')
      return
    }

    setIsLoadingCatalog(true)
    setProducts([])

    try {
      const response = await request({ method: 'GET', url: '/products?status=active&per_page=1' })

      const totalActiveProducts = Number(
        response?.total ??
        response?.data?.total ??
        (Array.isArray(response?.data?.data) ? response.data.data.length :
          Array.isArray(response?.data) ? response.data.length :
            Array.isArray(response) ? response.length : 0)
      )

      setActiveProductsCount(totalActiveProducts)

      if (totalActiveProducts > 0 && totalActiveProducts <= SMALL_CATALOG_THRESHOLD) {
        await fetchProducts(totalActiveProducts)
        setProductSearchMode('local-cache')
      } else {
        setProductSearchMode('server-on-demand')
        setProducts([])
      }
    } catch {
      setActiveProductsCount(null)
      setProductSearchMode('server-on-demand')
      setProducts([])
    } finally {
      setIsLoadingCatalog(false)
    }
  }, [request, selectedBranch?.id, fetchProducts])

  const findProductOnServer = useCallback(async (query: string) => {
    const response = await request({
      method: 'GET',
      url: '/pos/products',
      params: { query, limit: 20 }
    })

    const data = Array.isArray(response)
      ? response
      : Array.isArray(response?.data)
        ? response.data
        : []

    return data.map(mapProductForPos)
  }, [request, mapProductForPos])

  // Función estable para recargar productos cuando se actualice la tasa de cambio
  const handleExchangeRateUpdate = useCallback(() => {
    if (productSearchMode !== 'local-cache') return

    // Ejecutar fetchProducts y LUEGO mostrar el toast cuando termine con éxito.
    fetchProducts(activeProductsCount && activeProductsCount > 0 ? activeProductsCount : SMALL_CATALOG_THRESHOLD).then(() => {
      sileo.success({
        title: "Precios actualizados",
        description: "Los precios se han actualizado con la nueva tasa de cambio"
      });
    });

  }, [fetchProducts, productSearchMode, activeProductsCount]); // fetchProducts es estable por useCallback

  // Recargar productos cuando se actualice la tasa de cambio
  useExchangeRateUpdates(handleExchangeRateUpdate);


  // Cargar carrito desde localStorage al montar el componente
  useEffect(() => {
    // Si viene un presupuesto para editar, cargarlo
    if (location.state?.budgetToEdit) {
      const budget = location.state.budgetToEdit
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mappedItems = budget.items?.map((item: any) => {
        const ivaRate = item.product?.iva?.rate || 0
        const priceNet = Number(item.unit_price)
        // Calcular precio bruto aproximado (o usar el del producto si coincide)
        const priceGross = priceNet * (1 + ivaRate / 100)

        return {
          id: item.product_id.toString(),
          product_id: item.product_id,
          code: item.product?.code || '',
          name: item.product?.description || '',
          price: priceNet,
          price_with_iva: priceGross,
          sale_price: priceGross, // Precio base para mostrar
          iva_rate: ivaRate,
          quantity: Number(item.quantity),
          image: '',
          currency: 'ARS',
          allow_discount: item.product?.allow_discount !== false,
          discount_type: item.product?.allow_discount === false ? undefined : item.discount_type,
          discount_value: item.product?.allow_discount === false ? undefined : Number(item.discount_value),
          is_from_combo: false,
        }
      }) || []

      if (mappedItems.length > 0) {
        setCart(mappedItems)
        sileo.success({
          title: `Presupuesto ${budget.receipt_number || `#${budget.id}`} cargado`,
          description: 'Se han cargado los ítems del presupuesto.'
        })
        setConvertedFromBudgetId(budget.id)

        // Auto-navigate to completion page
        navigate("/dashboard/pos/completar-venta", {
          state: {
            cart: mappedItems,
            branchId: budget.branch_id || selectedBranch?.id,
            convertedFromBudgetId: budget.id,
            convertedFromBudgetNumber: budget.receipt_number || `#${budget.id}`,
            convertedFromBudgetPayments: budget.payments,
            convertedFromBudgetTotal: budget.total,
            // Pasar datos del cliente del presupuesto original
            convertedFromBudgetCustomer: budget.customer_data || null
          }
        })

        // Limpiar el state para evitar recargas accidentales
        window.history.replaceState({}, document.title)
      }
    } else {
      // Si volvemos de completar venta, restaurar el ID del presupuesto
      if (location.state?.convertedFromBudgetId) {
        setConvertedFromBudgetId(location.state.convertedFromBudgetId)
      }

      // Comportamiento normal: cargar de localStorage
      const savedCart = loadCartFromStorage()
      if (savedCart.length > 0) {
        setCart(savedCart)
        sileo.info({ title: `Carrito restaurado: ${savedCart.length} producto${savedCart.length > 1 ? 's' : ''} encontrado${savedCart.length > 1 ? 's' : ''}` })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  // Efecto para detectar venta completada desde CompleteSalePage
  useEffect(() => {
    if (location.state?.completedSale) {
      setCompletedSale(location.state.completedSale)
      setShowReceiptPreview(true)
      // Limpiar el state para no reabrir al recargar
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchIds.length, originalBranchSelection])

  // Guardar carrito en localStorage cada vez que cambie
  useEffect(() => {
    if (cart.length > 0) {
      saveCartToStorage(cart)
    } else {
      clearCartFromStorage()
    }
  }, [cart])

  // Estrategia híbrida: catálogos chicos se precargan para UX instantánea;
  // catálogos grandes usan búsqueda bajo demanda para performance.

  // ── Búsqueda server-side con debounce (modo server-on-demand) ──
  const debouncedSearchTerm = useDebouncedValue(productCodeInput, 400)

  useEffect(() => {
    if (productSearchMode !== 'server-on-demand') return
    const trimmed = debouncedSearchTerm.trim()

    // Si el usuario borró el campo de búsqueda, limpiar la grilla
    if (!trimmed || trimmed.length < 2) {
      setProducts([])
      return
    }

    let cancelled = false

    const fetchServerResults = async () => {
      setIsSearchingProduct(true)
      try {
        const serverResults = await findProductOnServer(trimmed)
        if (cancelled) return
        // Reemplazar productos — solo mostrar los que coinciden con la búsqueda actual
        setProducts(serverResults)
      } catch {
        // silently fail — user can retry
      } finally {
        if (!cancelled) setIsSearchingProduct(false)
      }
    }

    void fetchServerResults()
    return () => { cancelled = true }
  }, [debouncedSearchTerm, productSearchMode, findProductOnServer])



  // Función para refrescar productos (para usar en el callback de exchange rate)
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      setStocksMap({})
    }
  }

  // Efecto: cargar stocks al cambiar sucursal o al montar
  useEffect(() => {
    fetchStocks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch])

  // Reaccionar a cambios de sucursal: stocks, productos, métodos de pago y tipos de comprobante si corresponde
  useEffect(() => {
    // Al cambiar de sucursal, refrescar stocks y productos
    fetchStocks()
    void initializeProductCatalogMode()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch?.id, selectionChangeToken, initializeProductCatalogMode])

  const filteredProducts = products.filter((product) => {
    const matchesCategory = filterCategoryIds === null || filterCategoryIds.includes(product.category_id);
    const matchesSearch = matchesWildcard(product.description || '', productCodeInput) ||
      matchesWildcard(String(product.code), productCodeInput) ||
      (product.barcode && matchesWildcard(String(product.barcode), productCodeInput));

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

  type CustomSelectionsType = Map<number, { option: import("@/types/combo").ComboGroupOption, quantity: number }[]>;

  /**
   * Agregar combo al carrito descomponiéndolo en productos individuales
   * Cada producto del combo se agrega con descuento pre-configurado
   * 
   * @param combo - El combo a agregar
   * @param quantity - Cantidad del combo a agregar
   * @param customSelections - Opciones seleccionadas de los grupos dinámicos (opcional)
   */
  const addComboToCart = async (combo: Combo, quantity: number, customSelections?: CustomSelectionsType) => {
    try {
      // Obtener detalles de precio del combo (ítems fijos precalculados por el backend)
      const priceDetails = await getComboPriceDetails(combo.id);

      const itemsBreakdown = [...priceDetails.items_breakdown];
      let totalBasePrice = priceDetails.base_price;

      // Combinar ítems customizados si existen
      if (customSelections) {
        customSelections.forEach((selections) => {
          selections.forEach(({ option, quantity: selQty }) => {
            if (option.product) {
              const unitPrice = option.product.sale_price ?? 0;
              const totalPrice = unitPrice * selQty;
              totalBasePrice += totalPrice;

              const existingIndex = itemsBreakdown.findIndex(i => i.product.id === option.product?.id);
              if (existingIndex >= 0) {
                itemsBreakdown[existingIndex].quantity += selQty;
                itemsBreakdown[existingIndex].total_price += totalPrice;
              } else {
                itemsBreakdown.push({
                  product: option.product,
                  quantity: selQty,
                  unit_price: unitPrice,
                  total_price: totalPrice
                });
              }
            }
          });
        });
      }

      // Recalcular descuento total considerando el nuevo totalBasePrice
      let totalDiscount = 0;
      if (combo.discount_type === 'percentage') {
        totalDiscount = totalBasePrice * (combo.discount_value / 100);
      } else if (combo.discount_type === 'fixed_amount') {
        totalDiscount = Math.min(combo.discount_value, totalBasePrice);
      }

      // Calcular el factor de descuento proporcional
      const discountFactor = totalBasePrice > 0 ? totalDiscount / totalBasePrice : 0;

      // Agregar cada producto del combo al carrito con descuento aplicado
      const comboItems = itemsBreakdown.map((item) => {
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

      sileo.success({
        title: "Combo agregado al carrito",
        description: `${combo.name} x${quantity} se descompuso en ${comboItems.length} productos con descuento aplicado.`,
      });
    } catch (error) {
      console.error("Error adding combo to cart:", error);
      sileo.error({ title: "Error al agregar combo al carrito" });
    }
  }

  /**
   * Busca productos en el servidor y los muestra en la grilla (sin agregar al carrito).
   * Se usa cuando el usuario quiere ver resultados manualmente.
   */
  const searchProductsOnServer = useCallback(async () => {
    const query = productCodeInput.trim()
    if (!query) return

    setIsSearchingProduct(true)
    try {
      const serverResults = await findProductOnServer(query)
      // Reemplazar productos con los resultados de esta búsqueda
      setProducts(serverResults)
    } catch {
      sileo.error({
        title: "Error al buscar producto",
        description: "No se pudo consultar el producto en este momento.",
      })
    } finally {
      setIsSearchingProduct(false)
    }
  }, [productCodeInput, findProductOnServer])

  /**
   * Busca coincidencia EXACTA por código o barcode y agrega al carrito.
   * Diseñado para lectores de código de barras que envían Enter al final.
   *
   * Si no es match exacto, solo dispara la búsqueda visual (no agrega).
   */
  const scanAndAddProduct = useCallback(async () => {
    const code = productCodeInput.trim()
    if (!code) return

    setIsSearchingProduct(true)

    try {
      const isExactMatch = (p: { code?: string | number; barcode?: string | number }) =>
        String(p.code).toLowerCase() === code.toLowerCase() ||
        (p.barcode && String(p.barcode).toLowerCase() === code.toLowerCase())

      // 1) Buscar en caché local
      let foundProduct = products.find(isExactMatch)

      // 2) Buscar en servidor si no está en memoria
      if (!foundProduct) {
        const serverResults = await findProductOnServer(code)
        foundProduct = serverResults.find(isExactMatch)

        // Cachear resultados para próximas búsquedas
        if (serverResults.length > 0 && productSearchMode === 'local-cache') {
          setProducts(prev => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const existingIds = new Set(prev.map((p: any) => p.id))
            const newProducts = serverResults.filter(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (p: any) => !existingIds.has(p.id)
            )
            return newProducts.length > 0 ? [...prev, ...newProducts] : prev
          })
        }
      }

      // 3) Solo agregar al carrito si hay match EXACTO (escáner)
      if (foundProduct) {
        addToCart(foundProduct, addQtyPerClick)
        sileo.success({
          title: "Producto agregado",
          description: `${foundProduct.description} x${Math.max(1, addQtyPerClick)} se agregó al carrito.`,
        })
        setProductCodeInput("")
      }
      // Si no hay match exacto no mostramos error — los resultados ya se ven en la grilla
    } catch {
      sileo.error({
        title: "Error al buscar producto",
        description: "No se pudo consultar el producto en este momento.",
      })
    } finally {
      setIsSearchingProduct(false)
    }
  }, [productCodeInput, products, findProductOnServer, addToCart, addQtyPerClick, productSearchMode])

  const handleProductCodeSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void scanAndAddProduct()
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

  // Calcular totales usando hook personalizado (sin descuento global en POS)
  const { totalItemDiscount, globalDiscountAmount, subtotalNet, totalIva, total } = useSaleTotals(cart, { type: '', value: '' })

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
            <span>- {formatCurrency(roundToTwoDecimals(totalItemDiscount + globalDiscountAmount))}</span>
          </div>
          <div className="border-t pt-2 sm:pt-3 mt-2 sm:mt-3">
            <div className="flex justify-between text-sm sm:text-base lg:text-lg font-bold">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <Button className="mt-3 sm:mt-4 lg:mt-6 w-full cursor-pointer" size="sm" disabled={cart.length === 0} onClick={() => {
          navigate("/dashboard/pos/completar-venta", { state: { cart, branchId: selectedBranch?.id, convertedFromBudgetId } })
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
              {/* @ts-expect-error - UI component props mismatch */}
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

          <div className="mb-4 space-y-1">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-auto sm:flex-grow">
                <div className="relative flex">
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
                    onClick={() => { void searchProductsOnServer() }}
                    disabled={!productCodeInput.trim() || isSearchingProduct}
                  >
                    {isSearchingProduct ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Cantidad por selección (selector único) */}
              <div className="flex items-center gap-2">
                <Popover open={qtySelectorOpen} onOpenChange={setQtySelectorOpen}>
                  {/* @ts-expect-error - UI component props mismatch */}
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className="min-w-[110px] justify-between">
                      Cant. x{Math.max(1, addQtyPerClick)}
                    </Button>
                  </PopoverTrigger>
                  {/* @ts-expect-error - UI component props mismatch */}
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

              {/* Categoría padre */}
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                {/* @ts-expect-error - UI component props mismatch */}
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                {/* @ts-expect-error - UI component props mismatch */}
                <SelectContent style={{ maxHeight: 300, overflowY: 'auto' }}>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {parentCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                  {parentCategories.length === 0 && (
                    <SelectItem value="no-categories" disabled>
                      No hay categorías
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>

              {/* Subcategoría */}
              <Select
                value={selectedSubcategoryId}
                onValueChange={setSelectedSubcategoryId}
                disabled={selectedCategoryId === 'all' || (subcategories.length === 0 && !loadingSubcategories)}
              >
                {/* @ts-expect-error - UI component props mismatch */}
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder={loadingSubcategories ? 'Cargando...' : 'Subcategoría'} />
                </SelectTrigger>
                {/* @ts-expect-error - UI component props mismatch */}
                <SelectContent style={{ maxHeight: 300, overflowY: 'auto' }}>
                  <SelectItem value="all">Todas las subcategorías</SelectItem>
                  {subcategories.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id.toString()}>
                      {sub.name}
                    </SelectItem>
                  ))}
                  {subcategories.length === 0 && !loadingSubcategories && (
                    <SelectItem value="no-subcategories" disabled>
                      Sin subcategorías
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <p className="text-xs text-muted-foreground">
              {isLoadingCatalog
                ? 'Preparando catálogo para esta sucursal...'
                : 'Buscá por código o descripción. Escaneá un código de barras para agregar directo al carrito.'}
            </p>
          </div>

          {/* Sección de Combos */}
          <ComboSection
            branchId={selectedBranch?.id ? Number(selectedBranch.id) : null}
            addQtyPerClick={addQtyPerClick}
            formatCurrency={formatCurrency}
            onComboAdded={addComboToCart}
            searchTerm={productCodeInput}
          />

          {/* Título de productos si hay combos */}
          <div className="flex items-center gap-2 mb-4 mt-8">
            <h3 className="text-lg font-semibold text-gray-900">
              Productos
            </h3>
          </div>

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

          {filteredProducts.length === 0 && (
            <div className="mt-6 text-center text-sm text-muted-foreground">
              {isLoadingCatalog
                ? 'Cargando catálogo de la sucursal...'
                : productSearchMode === 'local-cache'
                  ? 'No hay productos que coincidan con los filtros actuales.'
                  : 'Escribí un código o descripción para buscar y agregar productos sin cargar todo el catálogo.'}
            </div>
          )}
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
              {/* @ts-expect-error - UI component props mismatch */}
              <SheetContent side="bottom" className="h-[90vh] flex flex-col p-0 [&>button]:hidden">
                <CartContent />
              </SheetContent>
            </Sheet>
          </>
        )}
      </div>

      {/* Diálogo de vista previa de recibo */}
      <SaleReceiptPreviewDialog
        open={showReceiptPreview}
        onOpenChange={setShowReceiptPreview}
        sale={completedSale}
        customerName={completedSale?.customer?.business_name ||
          (completedSale?.customer?.person ? `${completedSale.customer.person.first_name || ''} ${completedSale.customer.person.last_name || ''}`.trim() : 'Cliente')}
        customerCuit={completedSale?.customer?.person?.cuit}
        formatDate={(date) => date ? new Date(date).toLocaleDateString('es-AR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }) : ''}
        formatCurrency={formatCurrency}
      />

    </ProtectedRoute>
  );
}