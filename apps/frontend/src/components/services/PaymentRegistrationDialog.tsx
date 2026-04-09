import { ArrowLeft, DollarSign, CreditCard, Building2, RefreshCw } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Customer, Branch, PaymentMethod, ClientService } from "./types"
import { useEffect, useMemo, useState } from "react"
import { DateInputDmy } from "@/components/ui/date-input-dmy"

interface PaymentForm {
    service_id: string
    amount: string
    payment_date: string
    notes: string
    renew_service: boolean
    branch_id: string
    payment_method_id: string
}

interface PaymentRegistrationDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    paymentCustomer: Customer | null
    userBranches: Branch[]
    paymentMethods: PaymentMethod[]
    paymentForm: PaymentForm
    setPaymentForm: React.Dispatch<React.SetStateAction<PaymentForm>>
    paymentLoading: boolean
    handleRegisterPayment: () => void
}

export function PaymentRegistrationDialog({
    open,
    onOpenChange,
    paymentCustomer,
    userBranches,
    paymentMethods,
    paymentForm,
    setPaymentForm,
    paymentLoading,
    handleRegisterPayment
}: PaymentRegistrationDialogProps) {
    const IVA_RATE = 0.21

    const parseAmount = (value: string | number | null | undefined): number | null => {
        if (value === null || value === undefined) return null
        const n = typeof value === "string" ? parseFloat(value) : value
        return Number.isFinite(n) ? n : null
    }

    const formatAmount = (n: number): string => {
        // keep the raw input as string for <input type="number" />
        return (Math.round(n * 100) / 100).toFixed(2)
    }

    const computeAmountForService = (service: ClientService | undefined | null, chargeWithIva: boolean): string => {
        if (!service) return ""

        const withoutIva = parseAmount(service.amount_without_iva) ?? parseAmount(service.amount) ?? 0
        const withIva =
            parseAmount(service.amount_with_iva) ??
            (Number.isFinite(withoutIva) ? withoutIva * (1 + IVA_RATE) : null)

        const chosen = chargeWithIva ? (withIva ?? withoutIva) : withoutIva
        return formatAmount(chosen)
    }

    const defaultChargeWithIva = useMemo(() => {
        return Boolean(paymentCustomer?.services_charge_with_iva_default)
    }, [paymentCustomer?.services_charge_with_iva_default])

    const [chargeWithIva, setChargeWithIva] = useState(defaultChargeWithIva)

    // When changing customer (or opening dialog for a different customer), reset the default toggle.
    useEffect(() => {
        setChargeWithIva(defaultChargeWithIva)
    }, [defaultChargeWithIva])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] sm:w-full sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="-ml-2 h-8 w-8"
                                onClick={() => onOpenChange(false)}
                                aria-label="Volver"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <CreditCard className="h-5 w-5 text-violet-600" />
                            <span>Registrar Pago</span>
                        </div>
                    </DialogTitle>
                    <DialogDescription>
                        {paymentCustomer && `Registrar pago para ${paymentCustomer.person.first_name} ${paymentCustomer.person.last_name ?? ""}`.trim()}
                    </DialogDescription>
                </DialogHeader>

                {paymentCustomer && (
                    <div className="py-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Branch Selector - only show if user has multiple branches */}
                            {userBranches.length > 1 && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="branch">Sucursal</Label>
                                    <Select
                                        value={paymentForm.branch_id}
                                        onValueChange={(value) => setPaymentForm(prev => ({ ...prev, branch_id: value }))}
                                    >
                                        <SelectTrigger>
                                            <Building2 className="h-4 w-4 mr-2 text-gray-500" />
                                            <SelectValue placeholder="Seleccionar sucursal" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {userBranches.map((branch) => (
                                                <SelectItem key={branch.id} value={branch.id.toString()}>
                                                    {branch.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Service Selector */}
                            <div className={`space-y-1.5 ${userBranches.length > 1 ? "" : "sm:col-span-2"}`}>
                                <Label htmlFor="service">Servicio</Label>
                                <Select
                                    value={paymentForm.service_id}
                                    onValueChange={(value) => {
                                        const service = paymentCustomer.client_services?.find((s: ClientService) => s.id.toString() === value)
                                        setPaymentForm(prev => ({
                                            ...prev,
                                            service_id: value,
                                            amount: computeAmountForService(service, chargeWithIva)
                                        }))
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar servicio" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {paymentCustomer.client_services?.map((service: ClientService) => (
                                            <SelectItem key={service.id} value={service.id.toString()}>
                                                {service.name} - ${parseFloat(service.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* IVA mode */}
                            <div className="space-y-1.5 sm:col-span-2">
                                <div className="flex items-center justify-between">
                                    <Label>Cobrar</Label>
                                    <span className="text-xs text-gray-500">Default según cliente</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        aria-pressed={!chargeWithIva}
                                        className={!chargeWithIva ? "border-violet-600 bg-violet-600 text-white hover:bg-violet-700 hover:text-white" : ""}
                                        onClick={() => {
                                            setChargeWithIva(false)
                                            const service = paymentCustomer.client_services?.find((s: ClientService) => s.id.toString() === paymentForm.service_id)
                                            setPaymentForm(prev => ({
                                                ...prev,
                                                amount: computeAmountForService(service, false)
                                            }))
                                        }}
                                    >
                                        Sin IVA
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        aria-pressed={chargeWithIva}
                                        className={chargeWithIva ? "border-violet-600 bg-violet-600 text-white hover:bg-violet-700 hover:text-white" : ""}
                                        onClick={() => {
                                            setChargeWithIva(true)
                                            const service = paymentCustomer.client_services?.find((s: ClientService) => s.id.toString() === paymentForm.service_id)
                                            setPaymentForm(prev => ({
                                                ...prev,
                                                amount: computeAmountForService(service, true)
                                            }))
                                        }}
                                    >
                                        Con IVA (21%)
                                    </Button>
                                </div>
                            </div>

                            {/* Amount */}
                            <div className="space-y-1.5">
                                <Label htmlFor="amount">Monto</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                    <Input
                                        id="amount"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="pl-7"
                                        placeholder="0.00"
                                        value={paymentForm.amount}
                                        onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {/* Payment Date */}
                            <div className="space-y-1.5">
                                <Label htmlFor="payment_date">Fecha</Label>
                                <DateInputDmy
                                    id="payment_date"
                                    value={paymentForm.payment_date}
                                    onChange={(nextIso) => setPaymentForm(prev => ({ ...prev, payment_date: nextIso }))}
                                    aria-label="Fecha de pago"
                                />
                            </div>

                            {/* Payment Method Selector */}
                            <div className="space-y-1.5">
                                <Label htmlFor="payment_method">Método</Label>
                                <Select
                                    value={paymentForm.payment_method_id}
                                    onValueChange={(value) => setPaymentForm(prev => ({ ...prev, payment_method_id: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar método" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {paymentMethods.map((method) => (
                                            <SelectItem key={method.id} value={method.id.toString()}>
                                                {method.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Renew Service Checkbox */}
                            <div className="space-y-1.5 sm:col-span-2">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="renew_service"
                                        checked={paymentForm.renew_service}
                                        onCheckedChange={(checked) => setPaymentForm(prev => ({ ...prev, renew_service: checked as boolean }))}
                                    />
                                    <Label htmlFor="renew_service" className="text-sm font-normal cursor-pointer">
                                        Renovar servicio
                                    </Label>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="space-y-1.5 sm:col-span-2">
                                <Label htmlFor="notes">Notas</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Agregar notas sobre el pago..."
                                    value={paymentForm.notes}
                                    onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                                    className="resize-none"
                                    rows={2}
                                />
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={paymentLoading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleRegisterPayment}
                        disabled={paymentLoading || !paymentForm.service_id || !paymentForm.amount}
                        className="bg-violet-600 hover:bg-violet-700 text-white"
                    >
                        {paymentLoading ? (
                            <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Procesando...
                            </>
                        ) : (
                            <>
                                <DollarSign className="h-4 w-4 mr-2" />
                                Registrar Pago
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
