"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { Plus, Edit, Trash2, Search, RefreshCw, DollarSign } from "lucide-react"
import Pagination from "@/components/ui/pagination"
import api from "@/lib/api"
import { toast } from "sonner"

interface ServiceType {
    id: number
    name: string
    description: string | null
    price: string
    billing_cycle: string
    icon: string | null
    is_active: boolean
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

export default function ServicesConfigView() {
    const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

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
            setServiceTypes(response.data.data || response.data || [])
            setTotalPages(response.data.last_page || 1)
        } catch (error) {
            console.error("Error fetching service types:", error)
            toast.error("Error al cargar los servicios")
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
                toast.error("Completa los campos requeridos")
                return
            }

            if (editingService) {
                await api.put(`/service-types/${editingService.id}`, formData)
                toast.success("Servicio actualizado exitosamente")
            } else {
                await api.post("/service-types", formData)
                toast.success("Servicio creado exitosamente")
            }

            setDialogOpen(false)
            fetchServiceTypes()
        } catch (error) {
            console.error("Error saving service:", error)
            toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message || "Error al guardar el servicio")
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
            toast.success("Servicio eliminado exitosamente")
            setDeleteDialogOpen(false)
            setServiceToDelete(null)
            fetchServiceTypes()
        } catch (error) {
            console.error("Error deleting service:", error)
            toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message || "Error al eliminar el servicio")
        }
    }

    return (
        <div className="space-y-6">
            {/* Filters & Actions */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                                placeholder="Buscar servicios..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={fetchServiceTypes}
                                disabled={loading}
                            >
                                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                            </Button>
                            <Button onClick={handleCreate}>
                                <Plus className="h-4 w-4 mr-2" />
                                Nuevo Servicio
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Services Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Descripción</TableHead>
                                    <TableHead>Precio</TableHead>
                                    <TableHead>Ciclo de Facturación</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8">
                                            <div className="flex items-center justify-center">
                                                <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : serviceTypes.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                            No se encontraron servicios
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    serviceTypes.map((service) => (
                                        <TableRow key={service.id}>
                                            <TableCell className="font-medium">{service.name}</TableCell>
                                            <TableCell className="text-sm text-gray-600">
                                                {service.description || "-"}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <DollarSign className="h-4 w-4 text-gray-500" />
                                                    <span className="font-medium">{service.price}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {getBillingCycleLabel(service.billing_cycle)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={service.is_active ? "default" : "secondary"}
                                                >
                                                    {service.is_active ? "Activo" : "Inactivo"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEdit(service)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteClick(service)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

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
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ej: Hosting Web, SSL, Dominio"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Descripción</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Descripción del servicio"
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
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

                            <div className="grid gap-2">
                                <Label htmlFor="billing_cycle">Ciclo de Facturación</Label>
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
                                        <SelectItem value="one_time">Único</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="icon">Icono (opcional)</Label>
                            <Input
                                id="icon"
                                value={formData.icon}
                                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                placeholder="Ej: globe, lock, server"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={formData.is_active}
                                onChange={(e) =>
                                    setFormData({ ...formData, is_active: e.target.checked })
                                }
                                className="h-4 w-4"
                            />
                            <Label htmlFor="is_active" className="cursor-pointer">
                                Servicio activo
                            </Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave}>
                            {editingService ? "Guardar Cambios" : "Crear Servicio"}
                        </Button>
                    </DialogFooter>
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
