import { format } from "date-fns"
import { es } from "date-fns/locale"
import { DollarSign, Calendar, AlertCircle, User, Mail, Phone, Layers, Pencil, X, Unlink, RefreshCw } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Customer, Service } from "./types"
import { getServicePaymentStatus } from "@/utils/servicePaymentStatus"
import { calculateMonthlyCost } from "@/utils/serviceUtils"
import { getBillingCycleLabel } from "@/utils/billingCycleUtils"
import { getServiceIcon, getServiceStatusBadge, getCustomerInitial, getInitialColor } from "./utils"

interface CustomerDetailDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    customer: Customer | null
    onViewServiceDetail: (customer: Customer, service: Service) => void
    onEnterServiceEditMode: (customer: Customer, service: Service) => void
    onUnlinkService: (serviceId: number) => void
    unlinkConfirmId: number | null
    onCancelUnlink: () => void
}

export function CustomerDetailDialog({
    open,
    onOpenChange,
    customer,
    onViewServiceDetail,
    onEnterServiceEditMode,
    onUnlinkService,
    unlinkConfirmId,
    onCancelUnlink,
}: CustomerDetailDialogProps) {
    if (!customer) return null;

    const initial = getCustomerInitial(customer.person.first_name, customer.person.last_name)
    const colorClass = getInitialColor(initial)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <User className="h-5 w-5 text-blue-600" />
                        Detalle del Cliente
                    </DialogTitle>
                    <DialogDescription>
                        Información completa del cliente y sus servicios contratados
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Customer Info Header */}
                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                        <div className={`flex h-14 w-14 items-center justify-center rounded-full ${colorClass} font-bold text-lg shadow-md`}>
                            {initial}
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-lg text-gray-900">
                                {customer.person.first_name} {customer.person.last_name}
                            </h3>
                            <div className="flex flex-wrap gap-3 text-sm text-gray-600 mt-1">
                                {customer.person.email && (
                                    <span className="flex items-center gap-1">
                                        <Mail className="h-3.5 w-3.5" />
                                        {customer.person.email}
                                    </span>
                                )}
                                {customer.person.phone && (
                                    <span className="flex items-center gap-1">
                                        <Phone className="h-3.5 w-3.5" />
                                        {customer.person.phone}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500 mb-1">Servicios activos</p>
                            <p className="text-2xl font-bold text-blue-600">
                                {customer.client_services?.filter(s => s.status === 'active').length || 0}
                            </p>
                        </div>
                    </div>

                    {/* Services List */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                                <Layers className="h-4 w-4" />
                                Servicios Asignados
                            </h4>
                            <span className="text-xs text-gray-500">
                                {customer.client_services?.length || 0} servicio(s)
                            </span>
                        </div>

                        {!customer.client_services || customer.client_services.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                <AlertCircle className="h-10 w-10 text-gray-300 mb-3" />
                                <p className="text-sm text-gray-500 font-medium">Sin servicios asignados</p>
                                <p className="text-xs text-gray-400 mt-1">Asigna un servicio a este cliente para comenzar</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {customer.client_services.map((service) => {
                                    const paymentStatus = getServicePaymentStatus(service)
                                    const statusBadge = getServiceStatusBadge(paymentStatus)
                                    const hasDiscount = service.discount_percentage && parseFloat(service.discount_percentage) > 0

                                    return (
                                        <div
                                            key={service.id}
                                            className={`p-4 rounded-xl border transition-all hover:shadow-sm ${paymentStatus === 'due_soon'
                                                ? 'bg-yellow-50 border-yellow-200 hover:border-yellow-300'
                                                : paymentStatus === 'active'
                                                    ? 'bg-green-50 border-green-200 hover:border-green-300'
                                                    : paymentStatus === 'expired'
                                                        ? 'bg-red-50 border-red-200 hover:border-red-300'
                                                        : 'bg-white border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                {/* Service Icon & Name */}
                                                <div className="flex items-start gap-3 flex-1">
                                                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${paymentStatus === 'active' ? 'bg-green-100 text-green-600' :
                                                        paymentStatus === 'due_soon' ? 'bg-yellow-100 text-yellow-600' :
                                                            paymentStatus === 'expired' ? 'bg-red-100 text-red-600' :
                                                                'bg-gray-100 text-gray-400'
                                                        }`}>
                                                        {getServiceIcon(service.name)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h5 className="font-semibold text-sm text-gray-900">{service.service_type?.name || service.name}</h5>
                                                            <Badge className={statusBadge.className}>
                                                                {statusBadge.label}
                                                            </Badge>
                                                            {service.service_type && service.billing_cycle !== service.service_type.billing_cycle && (
                                                                <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200" title={`El ciclo original es ${getBillingCycleLabel(service.service_type.billing_cycle)}`}>
                                                                    Ciclo Personalizado
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        {service.description && (
                                                            <p className="text-xs text-gray-600 mt-1.5 italic">
                                                                {service.description}
                                                            </p>
                                                        )}
                                                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                                                            <span className="flex items-center gap-1">
                                                                <RefreshCw className="h-3 w-3" />
                                                                {getBillingCycleLabel(service.billing_cycle)}
                                                            </span>
                                                            {service.next_due_date && (
                                                                <span className="flex items-center gap-1">
                                                                    <Calendar className="h-3 w-3" />
                                                                    Vence: {format(new Date(service.next_due_date), "dd/MM/yyyy", { locale: es })}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Price & Discount Info */}
                                                <div className="text-right shrink-0">
                                                    <div className="flex items-baseline gap-2 justify-end">
                                                        <span className="text-lg font-bold text-gray-900">
                                                            ${parseFloat(service.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                                        </span>
                                                        {hasDiscount && (
                                                            <span className="text-xs text-gray-400 line-through">
                                                                ${parseFloat(service.base_price || service.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {hasDiscount && (
                                                        <div className="flex items-center gap-1 justify-end mt-0.5">
                                                            <Badge variant="secondary" className="bg-green-50 text-green-700 text-[10px] px-1.5 py-0">
                                                                -{parseFloat(service.discount_percentage || '0').toFixed(0)}% desc.
                                                            </Badge>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Discount Notes */}
                                            {service.discount_notes && (
                                                <div className="mt-2 pt-2 border-t border-gray-100">
                                                    <p className="text-xs text-gray-500 italic">
                                                        <span className="font-medium">Nota de descuento:</span> {service.discount_notes}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Last Payment Info + Edit Button */}
                                            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                                                        <span className="text-xs text-gray-500">Último pago:</span>
                                                    </div>
                                                    {service.last_payment ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-medium text-gray-700">
                                                                ${parseFloat(service.last_payment.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                                            </span>
                                                            <span className="text-xs text-gray-500">
                                                                el {format(new Date(service.last_payment.payment_date), "dd/MM/yyyy", { locale: es })}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">Sin pagos registrados</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                        onClick={() => {
                                                            onOpenChange(false)
                                                            onViewServiceDetail(customer, service)
                                                            setTimeout(() => onEnterServiceEditMode(customer, service), 100)
                                                        }}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5 mr-1" />
                                                        Editar
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => onUnlinkService(service.id)}
                                                        className={unlinkConfirmId === service.id ? "text-red-600 bg-red-50 hover:bg-red-100 font-medium" : "text-red-600 hover:text-red-700 hover:bg-red-50"}
                                                    >
                                                        {unlinkConfirmId === service.id ? (
                                                            <>
                                                                <AlertCircle className="h-3.5 w-3.5 mr-1" />
                                                                ¿Confirmar?
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Unlink className="h-3.5 w-3.5 mr-1" />
                                                                Desvincular
                                                            </>
                                                        )}
                                                    </Button>
                                                    {unlinkConfirmId === service.id && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-gray-400 hover:text-gray-600"
                                                            onClick={onCancelUnlink}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Summary Footer */}
                    {customer.client_services && customer.client_services.length > 0 && (
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <div className="flex items-center gap-6">
                                <div>
                                    <p className="text-xs text-gray-500">Total mensual estimado</p>
                                    <p className="text-lg font-bold text-gray-900">
                                        ${customer.client_services
                                            .filter(s => s.status === 'active')
                                            .reduce((acc, s) => acc + calculateMonthlyCost(s.amount, s.billing_cycle), 0)
                                            .toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {(() => {
                                    const activeServices = customer.client_services.filter(s => s.status === 'active')
                                    const expiredCount = activeServices.filter(s => getServicePaymentStatus(s) === 'expired').length
                                    const dueSoonCount = activeServices.filter(s => getServicePaymentStatus(s) === 'due_soon').length
                                    const upToDateCount = activeServices.filter(s => getServicePaymentStatus(s) === 'active').length

                                    return (
                                        <>
                                            {upToDateCount > 0 && (
                                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                                    {upToDateCount} al día
                                                </Badge>
                                            )}
                                            {dueSoonCount > 0 && (
                                                <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
                                                    {dueSoonCount} por vencer
                                                </Badge>
                                            )}
                                            {expiredCount > 0 && (
                                                <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                                                    {expiredCount} vencido(s)
                                                </Badge>
                                            )}
                                        </>
                                    )
                                })()}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
