"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
    AlertTriangle,
    CheckCircle,
    Clock,
    Edit,
    FileText,
    Search,
    Server,
    Link,
    Lock,
    Globe,
    FileBadge,
    Wrench,
    Package,
    Video,
    Copyright
} from "lucide-react"
import useApi from "@/hooks/useApi"
import { toast } from "sonner"

// Mapping for icons based on service name or type (rudimentary)
const getServiceIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('dominio')) return <Globe className="h-4 w-4" />;
    if (n.includes('ssl')) return <Lock className="h-4 w-4" />;
    if (n.includes('hosting')) return <Server className="h-4 w-4" />;
    if (n.includes('fiscal')) return <FileBadge className="h-4 w-4" />;
    if (n.includes('web')) return <Globe className="h-4 w-4" />;
    if (n.includes('soporte')) return <Wrench className="h-4 w-4" />;
    if (n.includes('stock')) return <Package className="h-4 w-4" />;
    if (n.includes('camara') || n.includes('alarma')) return <Video className="h-4 w-4" />;
    if (n.includes('marca')) return <Copyright className="h-4 w-4" />;
    if (n.includes('noip')) return <Link className="h-4 w-4" />;
    return <Server className="h-4 w-4" />;
}

interface Service {
    id: number
    name: string
    description: string | null
    amount: string
    billing_cycle: string
    next_due_date: string | null
    status: 'active' | 'suspended' | 'cancelled'
    customer_id: number
    customer?: {
        person: {
            first_name: string
            last_name: string
            email: string | null
        }
    }
}

const getEstadoVencimiento = (fechaVencimiento: string | null, status: string) => {
    if (status !== 'active') return { estado: "inactivo", color: "bg-gray-50 text-gray-700", dias: 0 }
    if (!fechaVencimiento) return { estado: "indefinido", color: "bg-gray-50 text-gray-700", dias: 0 }

    const hoy = new Date()
    const vencimiento = new Date(fechaVencimiento)
    const diffTime = vencimiento.getTime() - hoy.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
        return { estado: "vencido", color: "bg-red-50 text-red-700", dias: Math.abs(diffDays) }
    } else if (diffDays <= 30) {
        return { estado: "por-vencer", color: "bg-yellow-50 text-yellow-700", dias: diffDays }
    } else {
        return { estado: "vigente", color: "bg-green-50 text-green-700", dias: diffDays }
    }
}

export default function ServicesPage() {
    const { request } = useApi()
    const [searchTerm, setSearchTerm] = useState("")
    const [filtroEstado, setFiltroEstado] = useState("todos")
    const [vistaActual, setVistaActual] = useState("servicios")
    const [services, setServices] = useState<Service[]>([])
    const [loading, setLoading] = useState(true)

    // Observaciones Dialog State
    const [observacionesDialogOpen, setObservacionesDialogOpen] = useState(false)
    const [observacionActual, setObservacionActual] = useState({ tipo: "", titulo: "", texto: "" })

    const fetchServices = async () => {
        setLoading(true)
        try {
            // Construct query params
            const params: Record<string, string> = {}
            if (searchTerm) params.search = searchTerm
            if (filtroEstado !== 'todos') {
                if (['vencidos', 'por-vencer'].includes(filtroEstado)) {
                    params.due_status = filtroEstado
                } else {
                    params.status = filtroEstado === 'activos' ? 'active' : 'suspended' // simple mapping
                }
            }

            const response = await request({
                method: 'GET',
                url: '/client-services',
                params
            })

            if (response && response.data) {
                setServices(response.data.data)
            }
        } catch (error) {
            console.error(error)
            toast.error("Error al cargar servicios")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchServices()
        }, 500)
        return () => clearTimeout(timer)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm, filtroEstado])


    // Estadísticas (Calculated on frontend for now, ideally backend should provide stats)
    const totalServicios = services.length
    const serviciosActivos = services.filter(s => s.status === 'active').length
    const serviciosVencidos = services.filter(s => getEstadoVencimiento(s.next_due_date, s.status).estado === 'vencido').length
    const serviciosPorVencer = services.filter(s => getEstadoVencimiento(s.next_due_date, s.status).estado === 'por-vencer').length

    const abrirObservaciones = (
        tipo: "cliente" | "servicio",
        titulo: string,
        textoActual?: string,
    ) => {
        setObservacionActual({
            tipo,
            titulo,
            texto: textoActual || "Sin observaciones",
        })
        setObservacionesDialogOpen(true)
    }

    const handleRenew = async (id: number) => {
        try {
            await request({
                method: "POST",
                url: `/client-services/${id}/renew`
            });
            toast.success("Servicio renovado");
            fetchServices();
        } catch (error) {
            if (error && typeof error === 'object' && 'response' in error) {
                const err = error as { response: { data: { message: string } } };
                toast.error(err.response?.data?.message || "Error al renovar");
            } else {
                toast.error("Error al renovar");
            }
        }
    }

    return (
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Gestión de Servicios</h2>
                {/* Nuevo Servicio Button could go here but it requires Customer Context, maybe redirect to Customers? */}
            </div>

            {/* Dialog para observaciones (View Only for now as endpoint to update notes only missing) */}
            <Dialog open={observacionesDialogOpen} onOpenChange={setObservacionesDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {observacionActual.titulo}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="observaciones">Observaciones</Label>
                            <Textarea
                                readOnly
                                value={observacionActual.texto}
                                className="min-h-[120px]"
                            />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Estadísticas */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Servicios (Vista)</CardTitle>
                        <Server className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalServicios}</div>
                        <p className="text-xs text-muted-foreground">Listados actualmente</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Servicios Activos</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{serviciosActivos}</div>
                        <p className="text-xs text-muted-foreground">Actualmente vigentes</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Por Vencer (30 días)</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{serviciosPorVencer}</div>
                        <p className="text-xs text-muted-foreground">Requieren atención</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{serviciosVencidos}</div>
                        <p className="text-xs text-muted-foreground">Necesitan renovación</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filtros */}
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                <div className="flex flex-1 items-center space-x-2">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Buscar clientes o servicios..."
                            className="w-full pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todos">Todos los estados</SelectItem>
                            <SelectItem value="activos">Activos</SelectItem>
                            <SelectItem value="inactivos">Suspendidos</SelectItem>
                            <SelectItem value="vencidos">Vencidos</SelectItem>
                            <SelectItem value="por-vencer">Por vencer</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Tabs para diferentes vistas */}
            <Tabs value={vistaActual} onValueChange={setVistaActual}>
                <TabsList>
                    <TabsTrigger value="servicios">Vista por Servicio</TabsTrigger>
                    <TabsTrigger value="tarjetas">Vista Tarjetas</TabsTrigger>
                </TabsList>

                <TabsContent value="servicios" className="space-y-4">
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
                                        <TableHead>Observaciones</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-10">Cargando...</TableCell>
                                        </TableRow>
                                    ) : services.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-10">No se encontraron servicios</TableCell>
                                        </TableRow>
                                    ) : services.map((servicio) => {
                                        const estado = getEstadoVencimiento(servicio.next_due_date, servicio.status)
                                        const nombreCliente = servicio.customer ? `${servicio.customer.person.first_name} ${servicio.customer.person.last_name}` : 'N/A'

                                        return (
                                            <TableRow key={servicio.id}>
                                                <TableCell className="font-medium">{nombreCliente}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center space-x-2">
                                                        <span>{getServiceIcon(servicio.name)}</span>
                                                        <span>{servicio.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={estado.color}>
                                                        {servicio.status === 'active'
                                                            ? estado.estado === "vencido"
                                                                ? "Vencido"
                                                                : estado.estado === "por-vencer"
                                                                    ? "Por vencer"
                                                                    : "Vigente"
                                                            : servicio.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        {servicio.next_due_date ? format(new Date(servicio.next_due_date), "dd/MM/yyyy", { locale: es }) : '-'}
                                                        {servicio.status === 'active' && estado.estado !== "vigente" && estado.estado !== "indefinido" && (
                                                            <div className="text-xs text-muted-foreground">
                                                                {estado.estado === "vencido" ? `Hace ${estado.dias} días` : `En ${estado.dias} días`}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>${parseFloat(servicio.amount).toFixed(2)}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center space-x-2">
                                                        {servicio.description && (
                                                            <div className="max-w-[200px] truncate text-sm text-muted-foreground">
                                                                {servicio.description}
                                                            </div>
                                                        )}
                                                        {(servicio.description) && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() =>
                                                                    abrirObservaciones(
                                                                        "servicio",
                                                                        servicio.name,
                                                                        servicio.description || "",
                                                                    )
                                                                }
                                                            >
                                                                <FileText className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" onClick={() => handleRenew(servicio.id)}>
                                                        Renovar
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </TabsContent>

                <TabsContent value="tarjetas" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {loading ? <p>Cargando...</p> : services.map(servicio => {
                            const estado = getEstadoVencimiento(servicio.next_due_date, servicio.status)
                            const nombreCliente = servicio.customer ? `${servicio.customer.person.first_name} ${servicio.customer.person.last_name}` : 'N/A'

                            return (
                                <div
                                    key={servicio.id}
                                    className={`p-3 rounded-lg border ${servicio.status === 'active'
                                            ? "bg-white border-gray-200"
                                            : "bg-red-50 border-red-200"
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <Badge variant="outline">{nombreCliente}</Badge>
                                        <Badge className={estado.color}>{estado.estado}</Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <span>{getServiceIcon(servicio.name)}</span>
                                            <span className="text-sm font-medium">{servicio.name}</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            {servicio.description && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0"
                                                    onClick={() =>
                                                        abrirObservaciones(
                                                            "servicio",
                                                            servicio.name,
                                                            servicio.description || "",
                                                        )
                                                    }
                                                >
                                                    <FileText className="h-3 w-3 text-blue-600" />
                                                </Button>
                                            )}
                                            {servicio.description && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0"
                                                    onClick={() =>
                                                        abrirObservaciones(
                                                            "servicio",
                                                            servicio.name,
                                                            servicio.description || "",
                                                        )
                                                    }
                                                >
                                                    <Edit className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-2 text-xs text-muted-foreground">
                                        <div>
                                            Vence: {servicio.next_due_date ? format(new Date(servicio.next_due_date), "dd/MM/yyyy", { locale: es }) : '-'}
                                        </div>
                                        <div>${parseFloat(servicio.amount).toFixed(2)}</div>
                                        {estado.estado === "por-vencer" && (
                                            <div className="text-yellow-600 font-medium">Vence en {estado.dias} días</div>
                                        )}
                                        {estado.estado === "vencido" && (
                                            <div className="text-red-600 font-medium">Vencido hace {estado.dias} días</div>
                                        )}
                                    </div>

                                    <div className="mt-3 text-right">
                                        <Button size="sm" variant="outline" onClick={() => handleRenew(servicio.id)}>Renovar</Button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
