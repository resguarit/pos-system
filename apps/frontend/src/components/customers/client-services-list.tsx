import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, RefreshCw, Pencil, Trash2, Calendar, Loader2, Clock } from "lucide-react"
import useApi from "@/hooks/useApi"
import { sileo } from "sileo"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getBillingCycleLabel } from "@/utils/billingCycleUtils"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface ClientService {
    id: number
    name: string
    description: string | null
    amount: string
    billing_cycle: 'monthly' | 'annual' | 'one_time'
    start_date: string
    next_due_date: string | null
    status: 'active' | 'suspended' | 'cancelled'
}

interface ClientServicePayment {
    id: number
    amount: string
    payment_date: string
    notes: string | null
}

interface ClientServicesListProps {
    customerId: string
    viewOnly?: boolean
}

export default function ClientServicesList({ customerId, viewOnly = false }: ClientServicesListProps) {
    const { request } = useApi()
    const [services, setServices] = useState<ClientService[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingService, setEditingService] = useState<ClientService | null>(null)

    // History State
    const [historyOpen, setHistoryOpen] = useState(false)
    const [historyService, setHistoryService] = useState<ClientService | null>(null)
    const [payments, setPayments] = useState<ClientServicePayment[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        amount: "",
        billing_cycle: "monthly",
        start_date: new Date().toISOString().split('T')[0],
        next_due_date: "",
        date_mode: "start_date" as "start_date" | "next_due_date",
        status: "active"
    })

    useEffect(() => {
        if (customerId) {
            fetchServices()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customerId])

    const fetchServices = async () => {
        setIsLoading(true)
        try {
            const response = await request({
                method: "GET",
                url: `/customers/${customerId}/services`
            })
            if (response && response.data) {
                setServices(Array.isArray(response.data.data) ? response.data.data : response.data)
            } else {
                setServices([]);
            }
        } catch (error) {
            console.error("Error fetching services:", error)
            sileo.error({ title: "Error al cargar servicios" })
        } finally {
            setIsLoading(false)
        }
    }

    const handleHistory = async (service: ClientService) => {
        setHistoryService(service)
        setHistoryOpen(true)
        setLoadingHistory(true)
        try {
            const response = await request({
                method: "GET",
                url: `/client-services/${service.id}/payments`
            })
            if (response && response.data) {
                setPayments(Array.isArray(response.data) ? response.data : [])
            }
        } catch (error) {
            console.error("Error loading history:", error)
            sileo.error({ title: "Error al cargar historial" })
        } finally {
            setLoadingHistory(false)
        }
    }

    const handleCreate = () => {
        setEditingService(null)
        setFormData({
            name: "",
            description: "",
            amount: "",
            billing_cycle: "monthly",
            start_date: new Date().toISOString().split('T')[0],
            next_due_date: "",
            date_mode: "start_date",
            status: "active"
        })
        setDialogOpen(true)
    }

    const handleEdit = (service: ClientService) => {
        setEditingService(service)
        setFormData({
            name: service.name,
            description: service.description || "",
            amount: service.amount,
            billing_cycle: service.billing_cycle,
            start_date: service.start_date.split('T')[0],
            next_due_date: service.next_due_date ? service.next_due_date.split('T')[0] : "",
            date_mode: "start_date",
            status: service.status
        })
        setDialogOpen(true)
    }

    const handleDelete = async (id: number) => {
        if (!confirm("¿Estás seguro de eliminar este servicio?")) return;

        try {
            await request({
                method: "DELETE",
                url: `/client-services/${id}`
            });
            sileo.success({ title: "Servicio eliminado" });
            fetchServices();
        } catch (error) {
            console.error("Error deleting service:", error)
            sileo.error({ title: "Error al eliminar" });
        }
    }

    const handleRenew = async (id: number) => {
        try {
            await request({
                method: "POST",
                url: `/client-services/${id}/renew`
            });
            sileo.success({ title: "Servicio renovado" });
            fetchServices();
        } catch (error: unknown) {
            let message = "Error al renovar";
            if (error && typeof error === 'object' && 'response' in error) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                message = (error as any).response?.data?.message || message;
            }
            sileo.error({ title: message });
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            if (formData.date_mode === "start_date" && !formData.start_date) {
                sileo.error({ title: "Ingresa la fecha de inicio" })
                return
            }

            if (formData.date_mode === "next_due_date" && !formData.next_due_date) {
                sileo.error({ title: "Ingresa la fecha de vencimiento" })
                return
            }

            const datePayload = formData.date_mode === "next_due_date"
                ? { next_due_date: formData.next_due_date }
                : { start_date: formData.start_date }

            const payload = {
                name: formData.name,
                description: formData.description,
                amount: formData.amount,
                billing_cycle: formData.billing_cycle,
                status: formData.status,
                customer_id: customerId,
                ...datePayload,
            }

            if (editingService) {
                await request({
                    method: "PUT",
                    url: `/client-services/${editingService.id}`,
                    data: payload
                })
                sileo.success({ title: "Servicio actualizado" })
            } else {
                await request({
                    method: "POST",
                    url: `/customers/${customerId}/services`,
                    data: payload
                })
                sileo.success({ title: "Servicio creado" })
            }
            setDialogOpen(false)
            fetchServices()
        } catch (error) {
            console.error(error)
            sileo.error({ title: "Error al guardar servicio" })
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active': return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Activo</Badge>
            case 'suspended': return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Suspendido</Badge>
            case 'cancelled': return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Cancelado</Badge>
            default: return <Badge>{status}</Badge>
        }
    }

    // const getBillingLabel = (cycle: string) => { ... } // Removed in favor of utility

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Servicios Contratados</CardTitle>
                        <CardDescription>
                            Administra los servicios recurrentes del cliente (Hosting, Dominios, etc.)
                        </CardDescription>
                    </div>
                    {!viewOnly && (
                        <Button onClick={handleCreate} size="sm">
                            <Plus className="h-4 w-4 mr-2" /> Nuevo Servicio
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Ciclo</TableHead>
                                <TableHead>Monto</TableHead>
                                <TableHead>Vencimiento</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {services.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                                        No hay servicios registrados
                                    </TableCell>
                                </TableRow>
                            ) : (
                                services.map(service => (
                                    <TableRow key={service.id}>
                                        <TableCell>
                                            <div className="font-medium">{service.name}</div>
                                            {service.description && (
                                                <div className="text-xs text-muted-foreground">{service.description}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>{getBillingCycleLabel(service.billing_cycle)}</TableCell>
                                        <TableCell>${parseFloat(service.amount).toFixed(2)}</TableCell>
                                        <TableCell>
                                            {service.next_due_date ? (
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3 text-muted-foreground" />
                                                    {new Date(service.next_due_date).toLocaleDateString()}
                                                </div>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(service.status)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {!viewOnly && (
                                                    <>
                                                        <Button variant="ghost" size="icon" onClick={() => handleHistory(service)} title="Historial de Pagos">
                                                            <Clock className="h-4 w-4 text-purple-500" />
                                                            <span className="sr-only">Historial</span>
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleRenew(service.id)} title="Renovar">
                                                            <RefreshCw className="h-4 w-4 text-blue-500" />
                                                            <span className="sr-only">Renovar</span>
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(service)} title="Editar">
                                                            <Pencil className="h-4 w-4 text-orange-500" />
                                                            <span className="sr-only">Editar</span>
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(service.id)} title="Eliminar">
                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                            <span className="sr-only">Eliminar</span>
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
            </CardContent>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingService ? "Editar Servicio" : "Nuevo Servicio"}</DialogTitle>
                        <DialogDescription>
                            Complete los datos del servicio.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Descripción</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="amount">Monto ($)</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="billing_cycle">Ciclo</Label>
                                <Select
                                    value={formData.billing_cycle}
                                    onValueChange={v => setFormData({ ...formData, billing_cycle: v })}
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
                        <div className="grid gap-3">
                            <Label className="text-sm font-medium">Fecha</Label>
                            <RadioGroup
                                value={formData.date_mode}
                                onValueChange={(value) => setFormData({ ...formData, date_mode: value as "start_date" | "next_due_date" })}
                                className="grid gap-2 sm:grid-cols-2"
                            >
                                <div className="flex items-center space-x-2 rounded-md border p-3">
                                    <RadioGroupItem value="start_date" id="customer-service-start" />
                                    <Label htmlFor="customer-service-start" className="cursor-pointer">
                                        Fecha de inicio
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2 rounded-md border p-3">
                                    <RadioGroupItem value="next_due_date" id="customer-service-due" />
                                    <Label htmlFor="customer-service-due" className="cursor-pointer">
                                        Proximo vencimiento
                                    </Label>
                                </div>
                            </RadioGroup>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor={formData.date_mode === "start_date" ? "start_date" : "next_due_date"}>
                                        {formData.date_mode === "start_date" ? "Fecha Inicio" : "Proximo Vencimiento"}
                                    </Label>
                                    <Input
                                        id={formData.date_mode === "start_date" ? "start_date" : "next_due_date"}
                                        type="date"
                                        value={formData.date_mode === "start_date" ? formData.start_date : formData.next_due_date}
                                        onChange={e =>
                                            setFormData({
                                                ...formData,
                                                ...(formData.date_mode === "start_date"
                                                    ? { start_date: e.target.value }
                                                    : { next_due_date: e.target.value })
                                            })
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="status">Estado</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={v => setFormData({ ...formData, status: v })}
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
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit">Guardar</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Historial de Pagos</DialogTitle>
                        <DialogDescription>{historyService?.name}</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[300px] overflow-y-auto">
                        {loadingHistory ? (
                            <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                        ) : payments.length === 0 ? (
                            <p className="text-center text-muted-foreground p-4">No hay pagos registrados</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Monto</TableHead>
                                        <TableHead>Notas</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payments.map(payment => (
                                        <TableRow key={payment.id}>
                                            <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                                            <TableCell>${parseFloat(payment.amount).toFixed(2)}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{payment.notes || '-'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
