import { DollarSign, CreditCard, Building2, RefreshCw } from "lucide-react"
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
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-violet-600" />
                        Registrar Pago
                    </DialogTitle>
                    <DialogDescription>
                        {paymentCustomer && `Registrar pago para ${paymentCustomer.person.first_name} ${paymentCustomer.person.last_name}`}
                    </DialogDescription>
                </DialogHeader>

                {paymentCustomer && (
                    <div className="space-y-4 py-4">
                        {/* Branch Selector - only show if user has multiple branches */}
                        {userBranches.length > 1 && (
                            <div className="space-y-2">
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
                        <div className="space-y-2">
                            <Label htmlFor="service">Servicio</Label>
                            <Select
                                value={paymentForm.service_id}
                                onValueChange={(value) => {
                                    const service = paymentCustomer.client_services?.find((s: ClientService) => s.id.toString() === value)
                                    setPaymentForm(prev => ({
                                        ...prev,
                                        service_id: value,
                                        amount: service?.amount || ""
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

                        {/* Amount */}
                        <div className="space-y-2">
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
                            <p className="text-xs text-gray-500">Puede ingresar un monto parcial si es necesario</p>
                        </div>

                        {/* Payment Date */}
                        <div className="space-y-2">
                            <Label htmlFor="payment_date">Fecha de Pago</Label>
                            <Input
                                id="payment_date"
                                type="date"
                                value={paymentForm.payment_date}
                                onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_date: e.target.value }))}
                            />
                        </div>

                        {/* Payment Method Selector */}
                        <div className="space-y-2">
                            <Label htmlFor="payment_method">Método de Pago</Label>
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

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notas (opcional)</Label>
                            <Textarea
                                id="notes"
                                placeholder="Agregar notas sobre el pago..."
                                value={paymentForm.notes}
                                onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                                className="resize-none"
                                rows={2}
                            />
                        </div>

                        {/* Renew Service Checkbox */}
                        <div className="flex items-center space-x-2 pt-2">
                            <Checkbox
                                id="renew_service"
                                checked={paymentForm.renew_service}
                                onCheckedChange={(checked) => setPaymentForm(prev => ({ ...prev, renew_service: checked as boolean }))}
                            />
                            <Label htmlFor="renew_service" className="text-sm font-normal cursor-pointer">
                                Renovar servicio después del pago
                            </Label>
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
