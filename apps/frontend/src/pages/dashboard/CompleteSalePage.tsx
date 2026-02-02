import { useState, useEffect, useCallback, useMemo } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { formatCurrency, roundToTwoDecimals, extractProductId } from '@/utils/sale-calculations'
import { CustomerSearchSection } from "@/components/sale/CustomerSearchSection"
import { PaymentSection } from "@/components/sale/PaymentSection"
import { SaleSummarySection } from "@/components/sale/SaleSummarySection"
import { DebtAlertDialog } from "@/components/sale/DebtAlertDialog"
import type { PaymentMethod, ReceiptType, SaleData, SaleHeader } from '@/types/sale'
import { useAfip } from "@/hooks/useAfip"
import {
  INTERNAL_RECEIPT_CODES,
  getAllowedAfipCodesForPos,
  receiptTypeRequiresCustomerWithCuit,
  isValidCuitForAfip,
} from '@/utils/afipReceiptTypes'

const CART_STORAGE_KEY = 'pos_cart'

export default function CompleteSalePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { request } = useApi()
  const { selectedBranch, branches } = useBranch()
  const { user, hasPermission } = useAuth()

  // Obtener datos del carrito, branchId, convertedFromBudgetId y cliente desde location.state
  const initialCart = (location.state?.cart as CartItem[]) || []
  const stateBranchId = location.state?.branchId
  const convertedFromBudgetId = location.state?.convertedFromBudgetId as number | null | undefined
  const convertedFromBudgetCustomer = location.state?.convertedFromBudgetCustomer as {
    id: number
    name: string
    dni: string | null
    cuit: string | null
    fiscal_condition_id: number | null
    fiscal_condition_name: string | null
  } | null | undefined

  // Usar la sucursal del state si está disponible, sino usar la del contexto
  const activeBranch = stateBranchId
    ? branches.find(b => b.id === stateBranchId) || selectedBranch
    : selectedBranch

  // Si no hay sucursal activa (ej. entró directo), usar la primera para cargar tipos de comprobante
  const effectiveBranch = activeBranch || (branches?.length ? branches[0] : null)

  if (import.meta.env.DEV) {
    // Debug: verificar qué sucursal se está usando (solo en desarrollo)
    // eslint-disable-next-line no-console
    console.log('CompleteSalePage - Branch info:', {
      stateBranchId,
      activeBranchId: activeBranch?.id,
      effectiveBranchId: effectiveBranch?.id
    })
  }

  const { validateCashRegisterForOperation } = useCashRegisterStatus(Number(activeBranch?.id) || 1)
  const { checkCuitCertificate, getReceiptTypes: getAfipReceiptTypes } = useAfip()

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
  const [completedSale, setCompletedSale] = useState<SaleHeader | null>(null)
  const [globalDiscountType, setGlobalDiscountType] = useState<'percent' | 'amount' | ''>('')
  const [globalDiscountValue, setGlobalDiscountValue] = useState<string>('')
  const [customerBalance, setCustomerBalance] = useState<number | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)
  const [showDebtDialog, setShowDebtDialog] = useState(false)
  const [showChangeConfirmDialog, setShowChangeConfirmDialog] = useState(false)
  const [pendingChangeAmount, setPendingChangeAmount] = useState(0)
  const [lockedPaymentDiscount, setLockedPaymentDiscount] = useState<number | null>(null)
  /** Identidad fiscal elegida cuando el cliente tiene varios CUITs */
  const [selectedTaxIdentityId, setSelectedTaxIdentityId] = useState<number | null>(null)

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

  // Función para calcular el descuento real basado en montos ingresados
  const calculateRealDiscount = useCallback(() => {
    let totalDiscount = 0
    payments.forEach(p => {
      if (!p.payment_method_id) return
      const method = paymentMethods.find(pm => pm.id.toString() === p.payment_method_id)
      const rate = (method?.discount_percentage || 0) / 100
      if (rate <= 0) return
      const amount = parseFloat(p.amount || '0') || 0
      totalDiscount += amount * rate
    })
    return roundToTwoDecimals(totalDiscount)
  }, [payments, paymentMethods])

  // Calcular descuento anticipado (cuando hay métodos con descuento sin monto)
  const calculateAnticipatedDiscount = useCallback((paymentsOverride?: Array<{ payment_method_id: string; amount: string }>) => {
    const list = paymentsOverride ?? payments
    const discountedPayments = list.filter(p => {
      if (!p.payment_method_id) return false
      const method = paymentMethods.find(pm => pm.id.toString() === p.payment_method_id)
      return (method?.discount_percentage || 0) > 0
    })

    if (discountedPayments.length === 0) return 0

    // Calcular cuánto ya se pagó en métodos SIN descuento
    const paidWithoutDiscount = list.reduce((sum, p) => {
      if (!p.payment_method_id) return sum
      const method = paymentMethods.find(pm => pm.id.toString() === p.payment_method_id)
      if ((method?.discount_percentage || 0) > 0) return sum
      return sum + (parseFloat(p.amount || '0') || 0)
    }, 0)

    const remainingToPay = Math.max(total - paidWithoutDiscount, 0)

    // Aplicar el descuento más alto de los métodos seleccionados
    const maxRate = Math.max(...discountedPayments.map(p => {
      const method = paymentMethods.find(pm => pm.id.toString() === p.payment_method_id)
      return (method?.discount_percentage || 0) / 100
    }))

    return roundToTwoDecimals(remainingToPay * maxRate)
  }, [payments, paymentMethods, total])

  // El descuento efectivo es el bloqueado si existe, sino el anticipado inicial
  const totalPaymentDiscount = useMemo(() => {
    if (lockedPaymentDiscount !== null) {
      return lockedPaymentDiscount
    }
    // Sin descuento bloqueado, calcular anticipado
    return calculateAnticipatedDiscount()
  }, [lockedPaymentDiscount, calculateAnticipatedDiscount])

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

  // Cargar el cliente del presupuesto cuando se está convirtiendo
  // Se ejecuta solo una vez al montar si hay datos del cliente
  useEffect(() => {
    if (!convertedFromBudgetCustomer?.id) return

    // Mapear los datos del cliente del presupuesto al formato CustomerOption
    const customerOption: CustomerOption = {
      id: convertedFromBudgetCustomer.id,
      name: convertedFromBudgetCustomer.name || '',
      dni: convertedFromBudgetCustomer.dni,
      cuit: convertedFromBudgetCustomer.cuit,
      fiscal_condition_id: convertedFromBudgetCustomer.fiscal_condition_id,
      fiscal_condition_name: convertedFromBudgetCustomer.fiscal_condition_name,
    }

    setSelectedCustomer(customerOption)
    setCustomerSearch(convertedFromBudgetCustomer.name || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Solo ejecutar al montar - los datos vienen del state de navegación

  // Cargar métodos de pago y tipos de comprobante
  useEffect(() => {
    fetchPaymentMethods()
    fetchReceiptTypes()
  }, [effectiveBranch])

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
      const branch = effectiveBranch as any
      const branchCuitRaw = branch?.cuit
      const branchCuit = branchCuitRaw ? String(branchCuitRaw).replace(/\D/g, '') : ''
      const enabledReceiptTypes = branch?.enabled_receipt_types

      const appResponse = await request({ method: 'GET', url: '/receipt-types' })
      const allTypes = Array.isArray(appResponse) ? appResponse :
        Array.isArray(appResponse?.data?.data) ? appResponse.data.data :
          Array.isArray(appResponse?.data) ? appResponse.data : []

      const mappedTypes: ReceiptType[] = allTypes.map((item: any) => ({
        id: item.id,
        name: item.description || item.name,
        afip_code: item.afip_code || item.code || ''
      }))

      let availableTypes: ReceiptType[] = []
      const isInternalOnly = (t: ReceiptType) =>
        t.afip_code && INTERNAL_RECEIPT_CODES.includes(String(t.afip_code))

      if (!branchCuit || branchCuit.length !== 11) {
        availableTypes = mappedTypes.filter(isInternalOnly)
      } else {
        const certStatus = await checkCuitCertificate(branchCuit)

        if (!certStatus.has_certificate || !certStatus.is_valid) {
          availableTypes = mappedTypes.filter(isInternalOnly)
        } else if (enabledReceiptTypes?.length) {
          availableTypes = mappedTypes.filter((t) => enabledReceiptTypes.includes(t.id))
        } else {
          const afipTypes = await getAfipReceiptTypes(branchCuit)
          const allowedAfipCodes = getAllowedAfipCodesForPos(afipTypes ?? null)
          availableTypes = mappedTypes.filter(
            (t) => t.afip_code && allowedAfipCodes.has(String(t.afip_code))
          )
        }
      }

      // RESTRICCIÓN POR PERMISO: Si el usuario TIENE permiso solo_crear_presupuestos,
      // solo puede emitir Presupuestos (ID=1)
      // PERO: Si viene de una conversión de presupuesto, NO puede crear otro presupuesto
      const isRestrictedToBudgets = hasPermission('solo_crear_presupuestos')
      const isConvertingBudget = !!convertedFromBudgetId

      if (isConvertingBudget) {
        // Si estamos convirtiendo un presupuesto, excluir el tipo "Presupuesto" (016)
        // porque no tiene sentido crear otro presupuesto desde un presupuesto
        availableTypes = availableTypes.filter((t: ReceiptType) => t.afip_code !== '016')

        if (availableTypes.length === 0) {
          toast.error('No hay tipos de comprobante de venta disponibles para convertir este presupuesto')
        }
      } else if (isRestrictedToBudgets) {
        const presupuesto = availableTypes.find((t: ReceiptType) => t.afip_code === '016') // Presupuesto Code = 016
        if (presupuesto) {
          availableTypes = [presupuesto]
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
  }, [request, effectiveBranch, checkCuitCertificate, getAfipReceiptTypes, convertedFromBudgetId, hasPermission])

  const addPayment = useCallback(() => {
    // Recalcular y bloquear el descuento basado en los montos actuales
    const newDiscount = calculateRealDiscount()
    setLockedPaymentDiscount(newDiscount)
    setPayments(prev => [...prev, { payment_method_id: '', amount: '' }])
  }, [calculateRealDiscount])

  const removePayment = useCallback((idx: number) => {
    setPayments(prev => {
      const newPayments = prev.filter((_, i) => i !== idx)
      // Calcular usando la nueva lista filtrada
      const newDiscount = calculateAnticipatedDiscount(newPayments)
      setLockedPaymentDiscount(newDiscount)
      return newPayments
    })
  }, [calculateAnticipatedDiscount])

  const updatePayment = useCallback((idx: number, field: string, value: string) => {
    setPayments(prev => {
      const updated = prev.map((p, i) => i === idx ? { ...p, [field]: value } : p)
      // Si cambia el método de pago, calcular usando la lista 'updated' INMEDIATAMENTE
      if (field === 'payment_method_id') {
        const newDiscount = calculateAnticipatedDiscount(updated)
        setLockedPaymentDiscount(newDiscount)
      }
      return updated
    })
    // Si cambia el monto, NO recalculamos (el comportamiento original se mantiene)
  }, [calculateAnticipatedDiscount])


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

    const selectedReceiptType = receiptTypes.find((rt) => rt.id === receiptTypeId)
    const requiresCuit = receiptTypeRequiresCustomerWithCuit(selectedReceiptType?.afip_code)
    if (requiresCuit && !selectedCustomer) {
      toast.error('Factura A requiere cliente', {
        description: 'Seleccioná un cliente con CUIT para continuar.',
        duration: 5000,
      })
      return
    }
    if (requiresCuit && selectedCustomer && !isValidCuitForAfip(selectedCustomer.cuit)) {
      toast.error('Cliente sin CUIT válido', {
        description: 'El cliente debe tener un CUIT de 11 dígitos para Factura A.',
        duration: 5000,
      })
      return
    }

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

      const chosenIdentity = selectedTaxIdentityId && selectedCustomer?.tax_identities
        ? selectedCustomer.tax_identities.find((t) => t.id === selectedTaxIdentityId)
        : null
      const saleData: SaleData = {
        branch_id: Number(activeBranch.id),
        customer_id: selectedCustomer?.id || null,
        customer_tax_identity_id: chosenIdentity?.id ?? selectedTaxIdentityId ?? undefined,
        sale_document_number: (chosenIdentity?.cuit ?? selectedCustomer?.cuit ?? selectedCustomer?.dni)
          ? String(chosenIdentity?.cuit ?? selectedCustomer?.cuit ?? selectedCustomer?.dni)
          : null,
        receipt_type_id: receiptTypeId,
        sale_fiscal_condition_id: chosenIdentity?.fiscal_condition_id ?? selectedCustomer?.fiscal_condition_id ?? null,
        sale_date: argDateString,
        subtotal_net: subtotalNet,
        total_iva: totalIva,
        total: finalTotal,
        total_discount: Math.max(0, totalItemDiscount + globalDiscountAmount + totalPaymentDiscount),
        ...(globalDiscountType && Number(globalDiscountValue) > 0
          ? { discount_type: globalDiscountType, discount_value: Number(globalDiscountValue) }
          : {}),
        // Si viene de un presupuesto, incluir el ID para marcarlo como convertido
        ...(convertedFromBudgetId ? { converted_from_budget_id: convertedFromBudgetId } : {}),
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

      // Handle AFIP authorization result
      const afipAuth = (saleResponse as any)?.afip_authorization

      if (saleStatus === 'pending') {
        toast.info('Venta registrada - Pendiente de aprobación', {
          description: 'Tu venta ha sido registrada pero requiere aprobación de un supervisor antes de ser procesada. El stock y la caja no serán afectados hasta que sea aprobada.',
          duration: 8000,
        })
      } else if (afipAuth) {
        // Si se intentó autorizar con AFIP
        if (afipAuth.success && afipAuth.cae) {
          toast.success('¡Venta facturada con AFIP!', {
            description: `CAE: ${afipAuth.cae}`,
            duration: 6000,
          })
        } else if (afipAuth.success === false) {
          toast.warning('Venta guardada - Autorización AFIP pendiente', {
            description: afipAuth.error || 'Podrás autorizar la venta desde el historial de ventas.',
            duration: 8000,
          })
        } else {
          toast.success('¡Venta realizada con éxito!')
        }
      } else {
        toast.success('¡Venta realizada con éxito!')
      }

      try {
        const saleId = (saleResponse as any)?.id || (saleResponse as any)?.data?.id
        if (saleId) {
          const saleDetails = await request({
            method: 'GET',
            url: `/sales/${saleId}?include=items,customer,receipt_type,saleFiscalCondition,branch,saleIvas`
          })
          const normalizedSale = (saleDetails as any)?.data ?? saleDetails
          setCompletedSale(normalizedSale)

          localStorage.removeItem(CART_STORAGE_KEY)
          navigate("/dashboard/pos", { state: { completedSale: normalizedSale } })
          return
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
    receiptTypes,
    receiptTypeId,
    selectedCustomer,
    activeBranch,
    validateCashRegisterForOperation,
    user,
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
  const pendingAmount = useMemo(() => {
    const paid = payments.reduce((sum, p) => sum + (parseFloat(p.amount || '0') || 0), 0)
    return roundToTwoDecimals(finalTotal - paid)
  }, [finalTotal, payments])

  const diff = useMemo(() => pendingAmount, [pendingAmount])

  // Definir hasChange y changeAmount basado en diff
  const hasChange = useMemo(() => diff < 0, [diff])
  const changeAmount = useMemo(() => roundToTwoDecimals(Math.abs(diff)), [diff])

  // Detectar si HAY AL MENOS UN método de pago en Efectivo
  const hasCashPayment = useMemo(() => {
    return payments.some(p => {
      if (!p.payment_method_id) return false
      const paymentMethod = paymentMethods.find(pm => pm.id.toString() === p.payment_method_id)
      return paymentMethod?.name?.toLowerCase().includes('efectivo') ||
        paymentMethod?.name?.toLowerCase().includes('cash')
    })
  }, [payments, paymentMethods])

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
  }, [isProcessingSale, hasChange, changeAmount, processSale, diff, hasCashPayment, finalTotal])

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

  const selectedReceiptType = useMemo(
    () => receiptTypes.find((rt) => rt.id === receiptTypeId),
    [receiptTypes, receiptTypeId]
  )
  const requiresCustomerCuit = receiptTypeRequiresCustomerWithCuit(selectedReceiptType?.afip_code)
  const customerCuitValid = useMemo(() => {
    if (!requiresCustomerCuit) return true
    return selectedCustomer != null && isValidCuitForAfip(selectedCustomer.cuit)
  }, [requiresCustomerCuit, selectedCustomer])

  const canConfirm = useMemo(() => {
    // Validación básica
    if (cart.length === 0 || receiptTypeId === undefined || activeBranch === null) {
      return false
    }
    if (requiresCustomerCuit && !customerCuitValid) return false
    // Validar pagos
    if (!allPaymentsValid || !currentAccountPaymentValid) {
      return false
    }
    // Si el pago es exacto, permitir
    if (diff === 0) {
      return true
    }
    // Si hay cambio (diff < 0)
    if (diff < 0) {
      return hasCashPayment
    }
    return false
  }, [cart.length, receiptTypeId, activeBranch, requiresCustomerCuit, customerCuitValid, diff, allPaymentsValid, currentAccountPaymentValid, hasCashPayment])

  const confirmDisabledReason = useMemo(() => {
    if (cart.length === 0) return 'El carrito está vacío'
    if (receiptTypeId === undefined) return 'Debe seleccionar un tipo de comprobante'
    if (requiresCustomerCuit && !selectedCustomer) return 'Factura A requiere un cliente con CUIT'
    if (requiresCustomerCuit && selectedCustomer && !isValidCuitForAfip(selectedCustomer.cuit)) {
      return 'El cliente debe tener CUIT de 11 dígitos para Factura A'
    }
    if (diff > 0) return `Falta ${formatCurrency(diff)} para completar el pago`
    if (!allPaymentsValid) return 'Debe completar todos los métodos de pago'
    if (!currentAccountPaymentValid) return 'Debe seleccionar un cliente para usar Cuenta Corriente'
    if (activeBranch === null) return 'Debe seleccionar una sucursal'
    if (diff < 0 && !hasCashPayment) {
      const mainPaymentMethod = paymentMethods.find(pm => pm.id.toString() === payments[0]?.payment_method_id)
      return `${mainPaymentMethod?.name || 'Este método de pago'} requiere monto exacto. No se permite cambio.`
    }
    return ''
  }, [cart.length, receiptTypeId, requiresCustomerCuit, selectedCustomer, diff, allPaymentsValid, currentAccountPaymentValid, activeBranch, hasCashPayment, paymentMethods, payments])

  const handleCustomerSelect = useCallback((customer: CustomerOption) => {
    setSelectedCustomer(customer)
    setCustomerSearch(customer.name)
    setShowCustomerOptions(false)
    const defaultIdentityId = customer.tax_identities?.find((t) => t.is_default)?.id ?? customer.tax_identities?.[0]?.id ?? null
    setSelectedTaxIdentityId(defaultIdentityId ?? null)

    // Cargar el saldo del cliente
    if (customer.id) {
      setLoadingBalance(true)
      request({
        method: 'GET',
        url: `/customers/${customer.id}/current-account-balance`
      })
        .then((response) => {
          const balance = response?.balance ?? response?.data?.balance ?? 0
          setCustomerBalance(balance)

          // Mostrar alerta si tiene deuda
          if (balance > 0) {
            setShowDebtDialog(true)
          }
        })
        .catch((error) => {
          console.error('Error al cargar saldo del cliente:', error)
          setCustomerBalance(null)
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

  useEffect(() => {
    if (!selectedCustomer) setSelectedTaxIdentityId(null)
  }, [selectedCustomer])

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
                    selectedTaxIdentityId={selectedTaxIdentityId}
                    customerBalance={customerBalance}
                    loadingBalance={loadingBalance}
                    onSearchChange={setCustomerSearch}
                    onCustomerSelect={handleCustomerSelect}
                    onTaxIdentitySelect={(identity) => setSelectedTaxIdentityId(identity?.id ?? null)}
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
                  branchId={Number(activeBranch?.id) || 1}
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