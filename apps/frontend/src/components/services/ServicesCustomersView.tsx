"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, RefreshCw, Globe, Lock, Server, Wrench, Users, Eye, Pencil, MoreVertical, DollarSign, Calendar, AlertCircle, CreditCard, Building2, User, Mail, Phone, Layers, Trash2, Save, X, Unlink, ArrowLeft } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import Pagination from "@/components/ui/pagination"
import api from "@/lib/api"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import { getBillingCycleLabel } from "@/utils/billingCycleUtils"
import { calculateMonthlyCost } from "@/utils/serviceUtils"
import { getServicePaymentStatus } from "@/utils/servicePaymentStatus"

interface Service {
    id: number
    name: string
    status: string
    next_due_date: string | null
    billing_cycle: string
    amount: string
    next_billing_cycle?: string | null
    next_amount?: string | null
    service_type?: {
        id: number
        name: string
        billing_cycle: string
        price: string
    } | null
    base_price?: string | null
    discount_percentage?: string | null
    discount_notes?: string | null
    start_date?: string
    last_payment?: {
        id: number
        amount: string
        payment_date: string
        notes: string | null
    } | null
}

type ClientService = Service

interface Customer {
    id: number
    person: {
        first_name: string
        last_name: string
        email?: string
        phone?: string
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
    const n = (name || "").toLowerCase()
    if (n.includes("dominio")) return <Globe className="h-5 w-5" />
    if (n.includes("ssl")) return <Lock className="h-5 w-5" />
    if (n.includes("hosting")) return <Server className="h-5 w-5" />
    if (n.includes("soporte") || n.includes("24/7")) return <Wrench className="h-5 w-5" />
    if (n.includes("vps")) return <Server className="h-5 w-5" />
    return <Server className="h-5 w-5" />
}

// Obtiene el badge de estado del servicio con colores
const getServiceStatusBadge = (status: string, service?: Service) => {
    switch (status) {
        case "expired":
            return { label: "Vencido", className: "bg-red-100 text-red-700 border-red-200" }
        case "due_soon":
            return { label: "Por vencer", className: "bg-yellow-100 text-yellow-700 border-yellow-200" }
        case "active":
            return { label: "Al día", className: "bg-green-100 text-green-700 border-green-200" }
        case "inactive":
            return { label: "Inactivo", className: "bg-gray-100 text-gray-700 border-gray-200" }
        default:
            return { label: "Desconocido", className: "bg-gray-100 text-gray-700 border-gray-200" }
    }
}

const getAccountStatusSummary = (services: Service[]) => {
    if (services.length === 0) return { label: "Sin servicios", color: "text-gray-500", dotColor: "bg-gray-400" }

    let expired = 0
    let dueSoon = 0

    services.forEach((svc) => {
        const status = getServicePaymentStatus(svc)
        if (status === "expired") expired += 1
        else if (status === "due_soon") dueSoon += 1
    })

    if (expired > 0) {
        return { label: `Vencido (${expired})`, color: "text-red-600", dotColor: "bg-red-500" }
    }

    if (dueSoon > 0) {
        return { label: `Por vencer (${dueSoon})`, color: "text-yellow-600", dotColor: "bg-yellow-500" }
    }

    return { label: "Al día", color: "text-green-600", dotColor: "bg-green-500" }
}

interface ServiceType {
    id: number
    name: string
    billing_cycle: string
}

interface Branch {
    id: number
    name: string
}

interface PaymentMethod {
    id: number
    name: string
    is_active: boolean
}

export default function ServicesCustomersView() {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [allServiceTypes, setAllServiceTypes] = useState<ServiceType[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [filterStatus, setFilterStatus] = useState<string>("all")
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    // Detail dialog (all services)
    const [detailOpen, setDetailOpen] = useState(false)
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

    // Single service detail dialog
    const [serviceDetailOpen, setServiceDetailOpen] = useState(false)
    const [selectedService, setSelectedService] = useState<Service | null>(null)
    const [servicePayments, setServicePayments] = useState<Payment[]>([])
    const [servicePaymentsLoading, setServicePaymentsLoading] = useState(false)

    // Service edit mode
    const [serviceEditMode, setServiceEditMode] = useState(false)
    const [serviceEditForm, setServiceEditForm] = useState({
        amount: "",
        base_price: "",
        discount_percentage: "",
        discount_notes: "",
        billing_cycle: "",
        status: "",
        next_due_date: "",
    })
    const [serviceEditLoading, setServiceEditLoading] = useState(false)

    // Unlink confirmation state
    const [unlinkConfirmId, setUnlinkConfirmId] = useState<number | null>(null)

    // Payment dialog
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
    const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null)
    const [userBranches, setUserBranches] = useState<Branch[]>([])
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])

    const [paymentForm, setPaymentForm] = useState({
        service_id: "",
        amount: "",
        payment_date: new Date().toISOString().split("T")[0],
        notes: "",
        renew_service: true,
        branch_id: "",
        payment_method_id: "",
    })
    const [paymentLoading, setPaymentLoading] = useState(false)

    // Fetch all available service types
    const fetchServiceTypes = async () => {
        try {
            const response = await api.get("/service-types", { params: { per_page: 100 } })
            const types = Array.isArray(response.data) ? response.data : response.data?.data || []
            setAllServiceTypes(types)
        } catch (error) {
            console.error("Error fetching service types:", error)
        }
    }


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
        fetchServiceTypes()
        fetchCustomers()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, searchTerm, filterStatus])

    // Ver detalle del cliente con todos sus servicios
    const handleViewCustomerDetails = async (customer: Customer) => {
        setSelectedCustomer(customer)
        setDetailOpen(true)

        // Cargar último pago de cada servicio
        try {
            const servicesWithPayments = await Promise.all(
                customer.client_services.map(async (service) => {
                    try {
                        const response = await api.get(`/client-services/${service.id}/payments`)
                        const payments = response.data || []
                        return {
                            ...service,
                            last_payment: payments.length > 0 ? payments[0] : null
                        }
                    } catch {
                        return { ...service, last_payment: null }
                    }
                })
            )
            // Actualizar customer con los servicios que tienen último pago
            setSelectedCustomer({
                ...customer,
                client_services: servicesWithPayments
            })
        } catch (error) {
            console.error("Error fetching payments:", error)
        }
    }

    // Ver detalle de un servicio específico con historial de pagos
    const handleViewServiceDetail = async (customer: Customer, service: Service) => {
        setSelectedCustomer(customer)
        setSelectedService(service)
        setServiceDetailOpen(true)
        setServiceEditMode(false)
        setServicePayments([])

        // Cargar historial de pagos del servicio
        try {
            setServicePaymentsLoading(true)
            const response = await api.get(`/client-services/${service.id}/payments`)
            setServicePayments(response.data || [])
        } catch (error) {
            console.error("Error fetching service payments:", error)
            toast.error("Error al cargar el historial de pagos")
        } finally {
            setServicePaymentsLoading(false)
        }
    }

    // Entrar en modo edición del servicio
    const handleEnterServiceEditMode = () => {
        if (!selectedService) return

        setServiceEditForm({
            amount: selectedService.amount,
            base_price: selectedService.base_price || selectedService.amount,
            discount_percentage: selectedService.discount_percentage || "0",
            discount_notes: selectedService.discount_notes || "",
            billing_cycle: selectedService.billing_cycle,
            status: selectedService.status === "suspended" ? "cancelled" : selectedService.status,
            next_due_date: selectedService.next_due_date || "",
        })
        setServiceEditMode(true)
    }

    // Cancelar edición
    const handleCancelServiceEdit = () => {
        setServiceEditMode(false)
    }

    // Calcular precio con descuento
    const calculateEditDiscountedPrice = () => {
        const basePrice = parseFloat(serviceEditForm.base_price) || 0
        const discountPercentage = parseFloat(serviceEditForm.discount_percentage) || 0
        return basePrice - (basePrice * discountPercentage / 100)
    }

    // Calcular nueva fecha de vencimiento según ciclo
    const calculateNextDueDate = (billingCycle: string, fromDate?: string): string => {
        // Use fromDate if provided, otherwise use today
        const baseDate = fromDate ? new Date(fromDate) : new Date()
        baseDate.setHours(0, 0, 0, 0)

        // If fromDate was not provided but we have a selectedService with a future date, use that as base
        // ONLY if we are calculating for a cycle change logic generally

        switch (billingCycle) {
            case 'monthly':
                baseDate.setMonth(baseDate.getMonth() + 1)
                break
            case 'quarterly':
                baseDate.setMonth(baseDate.getMonth() + 3)
                break
            case 'annual':
                baseDate.setFullYear(baseDate.getFullYear() + 1)
                break
            case 'biennial':
                baseDate.setFullYear(baseDate.getFullYear() + 2)
                break
            case 'one_time':
                // Para único, no hay fecha de vencimiento futura
                return ''
            default:
                baseDate.setMonth(baseDate.getMonth() + 1)
        }

        return baseDate.toISOString().split('T')[0]
    }

    // Manejar cambio de ciclo de facturación
    const handleBillingCycleChange = (newCycle: string) => {
        const originalCycle = selectedService?.billing_cycle

        setServiceEditForm(prev => {
            const updates: typeof prev = { ...prev, billing_cycle: newCycle }

            // Si cambió el ciclo, recalcular fecha de vencimiento
            if (originalCycle !== newCycle) {
                if (newCycle === 'one_time') {
                    // Si es único, limpiar fecha
                    updates.next_due_date = ''
                } else {
                    // Calcular nueva fecha
                    // Si ya tiene vencimiento futuro, proyectamos desde ahí? 
                    // NO. La lógica de negocio es: cambio de ciclo => cambio diferido => no cambia la fecha actual.
                    // PERO si el usuario edita la fecha manualmente es otra cosa.
                    // Si el usuario cambia el ciclo, el sistema backend decidirá si es diferido o inmediato.
                    // Si es diferido, la fecha NO DEBERÍA cambiar en el formulario (se mantiene la actual).
                    // Si es inmediato (ej. servicio vencido), se calcula desde hoy.

                    const isFuture = selectedService?.next_due_date && new Date(selectedService.next_due_date) > new Date()

                    if (!isFuture) {
                        updates.next_due_date = calculateNextDueDate(newCycle)
                    }
                    // If it is future, we don't change next_due_date because the change is deferred!
                    // And the backend handles the deferral logic.
                }
            }

            return updates
        })
    }

    // Guardar cambios del servicio
    const handleSaveServiceEdit = async () => {
        if (!selectedService) return

        try {
            setServiceEditLoading(true)

            // Determinar la fecha de vencimiento final
            let finalNextDueDate = serviceEditForm.next_due_date || null

            // Si el ciclo cambió y no es único, verificamos si es necesario recalcular
            // Si el usuario ya ve una fecha en el formulario (porque la lógica de cambio de ciclo la preservó o calculó), usamos esa.
            if (serviceEditForm.billing_cycle !== selectedService.billing_cycle) {
                if (serviceEditForm.billing_cycle === 'one_time') {
                    finalNextDueDate = null
                } else if (!finalNextDueDate) {
                    // Solo calculamos si no hay fecha definida
                    finalNextDueDate = calculateNextDueDate(serviceEditForm.billing_cycle)
                }
            }

            const payload = {
                amount: calculateEditDiscountedPrice().toFixed(2),
                base_price: serviceEditForm.base_price,
                discount_percentage: serviceEditForm.discount_percentage,
                discount_notes: serviceEditForm.discount_notes,
                billing_cycle: serviceEditForm.billing_cycle,
                status: serviceEditForm.status,
                next_due_date: finalNextDueDate,
            }

            console.log("Sending Service Update Payload:", payload)

            const response = await api.put(`/client-services/${selectedService.id}`, payload)
            const updatedServiceFromServer = response.data as Service

            toast.success("Servicio actualizado correctamente")
            setServiceEditMode(false)
            setServiceDetailOpen(false)

            // Actualizar el servicio en memoria usando la respuesta del servidor
            if (selectedCustomer) {
                const updatedServices = selectedCustomer.client_services.map(s =>
                    s.id === selectedService.id ? updatedServiceFromServer : s
                )

                // Actualizar selectedCustomer (para el modal de detalle)
                setSelectedCustomer({
                    ...selectedCustomer,
                    client_services: updatedServices
                })

                // Actualizar la lista de customers (para la card principal)
                setCustomers(prevCustomers =>
                    prevCustomers.map(c =>
                        c.id === selectedCustomer.id
                            ? { ...c, client_services: updatedServices }
                            : c
                    )
                )
            }

            // Refrescar del servidor para asegurar consistencia
            fetchCustomers()
        } catch (error) {
            console.error("Error updating service:", error)
            toast.error("Error al actualizar el servicio")
        } finally {
            setServiceEditLoading(false)
        }
    }

    // Eliminar servicio
    const handleDeleteService = async () => {
        if (!selectedService) return

        if (!confirm(`¿Estás seguro de eliminar el servicio "${selectedService.name}"? Esta acción no se puede deshacer.`)) {
            return
        }

        try {
            setServiceEditLoading(true)
            await api.delete(`/client-services/${selectedService.id}`)
            toast.success("Servicio eliminado correctamente")
            setServiceDetailOpen(false)
            fetchCustomers()
        } catch (error) {
            console.error("Error deleting service:", error)
            toast.error("Error al eliminar el servicio")
        } finally {
            setServiceEditLoading(false)
        }
    }

    // Desvincular servicio del cliente (desde la vista de gestión)
    const handleUnlinkService = (serviceId: number) => {
        if (unlinkConfirmId === serviceId) {
            // Second click: execute
            executeUnlinkService(serviceId)
        } else {
            // First click: ask for confirmation
            setUnlinkConfirmId(serviceId)
            // Auto-reset after 5 seconds if not confirmed
            setTimeout(() => setUnlinkConfirmId(null), 5000)
        }
    }

    const executeUnlinkService = async (serviceId: number) => {
        if (!selectedCustomer) return
        const service = selectedCustomer.client_services.find(s => s.id === serviceId)
        if (!service) return

        try {
            await api.delete(`/client-services/${service.id}`)
            toast.success(`Servicio "${service.name}" desvinculado correctamente`)

            // Actualizar el estado local inmediatamente
            const updatedServices = selectedCustomer.client_services.filter(s => s.id !== service.id)

            setSelectedCustomer({
                ...selectedCustomer,
                client_services: updatedServices
            })

            // Actualizar la lista de customers
            setCustomers(prevCustomers =>
                prevCustomers.map(c =>
                    c.id === selectedCustomer.id
                        ? { ...c, client_services: updatedServices }
                        : c
                )
            )

            // Refrescar del servidor
            fetchCustomers()
        } catch (error) {
            console.error("Error unlinking service:", error)
            toast.error("Error al desvincular el servicio")
        } finally {
            setUnlinkConfirmId(null)
        }
    }

    // Fetch user branches for payment dialog
    const fetchUserBranches = async () => {
        try {
            const response = await api.get("/my-branches")
            const branches = response.data?.data || response.data || []
            setUserBranches(branches)
            return branches
        } catch (error) {
            console.error("Error fetching user branches:", error)
            return []
        }
    }

    // Fetch payment methods
    const fetchPaymentMethods = async () => {
        try {
            const response = await api.get("/payment-methods")
            const methods = response.data?.data || response.data || []
            setPaymentMethods(methods.filter((m: PaymentMethod) => m.is_active))
            return methods
        } catch (error) {
            console.error("Error fetching payment methods:", error)
            return []
        }
    }

    // Payment dialog handlers
    const handleOpenPaymentDialog = async (customer: Customer, preselectedServiceId?: number) => {
        setPaymentCustomer(customer)

        // Fetch data in parallel
        const branchesPromise = fetchUserBranches()
        const methodsPromise = fetchPaymentMethods()
        const [branches, methods] = await Promise.all([branchesPromise, methodsPromise])

        // Determine which service to preselect
        let selectedService: Service | undefined
        
        if (preselectedServiceId) {
            // Use the explicitly preselected service
            selectedService = customer.client_services.find(s => s.id === preselectedServiceId)
        } else {
            // Find first service with debt, otherwise use first service
            selectedService = customer.client_services.find(s => {
                const status = getServicePaymentStatus(s)
                return status === "expired" || status === "due_soon"
            }) || customer.client_services[0]
        }

        // Find cash method default
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const defaultMethod = methods?.find((m: any) => m.name.toLowerCase().includes('efectivo')) || methods?.[0]

        setPaymentForm({
            service_id: selectedService?.id.toString() || "",
            amount: selectedService?.amount || "",
            payment_date: new Date().toISOString().split("T")[0],
            notes: "",
            renew_service: true,
            branch_id: branches.length === 1 ? branches[0].id.toString() : "",
            payment_method_id: defaultMethod?.id.toString() || ""
        })
        setPaymentDialogOpen(true)
    }

    const handleRegisterPayment = async () => {
        if (!paymentForm.service_id || !paymentForm.amount) {
            toast.error("Selecciona un servicio y monto")
            return
        }

        // Validar sucursal si hay más de una
        if (userBranches.length > 1 && !paymentForm.branch_id) {
            toast.error("Selecciona una sucursal")
            return
        }

        try {
            setPaymentLoading(true)

            // Register payment with branch_id
            const response = await api.post(`/client-services/${paymentForm.service_id}/payments`, {
                amount: parseFloat(paymentForm.amount),
                payment_date: paymentForm.payment_date,
                notes: paymentForm.notes || null,
                renew_service: paymentForm.renew_service,
                branch_id: paymentForm.branch_id ? parseInt(paymentForm.branch_id) : undefined,
                payment_method_id: paymentForm.payment_method_id ? parseInt(paymentForm.payment_method_id) : undefined,
            })

            toast.success("Pago registrado exitosamente")
            setPaymentDialogOpen(false)

            // Update local state immediately with the returned service
            const updatedService = response.data.service

            if (updatedService && paymentCustomer) {
                setCustomers(prevCustomers =>
                    prevCustomers.map(c => {
                        if (c.id === paymentCustomer.id) {
                            return {
                                ...c,
                                client_services: c.client_services.map(s =>
                                    s.id === updatedService.id ? updatedService : s
                                )
                            }
                        }
                        return c
                    })
                )

                // Also update selectedCustomer if it's the same
                if (selectedCustomer && selectedCustomer.id === paymentCustomer.id) {
                    setSelectedCustomer(prev => {
                        if (!prev) return null
                        return {
                            ...prev,
                            client_services: prev.client_services.map(s =>
                                s.id === updatedService.id ? updatedService : s
                            )
                        }
                    })
                }
            }

            fetchCustomers()
        } catch (error) {
            console.error("Error registering payment:", error)
            toast.error("Error al registrar el pago")
        } finally {
            setPaymentLoading(false)
        }
    }

    const getCustomerInitial = (firstName?: string | null, lastName?: string | null) => {
        const first = firstName?.trim().charAt(0) ?? ""
        const last = lastName?.trim().charAt(0) ?? ""
        return `${first}${last}`.toUpperCase()
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
        if (!initial) return colors[0]
        const code = initial.charCodeAt(0)
        const index = isNaN(code) ? 0 : code % colors.length
        return colors[index] || colors[0]
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
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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
                <div className="space-y-5">
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {customers.map((customer) => {
                            const initial = getCustomerInitial(customer.person.first_name, customer.person.last_name)
                            const colorClass = getInitialColor(initial)

                            return (
                                <div key={customer.id} className="border rounded-lg p-3 hover:border-gray-400 hover:shadow-sm transition-all">
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
                                                    // Buscamos por ID de tipo de servicio primero, luego por nombre (para retrocompatibilidad o servicios manuales)
                                                    const assignedService = customer.client_services.find(s =>
                                                        (s.service_type?.id === serviceType.id) ||
                                                        (s.name === serviceType.name)
                                                    )

                                                    // Usamos el nombre del services asignado si existe (y si tiene tipo, preferimos el nombre del tipo)
                                                    // const displayService = assignedService ? (assignedService.service_type?.name || assignedService.name) : serviceType.name
                                                    // No, mejor usamos el serviceType.name del loop para el título del icono, ya que estamos iterando los tipos.

                                                    const status = assignedService
                                                        ? (getServicePaymentStatus(assignedService) === 'active' ? 'paid' :
                                                            getServicePaymentStatus(assignedService) === 'due_soon' ? 'due_soon' : 'unpaid')
                                                        : "not_assigned"

                                                    let statusClass = "bg-gray-100 text-gray-400" // Gris - No asignado

                                                    if (status === "paid") {
                                                        statusClass = "bg-green-100 text-green-600" // Verde - Pagado
                                                    } else if (status === "due_soon") {
                                                        statusClass = "bg-yellow-100 text-yellow-600" // Amarillo - Por vencer
                                                    } else if (status === "unpaid") {
                                                        statusClass = "bg-red-100 text-red-600" // Rojo - Con deuda
                                                    }

                                                    return (
                                                        <div
                                                            key={serviceType.id}
                                                            className={`flex flex-col items-center gap-2 transition-all ${assignedService ? 'cursor-pointer' : 'cursor-default opacity-60'}`}
                                                            onClick={() => assignedService && handleViewServiceDetail(customer, assignedService)}
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
                                                const { label, color } = getAccountStatusSummary(customer.client_services)
                                                const dotColor = color === "text-green-600" ? "bg-green-500" : color === "text-orange-500" ? "bg-orange-500" : color === "text-red-600" ? "bg-red-500" : "bg-gray-400"
                                                return (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs font-semibold text-gray-500">Estado de la cuenta</span>
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`}></span>
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
                                                    onClick={() => handleOpenPaymentDialog(customer)}
                                                    aria-label="Registrar pago"
                                                >
                                                    <DollarSign className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-9 w-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                    onClick={() => handleViewCustomerDetails(customer)}
                                                    aria-label="Ver detalles"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-9 w-9 text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                                                    onClick={() => handleViewCustomerDetails(customer)}
                                                    aria-label="Gestionar servicios"
                                                >
                                                    <Layers className="h-4 w-4" />
                                                </Button>
                                            </div>
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

            {/* Customer Detail Dialog - All Services View */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
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

                    {selectedCustomer && (
                        <div className="space-y-6">
                            {/* Customer Info Header */}
                            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                                <div className={`flex h-14 w-14 items-center justify-center rounded-full ${getInitialColor(getCustomerInitial(selectedCustomer.person.first_name, selectedCustomer.person.last_name))} font-bold text-lg shadow-md`}>
                                    {getCustomerInitial(selectedCustomer.person.first_name, selectedCustomer.person.last_name)}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-lg text-gray-900">
                                        {selectedCustomer.person.first_name} {selectedCustomer.person.last_name}
                                    </h3>
                                    <div className="flex flex-wrap gap-3 text-sm text-gray-600 mt-1">
                                        {selectedCustomer.person.email && (
                                            <span className="flex items-center gap-1">
                                                <Mail className="h-3.5 w-3.5" />
                                                {selectedCustomer.person.email}
                                            </span>
                                        )}
                                        {selectedCustomer.person.phone && (
                                            <span className="flex items-center gap-1">
                                                <Phone className="h-3.5 w-3.5" />
                                                {selectedCustomer.person.phone}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500 mb-1">Servicios activos</p>
                                    <p className="text-2xl font-bold text-blue-600">
                                        {selectedCustomer.client_services?.filter(s => s.status === 'active').length || 0}
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
                                        {selectedCustomer.client_services?.length || 0} servicio(s)
                                    </span>
                                </div>

                                {!selectedCustomer.client_services || selectedCustomer.client_services.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                        <AlertCircle className="h-10 w-10 text-gray-300 mb-3" />
                                        <p className="text-sm text-gray-500 font-medium">Sin servicios asignados</p>
                                        <p className="text-xs text-gray-400 mt-1">Asigna un servicio a este cliente para comenzar</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {selectedCustomer.client_services.map((service) => {
                                            const paymentStatus = getServicePaymentStatus(service)
                                            const statusBadge = getServiceStatusBadge(paymentStatus, service)
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
                                                                    setDetailOpen(false)
                                                                    handleViewServiceDetail(selectedCustomer, service)
                                                                    setTimeout(() => handleEnterServiceEditMode(), 100)
                                                                }}
                                                            >
                                                                <Pencil className="h-3.5 w-3.5 mr-1" />
                                                                Editar
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleUnlinkService(service.id)}
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
                                                                    onClick={() => setUnlinkConfirmId(null)}
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
                            {selectedCustomer.client_services && selectedCustomer.client_services.length > 0 && (
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                                    <div className="flex items-center gap-6">
                                        <div>
                                            <p className="text-xs text-gray-500">Total mensual estimado</p>
                                            <p className="text-lg font-bold text-gray-900">
                                                ${selectedCustomer.client_services
                                                    .filter(s => s.status === 'active')
                                                    .reduce((acc, s) => acc + calculateMonthlyCost(s.amount, s.billing_cycle), 0)
                                                    .toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {(() => {
                                            const activeServices = selectedCustomer.client_services.filter(s => s.status === 'active')
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
                    )}
                </DialogContent>
            </Dialog>

            {/* Single Service Detail Dialog */}
            <Dialog open={serviceDetailOpen} onOpenChange={(open) => {
                setServiceDetailOpen(open)
                if (!open) setServiceEditMode(false)
            }}>
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
                                            handleCancelServiceEdit()
                                        } else {
                                            setServiceDetailOpen(false)
                                            setDetailOpen(true)
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
                                    onClick={handleEnterServiceEditMode}
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

                    {selectedCustomer && selectedService && (
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
                                                onClick={handleCancelServiceEdit}
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
                                                        <Badge className={getServiceStatusBadge(getServicePaymentStatus(selectedService), selectedService).className}>
                                                            {getServiceStatusBadge(getServicePaymentStatus(selectedService), selectedService).label}
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
                                            onClick={() => setServiceDetailOpen(false)}
                                        >
                                            Cerrar
                                        </Button>
                                        <Button
                                            className="bg-violet-600 hover:bg-violet-700 text-white"
                                            onClick={() => {
                                                setServiceDetailOpen(false)
                                                handleOpenPaymentDialog(selectedCustomer, selectedService.id)
                                            }}
                                        >
                                            <DollarSign className="h-4 w-4 mr-2" />
                                            Registrar Pago
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Payment Registration Dialog */}
            <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
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
                            onClick={() => setPaymentDialogOpen(false)}
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
        </div>
    )
}
