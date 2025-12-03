import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { ResizableTableHeader } from '@/components/ui/resizable-table-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, RotateCw, Search, Pencil, Trash2, CreditCard, Percent } from "lucide-react"
import { useEffect, useState, useCallback } from "react"
import useApi from "@/hooks/useApi"
import { useAuth } from "@/hooks/useAuth"
import Pagination from "@/components/ui/pagination"
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { PaymentMethod } from "@/types/sale"
import { Textarea } from "@/components/ui/textarea"

interface PaymentMethodForm extends Omit<PaymentMethod, 'id'> {
    id?: number
}

export default function PaymentMethodsPage() {
    const { request, loading } = useApi()
    const { hasPermission } = useAuth()

    // Configuración de columnas redimensionables
    const columnConfig = [
        { id: 'name', minWidth: 150, maxWidth: 300, defaultWidth: 200 },
        { id: 'description', minWidth: 200, maxWidth: 400, defaultWidth: 300 },
        { id: 'discount', minWidth: 100, maxWidth: 150, defaultWidth: 120 },
        { id: 'affects_cash', minWidth: 100, maxWidth: 150, defaultWidth: 120 },
        { id: 'status', minWidth: 80, maxWidth: 120, defaultWidth: 100 },
        { id: 'actions', minWidth: 100, maxWidth: 150, defaultWidth: 120 }
    ];

    const {
        getResizeHandleProps,
        getColumnHeaderProps,
        tableRef
    } = useResizableColumns({
        columns: columnConfig,
        storageKey: 'payment-methods-column-widths',
        defaultWidth: 150
    });

    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
    const [searchText, setSearchText] = useState("")
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [methodToDelete, setMethodToDelete] = useState<number | null>(null)
    const [formData, setFormData] = useState<PaymentMethodForm>({
        name: '',
        description: '',
        is_active: true,
        affects_cash: false,
        discount_percentage: 0
    })
    const [isEditMode, setIsEditMode] = useState(false)

    // Estados de paginación
    const [currentPage, setCurrentPage] = useState(1)
    const [totalItems, setTotalItems] = useState(0)
    const [totalPages, setTotalPages] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [allPaymentMethods, setAllPaymentMethods] = useState<PaymentMethod[]>([])

    const fetchPaymentMethods = useCallback(async (page = 1, signal?: AbortSignal) => {
        try {
            const response = await request({
                method: 'GET',
                url: "/payment-methods?all=true",
                signal
            })

            let allMethodsData: PaymentMethod[] = []

            if (response?.data?.data) {
                allMethodsData = Array.isArray(response.data.data) ? response.data.data : []
            } else if (response?.data && Array.isArray(response.data)) {
                allMethodsData = response.data
            }

            // Filtrar por búsqueda si existe
            if (searchText.trim()) {
                const searchLower = searchText.toLowerCase().trim()
                allMethodsData = allMethodsData.filter(method =>
                    method.name.toLowerCase().includes(searchLower) ||
                    method.description?.toLowerCase().includes(searchLower)
                )
            }

            setAllPaymentMethods(allMethodsData)

            // Calcular paginación en frontend
            const totalCount = allMethodsData.length
            const totalPagesCalculated = Math.ceil(totalCount / pageSize)
            const startIndex = (page - 1) * pageSize
            const endIndex = startIndex + pageSize
            const paginatedMethods = allMethodsData.slice(startIndex, endIndex)

            setPaymentMethods(paginatedMethods)
            setTotalItems(totalCount)
            setTotalPages(totalPagesCalculated)
            setCurrentPage(page)
        } catch (error: any) {
            if (error.name === 'AbortError' || error.name === 'CanceledError') {
            } else if (!signal?.aborted) {
                console.error("Error fetching payment methods:", error)
                setPaymentMethods([])
                setAllPaymentMethods([])
                setTotalItems(0)
                setTotalPages(1)
            }
        }
    }, [request, searchText, pageSize])

    useEffect(() => {
        const controller = new AbortController()
        fetchPaymentMethods(1, controller.signal)

        return () => {
            controller.abort()
        }
    }, [fetchPaymentMethods])

    const handleDeleteClick = (methodId: number) => {
        setMethodToDelete(methodId)
        setDeleteDialogOpen(true)
    }

    const confirmDelete = async () => {
        if (!methodToDelete) return

        if (!hasPermission('eliminar_metodos_pago')) {
            toast.error("Sin permisos", {
                description: "No tienes permisos para eliminar métodos de pago",
            })
            return
        }

        try {
            await request({
                method: "DELETE",
                url: `/payment-methods/${methodToDelete}`,
            })

            await fetchPaymentMethods(1)

            toast.success("Método de pago eliminado", {
                description: "El método de pago ha sido eliminado correctamente",
            })
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || "No se pudo eliminar el método de pago"
            toast.error("Error", {
                description: errorMsg,
            })
        } finally {
            setDeleteDialogOpen(false)
            setMethodToDelete(null)
        }
    }

    const handleEditClick = (method: PaymentMethod) => {
        setIsEditMode(true)
        setFormData({
            id: method.id,
            name: method.name,
            description: method.description || '',
            is_active: method.is_active ?? true,
            affects_cash: method.affects_cash ?? false,
            discount_percentage: method.discount_percentage ?? 0
        })
        setEditDialogOpen(true)
    }

    const handleCreateClick = () => {
        setIsEditMode(false)
        setFormData({
            name: '',
            description: '',
            is_active: true,
            affects_cash: false,
            discount_percentage: 0
        })
        setEditDialogOpen(true)
    }

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            toast.error("Error", {
                description: "El nombre es requerido",
            })
            return
        }

        if ((formData.discount_percentage ?? 0) < 0 || (formData.discount_percentage ?? 0) > 100) {
            toast.error("Error", {
                description: "El descuento debe estar entre 0 y 100",
            })
            return
        }

        try {
            const data = {
                name: formData.name.trim(),
                description: formData.description?.trim() || null,
                is_active: formData.is_active ?? true,
                affects_cash: formData.affects_cash ?? false,
                discount_percentage: formData.discount_percentage ?? 0
            }

            if (isEditMode && formData.id) {
                await request({
                    method: "PUT",
                    url: `/payment-methods/${formData.id}`,
                    data
                })
                toast.success("Método de pago actualizado", {
                    description: "El método de pago ha sido actualizado correctamente",
                })
            } else {
                await request({
                    method: "POST",
                    url: "/payment-methods",
                    data
                })
                toast.success("Método de pago creado", {
                    description: "El método de pago ha sido creado correctamente",
                })
            }

            setEditDialogOpen(false)
            await fetchPaymentMethods(1)
        } catch (error: any) {
            const errorMsg = error.response?.data?.message ||
                error.response?.data?.errors?.name?.[0] ||
                `No se pudo ${isEditMode ? 'actualizar' : 'crear'} el método de pago`
            toast.error("Error", {
                description: errorMsg,
            })
        }
    }

    const goToPage = (pageNumber: number) => {
        if (pageNumber >= 1 && pageNumber <= totalPages && pageNumber !== currentPage && !loading) {
            const startIndex = (pageNumber - 1) * pageSize
            const endIndex = startIndex + pageSize
            const paginatedMethods = allPaymentMethods.slice(startIndex, endIndex)

            setPaymentMethods(paginatedMethods)
            setCurrentPage(pageNumber)
        }
    }

    const handlePageSizeChange = (newPageSize: string) => {
        const size = parseInt(newPageSize, 10)
        setPageSize(size)
        setCurrentPage(1)

        const totalPagesCalculated = Math.ceil(allPaymentMethods.length / size)
        const paginatedMethods = allPaymentMethods.slice(0, size)

        setTotalPages(totalPagesCalculated)
        setPaymentMethods(paginatedMethods)
    }

    return (
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Métodos de Pago</h2>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => fetchPaymentMethods(currentPage)} disabled={loading} title="Refrescar">
                        <RotateCw className={loading ? "animate-spin h-4 w-4" : "h-4 w-4"} />
                    </Button>
                    {hasPermission('crear_metodos_pago') && (
                        <Button onClick={handleCreateClick}>
                            <Plus className="mr-2 h-4 w-4" />
                            Nuevo Método de Pago
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                <div className="flex flex-1 items-center space-x-2">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Buscar métodos de pago..."
                            className="w-full pl-8"
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <RotateCw className="animate-spin mr-2 h-5 w-5" /> Cargando métodos de pago...
                </div>
            ) : (
                <div className="rounded-md border min-h-[120px]">
                    <Table ref={tableRef}>
                        <TableHeader>
                            <TableRow>
                                <ResizableTableHeader columnId="name" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps}>Nombre</ResizableTableHeader>
                                <ResizableTableHeader columnId="description" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps}>Descripción</ResizableTableHeader>
                                <ResizableTableHeader columnId="discount" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps}>Descuento</ResizableTableHeader>
                                <ResizableTableHeader columnId="affects_cash" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps}>Afecta Caja</ResizableTableHeader>
                                <ResizableTableHeader columnId="status" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps}>Estado</ResizableTableHeader>
                                <ResizableTableHeader columnId="actions" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps} className="text-center">Acciones</ResizableTableHeader>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paymentMethods.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center">
                                        No hay métodos de pago
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paymentMethods.map((method) => (
                                    <TableRow key={method.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                                                    <CreditCard className="h-4 w-4" />
                                                </div>
                                                <span className="font-medium">{method.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-muted-foreground">
                                                {method.description || "Sin descripción"}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {(method.discount_percentage ?? 0) > 0 ? (
                                                <Badge variant="secondary" className="gap-1">
                                                    <Percent className="h-3 w-3" />
                                                    {method.discount_percentage}%
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {method.affects_cash ? (
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                    Sí
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                                    No
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {method.is_active ? (
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                    Activo
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                                    Inactivo
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                {hasPermission('editar_metodos_pago') && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Editar"
                                                        className="text-orange-500 hover:text-orange-700 hover:bg-orange-50"
                                                        onClick={() => handleEditClick(method)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {hasPermission('eliminar_metodos_pago') && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Eliminar"
                                                        className="hover:bg-red-100 group"
                                                        onClick={() => handleDeleteClick(method.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-600 group-hover:text-red-700" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Paginación */}
            {totalItems > 0 && (
                <div className="flex flex-col space-y-4 px-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium">Filas por página</p>
                            <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                                <SelectTrigger className="h-8 w-[70px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent side="top">
                                    <SelectItem value="5">5</SelectItem>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="15">15</SelectItem>
                                    <SelectItem value="20">20</SelectItem>
                                    <SelectItem value="30">30</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Pagination
                        currentPage={currentPage}
                        lastPage={totalPages}
                        total={totalItems}
                        itemName="métodos de pago"
                        onPageChange={(page) => goToPage(page)}
                        disabled={loading}
                    />
                </div>
            )}

            {/* Dialog de crear/editar */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{isEditMode ? 'Editar' : 'Nuevo'} Método de Pago</DialogTitle>
                        <DialogDescription>
                            {isEditMode ? 'Modifica los datos del método de pago' : 'Ingresa los datos del nuevo método de pago'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ej: Efectivo, Tarjeta de Crédito"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Descripción</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Descripción del método de pago (opcional)"
                                rows={3}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="discount">Descuento (%)</Label>
                            <Input
                                id="discount"
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={formData.discount_percentage}
                                onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) || 0 })}
                                placeholder="0.00"
                            />
                            <p className="text-xs text-muted-foreground">
                                Descuento automático que se aplicará al total pagado con este método (0-100%)
                            </p>
                        </div>

                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                                <Label htmlFor="affects-cash">Afecta Caja</Label>
                                <p className="text-xs text-muted-foreground">
                                    Este método afecta el flujo de caja
                                </p>
                            </div>
                            <Switch
                                id="affects-cash"
                                checked={formData.affects_cash}
                                onCheckedChange={(checked) => setFormData({ ...formData, affects_cash: checked })}
                                className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500"
                            />
                        </div>

                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                                <Label htmlFor="is-active">Activo</Label>
                                <p className="text-xs text-muted-foreground">
                                    El método está disponible para usar
                                </p>
                            </div>
                            <Switch
                                id="is-active"
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                                className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSubmit}>
                            {isEditMode ? 'Guardar' : 'Crear'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog de confirmación de eliminación */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente el método de pago.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete}>Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
