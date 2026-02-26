import { Button } from "@/components/ui/button"
import { Eye, Pencil, MoreVertical, DollarSign } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Customer, Service, ServiceType } from "./types"
import {
    getServiceIcon,
    getAccountStatusSummary,
    getCustomerInitial,
    getInitialColor
} from "./utils"
import { getServicePaymentStatus } from "@/utils/servicePaymentStatus"
import { getBillingCycleLabel } from "@/utils/billingCycleUtils"

interface CustomerCardProps {
    customer: Customer
    allServiceTypes: ServiceType[]
    onViewCustomer: (customer: Customer) => void
    onOpenPaymentDialog: (customer: Customer) => void
    onViewServiceDetail: (customer: Customer, service: Service) => void
}

export function CustomerCard({
    customer,
    allServiceTypes,
    onViewCustomer,
    onOpenPaymentDialog,
    onViewServiceDetail,
}: CustomerCardProps) {
    const initial = getCustomerInitial(customer.person.first_name, customer.person.last_name)
    const colorClass = getInitialColor(initial)

    return (
        <div className="border rounded-lg p-3 hover:border-gray-400 hover:shadow-sm transition-all">
            <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${colorClass} font-semibold text-sm`}>
                            {initial}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base text-gray-900 truncate">
                                {customer.person.first_name} {customer.person.last_name}
                            </h3>
                            {customer.person.email && (
                                <p className="text-xs text-gray-500 mt-0.5 truncate">
                                    {customer.person.email}
                                </p>
                            )}
                        </div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => window.location.href = `/dashboard/clientes/${customer.id}/ver`}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Cliente
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.location.href = `/dashboard/clientes/${customer.id}/editar`}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar Cliente
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Service Icons Grid - All Service Types */}
                <div className="space-y-2.5">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado de Servicios</div>
                    <div className="grid grid-cols-4 gap-2.5">
                        {allServiceTypes.map((serviceType) => {
                            const assignedService = customer.client_services.find(s =>
                                (s.service_type?.id === serviceType.id) ||
                                (s.name === serviceType.name)
                            )

                            const paymentStatus = assignedService ? getServicePaymentStatus(assignedService) : null

                            const status = paymentStatus === 'active' ? 'paid' :
                                paymentStatus === 'due_soon' ? 'due_soon' :
                                    paymentStatus === 'inactive' ? 'inactive' :
                                        paymentStatus === 'expired' ? 'unpaid' : "not_assigned"

                            let statusClass = "bg-gray-100 text-gray-400"

                            if (status === "paid") {
                                statusClass = "bg-green-100 text-green-600"
                            } else if (status === "due_soon") {
                                statusClass = "bg-yellow-100 text-yellow-600"
                            } else if (status === "inactive") {
                                statusClass = "bg-gray-200 text-gray-600"
                            } else if (status === "unpaid") {
                                statusClass = "bg-red-100 text-red-600"
                            }

                            return (
                                <div
                                    key={serviceType.id}
                                    className={`flex flex-col items-center gap-2 transition-all ${assignedService ? 'cursor-pointer' : 'cursor-default opacity-60'}`}
                                    onClick={() => assignedService && onViewServiceDetail(customer, assignedService)}
                                    title={assignedService ? `Ver detalle de ${serviceType.name}` : `${serviceType.name} - No asignado`}
                                >
                                    <div className={`flex h-12 w-12 items-center justify-center rounded-full ${statusClass} transition-all ${assignedService ? 'hover:shadow-lg hover:scale-105' : ''}`}>
                                        {getServiceIcon(serviceType.name)}
                                    </div>
                                    <div className="text-center leading-tight">
                                        <p className="text-[11px] font-medium text-gray-700">{serviceType.name}</p>
                                        <p className="text-[10px] text-gray-500">
                                            {getBillingCycleLabel(assignedService?.billing_cycle || serviceType.billing_cycle)}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Account Status + Actions aligned */}
                <div className="pt-3 flex items-center justify-between gap-3">
                    {(() => {
                        const { label, color, dotColor: dotBaseClass } = getAccountStatusSummary(customer.client_services)
                        // Ensure bg color maps safely from generic dotColor
                        const dotClass = dotBaseClass || "bg-gray-400"

                        return (
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-semibold text-gray-500">Estado de la cuenta</span>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`}></span>
                                    <span className={`font-medium ${color}`}>{label}</span>
                                </div>
                            </div>
                        )
                    })()}

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                            onClick={() => onOpenPaymentDialog(customer)}
                            aria-label="Registrar pago"
                        >
                            <DollarSign className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => onViewCustomer(customer)}
                            aria-label="Ver detalles"
                        >
                            <Eye className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
