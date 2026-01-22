"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, RefreshCw, Globe, Lock, Server, Wrench, Users } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Pagination from "@/components/ui/pagination"
import api from "@/lib/api"

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

const getServiceIcon = (name: string) => {
    const n = name.toLowerCase()
    if (n.includes("dominio")) return <Globe className="h-4 w-4 text-blue-500" />
    if (n.includes("ssl")) return <Lock className="h-4 w-4 text-green-500" />
    if (n.includes("hosting")) return <Server className="h-4 w-4 text-purple-500" />
    if (n.includes("soporte")) return <Wrench className="h-4 w-4 text-gray-500" />
    return <Server className="h-4 w-4 text-gray-500" />
}

const getPaymentStatusBadge = (nextDueDate: string | null, status: string) => {
    if (status !== "active") {
        return <Badge variant="secondary" className="text-xs">Suspendido</Badge>
    }
    
    if (!nextDueDate) {
        return <Badge variant="secondary" className="text-xs">Sin vencimiento</Badge>
    }

    const today = new Date()
    const dueDate = new Date(nextDueDate)
    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
        return (
            <Badge variant="destructive" className="text-xs">
                Vencido ({Math.abs(diffDays)}d)
            </Badge>
        )
    } else if (diffDays <= 30) {
        return (
            <Badge className="text-xs bg-yellow-500 hover:bg-yellow-600">
                Por vencer ({diffDays}d)
            </Badge>
        )
    } else {
        return (
            <Badge className="text-xs bg-green-500 hover:bg-green-600">
                Al día
            </Badge>
        )
    }
}

const getBillingCycleLabel = (cycle: string) => {
    const labels: Record<string, string> = {
        monthly: "Mensual",
        quarterly: "Trimestral",
        annual: "Anual",
        one_time: "Único"
    }
    return labels[cycle] || cycle
}

export default function ServicesCustomersView() {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [filterStatus, setFilterStatus] = useState<string>("all")
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

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
            setCustomers(response.data.data || [])
            setTotalPages(response.data.last_page || 1)
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

    return (
        <div className="space-y-6">
            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                                placeholder="Buscar por cliente, dominio o servicio..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="w-[180px]">
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
                </CardContent>
            </Card>

            {/* Customer Cards Grid */}
            {loading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader className="space-y-2">
                                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="h-10 bg-gray-200 rounded"></div>
                                    <div className="h-10 bg-gray-200 rounded"></div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : customers.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Users className="h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-500">No se encontraron clientes con servicios</p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {customers.map((customer) => (
                            <Card key={customer.id} className="hover:shadow-lg transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-lg text-gray-900">
                                                {customer.person.first_name} {customer.person.last_name}
                                            </h3>
                                            {customer.person.email && (
                                                <p className="text-sm text-gray-500 mt-1">
                                                    {customer.person.email}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-3">
                                    {/* Service Icons Row */}
                                    <div className="flex items-center gap-2 pb-3 border-b">
                                        <span className="text-xs font-medium text-gray-500">SERVICIOS ACTIVOS</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {customer.client_services.map((service) => (
                                            <div
                                                key={service.id}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                                                    service.status === "active"
                                                        ? "bg-green-50 border-green-200"
                                                        : "bg-gray-50 border-gray-200"
                                                }`}
                                            >
                                                {getServiceIcon(service.name)}
                                                <span className="text-sm font-medium text-gray-700">
                                                    {service.name}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Payment Status */}
                                    <div className="space-y-2 pt-2">
                                        <span className="text-xs font-medium text-gray-500">ESTADO DE PAGO</span>
                                        {customer.client_services.map((service) => (
                                            <div key={service.id} className="flex items-center justify-between text-sm">
                                                <span className="text-gray-600">{service.name}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500">
                                                        {getBillingCycleLabel(service.billing_cycle)}
                                                    </span>
                                                    {getPaymentStatusBadge(service.next_due_date, service.status)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center pt-4">
                            <Pagination
                                currentPage={currentPage}
                                lastPage={totalPages}
                                total={customers.length}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
