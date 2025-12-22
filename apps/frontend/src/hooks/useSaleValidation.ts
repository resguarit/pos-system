
import { useMemo } from 'react'
import type { CartItem } from '@/types/combo'
import type { PaymentMethod } from '@/types/sale'
import { formatCurrency, roundToTwoDecimals } from '@/utils/sale-calculations'
import type { CustomerOption } from '@/hooks/useCustomerSearch'

interface UseSaleValidationProps {
    cart: CartItem[]
    receiptTypeId: number | undefined
    diff: number
    payments: Array<{ payment_method_id: string; amount: string }>
    paymentMethods: PaymentMethod[]
    activeBranch: any | null // Using any for Branch type as it's not strictly defined in snippets
    selectedCustomer: CustomerOption | null
}

export function useSaleValidation({
    cart,
    receiptTypeId,
    diff,
    payments,
    paymentMethods,
    activeBranch,
    selectedCustomer
}: UseSaleValidationProps) {

    // Detectar si HAY AL MENOS UN método de pago en Efectivo
    const hasCashPayment = useMemo(() => {
        return payments.some(p => {
            if (!p.payment_method_id) return false
            const paymentMethod = paymentMethods.find(pm => pm.id.toString() === p.payment_method_id)
            return paymentMethod?.name?.toLowerCase().includes('efectivo') ||
                paymentMethod?.name?.toLowerCase().includes('cash')
        })
    }, [payments, paymentMethods])

    // Definir hasChange y changeAmount basado en diff
    const hasChange = useMemo(() => diff < 0, [diff])
    const changeAmount = useMemo(() => roundToTwoDecimals(Math.abs(diff)), [diff])

    // Validaciones de pagos individuales
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

    const canConfirm = useMemo(() => {
        // Validación básica
        if (cart.length === 0 || receiptTypeId === undefined || activeBranch === null) {
            return false
        }

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
            // Solo permitir si hay método de Efectivo
            return hasCashPayment
        }

        // Si hay falta de pago (diff > 0), no permitir
        return false
    }, [cart.length, receiptTypeId, diff, allPaymentsValid, currentAccountPaymentValid, activeBranch, hasCashPayment])

    const confirmDisabledReason = useMemo(() => {
        if (cart.length === 0) return 'El carrito está vacío'
        if (receiptTypeId === undefined) return 'Debe seleccionar un tipo de comprobante'
        if (diff > 0) return `Falta ${formatCurrency(diff)} para completar el pago`
        if (!allPaymentsValid) return 'Debe completar todos los métodos de pago'
        if (!currentAccountPaymentValid) return 'Debe seleccionar un cliente para usar Cuenta Corriente'
        if (activeBranch === null) return 'Debe seleccionar una sucursal'
        if (diff < 0 && !hasCashPayment) {
            const mainPaymentMethod = paymentMethods.find(pm => pm.id.toString() === payments[0]?.payment_method_id)
            return `${mainPaymentMethod?.name || 'Este método de pago'} requiere monto exacto. No se permite cambio.`
        }
        return ''
    }, [cart.length, receiptTypeId, diff, allPaymentsValid, currentAccountPaymentValid, activeBranch, hasCashPayment, paymentMethods, payments])

    return {
        hasCashPayment,
        hasChange,
        changeAmount,
        allPaymentsValid,
        hasCurrentAccountPayment,
        canConfirm,
        confirmDisabledReason
    }
}
