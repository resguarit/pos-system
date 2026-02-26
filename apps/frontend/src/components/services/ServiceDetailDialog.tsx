import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ArrowLeft, Pencil, DollarSign, Calendar, RefreshCw, Save, Trash2, X, AlertCircle } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Customer, Service, Payment } from "./types"
import { getServicePaymentStatus } from "@/utils/servicePaymentStatus"
import { getServiceIcon, getServiceStatusBadge, getCustomerInitial, getInitialColor } from "./utils"

interface ServiceEditForm {
    amount: string
    base_price: string
    discount_percentage: string
    discount_notes: string
    billing_cycle: string
    status: string
    next_due_date: string
    description: string
}

interface ServiceDetailDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    serviceEditMode: boolean
    onCancelEdit: () => void
    selectedCustomer: Customer | null
    selectedService: Service | null
    serviceEditForm: ServiceEditForm
    setServiceEditForm: React.Dispatch<React.SetStateAction<ServiceEditForm>>
    servicePayments: Payment[]
    servicePaymentsLoading: boolean
    calculateEditDiscountedPrice: () => number
    handleBillingCycleChange: (newCycle: string) => void
    handleDeleteService: () => void
    serviceEditLoading: boolean
    handleSaveServiceEdit: () => void
    onEnterServiceEditMode: () => void
    onOpenPaymentDialog: (customer: Customer, serviceId: number) => void
    onBackToCustomerDetail: () => void
}

export function ServiceDetailDialog({
    open,
    onOpenChange,
    serviceEditMode,
    onCancelEdit,
    selectedCustomer,
    selectedService,
    serviceEditForm,
    setServiceEditForm,
    servicePayments,
    servicePaymentsLoading,
    calculateEditDiscountedPrice,
    handleBillingCycleChange,
    handleDeleteService,
    serviceEditLoading,
    handleSaveServiceEdit,
    onEnterServiceEditMode,
    onOpenPaymentDialog,
    onBackToCustomerDetail
}: ServiceDetailDialogProps) {

    if (!selectedCustomer || !selectedService) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="-ml-2 h-8 w-8 text-gray-500 hover:text-gray-900"
                                onClick={() => {
                                    if (serviceEditMode) {
                                        onCancelEdit()
                                    } else {
                                        onBackToCustomerDetail()
                                    }
                                }}
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            {selectedService && getServiceIcon(selectedService.name)}
                            <span>{serviceEditMode ? 'Editar Servicio' : 'Detalle del Servicio'}</span>
                        </div>
                        {!serviceEditMode && selectedService && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onEnterServiceEditMode}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                                <Pencil className="h-4 w-4 mr-1" />
                                Editar
                            </Button>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        {serviceEditMode ? 'Modifica los datos del servicio' : 'Detalles y gestión del servicio'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Customer Mini Header */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${getInitialColor(getCustomerInitial(selectedCustomer.person.first_name, selectedCustomer.person.last_name))} font-semibold text-sm`}>
                            {getCustomerInitial(selectedCustomer.person.first_name, selectedCustomer.person.last_name)}
                        </div>
                        <div>
                            <p className="font-medium text-sm">{selectedCustomer.person.first_name} {selectedCustomer.person.last_name}</p>
                            {selectedCustomer.person.email && (
                                <p className="text-xs text-gray-500">{selectedCustomer.person.email}</p>
                            )}
                        </div>
                    </div>

                    {serviceEditMode ? (
                        /* EDIT MODE */
                        <div className="space-y-4">
                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-medium text-sm text-blue-800 flex items-center gap-2">
                                        <Pencil className="h-4 w-4" />
                                        Editando: {selectedService.name}
                                    </h4>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Description */}
                                    <div className="col-span-2 space-y-1.5">
                                        <Label className="text-xs">Descripción del Servicio</Label>
                                        <Textarea
                                            placeholder="Ej: Detalle adicional del servicio..."
                                            value={serviceEditForm.description}
                                            onChange={(e) => setServiceEditForm(prev => ({ ...prev, description: e.target.value }))}
                                            rows={2}
                                            className="resize-none"
                                        />
                                    </div>

                                    {/* Base Price */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Precio Base</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                className="pl-7"
                                                value={serviceEditForm.base_price}
                                                onChange={(e) => setServiceEditForm(prev => ({ ...prev, base_price: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    {/* Discount Percentage */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Descuento (%)</Label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                step="1"
                                                min="0"
                                                max="100"
                                                className="pr-7"
                                                value={serviceEditForm.discount_percentage}
                                                onChange={(e) => setServiceEditForm(prev => ({ ...prev, discount_percentage: e.target.value }))}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                                        </div>
                                    </div>

                                    {/* Final Price Preview */}
                                    <div className="col-span-2 p-3 bg-white rounded-lg border">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">Precio Final:</span>
                                            <span className="text-lg font-bold text-green-600">
                                                ${calculateEditDiscountedPrice().toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Discount Notes */}
                                    <div className="col-span-2 space-y-1.5">
                                        <Label className="text-xs">Nota de Descuento</Label>
                                        <Textarea
                                            placeholder="Ej: Descuento por pronto pago..."
                                            value={serviceEditForm.discount_notes}
                                            onChange={(e) => setServiceEditForm(prev => ({ ...prev, discount_notes: e.target.value }))}
                                            rows={2}
                                            className="resize-none"
                                        />
                                    </div>

                                    {/* Billing Cycle */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Ciclo de Facturación</Label>
                                        <Select
                                            value={serviceEditForm.billing_cycle}
                                            onValueChange={handleBillingCycleChange}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="monthly">Mensual</SelectItem>
                                                <SelectItem value="quarterly">Trimestral</SelectItem>
                                                <SelectItem value="annual">Anual</SelectItem>
                                                <SelectItem value="biennial">Bienal (2 años)</SelectItem>
                                                <SelectItem value="one_time">Único</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {serviceEditForm.billing_cycle !== selectedService.billing_cycle && (
                                            <p className="text-xs text-blue-600 mt-1">
                                                ⓘ Se recalculará la fecha de vencimiento
                                            </p>
                                        )}
                                    </div>

                                    {/* Status */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Estado</Label>
                                        <Select
                                            value={serviceEditForm.status}
                                            onValueChange={(value) => setServiceEditForm(prev => ({ ...prev, status: value }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="active">Activo</SelectItem>
                                                <SelectItem value="cancelled">Cancelado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Next Due Date */}
                                    <div className="col-span-2 space-y-1.5">
                                        <Label className="text-xs">Próximo Vencimiento</Label>
                                        <Input
                                            type="date"
                                            value={serviceEditForm.next_due_date ? serviceEditForm.next_due_date.split('T')[0] : ''}
                                            onChange={(e) => setServiceEditForm(prev => ({ ...prev, next_due_date: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Edit Actions */}
                            <div className="flex items-center justify-between pt-2 border-t">
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleDeleteService}
                                    disabled={serviceEditLoading}
                                >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Eliminar
                                </Button>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={onCancelEdit}
                                        disabled={serviceEditLoading}
                                    >
                                        <X className="h-4 w-4 mr-1" />
                                        Cancelar
                                    </Button>
                                    <Button
                                        onClick={handleSaveServiceEdit}
                                        disabled={serviceEditLoading}
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        {serviceEditLoading ? (
                                            <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                                        ) : (
                                            <Save className="h-4 w-4 mr-1" />
                                        )}
                                        Guardar
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* VIEW MODE */
                        <>
                            {/* Service Info Card */}
                            <div className="space-y-4">
                                <div className="flex items-start justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                                    <div className="flex items-start gap-4">
                                        <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${getServicePaymentStatus(selectedService) === 'active' ? 'bg-green-100 text-green-600' :
                                            getServicePaymentStatus(selectedService) === 'due_soon' ? 'bg-yellow-100 text-yellow-600' :
                                                getServicePaymentStatus(selectedService) === 'expired' ? 'bg-red-100 text-red-600' :
                                                    'bg-gray-100 text-gray-400'
                                            }`}>
                                            {getServiceIcon(selectedService.name)}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg text-gray-900">{selectedService.service_type?.name || selectedService.name}</h3>
                                            {selectedService.description && (
                                                <p className="text-sm text-gray-600 mt-1 italic">
                                                    {selectedService.description}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge className={getServiceStatusBadge(getServicePaymentStatus(selectedService)).className}>
                                                    {getServiceStatusBadge(getServicePaymentStatus(selectedService)).label}
                                                </Badge>
                                                <span className="text-xs text-gray-500">
                                                    {selectedService.billing_cycle === 'monthly' ? 'Mensual' :
                                                        selectedService.billing_cycle === 'quarterly' ? 'Trimestral' :
                                                            selectedService.billing_cycle === 'annual' ? 'Anual' :
                                                                selectedService.billing_cycle === 'biennial' ? 'Bienal' : 'Único'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-gray-900">
                                            ${parseFloat(selectedService.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                        </p>
                                        {selectedService.discount_percentage && parseFloat(selectedService.discount_percentage) > 0 && (
                                            <div className="flex items-center gap-2 justify-end mt-1">
                                                <span className="text-xs text-gray-400 line-through">
                                                    ${parseFloat(selectedService.base_price || selectedService.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                                </span>
                                                <Badge variant="secondary" className="bg-green-50 text-green-700 text-[10px]">
                                                    -{parseFloat(selectedService.discount_percentage).toFixed(0)}%
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Service Details Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <p className="text-xs text-gray-500 mb-1">Próximo Vencimiento</p>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-gray-400" />
                                            <p className="font-medium text-sm">
                                                {selectedService.next_due_date
                                                    ? format(new Date(selectedService.next_due_date), "dd/MM/yyyy", { locale: es })
                                                    : selectedService.billing_cycle === 'one_time' ? 'Pagado' : 'Sin fecha'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <p className="text-xs text-gray-500 mb-1">Estado del Servicio</p>
                                        <p className="font-medium text-sm capitalize">
                                            {selectedService.status === 'active' ? 'Activo' : 'Inactivo'}
                                        </p>
                                    </div>
                                </div>

                                {/* Discount Notes */}
                                {selectedService.discount_notes && (
                                    <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                                        <p className="text-xs text-green-700 font-medium mb-1">Nota de descuento:</p>
                                        <p className="text-sm text-green-800">{selectedService.discount_notes}</p>
                                    </div>
                                )}
                            </div>

                            {/* Payment History */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                                        <DollarSign className="h-4 w-4" />
                                        Historial de Pagos
                                    </h4>
                                    <span className="text-xs text-gray-500">
                                        {servicePayments.length} pago(s)
                                    </span>
                                </div>

                                {servicePaymentsLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
                                    </div>
                                ) : servicePayments.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                        <AlertCircle className="h-8 w-8 text-gray-300 mb-2" />
                                        <p className="text-sm text-gray-500">No hay pagos registrados</p>
                                        <p className="text-xs text-gray-400 mt-1">Registrá un pago para este servicio</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {servicePayments.map((payment) => (
                                            <div key={payment.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100">
                                                        <DollarSign className="h-4 w-4 text-green-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-sm text-gray-900">
                                                            ${parseFloat(payment.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {format(new Date(payment.payment_date), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                                                        </p>
                                                    </div>
                                                </div>
                                                {payment.notes && (
                                                    <p className="text-xs text-gray-500 max-w-[150px] truncate" title={payment.notes}>
                                                        {payment.notes}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <Button
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                >
                                    Cerrar
                                </Button>
                                <Button
                                    className="bg-violet-600 hover:bg-violet-700 text-white"
                                    onClick={() => onOpenPaymentDialog(selectedCustomer, selectedService.id)}
                                >
                                    <DollarSign className="h-4 w-4 mr-2" />
                                    Registrar Pago
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
