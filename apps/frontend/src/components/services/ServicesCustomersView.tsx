"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, RefreshCw, Users } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Pagination from "@/components/ui/pagination"
import api from "@/lib/api"
import { sileo } from "sileo"

// Import types
import { Customer, Service, ServiceType, Branch, PaymentMethod, Payment } from "./types"

// Import components
import { CustomerCard } from "./CustomerCard"
import { CustomerDetailDialog } from "./CustomerDetailDialog"
import { ServiceDetailDialog } from "./ServiceDetailDialog"
import { PaymentRegistrationDialog } from "./PaymentRegistrationDialog"

// Import utils
import { getServicePaymentStatus } from "@/utils/servicePaymentStatus"

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
        description: "",
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

        try {
            setServicePaymentsLoading(true)
            const response = await api.get(`/client-services/${service.id}/payments`)
            setServicePayments(response.data || [])
        } catch (error) {
            console.error("Error fetching service payments:", error)
            sileo.error({ title: "Error al cargar el historial de pagos" })
        } finally {
            setServicePaymentsLoading(false)
        }
    }

    const handleEnterServiceEditMode = (customer?: Customer, service?: Service) => {
        const tgtService = service || selectedService
        if (!tgtService) return

        setServiceEditForm({
            amount: tgtService.amount,
            base_price: tgtService.base_price || tgtService.amount,
            discount_percentage: tgtService.discount_percentage || "0",
            discount_notes: tgtService.discount_notes || "",
            billing_cycle: tgtService.billing_cycle,
            status: tgtService.status === "suspended" ? "cancelled" : tgtService.status,
            next_due_date: tgtService.next_due_date || "",
            description: tgtService.description || "",
        })
        setServiceEditMode(true)
    }

    const handleCancelServiceEdit = () => {
        setServiceEditMode(false)
    }

    const calculateEditDiscountedPrice = () => {
        const basePrice = parseFloat(serviceEditForm.base_price) || 0
        const discountPercentage = parseFloat(serviceEditForm.discount_percentage) || 0
        return basePrice - (basePrice * discountPercentage / 100)
    }

    const calculateNextDueDate = (billingCycle: string, fromDate?: string): string => {
        const baseDate = fromDate ? new Date(fromDate) : new Date()
        baseDate.setHours(0, 0, 0, 0)

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
                return ''
            default:
                baseDate.setMonth(baseDate.getMonth() + 1)
        }

        return baseDate.toISOString().split('T')[0]
    }

    const handleBillingCycleChange = (newCycle: string) => {
        const originalCycle = selectedService?.billing_cycle

        setServiceEditForm(prev => {
            const updates: typeof prev = { ...prev, billing_cycle: newCycle }

            if (originalCycle !== newCycle) {
                if (newCycle === 'one_time') {
                    updates.next_due_date = ''
                } else {
                    const isFuture = selectedService?.next_due_date && new Date(selectedService.next_due_date) > new Date()

                    if (!isFuture) {
                        updates.next_due_date = calculateNextDueDate(newCycle)
                    }
                }
            }

            return updates
        })
    }

    const handleSaveServiceEdit = async () => {
        if (!selectedService) return

        try {
            setServiceEditLoading(true)

            let finalNextDueDate = serviceEditForm.next_due_date || null

            if (serviceEditForm.billing_cycle !== selectedService.billing_cycle) {
                if (serviceEditForm.billing_cycle === 'one_time') {
                    finalNextDueDate = null
                } else if (!finalNextDueDate) {
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
                description: serviceEditForm.description || null,
            }

            const response = await api.put(`/client-services/${selectedService.id}`, payload)
            const updatedServiceFromServer = response.data as Service

            sileo.success({ title: "Servicio actualizado correctamente" })
            setServiceEditMode(false)
            setServiceDetailOpen(false)

            if (selectedCustomer) {
                const updatedServices = selectedCustomer.client_services.map(s =>
                    s.id === selectedService.id ? updatedServiceFromServer : s
                )

                setSelectedCustomer({
                    ...selectedCustomer,
                    client_services: updatedServices
                })

                setCustomers(prevCustomers =>
                    prevCustomers.map(c =>
                        c.id === selectedCustomer.id
                            ? { ...c, client_services: updatedServices }
                            : c
                    )
                )
            }

            fetchCustomers()
        } catch (error) {
            console.error("Error updating service:", error)
            sileo.error({ title: "Error al actualizar el servicio" })
        } finally {
            setServiceEditLoading(false)
        }
    }

    const handleDeleteService = async () => {
        if (!selectedService) return

        if (!confirm(`¿Estás seguro de eliminar el servicio "${selectedService.name}"? Esta acción no se puede deshacer.`)) {
            return
        }

        try {
            setServiceEditLoading(true)
            await api.delete(`/client-services/${selectedService.id}`)
            sileo.success({ title: "Servicio eliminado correctamente" })
            setServiceDetailOpen(false)
            fetchCustomers()
        } catch (error) {
            console.error("Error deleting service:", error)
            sileo.error({ title: "Error al eliminar el servicio" })
        } finally {
            setServiceEditLoading(false)
        }
    }

    const handleUnlinkService = (serviceId: number) => {
        if (unlinkConfirmId === serviceId) {
            executeUnlinkService(serviceId)
        } else {
            setUnlinkConfirmId(serviceId)
            setTimeout(() => setUnlinkConfirmId(null), 5000)
        }
    }

    const executeUnlinkService = async (serviceId: number) => {
        if (!selectedCustomer) return
        const service = selectedCustomer.client_services.find(s => s.id === serviceId)
        if (!service) return

        try {
            await api.delete(`/client-services/${service.id}`)
            sileo.success({ title: `Servicio "${service.name}" desvinculado correctamente` })

            const updatedServices = selectedCustomer.client_services.filter(s => s.id !== service.id)

            setSelectedCustomer({
                ...selectedCustomer,
                client_services: updatedServices
            })

            setCustomers(prevCustomers =>
                prevCustomers.map(c =>
                    c.id === selectedCustomer.id
                        ? { ...c, client_services: updatedServices }
                        : c
                )
            )

            fetchCustomers()
        } catch (error) {
            console.error("Error unlinking service:", error)
            sileo.error({ title: "Error al desvincular el servicio" })
        } finally {
            setUnlinkConfirmId(null)
        }
    }

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

    const handleOpenPaymentDialog = async (customer: Customer, preselectedServiceId?: number) => {
        setPaymentCustomer(customer)

        const branchesPromise = fetchUserBranches()
        const methodsPromise = fetchPaymentMethods()
        const [branches, methods] = await Promise.all([branchesPromise, methodsPromise])

        let selectedService: Service | undefined

        if (preselectedServiceId) {
            selectedService = customer.client_services.find(s => s.id === preselectedServiceId)
        } else {
            selectedService = customer.client_services.find(s => {
                const status = getServicePaymentStatus(s)
                return status === "expired" || status === "due_soon"
            }) || customer.client_services[0]
        }

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
            sileo.error({ title: "Selecciona un servicio y monto" })
            return
        }

        if (userBranches.length > 1 && !paymentForm.branch_id) {
            sileo.error({ title: "Selecciona una sucursal" })
            return
        }

        try {
            setPaymentLoading(true)

            const response = await api.post(`/client-services/${paymentForm.service_id}/payments`, {
                amount: parseFloat(paymentForm.amount),
                payment_date: paymentForm.payment_date,
                notes: paymentForm.notes || null,
                renew_service: paymentForm.renew_service,
                branch_id: paymentForm.branch_id ? parseInt(paymentForm.branch_id) : undefined,
                payment_method_id: paymentForm.payment_method_id ? parseInt(paymentForm.payment_method_id) : undefined,
            })

            sileo.success({ title: "Pago registrado exitosamente" })
            setPaymentDialogOpen(false)

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
            sileo.error({ title: "Error al registrar el pago" })
        } finally {
            setPaymentLoading(false)
        }
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
                        {customers.map((customer) => (
                            <CustomerCard
                                key={customer.id}
                                customer={customer}
                                allServiceTypes={allServiceTypes}
                                onViewCustomer={handleViewCustomerDetails}
                                onOpenPaymentDialog={handleOpenPaymentDialog}
                                onViewServiceDetail={handleViewServiceDetail}
                            />
                        ))}
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

            <CustomerDetailDialog
                open={detailOpen}
                onOpenChange={setDetailOpen}
                customer={selectedCustomer}
                onViewServiceDetail={handleViewServiceDetail}
                onEnterServiceEditMode={handleEnterServiceEditMode}
                onUnlinkService={handleUnlinkService}
                unlinkConfirmId={unlinkConfirmId}
                onCancelUnlink={() => setUnlinkConfirmId(null)}
            />

            <ServiceDetailDialog
                open={serviceDetailOpen}
                onOpenChange={(open) => {
                    setServiceDetailOpen(open)
                    if (!open) setServiceEditMode(false)
                }}
                serviceEditMode={serviceEditMode}
                onCancelEdit={handleCancelServiceEdit}
                selectedCustomer={selectedCustomer}
                selectedService={selectedService}
                serviceEditForm={serviceEditForm}
                setServiceEditForm={setServiceEditForm}
                servicePayments={servicePayments}
                servicePaymentsLoading={servicePaymentsLoading}
                calculateEditDiscountedPrice={calculateEditDiscountedPrice}
                handleBillingCycleChange={handleBillingCycleChange}
                handleDeleteService={handleDeleteService}
                serviceEditLoading={serviceEditLoading}
                handleSaveServiceEdit={handleSaveServiceEdit}
                onEnterServiceEditMode={() => handleEnterServiceEditMode()}
                onOpenPaymentDialog={handleOpenPaymentDialog}
                onBackToCustomerDetail={() => {
                    setServiceDetailOpen(false)
                    setDetailOpen(true)
                }}
            />

            <PaymentRegistrationDialog
                open={paymentDialogOpen}
                onOpenChange={setPaymentDialogOpen}
                paymentCustomer={paymentCustomer}
                userBranches={userBranches}
                paymentMethods={paymentMethods}
                paymentForm={paymentForm}
                setPaymentForm={setPaymentForm}
                paymentLoading={paymentLoading}
                handleRegisterPayment={handleRegisterPayment}
            />
        </div>
    )
}
