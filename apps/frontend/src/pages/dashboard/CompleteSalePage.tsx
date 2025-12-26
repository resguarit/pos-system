import { useState, useEffect, useCallback, useMemo } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import useApi from "@/hooks/useApi"
import { useBranch } from "@/context/BranchContext"
import { useAuth } from "@/context/AuthContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import SaleReceiptPreviewDialog from "@/components/SaleReceiptPreviewDialog"
import CashRegisterProtectedButton from "@/components/cash-register-protected-button"
import { useCashRegisterStatus } from "@/hooks/useCashRegisterStatus"
import CustomerForm from "@/components/customers/customer-form"
import { Loader2, ArrowLeft } from "lucide-react"
import type { CartItem } from "@/types/combo"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useSaleTotals } from "@/hooks/useSaleTotals"
import { useCustomerSearch, type CustomerOption } from "@/hooks/useCustomerSearch"
import { formatCurrency, roundToTwoDecimals, extractProductId, calculatePaymentDiscount } from '@/utils/sale-calculations'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useSaleValidation } from '@/hooks/useSaleValidation'
import { CustomerSearchSection } from "@/components/sale/CustomerSearchSection"
import { SaleItemsTable } from "@/components/sale/SaleItemsTable"
import { PaymentSection } from "@/components/sale/PaymentSection"
import { SaleSummarySection } from "@/components/sale/SaleSummarySection"
import { DebtAlertDialog } from "@/components/sale/DebtAlertDialog"
import type { PaymentMethod, ReceiptType, SaleData, SaleHeader } from '@/types/sale'
import { useAfip } from "@/hooks/useAfip"
import type { ApiResponse } from "@/types/api"
import { clearCartStorage } from "@/utils/cart-storage"
import { useCartContext } from "@/context/CartContext"

export default function CompleteSalePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { request } = useApi()
  const { selectedBranch, branches } = useBranch()
  const { user, hasPermission } = useAuth()
  // Obtener branchId desde location.state
  const stateBranchId = location.state?.branchId

  // Usar la sucursal del state si está disponible, sino usar la del contexto
  const activeBranch = stateBranchId
    ? branches.find(b => b.id === stateBranchId) || selectedBranch
    : selectedBranch

  // Debug: verificar qué sucursal se está usando
  console.log('CompleteSalePage - Branch info:', {
    stateBranchId,
    activeBranchId: activeBranch?.id,
    activeBranchName: activeBranch?.description,
    selectedBranchId: selectedBranch?.id
  })

  const { validateCashRegisterForOperation } = useCashRegisterStatus(Number(activeBranch?.id) || 1)
  const { checkCuitCertificate } = useAfip()

  const { cart, setCart, clearCart } = useCartContext()

  // Sync cart from location state if provided
  useEffect(() => {
    const passedCart = (location.state?.cart as CartItem[]) || []
    if (passedCart.length > 0) {
      setCart(passedCart)
    }
  }, [location.state]) // Depend only on location state changes

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [receiptTypes, setReceiptTypes] = useState<ReceiptType[]>([])
  const [receiptTypeId, setReceiptTypeId] = useState<number | undefined>(undefined)
  const [payments, setPayments] = useState<Array<{ payment_method_id: string; amount: string }>>([
    { payment_method_id: '', amount: '' }
  ])
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false)
  const [isProcessingSale, setIsProcessingSale] = useState(false)
  const [showReceiptPreview, setShowReceiptPreview] = useState(false)
  const [completedSale, setCompletedSale] = useState<SaleHeader | null>(null)
  const [globalDiscountType, setGlobalDiscountType] = useState<'percent' | 'amount' | ''>('')
  const [globalDiscountValue, setGlobalDiscountValue] = useState<string>('')
  const [customerBalance, setCustomerBalance] = useState<number | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)
  const [showDebtDialog, setShowDebtDialog] = useState(false)
  const [showChangeConfirmDialog, setShowChangeConfirmDialog] = useState(false)
  const [pendingChangeAmount, setPendingChangeAmount] = useState(0)


  // Hook personalizado para búsqueda de clientes
  const {
    selectedCustomer,
    customerSearch,
    customerOptions,
    showCustomerOptions,
    setSelectedCustomer,
    setCustomerSearch,
    setShowCustomerOptions,
  } = useCustomerSearch()

  // Calcular totales usando hook personalizado
  const globalDiscount = useMemo(() => ({
    type: globalDiscountType,
    value: globalDiscountValue,
  }), [globalDiscountType, globalDiscountValue])

  const { totalItemDiscount, globalDiscountAmount, subtotalNet, totalIva, total } = useSaleTotals(cart, globalDiscount)

  // Estado para el descuento de pago (congelado hasta que se cambie método o agregue fila)
  const [totalPaymentDiscount, setTotalPaymentDiscount] = useState(0)

  // Recalcular el descuento con una lista de pagos específica
  const recalculateDiscount = useCallback((currentPayments: typeof payments) => {
    const newVal = calculatePaymentDiscount(total, currentPayments, paymentMethods)
    setTotalPaymentDiscount(newVal)
  }, [total, paymentMethods])

  // Si cambia el total base (por ítems o d. global), actualizar el descuento de pago
  useEffect(() => {
    recalculateDiscount(payments)
  }, [total, recalculateDiscount])

  // Total final después de aplicar descuentos de métodos de pago  
  const finalTotal = useMemo(() => {
    return roundToTwoDecimals(total - totalPaymentDiscount)
  }, [total, totalPaymentDiscount])

  // Si no hay carrito, redirigir al POS
  useEffect(() => {
    const passedCart = (location.state?.cart as CartItem[]) || []
    // Only redirect if both context cart and passed cart are empty
    if (cart.length === 0 && passedCart.length === 0) {
      toast.error("No hay productos en el carrito")
      navigate("/dashboard/pos")
    }
  }, [cart.length, navigate, location.state])

  // Cargar métodos de pago y tipos de comprobante
  useEffect(() => {
    fetchPaymentMethods()
    fetchReceiptTypes()
  }, [activeBranch])

  const fetchPaymentMethods = useCallback(async () => {
    try {
      const response = await request({ method: 'GET', url: '/pos/payment-methods' })
      const apiData = Array.isArray(response) ? response :
        Array.isArray(response?.data?.data) ? response.data.data :
          Array.isArray(response?.data) ? response.data : []

      const filteredMethods = apiData
        .map((item: any): PaymentMethod => ({
          id: item.id,
          name: item.name || item.description,
          discount_percentage: item.discount_percentage,
        }))

      setPaymentMethods(filteredMethods)
    } catch (err) {
      setPaymentMethods([])
      toast.error("Error al cargar los métodos de pago.")
    }
  }, [request])

  const fetchReceiptTypes = useCallback(async () => {
    try {
      const branchCuit = (activeBranch as any)?.cuit
      const enabledReceiptTypes = (activeBranch as any)?.enabled_receipt_types

      // Debug: mostrar datos de la sucursal
      console.log('Branch data:', {
        id: activeBranch?.id,
        cuit: branchCuit,
        enabled_receipt_types: enabledReceiptTypes
      })

      // Códigos AFIP para tipos internos
      const INTERNAL_CODES = ['016', '017'] // Presupuesto (016), Factura X (017)

      // Códigos AFIP para facturas válidas
      // Factura A (001), Factura B (006), Factura C (011), Factura M (049)
      // Presupuesto (016), Factura X (017)
      const FACTURA_CODES = ['001', '006', '011', '049', '016', '017']

      let availableTypes: ReceiptType[] = []

      // Obtener todos los tipos de comprobantes del backend
      const response = await request({ method: 'GET', url: '/receipt-types' })
      const allTypes = Array.isArray(response) ? response :
        Array.isArray(response?.data?.data) ? response.data.data :
          Array.isArray(response?.data) ? response.data : []

      // Mapear y filtrar SOLO facturas (no notas de crédito/débito/recibos)
      const mappedTypes = allTypes
        .filter((item: any) => FACTURA_CODES.includes(item.afip_code))
        .map((item: any): ReceiptType => ({
          id: item.id,
          name: item.description || item.name,
          afip_code: item.afip_code || item.code
        }))

      // Si la sucursal NO tiene CUIT, solo mostrar tipos internos
      if (!branchCuit || branchCuit.length !== 11) {
        availableTypes = mappedTypes.filter((t: ReceiptType) => t.afip_code && INTERNAL_CODES.includes(t.afip_code))
        console.log('Sucursal sin CUIT: mostrando solo tipos internos', availableTypes)
      }
      else {
        // Verificar si el CUIT tiene certificado válido
        const certStatus = await checkCuitCertificate(branchCuit)

        if (!certStatus.has_certificate || !certStatus.is_valid) {
          // Tiene CUIT pero no certificado válido -> Solo tipos internos
          availableTypes = mappedTypes.filter((t: ReceiptType) => t.afip_code && INTERNAL_CODES.includes(t.afip_code))
          console.log(`Sucursal con CUIT ${branchCuit} pero SIN certificado válido: mostrando solo tipos internos`, availableTypes)
        }
        // Si tiene CUIT y tipos habilitados configurados, filtrar por los habilitados
        else if (enabledReceiptTypes && Array.isArray(enabledReceiptTypes) && enabledReceiptTypes.length > 0) {
          // Filtrar por los habilitados que también sean facturas
          availableTypes = mappedTypes.filter((t: ReceiptType) => enabledReceiptTypes.includes(t.id))
          console.log(`Sucursal con CUIT ${branchCuit}: mostrando ${availableTypes.length} tipos habilitados`, availableTypes)
        }
        // Si tiene CUIT pero no tiene tipos habilitados configurados, mostrar todas las facturas
        else {
          availableTypes = mappedTypes
          console.log('Sucursal con CUIT pero sin tipos configurados: mostrando todas las facturas', availableTypes.length)
        }
      }

      // RESTRICCIÓN POR PERMISO: Si el usuario TIENE permiso solo_crear_presupuestos,
      // solo puede emitir Presupuestos (ID=1)
      const isRestrictedToBudgets = hasPermission('solo_crear_presupuestos')
      if (isRestrictedToBudgets) {
        const presupuesto = availableTypes.find((t: ReceiptType) => t.afip_code === '016') // Presupuesto Code = 016
        if (presupuesto) {
          availableTypes = [presupuesto]
          console.log('Usuario con permiso solo_crear_presupuestos: restringido a Presupuestos')
          // Toast removed as per user request
        } else {
          // Si por alguna razón Presupuesto no está disponible, mostrar error
          availableTypes = []
          toast.error('Tienes restricción de solo presupuestos pero el tipo Presupuesto no está disponible')
        }
      }

      setReceiptTypes(availableTypes)

      // Seleccionar tipo de comprobante por defecto
      if (availableTypes.length > 0) {
        // Prioridad: Factura B (006) > Factura X (017) > primero disponible
        const defaultReceipt = availableTypes.find((t: ReceiptType) => t.afip_code === '006') || // Factura B
          availableTypes.find((t: ReceiptType) => t.afip_code === '017') || // Factura X
          availableTypes[0]

        if (defaultReceipt) {
          setReceiptTypeId(defaultReceipt.id)
        }
      } else {
        // Si no hay tipos disponibles, limpiar selección
        setReceiptTypeId(undefined)
        toast.warning('No hay tipos de comprobante disponibles para esta sucursal')
      }
    } catch (err) {
      console.error('Error al cargar tipos de comprobante:', err)
      setReceiptTypes([])
      toast.error("Error al cargar los tipos de comprobante.")
    }
  }, [request, activeBranch])

  const addPayment = useCallback(() => {
    setPayments(prev => {
      const newPayments = [...prev, { payment_method_id: '', amount: '' }]
      // Al agregar pago, recalculamos descuento sobre la nueva estructura
      recalculateDiscount(newPayments)
      return newPayments
    })
  }, [recalculateDiscount])

  const removePayment = useCallback((idx: number) => {
    setPayments(prev => {
      const newPayments = prev.filter((_, i) => i !== idx)
      // Al quitar pago, recalculamos
      recalculateDiscount(newPayments)
      return newPayments
    })
  }, [recalculateDiscount])

  const updatePayment = useCallback((idx: number, field: string, value: string) => {
    setPayments(prev => {
      const updated = prev.map((p, i) => i === idx ? { ...p, [field]: value } : p)

      // SOLO recalcular si cambia el MÉTODO DE PAGO
      // Si cambia el monto, NO recalculamos (para evitar saltos en la UI)
      if (field === 'payment_method_id') {
        recalculateDiscount(updated)
      }
      return updated
    })
  }, [recalculateDiscount])


  const formatDate = useCallback((dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('es-AR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return 'N/A'
    }
  }, [])

  const getCustomerName = useCallback((sale: SaleHeader | null): string => {
    if (!sale?.customer) return 'Consumidor Final'
    const customer = sale.customer
    if (customer.person) {
      return `${customer.person.first_name || ''} ${customer.person.last_name || ''}`.trim()
    }
    return customer.business_name || 'Cliente'
  }, [])

  // Procesar la venta - DEBE estar definido ANTES de handleConfirmSale
  const processSale = useCallback(async () => {
    if (isProcessingSale) return

    if (!activeBranch) {
      toast.error('Debe seleccionar una sucursal antes de realizar la venta', {
        description: 'Use el selector de sucursal en la parte superior del POS'
      })
      return
    }

    setIsProcessingSale(true)

    try {
      const isValid = await validateCashRegisterForOperation('realizar ventas')
      if (!isValid) {
        setIsProcessingSale(false)
        return
      }

      if (!user || !activeBranch) {
        toast.error("Error de sesión o sucursal. Recargue la página.")
        setIsProcessingSale(false)
        return
      }

      const now = new Date()
      const pad = (n: number) => n.toString().padStart(2, '0')
      const argDateString = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

      const saleData: SaleData = {
        branch_id: Number(activeBranch.id),
        customer_id: selectedCustomer?.id || null,
        sale_document_number: (selectedCustomer?.cuit || selectedCustomer?.dni)
          ? String(selectedCustomer?.cuit || selectedCustomer?.dni)
          : null,
        receipt_type_id: receiptTypeId,
        sale_fiscal_condition_id: selectedCustomer?.fiscal_condition_id || null,
        sale_date: argDateString,
        subtotal_net: subtotalNet,
        total_iva: totalIva,
        total: finalTotal,
        total_discount: Math.max(0, totalItemDiscount + globalDiscountAmount + totalPaymentDiscount),
        ...(globalDiscountType && Number(globalDiscountValue) > 0
          ? { discount_type: globalDiscountType, discount_value: Number(globalDiscountValue) }
          : {}),
        items: cart.map((item) => {
          const productId = extractProductId(item)

          return {
            product_id: productId,
            quantity: item.quantity,
            unit_price: Number(item.price || 0),
            ...(item.discount_type && (item.discount_value ?? 0) > 0
              ? { discount_type: item.discount_type, discount_value: Number(item.discount_value) }
              : {}),
          }
        }),
        payments: payments.map((p, idx) => {
          // Si hay cambio (diff < 0), ajustar el ÚLTIMO método de pago (que debería ser efectivo)
          const isLastPayment = idx === payments.length - 1
          if (isLastPayment && diff < 0) {
            // El monto que realmente necesitamos es: monto pagado + diff (que es negativo)
            const adjustedAmount = parseFloat(p.amount || '0') + diff
            return {
              payment_method_id: parseInt(p.payment_method_id),
              amount: roundToTwoDecimals(Math.max(0, adjustedAmount)), // Nunca enviar negativo
            }
          }
          return {
            payment_method_id: parseInt(p.payment_method_id),
            amount: parseFloat(p.amount || '0') || 0,
          }
        }),
      }

      const saleResponse = await request({ url: '/pos/sales', method: 'POST', data: saleData })

      // Check if the sale is pending approval
      const saleStatus = (saleResponse as any)?.status || (saleResponse as any)?.data?.status

      if (saleStatus === 'pending') {
        toast.info('Venta registrada - Pendiente de aprobación', {
          description: 'Tu venta ha sido registrada pero requiere aprobación de un supervisor antes de ser procesada. El stock y la caja no serán afectados hasta que sea aprobada.',
          duration: 8000,
        })
      } else {
        toast.success('¡Venta realizada con éxito!')
      }



      try {
        const saleResponseData = saleResponse as ApiResponse<SaleHeader> | SaleHeader
        // Handle both wrapped and unwrapped responses (just in case backend varies)
        const saleId = 'id' in saleResponseData ? saleResponseData.id : saleResponseData.data?.id

        if (saleId) {
          const saleDetails = await request({
            method: 'GET',
            url: `/sales/${saleId}?include=items,customer,receipt_type,saleFiscalCondition,branch,saleIvas`
          })

          const normalizedSale = (saleDetails as ApiResponse<SaleHeader>).data ?? saleDetails
          setCompletedSale(normalizedSale as SaleHeader)

          clearCartStorage()
          navigate("/dashboard/pos", { state: { completedSale: normalizedSale } })
          return
        }
      } catch (err) {
        console.error('Error al obtener detalles de la venta:', err)
      }

      clearCartStorage()
      navigate("/dashboard/pos")


    } catch (err: any) {
      console.error("Error del backend:", err?.response?.data)
      const errorData = err?.response?.data as ApiResponse
      const errors = errorData?.errors
      let errorMessage = 'Ocurrió un error inesperado.'

      if (errors) {
        errorMessage = Object.keys(errors).map(key => {
          return `${key}: ${errors[key].join(', ')}`
        }).join('; ')
      } else if (errorData?.message) {
        errorMessage = errorData.message
      }
      toast.error('Error al procesar la venta', {
        description: errorMessage,
        duration: 9000,
      })
    } finally {
      setIsProcessingSale(false)
    }
  }, [
    isProcessingSale,
    activeBranch,
    validateCashRegisterForOperation,
    user,
    selectedCustomer,
    receiptTypeId,
    subtotalNet,
    totalIva,
    total,
    totalItemDiscount,
    globalDiscountAmount,
    globalDiscountType,
    globalDiscountValue,
    cart,
    payments,
    request,
    navigate,
  ])

  // Calcular monto pendiente explícitamente - DEBE estar ANTES de hasChange
  // Calcular monto pendiente explícitamente - DEBE estar ANTES de hasChange
  // Usamos debounce de 2 segundos para evitar que el 'Falta' salte mientras se escribe
  const debouncedPayments = useDebouncedValue(payments, 2000)
  const pendingAmount = useMemo(() => {
    const paid = debouncedPayments.reduce((sum, p) => sum + (parseFloat(p.amount || '0') || 0), 0)
    return roundToTwoDecimals(finalTotal - paid)
  }, [finalTotal, debouncedPayments])

  const diff = useMemo(() => pendingAmount, [pendingAmount])

  // useSaleValidation hook
  const {
    hasCashPayment,
    hasChange,
    changeAmount,
    hasCurrentAccountPayment,
    canConfirm,
    confirmDisabledReason
  } = useSaleValidation({
    cart,
    receiptTypeId,
    diff,
    payments,
    paymentMethods,
    activeBranch,
    selectedCustomer
  })

  // Re-implement handleConfirmSale using valdiation logic
  const handleConfirmSale = useCallback(async () => {
    if (isProcessingSale) return

    // Validación: Si no es exacto, verificar el tipo de pago
    if (diff !== 0) {
      // Si hay cambio (pagó más)
      if (hasChange) {
        // Solo permitir cambio si hay un método de Efectivo
        if (!hasCashPayment) {
          toast.error('Monto no coincide', {
            description: 'Para métodos de pago diferentes a efectivo, el monto debe ser exacto. Por favor ajusta el monto a pagar.',
            duration: 5000,
          })
          return
        }
        // Si es efectivo, mostrar diálogo de confirmación de cambio
        setPendingChangeAmount(changeAmount)
        setShowChangeConfirmDialog(true)
        return
      }
      // Si hay falta de pago (no debería pasar por validación canConfirm, pero validamos por seguridad)
      if (diff > 0) {
        toast.error('Pago incompleto', {
          description: `Falta ${formatCurrency(diff)} para completar el pago.`,
          duration: 5000,
        })
        return
      }
    }

    // Proceder con la venta
    await processSale()
  }, [isProcessingSale, hasChange, changeAmount, processSale, diff, hasCashPayment])

  const handleCustomerSelect = useCallback((customer: CustomerOption) => {
    setSelectedCustomer(customer)
    setCustomerSearch(customer.name)
    setShowCustomerOptions(false)

    // Cargar el saldo del cliente
    // Cargar el saldo del cliente
    if (customer.id) {
      setLoadingBalance(true)
      request({
        method: 'GET',
        url: `/current-accounts/customer/${customer.id}`
      })
        .then((response) => {
          // El endpoint retorna { data: CurrentAccount } o similar
          // Verificamos si response tiene la propiedad data o balance directo
          console.log('API Response:', response)

          let balance = 0

          let accountData = response?.data || response

          // Manejo robusto de anidamiento extra "data.data"
          if (accountData?.data && typeof accountData.data === 'object') {
            accountData = accountData.data
          }

          console.log('Processed Account Data:', accountData)

          // Priorizamos total_pending_debt que representa la deuda real por ventas
          if (accountData) {
            if (accountData.total_pending_debt !== undefined && accountData.total_pending_debt !== null) {
              balance = Number(accountData.total_pending_debt)
            } else {
              // Fallback a current_balance, manejando strings numéricos
              balance = Number(accountData.current_balance || accountData.balance || 0)
            }
          }

          console.log('Calculated Balance:', balance)

          setCustomerBalance(balance)

          // Mostrar alerta si tiene deuda
          if (balance > 0) {
            setShowDebtDialog(true)
          }
        })
        .catch((error) => {
          console.error('Error al cargar saldo del cliente:', error)
          // Si el error es 404 (no existe cuenta corriente), el saldo es 0
          if (error?.response?.status === 404) {
            setCustomerBalance(0)
          } else {
            setCustomerBalance(null)
          }
        })
        .finally(() => {
          setLoadingBalance(false)
        })
    }
  }, [setSelectedCustomer, setCustomerSearch, setShowCustomerOptions, request])

  // ... (resto del código)

  const handleNewCustomerSuccess = useCallback((cust: any) => {
    const hasCuit = cust.person?.cuit
    const hasDni = cust.person?.documento

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
    setShowNewCustomerDialog(false)
    toast.success("Cliente agregado y seleccionado")
  }, [setSelectedCustomer, setCustomerSearch])

  if (cart.length === 0) {
    return null
  }

  return (
    <ProtectedRoute permissions={['crear_ventas']} requireAny={true}>
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard/pos")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al POS
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>Completar Venta</CardTitle>
              <CardDescription>
                Completa los detalles de la venta y selecciona los métodos de pago.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <CustomerSearchSection
                    customerSearch={customerSearch}
                    customerOptions={customerOptions}
                    showCustomerOptions={showCustomerOptions}
                    selectedCustomer={selectedCustomer}
                    customerBalance={customerBalance}
                    loadingBalance={loadingBalance}
                    onSearchChange={setCustomerSearch}
                    onCustomerSelect={handleCustomerSelect}
                    onShowOptionsChange={setShowCustomerOptions}
                    onNewCustomerClick={() => setShowNewCustomerDialog(true)}
                  />

                  <div>
                    <Label>Tipo de comprobante</Label>
                    <Select value={receiptTypeId?.toString() || ''} onValueChange={val => setReceiptTypeId(Number(val))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto" style={{ maxHeight: 300, overflowY: 'auto' }}>
                        {receiptTypes.map(rt => (
                          <SelectItem key={rt.id} value={rt.id.toString()}>
                            {rt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {hasPermission('aplicar_descuentos') && (
                    <div className="grid grid-cols-4 gap-2 items-end">
                      <Label className="col-span-4">Descuento global</Label>
                      <Select value={globalDiscountType} onValueChange={(v) => setGlobalDiscountType(v as 'percent' | 'amount' | '')}>
                        <SelectTrigger className="col-span-2">
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
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
                </div>

                <div className="space-y-4">
                  <SaleSummarySection
                    subtotalNet={subtotalNet}
                    totalIva={totalIva}
                    totalItemDiscount={totalItemDiscount}
                    globalDiscountAmount={globalDiscountAmount}
                    total={total}
                    totalPaymentDiscount={totalPaymentDiscount}
                    finalTotal={finalTotal}
                  />

                  <PaymentSection
                    payments={payments}
                    paymentMethods={paymentMethods}
                    total={finalTotal}
                    pendingAmount={pendingAmount}
                    onAddPayment={addPayment}
                    onRemovePayment={removePayment}
                    onUpdatePayment={updatePayment}
                    hasCurrentAccountPayment={hasCurrentAccountPayment}
                    hasSelectedCustomer={selectedCustomer !== null}
                    isMainPaymentCash={hasCashPayment}
                  />
                </div>
              </div>

              <div className="mt-6">
                <h3 className="font-semibold mb-2">Productos en la venta</h3>
                <p className="text-xs text-muted-foreground mb-2">
                  El precio unitario ingresado o editado se interpreta sin IVA. Los descuentos por ítem se aplican antes del IVA, el descuento global se aplica sobre el total con IVA. Cálculo con hasta 2 decimales.
                </p>

                <SaleItemsTable
                  cart={cart}
                  hasPermission={hasPermission}
                  onUpdateItem={(idx, changes) => {
                    setCart((prev) => prev.map((ci, i) =>
                      i === idx
                        ? { ...ci, ...changes }
                        : ci
                    ))
                  }}
                />
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button variant="outline" onClick={() => navigate("/dashboard/pos")}>
                  Cancelar
                </Button>
                <CashRegisterProtectedButton
                  branchId={Number(activeBranch?.id) || 1}
                  operationName="realizar ventas"
                >
                  <Button
                    className="cursor-pointer"
                    onClick={handleConfirmSale}
                    disabled={!canConfirm || isProcessingSale}
                    title={!canConfirm ? confirmDisabledReason : undefined}
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
                </CashRegisterProtectedButton>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog para crear cliente desde POS */}
      {showNewCustomerDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <CustomerForm
                disableNavigate
                onCancel={() => setShowNewCustomerDialog(false)}
                onSuccess={handleNewCustomerSuccess}
              />
            </div>
          </div>
        </div>
      )}

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

      {/* Diálogo de confirmación de cambio */}
      <Dialog open={showChangeConfirmDialog} onOpenChange={setShowChangeConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              💰 Confirmar Cambio a Entregar
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Amount Display */}
            <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg shadow-sm">
              <p className="text-center text-sm text-blue-700 font-medium mb-3">Cambio a Entregar al Cliente</p>
              <p className="text-center text-4xl font-bold text-blue-600">{formatCurrency(pendingChangeAmount)}</p>
            </div>

            {/* Instructions */}
            <div className="space-y-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-amber-900">⚠️ Antes de continuar:</p>
              <ul className="text-xs text-amber-800 space-y-1.5 ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">✓</span>
                  <span>Verifica que el monto mostrado sea correcto</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">✓</span>
                  <span>Prepara el cambio en efectivo</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">✓</span>
                  <span>Entrega el cambio al cliente</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowChangeConfirmDialog(false)}
                disabled={isProcessingSale}
                className="flex-1"
              >
                Volver a Revisar
              </Button>
              <Button
                onClick={async () => {
                  setShowChangeConfirmDialog(false)
                  await processSale()
                }}
                disabled={isProcessingSale}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isProcessingSale ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  '✓ Confirmar Venta'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alerta de deuda */}
      {selectedCustomer && (
        <DebtAlertDialog
          open={showDebtDialog}
          onOpenChange={setShowDebtDialog}
          customerId={selectedCustomer.id}
          debtAmount={customerBalance}
        />
      )}    </ProtectedRoute>
  )
}