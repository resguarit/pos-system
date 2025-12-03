import { useState, useEffect, useCallback, useMemo } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { formatCurrency, roundToTwoDecimals, extractProductId } from '@/utils/sale-calculations'
import { CustomerSearchSection } from "@/components/sale/CustomerSearchSection"
import { PaymentSection } from "@/components/sale/PaymentSection"
import { SaleSummarySection } from "@/components/sale/SaleSummarySection"
import type { PaymentMethod, ReceiptType, SaleData, CompletedSale } from '@/types/sale'

const CART_STORAGE_KEY = 'pos_cart'

export default function CompleteSalePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { request } = useApi()
  const { selectedBranch } = useBranch()
  const { user, hasPermission } = useAuth()
  const { validateCashRegisterForOperation } = useCashRegisterStatus(Number(selectedBranch?.id) || 1)

  // Obtener datos del carrito desde location.state
  const initialCart = (location.state?.cart as CartItem[]) || []
  const [cart, setCart] = useState<CartItem[]>(initialCart)

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [receiptTypes, setReceiptTypes] = useState<ReceiptType[]>([])
  const [receiptTypeId, setReceiptTypeId] = useState<number | undefined>(undefined)
  const [payments, setPayments] = useState<Array<{ payment_method_id: string; amount: string }>>([
    { payment_method_id: '', amount: '' }
  ])
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false)
  const [isProcessingSale, setIsProcessingSale] = useState(false)
  const [showReceiptPreview, setShowReceiptPreview] = useState(false)
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null)
  const [globalDiscountType, setGlobalDiscountType] = useState<'percent' | 'amount' | ''>('')
  const [globalDiscountValue, setGlobalDiscountValue] = useState<string>('')

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

  // Calcular descuento total de métodos de pago
  const totalPaymentDiscount = useMemo(() => {
    let discountSum = 0
    let paidSoFar = 0 // Monto NETO pagado hasta ahora
    let grossPaidSoFar = 0 // Monto BRUTO (deuda) cubierto hasta ahora

    payments.forEach((p) => {
      const method = paymentMethods.find(pm => pm.id.toString() === p.payment_method_id)
      const discountPercentage = (method?.discount_percentage || 0)
      const discountRate = discountPercentage / 100

      if (p.amount && p.amount !== '') {
        // Si hay monto ingresado, usamos lógica "Gross Up"
        // Ejemplo: Pago $90 con 10% desc.
        // Valor cubierto = 90 / (1 - 0.10) = 100
        // Descuento = 100 - 90 = 10
        const amount = parseFloat(p.amount) || 0

        if (discountRate > 0 && discountRate < 1) {
          const grossValue = amount / (1 - discountRate)
          const discount = grossValue - amount
          discountSum += discount
          grossPaidSoFar += grossValue
        } else {
          grossPaidSoFar += amount
        }
        paidSoFar += amount

      } else if (p.payment_method_id && discountPercentage > 0) {
        // Vista previa: Calculamos descuento sobre el saldo pendiente BRUTO
        // Saldo pendiente bruto = Total Original - Lo que ya cubrimos (con descuentos incluidos)
        const pendingGross = total - grossPaidSoFar

        if (pendingGross > 0) {
          // El descuento será simplemente Porcentaje * Pendiente
          // Ejemplo: Debo $100. 10% desc. Descuento $10. A pagar $90.
          discountSum += pendingGross * discountRate
          // Asumimos que este pago cubrirá el resto para que no se duplique en siguientes loops
          grossPaidSoFar += pendingGross
        }
      }
    })

    return discountSum
  }, [payments, paymentMethods, total])

  // Total final después de aplicar descuentos de métodos de pago  
  const finalTotal = useMemo(() => {
    return roundToTwoDecimals(total - totalPaymentDiscount)
  }, [total, totalPaymentDiscount])

  // Si no hay carrito, redirigir al POS
  useEffect(() => {
    if (initialCart.length === 0) {
      toast.error("No hay productos en el carrito")
      navigate("/dashboard/pos")
    }
  }, [initialCart.length, navigate])

  // Cargar métodos de pago y tipos de comprobante
  useEffect(() => {
    fetchPaymentMethods()
    fetchReceiptTypes()
  }, [selectedBranch])

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
      const branchCuit = (selectedBranch as any)?.cuit
      const enabledReceiptTypes = (selectedBranch as any)?.enabled_receipt_types

      // Debug: mostrar datos de la sucursal
      console.log('Branch data:', {
        id: selectedBranch?.id,
        cuit: branchCuit,
        enabled_receipt_types: enabledReceiptTypes
      })

      // IDs de tipos internos (siempre disponibles para ventas)
      const INTERNAL_RECEIPT_TYPE_IDS = [1, 2] // Presupuesto (1), Factura X (2)

      // IDs de facturas AFIP (solo estas aplican para ventas, no notas de crédito/débito)
      // Factura A (3), Factura B (8), Factura C (13), Factura M (17)
      const FACTURA_IDS = [1, 2, 3, 8, 13, 17]

      let availableTypes: ReceiptType[] = []

      // Obtener todos los tipos de comprobantes del backend
      const response = await request({ method: 'GET', url: '/receipt-types' })
      const allTypes = Array.isArray(response) ? response :
        Array.isArray(response?.data?.data) ? response.data.data :
          Array.isArray(response?.data) ? response.data : []

      // Mapear y filtrar SOLO facturas (no notas de crédito/débito/recibos)
      const mappedTypes = allTypes
        .filter((item: any) => FACTURA_IDS.includes(item.id))
        .map((item: any): ReceiptType => ({
          id: item.id,
          name: item.description || item.name,
          afip_code: item.afip_code || item.code
        }))

      // Si la sucursal NO tiene CUIT, solo mostrar tipos internos
      if (!branchCuit || branchCuit.length !== 11) {
        availableTypes = mappedTypes.filter((t: ReceiptType) => INTERNAL_RECEIPT_TYPE_IDS.includes(t.id))
        console.log('Sucursal sin CUIT: mostrando solo tipos internos', availableTypes)
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

      setReceiptTypes(availableTypes)

      // Seleccionar tipo de comprobante por defecto
      if (availableTypes.length > 0) {
        // Prioridad: Factura B (8) > Factura X (2) > primero disponible
        const defaultReceipt = availableTypes.find((t: ReceiptType) => t.id === 8) || // Factura B
          availableTypes.find((t: ReceiptType) => t.id === 2) || // Factura X
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
  }, [request, selectedBranch])

  const addPayment = useCallback(() => {
    setPayments(prev => [...prev, { payment_method_id: '', amount: '' }])
  }, [])

  const removePayment = useCallback((idx: number) => {
    setPayments(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const updatePayment = useCallback((idx: number, field: string, value: string) => {
    setPayments(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p))
  }, [])


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

  const getCustomerName = useCallback((sale: CompletedSale | null): string => {
    if (!sale?.customer) return 'Consumidor Final'
    const customer = sale.customer
    if (customer.person) {
      return `${customer.person.first_name || ''} ${customer.person.last_name || ''}`.trim()
    }
    return customer.name || 'Cliente'
  }, [])

  const handleConfirmSale = useCallback(async () => {
    if (isProcessingSale) return

    if (!selectedBranch) {
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

      if (!user || !selectedBranch) {
        toast.error("Error de sesión o sucursal. Recargue la página.")
        setIsProcessingSale(false)
        return
      }

      const now = new Date()
      const pad = (n: number) => n.toString().padStart(2, '0')
      const argDateString = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

      const saleData: SaleData = {
        branch_id: Number(selectedBranch.id),
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
        payments: payments.map(p => ({
          payment_method_id: parseInt(p.payment_method_id),
          amount: parseFloat(p.amount || '0') || 0,
        })),
      }

      const saleResponse = await request({ url: '/pos/sales', method: 'POST', data: saleData })
      toast.success('¡Venta realizada con éxito!')

      try {
        const saleId = (saleResponse as any)?.id || (saleResponse as any)?.data?.id
        if (saleId) {
          const saleDetails = await request({
            method: 'GET',
            url: `/sales/${saleId}?include=items,customer,receipt_type,saleFiscalCondition,branch,saleIvas`
          })
          const normalizedSale = (saleDetails as any)?.data ?? saleDetails
          setCompletedSale(normalizedSale)
        }
      } catch (err) {
        console.error('Error al obtener detalles de la venta:', err)
      }

      localStorage.removeItem(CART_STORAGE_KEY)
      navigate("/dashboard/pos")

    } catch (err: any) {
      console.error("Error del backend:", err?.response?.data)
      const errors = err?.response?.data?.errors
      let errorMessage = 'Ocurrió un error inesperado.'
      if (errors) {
        errorMessage = Object.keys(errors).map(key => {
          return `${key}: ${errors[key].join(', ')}`
        }).join('; ')
      } else if (err?.response?.data?.message) {
        errorMessage = err.response.data.message
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
    selectedBranch,
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

  // Validaciones
  const allPaymentsValid = useMemo(() => {
    return payments
      .filter(p => p.amount && parseFloat(p.amount || '0') > 0)
      .every(p => p.payment_method_id)
  }, [payments])

  const hasCurrentAccountPayment = useMemo(() => {
    return payments.some(p => {
      const paymentMethod = paymentMethods.find(pm => pm.id.toString() === p.payment_method_id)
      return paymentMethod && paymentMethod.name === 'Cuenta Corriente' && parseFloat(p.amount || '0') > 0
    })
  }, [payments, paymentMethods])

  const currentAccountPaymentValid = !hasCurrentAccountPayment || selectedCustomer !== null

  const paid = useMemo(() => {
    return payments.reduce((sum, p) => sum + (parseFloat(p.amount || '0') || 0), 0)
  }, [payments])

  // Calcular monto pendiente explícitamente
  const pendingAmount = useMemo(() => {
    const paid = payments.reduce((sum, p) => sum + (parseFloat(p.amount || '0') || 0), 0)
    return roundToTwoDecimals(finalTotal - paid)
  }, [finalTotal, payments])

  const diff = useMemo(() => pendingAmount, [pendingAmount])

  const canConfirm = useMemo(() => {
    return cart.length > 0 &&
      receiptTypeId !== undefined &&
      diff === 0 &&
      allPaymentsValid &&
      currentAccountPaymentValid &&
      selectedBranch !== null
  }, [cart.length, receiptTypeId, diff, allPaymentsValid, currentAccountPaymentValid, selectedBranch])

  const handleCustomerSelect = useCallback((customer: CustomerOption) => {
    setSelectedCustomer(customer)
    setCustomerSearch(customer.name)
    setShowCustomerOptions(false)
  }, [setSelectedCustomer, setCustomerSearch, setShowCustomerOptions])

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

  if (initialCart.length === 0) {
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
                  />
                </div>
              </div>

              <div className="mt-6">
                <h3 className="font-semibold mb-2">Productos en la venta</h3>
                <p className="text-xs text-muted-foreground mb-2">
                  El precio unitario ingresado o editado se interpreta sin IVA. Los descuentos por ítem se aplican antes del IVA, el descuento global se aplica sobre el total con IVA. Cálculo con hasta 2 decimales.
                </p>

                <div className="overflow-x-auto">
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
                        const base = roundToTwoDecimals((item.price || 0) * item.quantity)
                        const itemDiscRaw = item.discount_type === 'percent'
                          ? roundToTwoDecimals(base * ((item.discount_value || 0) / 100))
                          : roundToTwoDecimals(Number(item.discount_value || 0))
                        const safeDisc = Math.max(0, Math.min(itemDiscRaw, base))
                        const net = roundToTwoDecimals(base - safeDisc)
                        const iva = roundToTwoDecimals(net * ((item.iva_rate || 0) / 100))
                        const tot = roundToTwoDecimals(net + iva)
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
                                  setCart((prev) => prev.map((ci, i) =>
                                    i === idx
                                      ? { ...ci, discount_type: v as 'percent' | 'amount', discount_value: ci.discount_value ?? 0 }
                                      : ci
                                  ))
                                }}
                                disabled={!hasPermission('aplicar_descuentos')}
                              >
                                <SelectTrigger className="w-[130px]">
                                  <SelectValue placeholder="Tipo" />
                                </SelectTrigger>
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
                                step={0.01}
                                placeholder={item.discount_type === 'percent' ? '0.00' : '0.00'}
                                value={item.discount_value?.toString() || ''}
                                onChange={(e) => {
                                  const val = e.target.value
                                  setCart((prev) => prev.map((ci, i) =>
                                    i === idx
                                      ? { ...ci, discount_value: val === '' ? undefined : Number(val) }
                                      : ci
                                  ))
                                }}
                                disabled={!hasPermission('aplicar_descuentos')}
                              />
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button variant="outline" onClick={() => navigate("/dashboard/pos")}>
                  Cancelar
                </Button>
                <CashRegisterProtectedButton
                  branchId={Number(selectedBranch?.id) || 1}
                  operationName="realizar ventas"
                >
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
    </ProtectedRoute>
  )
}
