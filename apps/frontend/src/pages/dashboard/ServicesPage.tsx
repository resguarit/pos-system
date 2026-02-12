"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
    AlertTriangle,
    CheckCircle,
    Clock,
    Edit,
    Eye,
    List,
    LayoutGrid,
    Plus,
    RefreshCw,
    RotateCw,
    Search,
    Server,
    Trash2,
    TrendingUp,
    Globe,
    Lock,
    FileBadge,
    Wrench,
    Package,
    Video,
    Copyright,
    Link,
    DollarSign,
} from "lucide-react"
import ServicesStatusCard from "@/components/cards/ServicesStatusCard"
import useServices, { ClientService, CreateServiceData } from "@/hooks/useServices"
import Pagination from "@/components/ui/pagination"
import { getBillingCycleLabel } from "@/utils/billingCycleUtils"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Get due status and styling
const getDueStatus = (nextDueDate: string | null, status: string) => {
    if (status !== "active") return { label: status === "suspended" ? "Suspendido" : "Cancelado", color: "bg-gray-50 text-gray-600", days: 0, type: "inactive" }
    if (!nextDueDate) return { label: "Sin vencimiento", color: "bg-gray-50 text-gray-600", days: 0, type: "none" }

    const today = new Date()
    const dueDate = new Date(nextDueDate)
    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
        return { label: "Vencido", color: "bg-red-50 text-red-700 border-red-200", days: Math.abs(diffDays), type: "expired" }
    } else if (diffDays <= 30) {
        return { label: "Por vencer", color: "bg-yellow-50 text-yellow-700 border-yellow-200", days: diffDays, type: "due_soon" }
    } else {
        return { label: "Vigente", color: "bg-green-50 text-green-700 border-green-200", days: diffDays, type: "active" }
    }
}

// Icon mapping based on service name
const getServiceIcon = (name: string) => {
    const n = name.toLowerCase()
    if (n.includes("dominio")) return <Globe className="h-4 w-4 text-blue-500" />
    if (n.includes("ssl")) return <Lock className="h-4 w-4 text-green-500" />
    if (n.includes("hosting")) return <Server className="h-4 w-4 text-purple-500" />
    if (n.includes("fiscal")) return <FileBadge className="h-4 w-4 text-orange-500" />
    if (n.includes("web")) return <Globe className="h-4 w-4 text-indigo-500" />
    if (n.includes("soporte")) return <Wrench className="h-4 w-4 text-gray-500" />
    if (n.includes("stock")) return <Package className="h-4 w-4 text-amber-500" />
    if (n.includes("camara") || n.includes("alarma")) return <Video className="h-4 w-4 text-red-500" />
    if (n.includes("marca")) return <Copyright className="h-4 w-4 text-pink-500" />
    if (n.includes("noip")) return <Link className="h-4 w-4 text-cyan-500" />
    return <Server className="h-4 w-4 text-gray-500" />
}

export default function ServicesPage() {
    const {
        services,
        stats,
        customers,
        loading,
        statsLoading,
        currentPage,
        totalPages,
        totalItems,
        setCurrentPage,
        filters,
        setFilters,
        createService,
        updateService,
        deleteService,
        renewService,
        getPayments,
        refresh,
    } = useServices()

    // View mode
    const [viewMode, setViewMode] = useState<"table" | "cards">("table")

    // Create/Edit dialog
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingService, setEditingService] = useState<ClientService | null>(null)
    const [formData, setFormData] = useState<Partial<CreateServiceData>>({
        name: "",
        description: "",
        amount: 0,
        billing_cycle: "monthly",
        start_date: format(new Date(), 'yyyy-MM-dd'),
        next_due_date: "",
        status: "active",
    })
    const [dateMode, setDateMode] = useState<"start_date" | "next_due_date">("start_date")

    // Detail dialog
    const [detailOpen, setDetailOpen] = useState(false)
    const [selectedService, setSelectedService] = useState<ClientService | null>(null)
    const [payments, setPayments] = useState<{ id: number; amount: string; payment_date: string; notes: string | null }[]>([])
    const [paymentsLoading, setPaymentsLoading] = useState(false)

    // Delete confirmation
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [serviceToDelete, setServiceToDelete] = useState<ClientService | null>(null)

    // Handle filter changes
    const handleSearchChange = (value: string) => {
        setFilters((f) => ({ ...f, search: value }))
    }

    const handleStatusFilterChange = (value: string) => {
        if (value === "todos") {
            setFilters((f) => ({ ...f, status: undefined, due_status: undefined }))
        } else if (value === "vencidos" || value === "por-vencer") {
            setFilters((f) => ({ ...f, status: undefined, due_status: value }))
        } else {
            setFilters((f) => ({ ...f, status: value, due_status: undefined }))
        }
    }

    // Open create dialog
    const handleCreate = () => {
        setEditingService(null)
        setFormData({
            customer_id: undefined,
            name: "",
            description: "",
            amount: 0,
            billing_cycle: "monthly",
            start_date: format(new Date(), 'yyyy-MM-dd'),
            next_due_date: "",
            status: "active",
        })
        setDateMode("start_date")
        setDialogOpen(true)
    }

    // Open edit dialog
    const handleEdit = (service: ClientService) => {
        setEditingService(service)
        setFormData({
            customer_id: service.customer_id,
            name: service.name,
            description: service.description || "",
            amount: parseFloat(service.amount),
            billing_cycle: service.billing_cycle,
            start_date: service.start_date,
            next_due_date: service.next_due_date,
            status: service.status,
        })
        setDateMode("start_date")
        setDialogOpen(true)
    }

    // Save service
    const handleSave = async () => {
        if (!formData.customer_id || !formData.name || !formData.amount) {
            return
        }

        if (dateMode === "start_date" && !formData.start_date) {
            return
        }

        if (dateMode === "next_due_date" && !formData.next_due_date) {
            return
        }

        const datePayload = dateMode === "next_due_date"
            ? { next_due_date: formData.next_due_date }
            : { start_date: formData.start_date }

        const payload = {
            customer_id: formData.customer_id,
            name: formData.name,
            description: formData.description,
            amount: formData.amount,
            billing_cycle: formData.billing_cycle,
            status: formData.status,
            ...datePayload,
        } as CreateServiceData

        if (editingService) {
            const updated = await updateService(editingService.id, payload)
            if (updated) {
                setDialogOpen(false)
                refresh()
            }
        } else {
            const created = await createService(payload)
            if (created) {
                setDialogOpen(false)
                refresh()
            }
        }
    }

    // View detail
    const handleViewDetail = async (service: ClientService) => {
        setSelectedService(service)
        setDetailOpen(true)
        setPaymentsLoading(true)
        const paymentData = await getPayments(service.id)
        setPayments(paymentData)
        setPaymentsLoading(false)
    }

    // Renew service
    const handleRenew = async (service: ClientService) => {
        const renewed = await renewService(service.id)
        if (renewed) {
            refresh()
            if (selectedService?.id === service.id) {
                setSelectedService(renewed)
                const paymentData = await getPayments(service.id)
                setPayments(paymentData)
            }
        }
    }

    // Delete service
    const handleDeleteConfirm = async () => {
        if (!serviceToDelete) return
        const success = await deleteService(serviceToDelete.id)
        if (success) {
            setDeleteDialogOpen(false)
            setServiceToDelete(null)
            refresh()
        }
    }

    // Format currency
    const formatCurrency = (amount: string | number) => {
        const num = typeof amount === "string" ? parseFloat(amount) : amount
        return `$${num.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }

    // Get customer name
    const getCustomerName = (service: ClientService) => {
        if (!service.customer?.person) return "N/A"
        return `${service.customer.person.first_name} ${service.customer.person.last_name}`
    }

    return (
        <div className="h-full w-full flex flex-col space-y-6 p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Gestión de Servicios
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Administra los servicios recurrentes de tus clientes
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* View Toggle */}
                    <div className="flex items-center border rounded-md">
                        <Button
                            variant={viewMode === "table" ? "secondary" : "ghost"}
                            size="sm"
                            className="rounded-r-none"
                            onClick={() => setViewMode("table")}
                        >
                            <List className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === "cards" ? "secondary" : "ghost"}
                            size="sm"
                            className="rounded-l-none"
                            onClick={() => setViewMode("cards")}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                    </div>

                    <Button variant="outline" size="icon" onClick={refresh} disabled={loading} title="Refrescar">
                        <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>

                    <Button onClick={handleCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Servicio
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <ServicesStatusCard
                    title="Total Servicios"
                    icon={<Server className="h-4 w-4 text-blue-600" />}
                    value={stats.total}
                    subtitle="En el sistema"
                    loading={statsLoading}
                />
                <ServicesStatusCard
                    title="Activos"
                    icon={<CheckCircle className="h-4 w-4 text-green-600" />}
                    value={stats.active}
                    subtitle="Vigentes"
                    loading={statsLoading}
                    className="border-l-4 border-l-green-500"
                />
                <ServicesStatusCard
                    title="Por Vencer"
                    icon={<Clock className="h-4 w-4 text-yellow-600" />}
                    value={stats.due_soon}
                    subtitle="En 30 días"
                    loading={statsLoading}
                    className="border-l-4 border-l-yellow-500"
                    onClick={() => handleStatusFilterChange("por-vencer")}
                />
                <ServicesStatusCard
                    title="Vencidos"
                    icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
                    value={stats.expired}
                    subtitle="Requieren atención"
                    loading={statsLoading}
                    className="border-l-4 border-l-red-500"
                    onClick={() => handleStatusFilterChange("vencidos")}
                />
            </div>

            {/* Revenue Cards */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ingresos Mensuales</CardTitle>
                        <DollarSign className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-700">
                            {statsLoading ? "..." : formatCurrency(stats.monthly_revenue)}
                        </div>
                        <p className="text-xs text-muted-foreground">Servicios mensuales activos</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ingresos Anuales</CardTitle>
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-700">
                            {statsLoading ? "..." : formatCurrency(stats.annual_revenue)}
                        </div>
                        <p className="text-xs text-muted-foreground">Servicios anuales activos</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar por cliente o servicio..."
                        className="pl-9"
                        value={filters.search || ""}
                        onChange={(e) => handleSearchChange(e.target.value)}
                    />
                </div>
                <Select
                    value={filters.due_status || filters.status || "todos"}
                    onValueChange={handleStatusFilterChange}
                >
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filtrar por estado" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="todos">Todos los estados</SelectItem>
                        <SelectItem value="active">Activos</SelectItem>
                        <SelectItem value="suspended">Suspendidos</SelectItem>
                        <SelectItem value="cancelled">Cancelados</SelectItem>
                        <SelectItem value="por-vencer">Por vencer (30 días)</SelectItem>
                        <SelectItem value="vencidos">Vencidos</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Content */}
            {viewMode === "table" ? (
                <Card>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Servicio</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Vencimiento</TableHead>
                                    <TableHead>Precio</TableHead>
                                    <TableHead>Ciclo</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-10">
                                            <RotateCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                                            Cargando...
                                        </TableCell>
                                    </TableRow>
                                ) : services.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                            No se encontraron servicios
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    services.map((service) => {
                                        const dueStatus = getDueStatus(service.next_due_date, service.status)
                                        return (
                                            <TableRow key={service.id} className="hover:bg-muted/50">
                                                <TableCell className="font-medium">{getCustomerName(service)}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {getServiceIcon(service.name)}
                                                        <span>{service.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={dueStatus.color}>
                                                        {dueStatus.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        {service.next_due_date
                                                            ? format(new Date(service.next_due_date), "dd/MM/yyyy", { locale: es })
                                                            : "-"}
                                                        {dueStatus.type === "expired" && (
                                                            <div className="text-xs text-red-600">Hace {dueStatus.days} días</div>
                                                        )}
                                                        {dueStatus.type === "due_soon" && (
                                                            <div className="text-xs text-yellow-600">En {dueStatus.days} días</div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{formatCurrency(service.amount)}</TableCell>
                                                <TableCell className="capitalize">
                                                    {getBillingCycleLabel(service.billing_cycle)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="hover:bg-blue-100"
                                                            onClick={() => handleViewDetail(service)}
                                                            title="Ver detalle"
                                                        >
                                                            <Eye className="h-4 w-4 text-blue-600" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="hover:bg-orange-100"
                                                            onClick={() => handleEdit(service)}
                                                            title="Editar"
                                                        >
                                                            <Edit className="h-4 w-4 text-orange-600" />
                                                        </Button>
                                                        {service.billing_cycle !== "one_time" && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="hover:bg-green-100"
                                                                onClick={() => handleRenew(service)}
                                                                title="Renovar"
                                                            >
                                                                <RefreshCw className="h-4 w-4 text-green-600" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="hover:bg-red-100"
                                                            onClick={() => {
                                                                setServiceToDelete(service)
                                                                setDeleteDialogOpen(true)
                                                            }}
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 className="h-4 w-4 text-red-600" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    {totalPages > 1 && (
                        <div className="p-4 border-t">
                            <Pagination
                                currentPage={currentPage}
                                lastPage={totalPages}
                                total={totalItems}
                                itemName="servicios"
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    )}
                </Card>
            ) : (
                // Cards View
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {loading ? (
                        <div className="col-span-full text-center py-10">
                            <RotateCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                            Cargando...
                        </div>
                    ) : services.length === 0 ? (
                        <div className="col-span-full text-center py-10 text-muted-foreground">
                            No se encontraron servicios
                        </div>
                    ) : (
                        services.map((service) => {
                            const dueStatus = getDueStatus(service.next_due_date, service.status)
                            return (
                                <Card key={service.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                                    <div className={`h-1 ${dueStatus.type === "expired" ? "bg-red-500" : dueStatus.type === "due_soon" ? "bg-yellow-500" : "bg-green-500"}`} />
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center justify-between">
                                            <Badge variant="outline" className="text-xs">
                                                {getCustomerName(service)}
                                            </Badge>
                                            <Badge variant="outline" className={dueStatus.color}>
                                                {dueStatus.label}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            {getServiceIcon(service.name)}
                                            <span className="font-semibold">{service.name}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <span className="text-muted-foreground">Vence:</span>
                                                <div className="font-medium">
                                                    {service.next_due_date
                                                        ? format(new Date(service.next_due_date), "dd/MM/yyyy", { locale: es })
                                                        : "-"}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Precio:</span>
                                                <div className="font-medium">{formatCurrency(service.amount)}</div>
                                            </div>
                                        </div>
                                        {dueStatus.type === "expired" && (
                                            <div className="text-xs text-red-600 font-medium">
                                                ⚠️ Vencido hace {dueStatus.days} días
                                            </div>
                                        )}
                                        {dueStatus.type === "due_soon" && (
                                            <div className="text-xs text-yellow-600 font-medium">
                                                ⏰ Vence en {dueStatus.days} días
                                            </div>
                                        )}
                                        <div className="flex justify-end gap-1 pt-2 border-t">
                                            <Button variant="ghost" size="sm" onClick={() => handleViewDetail(service)}>
                                                <Eye className="h-4 w-4 mr-1" /> Ver
                                            </Button>
                                            {service.billing_cycle !== "one_time" && (
                                                <Button variant="ghost" size="sm" onClick={() => handleRenew(service)}>
                                                    <RefreshCw className="h-4 w-4 mr-1" /> Renovar
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })
                    )}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingService ? "Editar Servicio" : "Nuevo Servicio"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Cliente *</Label>
                            <Select
                                value={formData.customer_id?.toString() || ""}
                                onValueChange={(v) => setFormData((f) => ({ ...f, customer_id: parseInt(v) }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar cliente" />
                                </SelectTrigger>
                                <SelectContent>
                                    {customers.map((c) => (
                                        <SelectItem key={c.id} value={c.id.toString()}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Nombre del Servicio *</Label>
                            <Input
                                value={formData.name || ""}
                                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                                placeholder="Ej: Hosting Web, Dominio .com"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Monto *</Label>
                                <Input
                                    type="number"
                                    value={formData.amount || ""}
                                    onChange={(e) => setFormData((f) => ({ ...f, amount: parseFloat(e.target.value) }))}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Ciclo de Facturación</Label>
                                <Select
                                    value={formData.billing_cycle}
                                    onValueChange={(v: "monthly" | "annual" | "one_time") => setFormData((f) => ({ ...f, billing_cycle: v }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="monthly">Mensual</SelectItem>
                                        <SelectItem value="annual">Anual</SelectItem>
                                        <SelectItem value="one_time">Único</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <Label className="text-sm font-medium">Fecha</Label>
                            <RadioGroup
                                value={dateMode}
                                onValueChange={(value) => setDateMode(value as "start_date" | "next_due_date")}
                                className="grid gap-2 sm:grid-cols-2"
                            >
                                <div className="flex items-center space-x-2 rounded-md border p-3">
                                    <RadioGroupItem value="start_date" id="service-start-date" />
                                    <Label htmlFor="service-start-date" className="cursor-pointer">
                                        Fecha de inicio
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2 rounded-md border p-3">
                                    <RadioGroupItem value="next_due_date" id="service-next-due" />
                                    <Label htmlFor="service-next-due" className="cursor-pointer">
                                        Proximo vencimiento
                                    </Label>
                                </div>
                            </RadioGroup>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{dateMode === "start_date" ? "Fecha Inicio" : "Proximo Vencimiento"}</Label>
                                    <Input
                                        type="date"
                                        value={dateMode === "start_date" ? (formData.start_date || "") : (formData.next_due_date || "")}
                                        onChange={(e) =>
                                            setFormData((f) => ({
                                                ...f,
                                                ...(dateMode === "start_date"
                                                    ? { start_date: e.target.value }
                                                    : { next_due_date: e.target.value }),
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Estado</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(v: "active" | "suspended" | "cancelled") => setFormData((f) => ({ ...f, status: v }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Activo</SelectItem>
                                            <SelectItem value="suspended">Suspendido</SelectItem>
                                            <SelectItem value="cancelled">Cancelado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Descripción / Notas</Label>
                            <Textarea
                                value={formData.description || ""}
                                onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                                placeholder="Detalles adicionales..."
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} disabled={!formData.customer_id || !formData.name}>
                            {editingService ? "Guardar" : "Crear"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Detail Dialog */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {selectedService && getServiceIcon(selectedService.name)}
                            {selectedService?.name}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedService && (
                        <div className="space-y-6">
                            {/* Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-sm text-muted-foreground">Cliente</span>
                                    <div className="font-medium">{getCustomerName(selectedService)}</div>
                                </div>
                                <div>
                                    <span className="text-sm text-muted-foreground">Estado</span>
                                    <div>
                                        <Badge variant="outline" className={getDueStatus(selectedService.next_due_date, selectedService.status).color}>
                                            {getDueStatus(selectedService.next_due_date, selectedService.status).label}
                                        </Badge>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-sm text-muted-foreground">Próximo Vencimiento</span>
                                    <div className="font-medium">
                                        {selectedService.next_due_date
                                            ? format(new Date(selectedService.next_due_date), "dd/MM/yyyy", { locale: es })
                                            : "-"}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-sm text-muted-foreground">Monto</span>
                                    <div className="font-medium text-lg">{formatCurrency(selectedService.amount)}</div>
                                </div>
                            </div>

                            {selectedService.description && (
                                <div>
                                    <span className="text-sm text-muted-foreground">Descripción</span>
                                    <p className="mt-1">{selectedService.description}</p>
                                </div>
                            )}

                            {/* Payment History */}
                            <div>
                                <h4 className="font-semibold mb-3">Historial de Pagos</h4>
                                {paymentsLoading ? (
                                    <div className="text-center py-4 text-muted-foreground">Cargando...</div>
                                ) : payments.length === 0 ? (
                                    <div className="text-center py-4 text-muted-foreground">Sin pagos registrados</div>
                                ) : (
                                    <div className="border rounded-md max-h-48 overflow-y-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Fecha</TableHead>
                                                    <TableHead>Monto</TableHead>
                                                    <TableHead>Notas</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {payments.map((p) => (
                                                    <TableRow key={p.id}>
                                                        <TableCell>
                                                            {format(new Date(p.payment_date), "dd/MM/yyyy", { locale: es })}
                                                        </TableCell>
                                                        <TableCell>{formatCurrency(p.amount)}</TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">{p.notes || "-"}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button variant="outline" onClick={() => handleEdit(selectedService)}>
                                    <Edit className="h-4 w-4 mr-1" /> Editar
                                </Button>
                                {selectedService.billing_cycle !== "one_time" && (
                                    <Button onClick={() => handleRenew(selectedService)}>
                                        <RefreshCw className="h-4 w-4 mr-1" /> Renovar
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar servicio?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará el servicio{" "}
                            <strong>{serviceToDelete?.name}</strong> del sistema.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
