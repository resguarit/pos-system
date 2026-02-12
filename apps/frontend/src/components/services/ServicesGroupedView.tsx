"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, ChevronDown, ChevronUp, Clock, DollarSign, RefreshCw, Search, Users, XCircle } from "lucide-react"
import api from "@/lib/api"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { getBillingCycleConfig } from "@/utils/billingCycleUtils"
import { formatPrice } from "@/lib/utils/currency"
import { getServicePaymentStatus } from "@/utils/servicePaymentStatus"
import { toast } from "sonner"

interface ServiceType {
    id: number
    name: string
    billing_cycle: string
    price: string
}

interface Customer {
    id: number
    person: {
        first_name: string
        last_name: string
        email?: string
        phone?: string
    }
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

interface ClientService {
    id: number
    service_type_id?: number | null
    name: string
    status: string
    next_due_date: string | null
    billing_cycle: string
    amount: string
    customer?: Customer
    service_type?: ServiceType | null
}

interface ServiceGroup {
    id: string
    name: string
    services: ClientService[]
    stats: {
        total: number
        expired: number
        dueSoon: number
        active: number
        inactive: number
        pendingAmount: number
    }
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

const getServiceStatusBadge = (status: string, service: ClientService) => {
    switch (status) {
        case "expired":
            return { label: "Vencido", className: "bg-red-100 text-red-700 border-red-200", icon: XCircle }
        case "due_soon":
            return { label: "Por vencer", className: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Clock }
        case "active":
            return { label: "Al día", className: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle }
        case "inactive":
            return {
                label: "Inactivo",
                className: "bg-gray-100 text-gray-700 border-gray-200",
                icon: XCircle,
            }
        default:
            return { label: "Desconocido", className: "bg-gray-100 text-gray-700 border-gray-200", icon: XCircle }
    }
}

const getCustomerName = (service: ClientService) => {
    const firstName = service.customer?.person?.first_name || ""
    const lastName = service.customer?.person?.last_name || ""
    return `${firstName} ${lastName}`.trim() || "Cliente sin nombre"
}

const matchesSearch = (service: ClientService, groupName: string, query: string) => {
    if (!query) return true
    const name = getCustomerName(service)
    const email = service.customer?.person?.email || ""
    const phone = service.customer?.person?.phone || ""
    const serviceName = service.name || ""

    const haystack = `${groupName} ${serviceName} ${name} ${email} ${phone}`.toLowerCase()
    return haystack.includes(query)
}

const getGroupStats = (services: ClientService[]) => {
    return services.reduce(
        (acc, service) => {
            const paymentStatus = getServicePaymentStatus(service)
            const amount = parseFloat(service.amount) || 0

            if (paymentStatus === "expired") {
                acc.expired += 1
                acc.pendingAmount += amount
            } else if (paymentStatus === "due_soon") {
                acc.dueSoon += 1
                acc.pendingAmount += amount
            } else if (paymentStatus === "inactive") {
                acc.inactive += 1
            } else {
                acc.active += 1
            }

            acc.total += 1
            return acc
        },
        { total: 0, expired: 0, dueSoon: 0, active: 0, inactive: 0, pendingAmount: 0 }
    )
}

export default function ServicesGroupedView() {
    const [services, setServices] = useState<ClientService[]>([])
    const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [filterStatus, setFilterStatus] = useState("all")
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
    const [paymentService, setPaymentService] = useState<ClientService | null>(null)
    const [userBranches, setUserBranches] = useState<Branch[]>([])
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
    const [paymentLoading, setPaymentLoading] = useState(false)
    const [paymentForm, setPaymentForm] = useState({
        amount: "",
        payment_date: new Date().toISOString().split("T")[0],
        notes: "",
        renew_service: true,
        branch_id: "",
        payment_method_id: "",
    })

    const fetchServices = useCallback(async () => {
        try {
            setLoading(true)
            let page = 1
            let lastPage = 1
            const aggregated: ClientService[] = []

            do {
                const response = await api.get("/client-services", {
                    params: {
                        page,
                        per_page: 100,
                    },
                })

                const list = normalizeArrayResponse<ClientService>(response.data)
                aggregated.push(...list)
                lastPage = getLastPage(response.data)
                page += 1
            } while (page <= lastPage)

            setServices(aggregated)
        } catch (error) {
            console.error("Error fetching services:", error)
            toast.error("Error al cargar los servicios")
        } finally {
            setLoading(false)
        }
    }, [])

    const fetchServiceTypes = useCallback(async () => {
        try {
            const response = await api.get("/service-types", { params: { per_page: 200 } })
            const list = normalizeArrayResponse<ServiceType>(response.data)
            setServiceTypes(list)
        } catch (error) {
            console.error("Error fetching service types:", error)
        }
    }, [])

    useEffect(() => {
        fetchServices()
        fetchServiceTypes()
    }, [fetchServices, fetchServiceTypes])

    const fetchUserBranches = async () => {
        try {
            const response = await api.get("/my-branches")
            const branches = response.data?.data || response.data || []
            setUserBranches(branches)
            return branches as Branch[]
        } catch (error) {
            console.error("Error fetching user branches:", error)
            return [] as Branch[]
        }
    }

    const fetchPaymentMethods = async () => {
        try {
            const response = await api.get("/payment-methods")
            const methods = response.data?.data || response.data || []
            const activeMethods = methods.filter((method: PaymentMethod) => method.is_active)
            setPaymentMethods(activeMethods)
            return activeMethods as PaymentMethod[]
        } catch (error) {
            console.error("Error fetching payment methods:", error)
            return [] as PaymentMethod[]
        }
    }

    const handleOpenPaymentDialog = async (service: ClientService) => {
        setPaymentService(service)
        const [branches, methods] = await Promise.all([fetchUserBranches(), fetchPaymentMethods()])
        const defaultBranchId = branches.length === 1 ? branches[0]?.id.toString() : ""
        const defaultMethodId = methods.length === 1 ? methods[0]?.id.toString() : ""

        setPaymentForm({
            amount: service.amount || "",
            payment_date: new Date().toISOString().split("T")[0],
            notes: "",
            renew_service: true,
            branch_id: defaultBranchId,
            payment_method_id: defaultMethodId,
        })

        setPaymentDialogOpen(true)
    }

    const handleRegisterPayment = async () => {
        if (!paymentService) return

        if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
            toast.error("Ingrese un monto valido")
            return
        }

        if (userBranches.length > 1 && !paymentForm.branch_id) {
            toast.error("Selecciona una sucursal")
            return
        }

        if (paymentMethods.length > 0 && !paymentForm.payment_method_id) {
            toast.error("Selecciona un metodo de pago")
            return
        }

        try {
            setPaymentLoading(true)
            await api.post(`/client-services/${paymentService.id}/payments`, {
                amount: parseFloat(paymentForm.amount),
                payment_date: paymentForm.payment_date,
                notes: paymentForm.notes || null,
                renew_service: paymentForm.renew_service,
                branch_id: paymentForm.branch_id ? parseInt(paymentForm.branch_id) : undefined,
                payment_method_id: paymentForm.payment_method_id ? parseInt(paymentForm.payment_method_id) : undefined,
            })

            toast.success("Pago registrado exitosamente")
            setPaymentDialogOpen(false)
            fetchServices()
        } catch (error) {
            console.error("Error registering payment:", error)
            toast.error("Error al registrar el pago")
        } finally {
            setPaymentLoading(false)
        }
    }

    const groupedServices = useMemo(() => {
        const query = searchTerm.trim().toLowerCase()
        const activeTypeNames = new Set(serviceTypes.map((type) => type.name.toLowerCase()))
        const map = new Map<string, { name: string; services: ClientService[] }>()

        services.forEach((service) => {
            if (service.service_type_id && !service.service_type) {
                return
            }
            if (!service.service_type_id && !activeTypeNames.has(service.name.toLowerCase())) {
                return
            }
            const key = service.service_type?.id
                ? `type-${service.service_type.id}`
                : `custom-${service.name || service.id}`
            const name = service.service_type?.name || service.name || "Servicio sin nombre"

            if (!map.has(key)) {
                map.set(key, { name, services: [] })
            }

            map.get(key)?.services.push(service)
        })

        const filterService = (service: ClientService) => {
            const paymentStatus = getServicePaymentStatus(service)

            if (filterStatus === "pending") {
                return paymentStatus === "expired" || paymentStatus === "due_soon"
            }
            if (filterStatus === "expired") return paymentStatus === "expired"
            if (filterStatus === "due_soon") return paymentStatus === "due_soon"
            if (filterStatus === "active") return paymentStatus === "active"
            if (filterStatus === "inactive") return paymentStatus === "inactive"
            return true
        }

        const groups: ServiceGroup[] = []

        map.forEach((value, key) => {
            const filtered = value.services.filter(
                (service) => filterService(service) && matchesSearch(service, value.name, query)
            )

            if (filtered.length === 0) return

            groups.push({
                id: key,
                name: value.name,
                services: filtered,
                stats: getGroupStats(filtered),
            })
        })

        return groups.sort((a, b) => {
            const pendingA = a.stats.expired + a.stats.dueSoon
            const pendingB = b.stats.expired + b.stats.dueSoon
            if (pendingA !== pendingB) return pendingB - pendingA
            return a.name.localeCompare(b.name)
        })
    }, [services, filterStatus, searchTerm, serviceTypes])

    const summary = useMemo(() => {
        return groupedServices.reduce(
            (acc, group) => {
                acc.totalServices += group.stats.total
                acc.expired += group.stats.expired
                acc.dueSoon += group.stats.dueSoon
                acc.groupsWithDebt += group.stats.expired + group.stats.dueSoon > 0 ? 1 : 0
                acc.pendingAmount += group.stats.pendingAmount
                return acc
            },
            { totalServices: 0, expired: 0, dueSoon: 0, groupsWithDebt: 0, pendingAmount: 0 }
        )
    }, [groupedServices])

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-1 flex-col gap-2 md:flex-row">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Buscar servicio, cliente o contacto..."
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-full md:w-60">
                            <SelectValue placeholder="Filtrar por estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="pending">Con deuda</SelectItem>
                            <SelectItem value="expired">Vencidos</SelectItem>
                            <SelectItem value="due_soon">Por vencer</SelectItem>
                            <SelectItem value="active">Al día</SelectItem>
                            <SelectItem value="inactive">Inactivos</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button variant="outline" size="icon" onClick={fetchServices} className="h-10 w-10">
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <p className="text-sm text-gray-500">Servicios listados</p>
                        <Users className="h-4 w-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-semibold text-gray-900">{summary.totalServices}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <p className="text-sm text-gray-500">Servicios con deuda</p>
                        <XCircle className="h-4 w-4 text-red-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-semibold text-gray-900">{summary.expired + summary.dueSoon}</div>
                        <p className="text-xs text-gray-500">En {summary.groupsWithDebt} servicios</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <p className="text-sm text-gray-500">Por vencer</p>
                        <Clock className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-semibold text-gray-900">{summary.dueSoon}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <p className="text-sm text-gray-500">Monto pendiente a cobrar</p>
                        <XCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-semibold text-gray-900">{formatPrice(summary.pendingAmount)}</div>
                    </CardContent>
                </Card>
            </div>

            {loading ? (
                <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 py-12 text-sm text-gray-500">
                    Cargando servicios...
                </div>
            ) : groupedServices.length === 0 ? (
                <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 py-12 text-sm text-gray-500">
                    No hay servicios para mostrar con los filtros actuales.
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {groupedServices.map((group) => {
                        const isOpen = !!openGroups[group.id]
                        const pendingCount = group.stats.expired + group.stats.dueSoon

                        return (
                            <Collapsible
                                key={group.id}
                                open={isOpen}
                                onOpenChange={(value) =>
                                    setOpenGroups((prev) => ({
                                        ...prev,
                                        [group.id]: value,
                                    }))
                                }
                            >
                                <Card className="border border-gray-200">
                                    <CollapsibleTrigger asChild>
                                        <button className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left">
                                            <div className="flex flex-col">
                                                <div className="text-lg font-semibold text-gray-900">{group.name}</div>
                                                <div className="text-sm text-gray-500">
                                                    {group.stats.total} clientes • {pendingCount} con deuda
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge className="bg-red-100 text-red-700 border-red-200">
                                                    Vencidos {group.stats.expired}
                                                </Badge>
                                                <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                                                    Por vencer {group.stats.dueSoon}
                                                </Badge>
                                                <Badge className="bg-green-100 text-green-700 border-green-200">
                                                    Al día {group.stats.active}
                                                </Badge>
                                                <Badge className="bg-violet-100 text-violet-700 border-violet-200">
                                                    Pendiente {formatPrice(group.stats.pendingAmount)}
                                                </Badge>
                                                {isOpen ? (
                                                    <ChevronUp className="h-4 w-4 text-gray-500" />
                                                ) : (
                                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                                )}
                                            </div>
                                        </button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <CardContent className="pt-0">
                                            <div className="grid gap-3">
                                                {group.services.map((service) => {
                                                    const paymentStatus = getServicePaymentStatus(service)
                                                    const badge = getServiceStatusBadge(paymentStatus, service)
                                                    const BadgeIcon = badge.icon
                                                    const cycleConfig = getBillingCycleConfig(service.billing_cycle)
                                                    const pendingAmount =
                                                        paymentStatus === "expired" || paymentStatus === "due_soon"
                                                            ? parseFloat(service.amount) || 0
                                                            : 0
                                                    const dueDate = service.next_due_date
                                                        ? format(new Date(service.next_due_date), "dd MMM yyyy", { locale: es })
                                                        : "Sin vencimiento"

                                                    return (
                                                        <div
                                                            key={service.id}
                                                            className="grid gap-2 rounded-lg border border-gray-100 bg-white p-3 shadow-sm md:grid-cols-[2fr_1.2fr_1.1fr_1fr] md:items-center"
                                                        >
                                                            <div className="flex flex-col">
                                                                <div className="text-sm font-semibold text-gray-900">{getCustomerName(service)}</div>
                                                                <div className="text-xs text-gray-500">{service.name}</div>
                                                                {(service.customer?.person?.email || service.customer?.person?.phone) && (
                                                                    <div className="text-xs text-gray-400">
                                                                        {[service.customer?.person?.email, service.customer?.person?.phone]
                                                                            .filter(Boolean)
                                                                            .join(" · ")}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <Badge className={badge.className}>
                                                                    <span className="flex items-center gap-1">
                                                                        <BadgeIcon className="h-3 w-3" />
                                                                        {badge.label}
                                                                    </span>
                                                                </Badge>
                                                                <Badge className={cycleConfig.styles}>
                                                                    {cycleConfig.label}
                                                                </Badge>
                                                            </div>
                                                            <div className="flex flex-col items-start gap-1 text-xs text-gray-500">
                                                                <span>Vence: {dueDate}</span>
                                                                {pendingAmount > 0 && (
                                                                    <span className="text-xs font-semibold text-red-600">
                                                                        Pendiente: {formatPrice(pendingAmount)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center justify-between gap-2 md:justify-end">
                                                                <div className="text-sm font-semibold text-gray-900">
                                                                    {formatPrice(service.amount)}
                                                                </div>
                                                                {(paymentStatus === "expired" || paymentStatus === "due_soon") && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="text-violet-600 border-violet-200 hover:bg-violet-50"
                                                                        onClick={() => handleOpenPaymentDialog(service)}
                                                                    >
                                                                        <DollarSign className="h-3.5 w-3.5 mr-1" />
                                                                        Cobrar
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </CardContent>
                                    </CollapsibleContent>
                                </Card>
                            </Collapsible>
                        )
                    })}
                </div>
            )}
            <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-violet-600" />
                            Cobrar servicio
                        </DialogTitle>
                        <DialogDescription>
                            {paymentService
                                ? `Registrar pago para ${getCustomerName(paymentService)}`
                                : "Selecciona un servicio"}
                        </DialogDescription>
                    </DialogHeader>

                    {paymentService && (
                        <div className="space-y-4 py-4">
                            {userBranches.length > 1 && (
                                <div className="space-y-2">
                                    <Label htmlFor="branch">Sucursal</Label>
                                    <Select
                                        value={paymentForm.branch_id}
                                        onValueChange={(value) => setPaymentForm((prev) => ({ ...prev, branch_id: value }))}
                                    >
                                        <SelectTrigger>
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
                                        value={paymentForm.amount}
                                        onChange={(event) =>
                                            setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))
                                        }
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="payment_date">Fecha de pago</Label>
                                <Input
                                    id="payment_date"
                                    type="date"
                                    value={paymentForm.payment_date}
                                    onChange={(event) =>
                                        setPaymentForm((prev) => ({ ...prev, payment_date: event.target.value }))
                                    }
                                />
                            </div>

                            {paymentMethods.length > 0 && (
                                <div className="space-y-2">
                                    <Label htmlFor="payment_method">Metodo de pago</Label>
                                    <Select
                                        value={paymentForm.payment_method_id}
                                        onValueChange={(value) =>
                                            setPaymentForm((prev) => ({ ...prev, payment_method_id: value }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar metodo" />
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
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="notes">Notas (opcional)</Label>
                                <Textarea
                                    id="notes"
                                    rows={2}
                                    value={paymentForm.notes}
                                    onChange={(event) =>
                                        setPaymentForm((prev) => ({ ...prev, notes: event.target.value }))
                                    }
                                />
                            </div>

                            <div className="flex items-center space-x-2 pt-1">
                                <Checkbox
                                    id="renew_service"
                                    checked={paymentForm.renew_service}
                                    onCheckedChange={(checked) =>
                                        setPaymentForm((prev) => ({ ...prev, renew_service: checked as boolean }))
                                    }
                                />
                                <Label htmlFor="renew_service" className="text-sm font-normal cursor-pointer">
                                    Renovar servicio despues del pago
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
                            className="bg-violet-600 hover:bg-violet-700 text-white"
                            onClick={handleRegisterPayment}
                            disabled={paymentLoading || !paymentForm.amount}
                        >
                            {paymentLoading ? (
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <DollarSign className="h-4 w-4 mr-2" />
                            )}
                            Cobrar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
