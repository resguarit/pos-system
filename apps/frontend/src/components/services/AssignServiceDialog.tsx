"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Check, ChevronsUpDown, Loader2, User, Package } from "lucide-react"
import { cn } from "@/lib/utils"
import api from "@/lib/api"
import { toast } from "sonner"
import { format } from "date-fns"

interface Customer {
    id: number
    person: {
        first_name: string
        last_name: string
        email?: string
    }
}

interface ServiceType {
    id: number
    name: string
    price: string
    billing_cycle: string
}

interface AssignServiceDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

const normalizeArrayResponse = <T,>(payload: unknown): T[] => {
    const data = payload as { data?: unknown }
    if (Array.isArray(data?.data)) return data.data as T[]
    if (Array.isArray(payload)) return payload as T[]
    return []
}

export default function AssignServiceDialog({
    open,
    onOpenChange,
    onSuccess,
}: AssignServiceDialogProps) {
    // State for customers and service types
    const [customers, setCustomers] = useState<Customer[]>([])
    const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
    const [loadingCustomers, setLoadingCustomers] = useState(false)
    const [loadingServiceTypes, setLoadingServiceTypes] = useState(false)
    const [saving, setSaving] = useState(false)

    // Combobox states
    const [customerOpen, setCustomerOpen] = useState(false)
    const [serviceTypeOpen, setServiceTypeOpen] = useState(false)

    // Form data
    const [formData, setFormData] = useState({
        customer_id: "",
        service_type_id: "",
        name: "",
        description: "",
        amount: "",
        billing_cycle: "monthly",
        start_date: format(new Date(), 'yyyy-MM-dd'),
    })

    // Fetch customers
    useEffect(() => {
        if (open) {
            fetchCustomers()
            fetchServiceTypes()
        }
    }, [open])

    const fetchCustomers = async () => {
        try {
            setLoadingCustomers(true)
            const response = await api.get("/customers", { params: { per_page: 100 } })
            setCustomers(normalizeArrayResponse<Customer>(response.data))
        } catch (error) {
            console.error("Error fetching customers:", error)
            toast.error("Error al cargar clientes")
        } finally {
            setLoadingCustomers(false)
        }
    }

    const fetchServiceTypes = async () => {
        try {
            setLoadingServiceTypes(true)
            const response = await api.get("/service-types", { params: { per_page: 100, is_active: true } })
            setServiceTypes(normalizeArrayResponse<ServiceType>(response.data))
        } catch (error) {
            console.error("Error fetching service types:", error)
            toast.error("Error al cargar tipos de servicio")
        } finally {
            setLoadingServiceTypes(false)
        }
    }

    // When a service type is selected, populate the form
    const handleServiceTypeSelect = (serviceTypeId: string) => {
        const serviceType = serviceTypes.find(st => st.id.toString() === serviceTypeId)
        if (serviceType) {
            setFormData(prev => ({
                ...prev,
                service_type_id: serviceTypeId,
                name: serviceType.name,
                amount: serviceType.price,
                billing_cycle: serviceType.billing_cycle,
            }))
        }
        setServiceTypeOpen(false)
    }

    const handleCustomerSelect = (customerId: string) => {
        setFormData(prev => ({ ...prev, customer_id: customerId }))
        setCustomerOpen(false)
    }

    const handleSubmit = async () => {
        if (!formData.customer_id || !formData.name || !formData.amount) {
            toast.error("Completa los campos requeridos")
            return
        }

        try {
            setSaving(true)
            await api.post('/client-services', {
                customer_id: parseInt(formData.customer_id),
                name: formData.name,
                description: formData.description || null,
                amount: parseFloat(formData.amount),
                billing_cycle: formData.billing_cycle,
                start_date: formData.start_date,
                status: "active",
            })
            toast.success("Servicio asignado exitosamente")
            // Reset form
            setFormData({
                customer_id: "",
                service_type_id: "",
                name: "",
                description: "",
                amount: "",
                billing_cycle: "monthly",
                start_date: format(new Date(), 'yyyy-MM-dd'),
            })
            onSuccess()
        } catch (error) {
            console.error("Error assigning service:", error)
            toast.error("Error al asignar el servicio")
        } finally {
            setSaving(false)
        }
    }

    const selectedCustomer = customers.find(c => c.id.toString() === formData.customer_id)
    const selectedServiceType = serviceTypes.find(st => st.id.toString() === formData.service_type_id)

    const getBillingCycleLabel = (cycle: string) => {
        const labels: Record<string, string> = {
            monthly: "Mensual",
            quarterly: "Trimestral",
            annual: "Anual",
            one_time: "Único"
        }
        return labels[cycle] || cycle
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-blue-600" />
                        Asignar Servicio a Cliente
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-5 py-4">
                    {/* Customer Selector */}
                    <div className="grid gap-2">
                        <Label>Cliente *</Label>
                        <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={customerOpen}
                                    className="w-full justify-between"
                                    disabled={loadingCustomers}
                                >
                                    {loadingCustomers ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Cargando...
                                        </span>
                                    ) : selectedCustomer ? (
                                        <span className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-gray-500" />
                                            {selectedCustomer.person.first_name} {selectedCustomer.person.last_name}
                                        </span>
                                    ) : (
                                        "Seleccionar cliente..."
                                    )}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0">
                                <Command>
                                    <CommandInput placeholder="Buscar cliente..." />
                                    <CommandList>
                                        <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                                        <CommandGroup>
                                            {customers.map((customer) => (
                                                <CommandItem
                                                    key={customer.id}
                                                    value={`${customer.person.first_name} ${customer.person.last_name}`}
                                                    onSelect={() => handleCustomerSelect(customer.id.toString())}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            formData.customer_id === customer.id.toString() ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    <div className="flex flex-col">
                                                        <span>{customer.person.first_name} {customer.person.last_name}</span>
                                                        {customer.person.email && (
                                                            <span className="text-xs text-gray-500">{customer.person.email}</span>
                                                        )}
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Service Type Selector (Template) */}
                    <div className="grid gap-2">
                        <Label>Tipo de Servicio (plantilla opcional)</Label>
                        <Popover open={serviceTypeOpen} onOpenChange={setServiceTypeOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={serviceTypeOpen}
                                    className="w-full justify-between"
                                    disabled={loadingServiceTypes}
                                >
                                    {loadingServiceTypes ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Cargando...
                                        </span>
                                    ) : selectedServiceType ? (
                                        <span className="flex items-center gap-2">
                                            <Package className="h-4 w-4 text-gray-500" />
                                            {selectedServiceType.name} - ${selectedServiceType.price}
                                        </span>
                                    ) : (
                                        "Seleccionar tipo de servicio..."
                                    )}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0">
                                <Command>
                                    <CommandInput placeholder="Buscar servicio..." />
                                    <CommandList>
                                        <CommandEmpty>No se encontraron servicios.</CommandEmpty>
                                        <CommandGroup>
                                            {serviceTypes.map((serviceType) => (
                                                <CommandItem
                                                    key={serviceType.id}
                                                    value={serviceType.name}
                                                    onSelect={() => handleServiceTypeSelect(serviceType.id.toString())}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            formData.service_type_id === serviceType.id.toString() ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    <div className="flex items-center justify-between w-full">
                                                        <span>{serviceType.name}</span>
                                                        <span className="text-sm text-gray-500">
                                                            ${serviceType.price} / {getBillingCycleLabel(serviceType.billing_cycle)}
                                                        </span>
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <p className="text-xs text-gray-500">
                            Selecciona un tipo de servicio para autocompletar los campos, o ingresa manualmente.
                        </p>
                    </div>

                    <div className="border-t pt-4">
                        <p className="text-sm font-medium text-gray-700 mb-3">Detalles del Servicio</p>
                        
                        {/* Service Name */}
                        <div className="grid gap-2 mb-4">
                            <Label htmlFor="name">Nombre del Servicio *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ej: Hosting Web, Dominio .com"
                            />
                        </div>

                        {/* Description */}
                        <div className="grid gap-2 mb-4">
                            <Label htmlFor="description">Descripción</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Descripción opcional del servicio"
                                rows={2}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            {/* Amount */}
                            <div className="grid gap-2">
                                <Label htmlFor="amount">Monto *</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    placeholder="0.00"
                                />
                            </div>

                            {/* Billing Cycle */}
                            <div className="grid gap-2">
                                <Label htmlFor="billing_cycle">Ciclo de Facturación</Label>
                                <Select
                                    value={formData.billing_cycle}
                                    onValueChange={(value) => setFormData({ ...formData, billing_cycle: value })}
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

                        {/* Start Date */}
                        <div className="grid gap-2">
                            <Label htmlFor="start_date">Fecha de Inicio</Label>
                            <Input
                                id="start_date"
                                type="date"
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={saving}>
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            "Asignar Servicio"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
