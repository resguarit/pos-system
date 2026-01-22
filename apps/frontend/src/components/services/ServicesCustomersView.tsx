"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, RefreshCw, Globe, Lock, Server, Wrench, Users, Eye, Edit, MoreVertical, DollarSign, Calendar, AlertCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import Pagination from "@/components/ui/pagination"
import api from "@/lib/api"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"

interface Service {
    id: number
    name: string
    status: string
    next_due_date: string | null
    billing_cycle: string
    amount: string
}

interface Customer {
    id: number
    person: {
        first_name: string
        last_name: string
        email?: string
    }
    client_services: Service[]
}

interface Payment {
    id: number
    amount: string
    payment_date: string
    notes: string | null
}

const normalizeArrayResponse = <T,>(payload: unknown): T[] => {
    const data = payload as { data?: unknown }
    if (Array.isArray(data?.data)) return data.data as T[]
    if (Array.isArray(payload)) return payload as T[]
    return []
}

const getLastPage = (payload: unknown) => {
    const data = payload as { last_page?: number }
    return typeof data?.last_page === "number" ? data.last_page : 1
}

const getServiceIcon = (name: string) => {
    const n = name.toLowerCase()
    if (n.includes("dominio")) return <Globe className="h-5 w-5" />
    if (n.includes("ssl")) return <Lock className="h-5 w-5" />
    if (n.includes("hosting")) return <Server className="h-5 w-5" />
    if (n.includes("soporte") || n.includes("24/7")) return <Wrench className="h-5 w-5" />
    if (n.includes("vps")) return <Server className="h-5 w-5" />
    return <Server className="h-5 w-5" />
}

const getServiceColor = (name: string) => {
    const n = name.toLowerCase()
    if (n.includes("dominio")) return "text-blue-600 bg-blue-50 border-blue-200"
    if (n.includes("ssl")) return "text-green-600 bg-green-50 border-green-200"
    if (n.includes("hosting")) return "text-purple-600 bg-purple-50 border-purple-200"
    if (n.includes("soporte") || n.includes("24/7")) return "text-orange-600 bg-orange-50 border-orange-200"
    if (n.includes("vps")) return "text-indigo-600 bg-indigo-50 border-indigo-200"
    return "text-gray-600 bg-gray-50 border-gray-200"
}

const getPaymentStatusBadge = (nextDueDate: string | null, status: string, billingCycle: string) => {
    if (status !== "active") {
        return (
            <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">{billingCycle === "monthly" ? "Mensual" : billingCycle === "annual" ? "Anual" : "Único"}</span>
                <Badge variant="secondary" className="text-xs">
                    {status === "suspended" ? "Suspendido" : "Cancelado"}
                </Badge>
            </div>
        )
    }
    
    if (!nextDueDate) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">{billingCycle === "monthly" ? "Mensual" : billingCycle === "annual" ? "Anual" : "Único"}</span>
                <Badge variant="secondary" className="text-xs">Sin vencimiento</Badge>
            </div>
        )
    }

    const today = new Date()
    const dueDate = new Date(nextDueDate)
    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    const cycleLabel = billingCycle === "monthly" ? "Mensual" : billingCycle === "annual" ? "Anual" : "Único"

    if (diffDays < 0) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">{cycleLabel}</span>
                <span className="text-xs">-</span>
                <Badge variant="destructive" className="text-xs font-semibold">
                    Vencido
                </Badge>
            </div>
        )
    } else if (diffDays <= 7) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">{cycleLabel}</span>
                <span className="text-xs">-</span>
                <Badge className="text-xs font-semibold bg-red-500 hover:bg-red-600">
                    Pendiente
                </Badge>
            </div>
        )
    } else if (diffDays <= 30) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">{cycleLabel}</span>
                <span className="text-xs">-</span>
                <Badge className="text-xs font-semibold bg-yellow-500 hover:bg-yellow-600">
                    Pendiente
                </Badge>
            </div>
        )
    } else {
        return (
            <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">{cycleLabel}</span>
                <span className="text-xs">-</span>
                <Badge className="text-xs font-semibold bg-green-500 hover:bg-green-600">
                    Al día
                </Badge>
            </div>
        )
    }
}

export default function ServicesCustomersView() {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [filterStatus, setFilterStatus] = useState<string>("all")
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    
    // Detail dialog
    const [detailOpen, setDetailOpen] = useState(false)
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    const [selectedService, setSelectedService] = useState<Service | null>(null)
    const [payments, setPayments] = useState<Payment[]>([])
    const [paymentsLoading, setPaymentsLoading] = useState(false)

    const fetchCustomers = async () => {
        try {
            setLoading(true)
            const params: Record<string, string | number> = {
                page: currentPage,
                per_page: 12,
            }

            if (searchTerm) params.search = searchTerm
            if (filterStatus && filterStatus !== "all") {
                if (filterStatus === "expired") {
                    params.payment_status = "expired"
                } else if (filterStatus === "due_soon") {
                    params.payment_status = "due_soon"
                } else if (filterStatus === "active") {
                    params.payment_status = "active"
                } else {
                    params.service_status = filterStatus
                }
            }

            const response = await api.get("/client-services/customers-with-services", { params })
            const list = normalizeArrayResponse<Customer>(response.data)
            setCustomers(list)
            setTotalPages(getLastPage(response.data))
        } catch (error) {
            console.error("Error fetching customers:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCustomers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, searchTerm, filterStatus])

    const handleViewDetails = async (customer: Customer, service: Service) => {
        setSelectedCustomer(customer)
        setSelectedService(service)
        setDetailOpen(true)
        
        // Fetch payment history
        try {
            setPaymentsLoading(true)
            const response = await api.get(`/client-services/${service.id}/payments`)
            setPayments(response.data || [])
        } catch (error) {
            console.error("Error fetching payments:", error)
            toast.error("Error al cargar el historial de pagos")
        } finally {
            setPaymentsLoading(false)
        }
    }

    const getCustomerInitial = (firstName: string, lastName: string) => {
        return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
    }

    const getInitialColor = (initial: string) => {
        const colors = [
            "bg-blue-100 text-blue-700",
            "bg-green-100 text-green-700",
            "bg-purple-100 text-purple-700",
            "bg-orange-100 text-orange-700",
            "bg-pink-100 text-pink-700",
            "bg-indigo-100 text-indigo-700",
            "bg-cyan-100 text-cyan-700",
            "bg-amber-100 text-amber-700",
        ]
        const index = initial.charCodeAt(0) % colors.length
        return colors[index]
    }

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-1 items-center">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Buscar por cliente, dominio o servicio..."
                            className="w-full pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="expired">Vencidos</SelectItem>
                            <SelectItem value="due_soon">Por vencer</SelectItem>
                            <SelectItem value="active">Al día</SelectItem>
                            <SelectItem value="suspended">Suspendidos</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={fetchCustomers}
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                </div>
            </div>

            {/* Customer Cards Grid */}
            {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="border rounded-lg p-4 animate-pulse">
                            <div className="space-y-3">
                                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                <div className="space-y-2 pt-2">
                                    <div className="h-8 bg-gray-200 rounded"></div>
                                    <div className="h-8 bg-gray-200 rounded"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : customers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border rounded-lg">
                    <Users className="h-12 w-12 text-muted-foreground/40 mb-3" />
                    <p>No se encontraron clientes con servicios</p>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {customers.map((customer) => {
                        const initial = getCustomerInitial(customer.person.first_name, customer.person.last_name)
                        const colorClass = getInitialColor(initial)
                        
                        return (
                            <div key={customer.id} className="border rounded-lg p-4 hover:border-gray-400 hover:shadow-sm transition-all">
                                <div className="space-y-4">
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
                                                    <Edit className="h-4 w-4 mr-2" />
                                                    Editar Cliente
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {/* Service Icons Grid */}
                                    <div className="space-y-2">
                                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Servicios Activos</div>
                                        <div className="grid grid-cols-4 gap-2">
                                            {customer.client_services.slice(0, 8).map((service) => (
                                                <div
                                                    key={service.id}
                                                    className={`flex flex-col items-center justify-center gap-1 px-2 py-3 rounded border cursor-pointer transition-all ${
                                                        service.status === "active"
                                                            ? getServiceColor(service.name)
                                                            : "bg-gray-50 border-gray-200 text-gray-400"
                                                    }`}
                                                    onClick={() => handleViewDetails(customer, service)}
                                                    title={service.name}
                                                >
                                                    {getServiceIcon(service.name)}
                                                    <span className="text-[10px] font-medium text-center leading-tight">
                                                        {service.name.split(' ')[0]}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Payment Status */}
                                    <div className="space-y-2 pt-2 border-t">
                                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado de Pago</div>
                                        {customer.client_services.slice(0, 1).map((service) => (
                                            <div key={service.id} className="flex items-center justify-between">
                                                {getPaymentStatusBadge(service.next_due_date, service.status, service.billing_cycle)}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 pt-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 text-xs"
                                            onClick={() => customer.client_services[0] && handleViewDetails(customer, customer.client_services[0])}
                                        >
                                            <Eye className="h-3 w-3 mr-1" />
                                            Ver Detalles
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 text-xs"
                                            onClick={() => window.location.href = `/dashboard/clientes/${customer.id}/editar`}
                                        >
                                            <Edit className="h-3 w-3 mr-1" />
                                            Editar
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center mt-6">
                            <Pagination
                                currentPage={currentPage}
                                lastPage={totalPages}
                                total={customers.length}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Service Detail Dialog */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-blue-600" />
                            Detalles del Servicio
                        </DialogTitle>
                    </DialogHeader>

                    {selectedCustomer && selectedService && (
                        <div className="space-y-6">
                            {/* Customer Info */}
                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm text-gray-700">Cliente</h4>
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
                            </div>

                            {/* Service Info */}
                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm text-gray-700">Información del Servicio</h4>
                                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Servicio</p>
                                        <p className="font-medium text-sm">{selectedService.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Monto</p>
                                        <p className="font-medium text-sm">${parseFloat(selectedService.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Ciclo de Facturación</p>
                                        <p className="font-medium text-sm">
                                            {selectedService.billing_cycle === 'monthly' ? 'Mensual' : 
                                             selectedService.billing_cycle === 'annual' ? 'Anual' : 'Único'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Estado</p>
                                        <Badge variant={selectedService.status === 'active' ? 'default' : 'secondary'}>
                                            {selectedService.status === 'active' ? 'Activo' : 
                                             selectedService.status === 'suspended' ? 'Suspendido' : 'Cancelado'}
                                        </Badge>
                                    </div>
                                    {selectedService.next_due_date && (
                                        <div className="col-span-2">
                                            <p className="text-xs text-gray-500 mb-1">Próximo Vencimiento</p>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-gray-400" />
                                                <p className="font-medium text-sm">
                                                    {format(new Date(selectedService.next_due_date), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Payment History */}
                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm text-gray-700">Historial de Pagos</h4>
                                {paymentsLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
                                    </div>
                                ) : payments.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <AlertCircle className="h-8 w-8 text-gray-400 mb-2" />
                                        <p className="text-sm text-gray-500">No hay pagos registrados</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {payments.map((payment) => (
                                            <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                                                        <DollarSign className="h-4 w-4 text-green-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm">
                                                            ${parseFloat(payment.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {format(new Date(payment.payment_date), "dd/MM/yyyy", { locale: es })}
                                                        </p>
                                                    </div>
                                                </div>
                                                {payment.notes && (
                                                    <p className="text-xs text-gray-500 max-w-xs truncate">{payment.notes}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
