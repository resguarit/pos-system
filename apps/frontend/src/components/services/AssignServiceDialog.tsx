"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ChevronDown, Check, Loader2, Package, Plus, X, AlertCircle, Info, DollarSign, Percent, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import api from "@/lib/api"
import { toast } from "sonner"
import { format } from "date-fns"
import { useCustomerSearch, CustomerOption } from "@/hooks/useCustomerSearch"
import CustomerForm from "@/components/customers/customer-form"
import { Badge } from "@/components/ui/badge"
import { NumberFormatter } from "@/lib/formatters/numberFormatter"
import { getBillingCycleLabel } from "@/utils/billingCycleUtils"

interface ServiceType {
    id: number
    name: string
    price: string
    billing_cycle: string
}

interface ServiceFormItem {
    service_type_id: string
    name: string
    description: string
    amount: string
    base_price: string
    billing_cycle: string
    discount_percentage: string
    discount_notes: string
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
    // State for service types
    const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
    const [loadingServiceTypes, setLoadingServiceTypes] = useState(false)
    const [saving, setSaving] = useState(false)

    // Customer Search Hook
    const {
        customerSearch,
        customerOptions,
        showCustomerOptions,
        selectedCustomer,
        setCustomerSearch,
        setSelectedCustomer,
        setShowCustomerOptions,
    } = useCustomerSearch()

    // New Customer Dialog state
    const [newCustomerOpen, setNewCustomerOpen] = useState(false)

    // Combobox states
    const [serviceTypeOpen, setServiceTypeOpen] = useState(false)

    // Form data
    const [formData, setFormData] = useState({
        customer_id: "",
        service_type_ids: [] as string[],
        services: [] as ServiceFormItem[], // Store details for each selected service
        start_date: format(new Date(), 'yyyy-MM-dd'),
    })

    const fetchServiceTypes = useCallback(async () => {
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
    }, [])

    // Initialize/Reset
    useEffect(() => {
        if (open) {
            fetchServiceTypes()
            // Reset search if closing/opening (optional, but good for UX)
            if (!formData.customer_id) {
                setCustomerSearch("")
                setSelectedCustomer(null)
            }
        }
    }, [open, formData.customer_id, setCustomerSearch, setSelectedCustomer, fetchServiceTypes])

    // State for existing services of the selected customer
    const [existingServiceTypeIds, setExistingServiceTypeIds] = useState<number[]>([])
    const [loadingExisting, setLoadingExisting] = useState(false)

    // Fetch existing services when customer changes
    useEffect(() => {
        const fetchExistingServices = async () => {
            if (!formData.customer_id) {
                setExistingServiceTypeIds([])
                return
            }

            try {
                setLoadingExisting(true)
                const response = await api.get("/client-services", {
                    params: { customer_id: formData.customer_id }
                })
                const services = normalizeArrayResponse<{ service_type_id: number }>(response.data)
                // Filter by service_type_id to know what they already have
                const typeIds = services
                    .map(s => s.service_type_id)
                    .filter(Boolean)
                setExistingServiceTypeIds(typeIds)
            } catch (error) {
                console.error("Error fetching existing services:", error)
            } finally {
                setLoadingExisting(false)
            }
        }

        fetchExistingServices()
    }, [formData.customer_id])

    // Derived state: Services available for this specific customer
    const availableServiceTypes = serviceTypes.filter(
        type => !existingServiceTypeIds.includes(type.id)
    )

    // When a service type is toggled
    const handleServiceTypeToggle = (serviceTypeId: string) => {
        const currentIds = formData.service_type_ids
        let newIds: string[]
        if (currentIds.includes(serviceTypeId)) {
            newIds = currentIds.filter(id => id !== serviceTypeId)
        } else {
            newIds = [...currentIds, serviceTypeId]
        }

        // Update services array based on selection
        const newServices = newIds.map(id => {
            // Check if we already have this service configured to preserve edits
            const existing = formData.services.find(s => s.service_type_id === id)
            if (existing) return existing

            // Otherwise create new from template
            const type = serviceTypes.find(t => t.id.toString() === id)
            return type ? {
                service_type_id: id,
                name: type.name,
                description: "",
                amount: type.price,
                base_price: type.price,
                billing_cycle: type.billing_cycle,
                discount_percentage: "0",
                discount_notes: "",
            } : null
        }).filter((s): s is ServiceFormItem => s !== null)

        setFormData(prev => ({
            ...prev,
            service_type_ids: newIds,
            services: newServices
        }))
    }

    const toggleAllServices = () => {
        if (formData.service_type_ids.length === availableServiceTypes.length) {
            // Deselect all
            setFormData(prev => ({ ...prev, service_type_ids: [], services: [] }))
        } else {
            // Select all available
            const allIds = availableServiceTypes.map(s => s.id.toString())
            const newServices = availableServiceTypes.map(type => ({
                service_type_id: type.id.toString(),
                name: type.name,
                description: "",
                amount: type.price,
                base_price: type.price,
                billing_cycle: type.billing_cycle,
                discount_percentage: "0",
                discount_notes: "",
            }))
            setFormData(prev => ({ ...prev, service_type_ids: allIds, services: newServices }))
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateServiceField = (index: number, field: string, value: any) => {
        setFormData(prev => {
            const updatedServices = [...prev.services]
            updatedServices[index] = { ...updatedServices[index], [field]: value }
            return { ...prev, services: updatedServices }
        })
    }

    const removeService = (index: number) => {
        const serviceToRemove = formData.services[index]
        const newServices = formData.services.filter((_, i) => i !== index)
        const newIds = formData.service_type_ids.filter(id => id !== serviceToRemove.service_type_id)
        setFormData(prev => ({ ...prev, services: newServices, service_type_ids: newIds }))
    }

    // Calculate discounted price
    const calculateDiscountedPrice = (basePrice: string, discountPercent: string): string => {
        const base = parseFloat(basePrice) || 0
        // Handle empty string, null, undefined, or invalid values
        const discountStr = discountPercent?.toString().trim() || "0"
        const discount = parseFloat(discountStr) || 0

        // Validate discount range
        const validDiscount = Math.max(0, Math.min(100, discount))

        if (base > 0 && validDiscount > 0) {
            return (base * (1 - validDiscount / 100)).toFixed(2)
        }

        // Return base price formatted if no discount
        return base > 0 ? base.toFixed(2) : "0.00"
    }

    // Handle discount change for specific service
    const handleServiceDiscountChange = (index: number, discountPercent: string) => {
        // Allow empty string for better UX while typing
        const discountValue = discountPercent.trim()

        setFormData(prev => {
            const updatedServices = [...prev.services]
            const service = updatedServices[index]
            const basePrice = service.base_price || "0"

            // Update discount percentage (allow empty string)
            updatedServices[index] = {
                ...service,
                discount_percentage: discountValue,
            }

            // Calculate and update amount only if discount is valid
            if (discountValue === "" || discountValue === "0") {
                // If empty or zero, use base price
                updatedServices[index].amount = basePrice
            } else {
                const newAmount = calculateDiscountedPrice(basePrice, discountValue)
                updatedServices[index].amount = newAmount
            }

            return { ...prev, services: updatedServices }
        })
    }

    // Handle base price change
    const handleServiceBasePriceChange = (index: number, newBasePrice: string) => {
        setFormData(prev => {
            const updatedServices = [...prev.services]
            const service = updatedServices[index]
            const discountPercent = service.discount_percentage || "0"

            // Update base price
            updatedServices[index] = {
                ...service,
                base_price: newBasePrice,
            }

            // Recalculate amount with current discount
            const newAmount = calculateDiscountedPrice(newBasePrice, discountPercent)
            updatedServices[index].amount = newAmount

            return { ...prev, services: updatedServices }
        })
    }

    const handleCustomerSelect = (customer: CustomerOption) => {
        setSelectedCustomer(customer)
        setCustomerSearch(customer.name)
        setFormData(prev => ({ ...prev, customer_id: customer.id.toString() }))
        setShowCustomerOptions(false)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleNewCustomerSuccess = (customer: any) => {
        // Auto-select the new customer
        const newCustomerOption: CustomerOption = {
            id: customer.id,
            name: `${customer.person?.first_name || ''} ${customer.person?.last_name || ''}`.trim(),
            dni: customer.person?.documento,
            cuit: customer.person?.cuit,
            fiscal_condition_id: customer.person?.fiscal_condition_id,
            fiscal_condition_name: null // Not critical right now
        }
        handleCustomerSelect(newCustomerOption)
        setNewCustomerOpen(false)
        toast.success("Cliente creado y seleccionado")
    }

    const resetForm = () => {
        setFormData({
            customer_id: "",
            service_type_ids: [],
            services: [],
            start_date: format(new Date(), 'yyyy-MM-dd'),
        })
        setCustomerSearch("")
        setSelectedCustomer(null)
        setExistingServiceTypeIds([])
        setNewCustomerOpen(false)
        setServiceTypeOpen(false)
    }

    const handleClose = () => {
        resetForm()
        onOpenChange(false)
    }

    const handleSubmit = async () => {
        if (!formData.customer_id) {
            toast.error("Selecciona un cliente")
            return
        }
        if (formData.services.length === 0) {
            toast.error("Selecciona al menos un servicio")
            return
        }

        // Validate all services with detailed errors
        const validationErrors = getValidationErrors()
        if (validationErrors.length > 0) {
            toast.error(validationErrors[0], {
                description: validationErrors.length > 1 ? `Y ${validationErrors.length - 1} error(es) más` : undefined
            })
            return
        }

        try {
            setSaving(true)
            // Send requests sequentially or parallel
            const promises = formData.services.map(service =>
                api.post('/client-services', {
                    customer_id: parseInt(formData.customer_id),
                    service_type_id: parseInt(service.service_type_id),
                    name: service.name,
                    description: service.description || null,
                    amount: parseFloat(service.amount),
                    base_price: service.base_price ? parseFloat(service.base_price) : null,
                    discount_percentage: service.discount_percentage ? parseFloat(service.discount_percentage) : 0,
                    discount_notes: service.discount_notes || null,
                    billing_cycle: service.billing_cycle,
                    start_date: formData.start_date,
                    status: "active",
                })
            )

            await Promise.all(promises)

            toast.success(`${formData.services.length} servicio(s) asignado(s) exitosamente`)
            resetForm()
            onSuccess()
        } catch (error) {
            console.error("Error assigning services:", error)
            toast.error("Error al asignar los servicios")
        } finally {
            setSaving(false)
        }
    }

    // const selectedCustomer = customers.find(c => c.id.toString() === formData.customer_id) // Removed old selector



    // Format currency helper
    const formatCurrency = (value: string | number): string => {
        const num = typeof value === 'string' ? parseFloat(value) : value
        return NumberFormatter.formatCurrency(num, { showCurrency: false })
    }

    // Validate service
    const validateService = (service: ServiceFormItem): string | null => {
        if (!service.name?.trim()) {
            return "El nombre del servicio es requerido"
        }
        const basePrice = parseFloat(service.base_price) || 0
        if (basePrice <= 0) {
            return "El precio base debe ser mayor a 0"
        }
        const discount = parseFloat(service.discount_percentage) || 0
        if (discount < 0 || discount > 100) {
            return "El descuento debe estar entre 0 y 100%"
        }
        return null
    }

    // Get validation errors for all services
    const getValidationErrors = (): string[] => {
        const errors: string[] = []
        formData.services.forEach((service, index) => {
            const error = validateService(service)
            if (error) {
                errors.push(`Servicio ${index + 1}: ${error}`)
            }
        })
        return errors
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
            <DialogContent className={cn(
                "max-h-[90vh] overflow-y-auto transition-all duration-300",
                newCustomerOpen ? "sm:max-w-3xl md:max-w-4xl" : "sm:max-w-lg md:max-w-xl"
            )}>
                {newCustomerOpen ? (
                    <div className="p-1">
                        <CustomerForm
                            disableNavigate
                            onSuccess={handleNewCustomerSuccess}
                            onCancel={() => setNewCustomerOpen(false)}
                        />
                    </div>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Package className="h-5 w-5 text-blue-600" />
                                Asignar Servicio a Cliente
                            </DialogTitle>
                            <DialogDescription>
                                Selecciona un cliente y los servicios que deseas asignar. Puedes personalizar precios y aplicar descuentos.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-5 py-4">
                            {/* Customer Selector */}
                            {/* Customer Selector (Search Input) */}
                            <div className="grid gap-2">
                                <Label>Cliente *</Label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Input
                                            placeholder="Buscar cliente (Nombre, DNI)..."
                                            value={customerSearch}
                                            onChange={(e) => setCustomerSearch(e.target.value)}
                                            // Make sure options show when typing
                                            onFocus={() => {
                                                if (customerSearch.length >= 1) setShowCustomerOptions(true)
                                            }}
                                            onBlur={() => {
                                                // Delay hiding to allow clicking
                                                setTimeout(() => setShowCustomerOptions(false), 200)
                                            }}
                                        />
                                        {showCustomerOptions && customerOptions.length > 0 && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                                                {customerOptions.map((customer) => (
                                                    <div
                                                        key={customer.id}
                                                        className="px-4 py-2 cursor-pointer hover:bg-gray-100 flex flex-col"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault() // Prevent blur
                                                            handleCustomerSelect(customer)
                                                        }}
                                                    >
                                                        <span className="font-medium text-sm">{customer.name}</span>
                                                        <span className="text-xs text-gray-500">
                                                            {customer.dni || customer.cuit || "Sin documento"}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setNewCustomerOpen(true)}
                                        title="Crear nuevo cliente"
                                        type="button"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                                {selectedCustomer && (
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                            <Check className="h-3 w-3 mr-1" />
                                            {selectedCustomer.name}
                                        </Badge>
                                        {loadingExisting && (
                                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                Verificando servicios existentes...
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label>Servicios a Asignar</Label>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => { if (!loadingServiceTypes) setServiceTypeOpen(!serviceTypeOpen); }}
                                        className={cn(
                                            "w-full flex items-center justify-between bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                            "hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                                            loadingServiceTypes && "text-gray-400 cursor-not-allowed opacity-60",
                                            !loadingServiceTypes && "text-gray-700"
                                        )}
                                        disabled={loadingServiceTypes}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <Package className="h-4 w-4 flex-shrink-0" />
                                            <span className="truncate">
                                                {loadingServiceTypes ? "Cargando..." :
                                                    formData.service_type_ids.length > 0
                                                        ? `${formData.service_type_ids.length} servicios seleccionados`
                                                        : "Seleccionar servicios..."}
                                            </span>
                                        </div>
                                        <ChevronDown className={cn(
                                            "h-4 w-4 transition-transform flex-shrink-0 ml-2",
                                            serviceTypeOpen && "rotate-180"
                                        )} />
                                    </button>

                                    {serviceTypeOpen && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-40"
                                                onClick={() => setServiceTypeOpen(false)}
                                            />
                                            <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-72 overflow-hidden flex flex-col">
                                                <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50/50">
                                                    <span className="text-xs text-gray-500 font-medium">
                                                        {loadingExisting ? "Verificando servicios..." : `Disponibles (${availableServiceTypes.length})`}
                                                    </span>
                                                    {availableServiceTypes.length > 1 && (
                                                        <button
                                                            type="button"
                                                            className="text-xs text-blue-600 hover:underline font-medium"
                                                            onClick={toggleAllServices}
                                                        >
                                                            {formData.service_type_ids.length === availableServiceTypes.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="p-2 overflow-y-auto space-y-1">
                                                    {loadingExisting ? (
                                                        <div className="flex items-center justify-center py-4">
                                                            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                                                        </div>
                                                    ) : availableServiceTypes.length === 0 ? (
                                                        <div className="text-center py-4 text-xs text-gray-400">
                                                            {formData.customer_id ? "El cliente ya tiene todos los servicios asignados." : "Selecciona un cliente primero."}
                                                        </div>
                                                    ) : (
                                                        availableServiceTypes.map((serviceType) => {
                                                            const isSelected = formData.service_type_ids.includes(serviceType.id.toString())
                                                            return (
                                                                <button
                                                                    key={serviceType.id}
                                                                    type="button"
                                                                    onClick={() => handleServiceTypeToggle(serviceType.id.toString())}
                                                                    className={cn(
                                                                        "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left",
                                                                        "hover:bg-gray-100",
                                                                        isSelected && "bg-blue-50"
                                                                    )}
                                                                >
                                                                    <span className={cn(
                                                                        "h-4 w-4 inline-flex items-center justify-center rounded border flex-shrink-0",
                                                                        isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300 bg-white"
                                                                    )}>
                                                                        {isSelected && <Check className="h-3 w-3" />}
                                                                    </span>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className={cn(
                                                                            "font-medium truncate",
                                                                            isSelected ? "text-blue-700" : "text-gray-700"
                                                                        )}>
                                                                            {serviceType.name}
                                                                        </div>
                                                                        <div className="text-xs text-gray-500 truncate">
                                                                            ${serviceType.price} / {getBillingCycleLabel(serviceType.billing_cycle)}
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            )
                                                        })
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                                {formData.service_type_ids.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        {formData.services.map((service, idx) => (
                                            <Badge key={idx} variant="secondary" className="text-xs">
                                                {service.name}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                                {!formData.customer_id && (
                                    <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                                        <Info className="h-3 w-3" />
                                        Selecciona un cliente primero para ver los servicios disponibles
                                    </p>
                                )}
                            </div>

                            <div className="space-y-4">
                                {formData.services.length === 0 ? (
                                    <div className="text-center p-8 border border-dashed rounded-lg bg-gray-50">
                                        <Package className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">Selecciona servicios arriba para configurarlos</p>
                                    </div>
                                ) : (
                                    formData.services.map((service, index) => {
                                        const discount = parseFloat(service.discount_percentage) || 0
                                        const hasDiscount = discount > 0
                                        const validationError = validateService(service)

                                        return (
                                            <div
                                                key={`service-${index}`}
                                                className={cn(
                                                    "border rounded-lg p-4 bg-white relative transition-all",
                                                    validationError ? "border-red-300 bg-red-50/30" : "border-gray-200 shadow-sm hover:shadow-md"
                                                )}
                                            >
                                                <div className="absolute right-2 top-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                        onClick={() => removeService(index)}
                                                        title="Eliminar servicio"
                                                        aria-label={`Eliminar servicio ${service.name}`}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>

                                                <div className="flex items-start gap-3 mb-4">
                                                    <div className="flex-shrink-0">
                                                        <div className="bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full min-w-[24px] text-center">
                                                            {index + 1}
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm font-semibold text-gray-900 mb-1">
                                                            {service.name || "Nuevo Servicio"}
                                                        </h4>
                                                        {validationError && (
                                                            <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
                                                                <AlertCircle className="h-3 w-3" />
                                                                <span>{validationError}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="grid gap-4">
                                                    {/* Service Name */}
                                                    <div className="flex flex-col gap-1.5">
                                                        <Label htmlFor={`service-name-${index}`} className="text-xs font-medium flex items-center gap-1 h-5">
                                                            Nombre <span className="text-red-500">*</span>
                                                        </Label>
                                                        <Input
                                                            id={`service-name-${index}`}
                                                            value={service.name}
                                                            onChange={(e) => updateServiceField(index, 'name', e.target.value)}
                                                            className={cn("h-9", validationError && !service.name?.trim() && "border-red-300 focus:border-red-500")}
                                                            placeholder="Nombre del servicio"
                                                            aria-invalid={!service.name?.trim()}
                                                            aria-describedby={!service.name?.trim() ? `service-name-error-${index}` : undefined}
                                                        />
                                                    </div>

                                                    {/* Pricing Section */}
                                                    <div className="space-y-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <DollarSign className="h-4 w-4 text-gray-600" />
                                                            <Label className="text-xs font-semibold text-gray-700">Precios y Descuentos</Label>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3">
                                                            {/* Base Price */}
                                                            <div className="flex flex-col gap-1.5">
                                                                <Label htmlFor={`base-price-${index}`} className="text-xs font-medium flex items-center gap-1 h-5">
                                                                    Precio Base <span className="text-red-500">*</span>
                                                                </Label>
                                                                <div className="relative">
                                                                    <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                                    <Input
                                                                        id={`base-price-${index}`}
                                                                        type="number"
                                                                        step="0.01"
                                                                        min="0"
                                                                        value={service.base_price}
                                                                        onChange={(e) => handleServiceBasePriceChange(index, e.target.value)}
                                                                        className={cn("h-9 pl-7", validationError && parseFloat(service.base_price || "0") <= 0 && "border-red-300")}
                                                                        placeholder="0.00"
                                                                        aria-invalid={parseFloat(service.base_price || "0") <= 0}
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Discount */}
                                                            <div className="flex flex-col gap-1.5">
                                                                <Label htmlFor={`discount-${index}`} className="text-xs font-medium flex items-center gap-1 h-5">
                                                                    <Percent className="h-3 w-3" />
                                                                    Descuento %
                                                                </Label>
                                                                <div className="relative">
                                                                    <Input
                                                                        id={`discount-${index}`}
                                                                        type="number"
                                                                        min="0"
                                                                        max="100"
                                                                        step="0.01"
                                                                        value={service.discount_percentage === "0" ? "" : (service.discount_percentage || "")}
                                                                        onChange={(e) => {
                                                                            const value = e.target.value
                                                                            if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                                                                handleServiceDiscountChange(index, value)
                                                                            }
                                                                        }}
                                                                        onBlur={(e) => {
                                                                            const value = e.target.value.trim()
                                                                            if (value === "" || parseFloat(value) < 0 || isNaN(parseFloat(value))) {
                                                                                handleServiceDiscountChange(index, "0")
                                                                            } else if (parseFloat(value) > 100) {
                                                                                handleServiceDiscountChange(index, "100")
                                                                            }
                                                                        }}
                                                                        placeholder="0"
                                                                        className="h-9 pr-7"
                                                                        aria-label={`Descuento porcentual para ${service.name}`}
                                                                    />
                                                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">%</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Final Amount Display */}
                                                        <div className="pt-2 border-t border-gray-300">
                                                            <div className="flex items-center justify-between">
                                                                <Label className="text-xs font-semibold text-gray-700">Monto Final</Label>
                                                                <span className="text-base font-bold text-gray-900">
                                                                    {formatCurrency(service.amount || "0")}
                                                                </span>
                                                            </div>
                                                            {hasDiscount && (
                                                                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                                                    <span className="line-through">{formatCurrency(service.base_price || "0")}</span>
                                                                    <span>→</span>
                                                                    <span className="text-green-600 font-medium">{formatCurrency(service.amount || "0")}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Billing Cycle and Description */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {/* Billing Cycle */}
                                                        <div className="flex flex-col gap-1.5">
                                                            <Label htmlFor={`billing-cycle-${index}`} className="text-xs font-medium flex items-center gap-1 h-5">
                                                                <Calendar className="h-3 w-3" />
                                                                Ciclo de Facturación
                                                            </Label>
                                                            <Select
                                                                value={service.billing_cycle}
                                                                onValueChange={(value) => updateServiceField(index, 'billing_cycle', value)}
                                                            >
                                                                <SelectTrigger id={`billing-cycle-${index}`} className="h-9">
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

                                                        {/* Description - Optional */}
                                                        <div className="flex flex-col gap-1.5">
                                                            <Label htmlFor={`description-${index}`} className="text-xs font-medium h-5">
                                                                Descripción <span className="text-gray-400 font-normal">(opcional)</span>
                                                            </Label>
                                                            <Input
                                                                id={`description-${index}`}
                                                                value={service.description}
                                                                onChange={(e) => updateServiceField(index, 'description', e.target.value)}
                                                                className="h-9"
                                                                placeholder="Detalles adicionales..."
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}

                                {/* Start Date - Global */}
                                {formData.services.length > 0 && (
                                    <div className="grid gap-2 border-t pt-4 mt-2">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-gray-600" />
                                            <Label htmlFor="start_date" className="text-sm font-semibold">
                                                Fecha de Inicio (aplica a todos los servicios)
                                            </Label>
                                        </div>
                                        <Input
                                            id="start_date"
                                            type="date"
                                            value={formData.start_date}
                                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                            className="h-9 max-w-xs"
                                            aria-label="Fecha de inicio para todos los servicios"
                                        />
                                        <p className="text-xs text-gray-500">
                                            Todos los servicios seleccionados comenzarán en esta fecha
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                variant="outline"
                                onClick={handleClose}
                                disabled={saving}
                                className="w-full sm:w-auto"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={saving || formData.services.length === 0 || getValidationErrors().length > 0}
                                className="w-full sm:w-auto"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Check className="mr-2 h-4 w-4" />
                                        Asignar {formData.services.length > 0 ? `${formData.services.length} ` : ''}Servicio{formData.services.length !== 1 ? 's' : ''}
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog >
    )
}
