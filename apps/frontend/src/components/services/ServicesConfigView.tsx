"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ResizableTableHeader, ResizableTableCell } from "@/components/ui/resizable-table-header"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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
import {
    Plus,
    Pencil,
    Trash2,
    Search,
    RefreshCw,
    DollarSign,
    Globe,
    Lock,
    Server,
    Wrench,
    Shield,
    Cloud,
    Database,
    Monitor,
    Smartphone,
    Wifi,
    HardDrive,
    Mail,
    Package,
    FileText,
    Settings,
    Zap,
} from "lucide-react"
import Pagination from "@/components/ui/pagination"
import { useResizableColumns } from "@/hooks/useResizableColumns"
import api from "@/lib/api"
import { sileo } from "sileo"
import { getBillingCycleLabel, getBillingCycleBadgeStyles } from "@/utils/billingCycleUtils"

// Iconos disponibles para servicios
const SERVICE_ICONS = [
    { id: 'globe', icon: Globe, label: 'Dominio', color: 'text-blue-500' },
    { id: 'lock', icon: Lock, label: 'SSL', color: 'text-green-500' },
    { id: 'server', icon: Server, label: 'Hosting', color: 'text-purple-500' },
    { id: 'wrench', icon: Wrench, label: 'Soporte', color: 'text-orange-500' },
    { id: 'shield', icon: Shield, label: 'Seguridad', color: 'text-red-500' },
    { id: 'cloud', icon: Cloud, label: 'Cloud', color: 'text-sky-500' },
    { id: 'database', icon: Database, label: 'Base de datos', color: 'text-amber-500' },
    { id: 'monitor', icon: Monitor, label: 'Sistema', color: 'text-indigo-500' },
    { id: 'smartphone', icon: Smartphone, label: 'App Móvil', color: 'text-pink-500' },
    { id: 'wifi', icon: Wifi, label: 'Internet', color: 'text-cyan-500' },
    { id: 'hard-drive', icon: HardDrive, label: 'VPS', color: 'text-slate-500' },
    { id: 'mail', icon: Mail, label: 'Email', color: 'text-rose-500' },
    { id: 'package', icon: Package, label: 'Software', color: 'text-emerald-500' },
    { id: 'file-text', icon: FileText, label: 'Licencia', color: 'text-yellow-600' },
    { id: 'settings', icon: Settings, label: 'Mantenimiento', color: 'text-gray-500' },
    { id: 'zap', icon: Zap, label: 'Otros', color: 'text-violet-500' },
] as const

// Función para obtener el icono por ID
const getServiceIconById = (iconId: string | null) => {
    const iconData = SERVICE_ICONS.find(i => i.id === iconId)
    if (iconData) {
        const IconComponent = iconData.icon
        return <IconComponent className={`h-4 w-4 ${iconData.color}`} />
    }
    return <Package className="h-4 w-4 text-gray-400" />
}

interface ServiceType {
    id: number
    name: string
    description: string | null
    price: string
    billing_cycle: string
    icon: string | null
    is_active: boolean
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

export default function ServicesConfigView() {
    const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    // Resizable columns
    const columns = [
        { id: 'name', defaultWidth: 200, minWidth: 150 },
        { id: 'description', defaultWidth: 300, minWidth: 150 },
        { id: 'price', defaultWidth: 120, minWidth: 100 },
        { id: 'billing_cycle', defaultWidth: 120, minWidth: 100 },
        { id: 'status', defaultWidth: 120, minWidth: 100 },
        { id: 'actions', defaultWidth: 100, minWidth: 80 }
    ]

    const { getColumnHeaderProps, getColumnCellProps, getResizeHandleProps } = useResizableColumns({
        columns,
        storageKey: 'service-types-table-widths'
    })

    // Dialog states
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingService, setEditingService] = useState<ServiceType | null>(null)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [serviceToDelete, setServiceToDelete] = useState<ServiceType | null>(null)

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        price: "",
        billing_cycle: "monthly",
        icon: "",
        is_active: true,
    })

    const fetchServiceTypes = async () => {
        try {
            setLoading(true)
            const params: Record<string, string | number> = {
                page: currentPage,
                per_page: 15,
            }
            if (searchTerm) params.search = searchTerm

            const response = await api.get("/service-types", { params })
            const list = normalizeArrayResponse<ServiceType>(response.data)
            setServiceTypes(list)
            setTotalPages(getLastPage(response.data))
        } catch (error) {
            console.error("Error fetching service types:", error)
            sileo.error({ title: "Error al cargar los servicios" })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchServiceTypes()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, searchTerm])

    const handleCreate = () => {
        setEditingService(null)
        setFormData({
            name: "",
            description: "",
            price: "",
            billing_cycle: "monthly",
            icon: "",
            is_active: true,
        })
        setDialogOpen(true)
    }

    const handleEdit = (service: ServiceType) => {
        setEditingService(service)
        setFormData({
            name: service.name,
            description: service.description || "",
            price: service.price,
            billing_cycle: service.billing_cycle,
            icon: service.icon || "",
            is_active: service.is_active,
        })
        setDialogOpen(true)
    }

    const handleSave = async () => {
        try {
            if (!formData.name || !formData.price) {
                sileo.error({ title: "Completa los campos requeridos" })
                return
            }

            if (editingService) {
                await api.put(`/service-types/${editingService.id}`, formData)
                sileo.success({ title: "Servicio actualizado exitosamente" })
            } else {
                await api.post("/service-types", formData)
                sileo.success({ title: "Servicio creado exitosamente" })
            }

            setDialogOpen(false)
            fetchServiceTypes()
        } catch (error) {
            console.error("Error saving service:", error)
            sileo.error({ title: (error as { response?: { data?: { message?: string } } }).response?.data?.message || "Error al guardar el servicio" })
        }
    }

    const handleDeleteClick = (service: ServiceType) => {
        setServiceToDelete(service)
        setDeleteDialogOpen(true)
    }

    const handleConfirmDelete = async () => {
        if (!serviceToDelete) return

        try {
            await api.delete(`/service-types/${serviceToDelete.id}`)
            sileo.success({ title: "Servicio eliminado exitosamente" })
            setDeleteDialogOpen(false)
            setServiceToDelete(null)
            fetchServiceTypes()
        } catch (error) {
            console.error("Error deleting service:", error)
            sileo.error({ title: (error as { response?: { data?: { message?: string } } }).response?.data?.message || "Error al eliminar el servicio" })
        }
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Tipos de Servicios</h2>
                    <p className="text-muted-foreground text-sm">
                        Configura los servicios disponibles para asignar a tus clientes
                    </p>
                </div>
                <Button onClick={handleCreate} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nuevo Servicio
                </Button>
            </div>

            {/* Buscar */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-1 items-center">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Buscar servicios..."
                            className="w-full pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={fetchServiceTypes}
                                disabled={loading}
                            >
                                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Actualizar</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {/* Tabla */}
            <div className="rounded-md border overflow-hidden">
                {serviceTypes.length === 0 ? (
                    <div className="flex h-32 items-center justify-center text-center text-muted-foreground">
                        {loading ? "Cargando servicios..." : "No se encontraron servicios"}
                    </div>
                ) : (
                    <div className="relative w-full overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <ResizableTableHeader
                                        columnId="name"
                                        getResizeHandleProps={getResizeHandleProps}
                                        getColumnHeaderProps={getColumnHeaderProps}
                                    >
                                        Nombre
                                    </ResizableTableHeader>
                                    <ResizableTableHeader
                                        columnId="description"
                                        getResizeHandleProps={getResizeHandleProps}
                                        getColumnHeaderProps={getColumnHeaderProps}
                                    >
                                        Descripción
                                    </ResizableTableHeader>
                                    <ResizableTableHeader
                                        columnId="price"
                                        getResizeHandleProps={getResizeHandleProps}
                                        getColumnHeaderProps={getColumnHeaderProps}
                                    >
                                        Precio
                                    </ResizableTableHeader>
                                    <ResizableTableHeader
                                        columnId="billing_cycle"
                                        getResizeHandleProps={getResizeHandleProps}
                                        getColumnHeaderProps={getColumnHeaderProps}
                                    >
                                        Ciclo
                                    </ResizableTableHeader>
                                    <ResizableTableHeader
                                        columnId="status"
                                        getResizeHandleProps={getResizeHandleProps}
                                        getColumnHeaderProps={getColumnHeaderProps}
                                    >
                                        Estado
                                    </ResizableTableHeader>
                                    <ResizableTableHeader
                                        columnId="actions"
                                        getResizeHandleProps={getResizeHandleProps}
                                        getColumnHeaderProps={getColumnHeaderProps}
                                        className="text-right"
                                    >
                                        Acciones
                                    </ResizableTableHeader>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {serviceTypes.map((service) => (
                                    <TableRow key={service.id} className="hover:bg-slate-50">
                                        <ResizableTableCell
                                            columnId="name"
                                            getColumnCellProps={getColumnCellProps}
                                            className="py-4"
                                        >
                                            <div className="flex items-center gap-2">
                                                {getServiceIconById(service.icon)}
                                                <span className="font-medium">{service.name}</span>
                                            </div>
                                        </ResizableTableCell>
                                        <ResizableTableCell
                                            columnId="description"
                                            getColumnCellProps={getColumnCellProps}
                                            className="text-sm text-muted-foreground py-4"
                                        >
                                            {service.description || "-"}
                                        </ResizableTableCell>
                                        <ResizableTableCell
                                            columnId="price"
                                            getColumnCellProps={getColumnCellProps}
                                            className="py-4"
                                        >
                                            <div className="flex items-center gap-1 text-green-600 font-semibold">
                                                <DollarSign className="h-4 w-4" />
                                                {parseFloat(service.price).toFixed(2)}
                                            </div>
                                        </ResizableTableCell>
                                        <ResizableTableCell
                                            columnId="billing_cycle"
                                            getColumnCellProps={getColumnCellProps}
                                            className="py-4"
                                        >
                                            <Badge variant="outline" className={getBillingCycleBadgeStyles(service.billing_cycle)}>
                                                {getBillingCycleLabel(service.billing_cycle)}
                                            </Badge>
                                        </ResizableTableCell>
                                        <ResizableTableCell
                                            columnId="status"
                                            getColumnCellProps={getColumnCellProps}
                                            className="py-4"
                                        >
                                            <Badge
                                                className={
                                                    service.is_active
                                                        ? "bg-green-100 text-green-700 border border-green-300 hover:bg-green-100"
                                                        : "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-100"
                                                }
                                            >
                                                {service.is_active ? "Activo" : "Inactivo"}
                                            </Badge>
                                        </ResizableTableCell>
                                        <ResizableTableCell
                                            columnId="actions"
                                            getColumnCellProps={getColumnCellProps}
                                            className="text-right py-4"
                                        >
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEdit(service)}
                                                    className="h-8 w-8 text-orange-500 hover:text-orange-700 hover:bg-orange-50"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteClick(service)}
                                                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </ResizableTableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center">
                    <Pagination
                        currentPage={currentPage}
                        lastPage={totalPages}
                        total={serviceTypes.length}
                        onPageChange={setCurrentPage}
                    />
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingService ? "Editar Servicio" : "Nuevo Servicio"}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {/* Nombre */}
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ej: Hosting Web, SSL, Dominio"
                            />
                        </div>

                        {/* Descripción */}
                        <div className="space-y-2">
                            <Label htmlFor="description">Descripción</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Descripción del servicio"
                                rows={2}
                            />
                        </div>

                        {/* Precio y Ciclo */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="price">Precio *</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    placeholder="0.00"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="billing_cycle">Ciclo</Label>
                                <Select
                                    value={formData.billing_cycle}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, billing_cycle: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="monthly">Mensual</SelectItem>
                                        <SelectItem value="quarterly">Trimestral</SelectItem>
                                        <SelectItem value="annual">Anual</SelectItem>
                                        <SelectItem value="biennial">Bienal</SelectItem>
                                        <SelectItem value="one_time">Único</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Selector de Icono */}
                        <div className="space-y-2">
                            <Label>Icono</Label>
                            <div className="grid grid-cols-8 gap-2 p-2 border rounded-lg max-h-[100px] overflow-y-auto">
                                {SERVICE_ICONS.map(({ id, icon: Icon, label, color }) => (
                                    <TooltipProvider key={id}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, icon: id })}
                                                    className={`flex items-center justify-center p-2 rounded transition-all border-2 ${formData.icon === id
                                                        ? 'border-blue-500 bg-blue-50'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                        }`}
                                                >
                                                    <Icon className={`h-5 w-5 ${formData.icon === id ? 'text-blue-600' : color}`} />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" className="text-xs">
                                                {label}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                ))}
                            </div>
                        </div>

                        {/* Switch Estado Activo */}
                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <Label htmlFor="is_active" className="cursor-pointer">
                                Servicio activo
                            </Label>
                            <Switch
                                id="is_active"
                                checked={formData.is_active}
                                onCheckedChange={(checked) =>
                                    setFormData({ ...formData, is_active: checked })
                                }
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave}>
                            {editingService ? "Guardar Cambios" : "Crear"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar servicio?</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Estás seguro de que deseas eliminar el servicio "{serviceToDelete?.name}"?
                            Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
