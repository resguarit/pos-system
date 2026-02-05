import type React from "react"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useEntityContext } from "@/context/EntityContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Loader2, Save, Plus, Trash2, ChevronDown } from "lucide-react"
import useApi from "@/hooks/useApi"
import { useFiscalConditions, type FiscalCondition } from "@/hooks/useFiscalConditions"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface TaxIdentity {
  id?: number
  cuit: string
  business_name: string
  fiscal_condition_id: string
  is_default: boolean
  cbu: string
  cbu_alias: string
  bank_name: string
  account_holder: string
}

interface Customer {
  id: number
  person_id: number
  email: string
  active: boolean
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  person: {
    id: number
    last_name: string
    first_name: string
    address: string
    city: string | null
    state: string | null
    postal_code: string | null
    phone: string
    cuit: string
    fiscal_condition_id: number
    person_type_id: number
    credit_limit: number
    document_type_id: number | null
    documento: string | null
    person_type: string
    created_at: string
    updated_at: string
    deleted_at: string | null
  }
  tax_identities?: TaxIdentity[]
}

interface CustomerFormProps {
  customerId?: string
  viewOnly?: boolean
  customerData?: Customer
  onSuccess?: (customer: Customer) => void // callback opcional al guardar
  disableNavigate?: boolean // si true, no navega al terminar
  onCancel?: () => void // si se provee, el botón Volver dispara esta función en lugar de navegar
}

export default function CustomerForm({ customerId, viewOnly = false, customerData, onSuccess, disableNavigate = false, onCancel }: CustomerFormProps) {
  const navigate = useNavigate()
  const { request } = useApi()
  const { state, dispatch } = useEntityContext()

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    postal_code: "",
    cuit: "",
    fiscal_condition_id: "",
    person_type_id: "1",
    credit_limit: "",
    active: true,
    notes: "",
    documento: "",
  })

  // Tax identities state for multiple CUITs
  const [taxIdentities, setTaxIdentities] = useState<TaxIdentity[]>([])

  const { fiscalConditions, isLoading: fiscalConditionsLoading } = useFiscalConditions()

  const [isLoading, setIsLoading] = useState(false)

  // Estados para validación de duplicados
  const [nameError, setNameError] = useState<string>("")
  const [isCheckingName, setIsCheckingName] = useState<boolean>(false)

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    if (customerData) {
      populateFormWithCustomerData(customerData)
    }
    else if (customerId) {
      const cachedCustomer = state.customers[customerId]
      if (cachedCustomer) {
        populateFormWithCustomerData(cachedCustomer)
      } else {
        loadCustomerData(customerId, signal)
      }
    }
    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, customerData, dispatch])

  // Set default fiscal condition (Consumidor Final) for new customers
  useEffect(() => {
    if (!customerId && !customerData && fiscalConditions.length > 0 && !formData.fiscal_condition_id) {
      // Best practice: match by AFIP code "5" (Consumidor Final) or fallback to name matching
      const consumidorFinal = fiscalConditions.find(fc => fc.afip_code === '5' || fc.name.toLowerCase().includes('consumidor final'));
      if (consumidorFinal) {
        setFormData(prev => ({ ...prev, fiscal_condition_id: String(consumidorFinal.id) }));
      }
    }
  }, [fiscalConditions, customerId, customerData, formData.fiscal_condition_id]);

  const loadCustomerData = async (id: string, signal?: AbortSignal) => {
    setIsLoading(true)
    try {
      const response = await request({ method: "GET", url: `/customers/${id}`, signal })
      if (response && response.success && response.data) {
        const customer = response.data
        dispatch({ type: 'SET_ENTITY', entityType: 'customers', id, entity: customer });
        populateFormWithCustomerData(customer);
      } else {
        toast.error("No se pudo cargar el cliente", {
          description: "Verificá tu conexión e intentá de nuevo.",
        })
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
        // Abort/Canceled: ocurre al cerrar el formulario; no mostrar toast de error
        return;
      }
      toast.error("Error de conexión", {
        description: "No se pudo cargar el cliente. Revisá tu conexión a internet.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // --- INICIO DE MODIFICACIÓN ---
  const populateFormWithCustomerData = (customer: Customer) => {
    if (!customer || !customer.person) {
      console.error("El objeto cliente o persona es inválido", customer);
      return;
    }

    setFormData({
      first_name: customer.person.first_name ?? "",
      last_name: customer.person.last_name ?? "",
      email: customer.email ?? "",
      phone: customer.person.phone ?? "",
      address: customer.person.address ?? "",
      city: customer.person.city ?? "",
      state: customer.person.state ?? "",
      postal_code: customer.person.postal_code ?? "",
      cuit: customer.person.cuit ?? "",
      fiscal_condition_id: (customer.person.fiscal_condition_id ?? "1").toString(),
      person_type_id: (customer.person.person_type_id ?? "1").toString(),
      credit_limit: customer.person.credit_limit !== null && customer.person.credit_limit !== undefined
        ? customer.person.credit_limit.toString()
        : "",
      active: customer.active,
      notes: customer.notes ?? "",
      documento: customer.person.documento || "",
    });

    // Populate tax identities
    if (customer.tax_identities && customer.tax_identities.length > 0) {
      setTaxIdentities(customer.tax_identities.map((ti: TaxIdentity) => ({
        id: ti.id,
        cuit: ti.cuit || "",
        business_name: ti.business_name || "",
        fiscal_condition_id: (ti.fiscal_condition_id ?? "1").toString(),
        is_default: ti.is_default || false,
        cbu: ti.cbu || "",
        cbu_alias: ti.cbu_alias || "",
        bank_name: ti.bank_name || "",
        account_holder: ti.account_holder || "",
      })));
    } else if (customer.person.cuit) {
      // Backward compatibility: create a tax identity from person data
      setTaxIdentities([{
        cuit: customer.person.cuit || "",
        business_name: `${customer.person.first_name || ""} ${customer.person.last_name || ""}`.trim(),
        fiscal_condition_id: (customer.person.fiscal_condition_id ?? "1").toString(),
        is_default: true,
        cbu: "",
        cbu_alias: "",
        bank_name: "",
        account_holder: "",
      }]);
    }
  }
  // --- FIN DE MODIFICACIÓN ---

  // Función para verificar si la combinación nombre + apellido ya existe
  const checkNameExists = async (firstName: string, lastName: string) => {
    if (!firstName.trim() || !lastName.trim()) {
      setNameError("");
      return;
    }

    setIsCheckingName(true);
    try {
      const response = await request({
        method: 'GET',
        url: `/customers/check-name/${encodeURIComponent(firstName)}/${encodeURIComponent(lastName)}`
      });

      if (response.exists &&
        (firstName !== (customerData?.person?.first_name || '') ||
          lastName !== (customerData?.person?.last_name || ''))) {
        setNameError("Esta combinación de nombre y apellido ya existe");
        toast.error("Cliente duplicado", {
          description: "Ya existe un cliente con este nombre y apellido."
        });
      } else {
        setNameError("");
      }
    } catch (error) {
      console.error("Error checking name:", error);
      setNameError("");
    } finally {
      setIsCheckingName(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Validación de duplicados con debounce para nombre y apellido
    if (name === 'first_name' || name === 'last_name') {
      const timeoutId = setTimeout(() => {
        checkNameExists(
          name === 'first_name' ? value : formData.first_name,
          name === 'last_name' ? value : formData.last_name
        );
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, active: checked }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Tax Identity management functions
  const addTaxIdentity = () => {
    const newIdentity: TaxIdentity = {
      cuit: "",
      business_name: "",
      fiscal_condition_id: "1",
      is_default: taxIdentities.length === 0, // First one is default
      cbu: "",
      cbu_alias: "",
      bank_name: "",
      account_holder: "",
    }
    setTaxIdentities([...taxIdentities, newIdentity])
  }

  const removeTaxIdentity = (index: number) => {
    const updated = taxIdentities.filter((_, i) => i !== index)
    // If we removed the default, make the first one default
    if (taxIdentities[index].is_default && updated.length > 0) {
      updated[0].is_default = true
    }
    setTaxIdentities(updated)
  }

  const updateTaxIdentity = (index: number, field: keyof TaxIdentity, value: string | boolean) => {
    const updated = [...taxIdentities]
    updated[index] = { ...updated[index], [field]: value }
    setTaxIdentities(updated)
  }

  const setDefaultTaxIdentity = (index: number) => {
    const updated = taxIdentities.map((ti, i) => ({
      ...ti,
      is_default: i === index
    }))
    setTaxIdentities(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validación de campos obligatorios
    const errors: string[] = []

    if (!formData.first_name?.trim()) {
      errors.push("El nombre es obligatorio")
    }



    if (errors.length > 0) {
      toast.error("Completá los campos requeridos", {
        description: errors.join(". ")
      })
      return
    }

    setIsLoading(true)

    try {
      // Get default tax identity's CUIT and fiscal_condition for backward compatibility
      const defaultTaxIdentity = taxIdentities.find(ti => ti.is_default) || taxIdentities[0]

      const customerData = {
        email: formData.email,
        active: formData.active,
        notes: formData.notes,
        first_name: formData.first_name,
        last_name: formData.last_name,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postal_code,
        phone: formData.phone,
        // Backward compatibility: use default tax identity's CUIT if available
        cuit: defaultTaxIdentity?.cuit || formData.cuit,
        fiscal_condition_id: defaultTaxIdentity?.fiscal_condition_id
          ? parseInt(defaultTaxIdentity.fiscal_condition_id, 10)
          : (formData.fiscal_condition_id
            ? parseInt(formData.fiscal_condition_id, 10)
            : (fiscalConditions.find(fc => fc.afip_code === '5' || fc.name.toLowerCase().includes('consumidor final'))?.id || 5)),
        person_type_id: formData.person_type_id ? parseInt(formData.person_type_id, 10) : 1,
        credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : null,
        // Siempre DNI (document_type_id = 1) cuando hay documento
        document_type_id: formData.documento ? 1 : null,
        documento: formData.documento || null,
        // New: include tax identities array
        tax_identities: taxIdentities.length > 0 ? taxIdentities.map(ti => ({
          id: ti.id,
          cuit: ti.cuit || null,
          business_name: ti.business_name || null,
          fiscal_condition_id: ti.fiscal_condition_id ? parseInt(ti.fiscal_condition_id, 10) : 1,
          is_default: ti.is_default,
          cbu: ti.cbu || null,
          cbu_alias: ti.cbu_alias || null,
          bank_name: ti.bank_name || null,
          account_holder: ti.account_holder || null,
        })) : undefined,
      }

      const response = await request({
        method: customerId ? "PUT" : "POST",
        url: customerId ? `/customers/${customerId}` : "/customers",
        data: customerData,
      })

      if (response && response.success) {
        if (customerId) {
          dispatch({
            type: 'SET_ENTITY',
            entityType: 'customers',
            id: customerId,
            entity: response.data
          });
        }

        toast.success(customerId ? "¡Cliente actualizado!" : "¡Cliente creado!", {
          description: customerId
            ? `Los cambios de "${formData.first_name}" fueron guardados.`
            : `"${formData.first_name}" fue agregado a tu lista de clientes.`,
        })

        // Ejecutar callback si viene desde POS u otra vista embebida
        if (onSuccess) {
          try { onSuccess(response.data as Customer) } catch { /* Ignorar errores del callback */ }
        }

        // Navegar solo si no está deshabilitado
        if (!disableNavigate) {
          navigate("/dashboard/clientes")
        }
      } else {
        const errorMessage = response?.message || "Ocurrió un problema al guardar los datos."
        toast.error("No se pudo guardar", {
          description: errorMessage,
        })
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } }; message?: string }
      console.error("Error al procesar la solicitud:", error)

      // Handle Laravel validation errors (422 status)
      if (error?.response?.data?.errors) {
        const validationErrors = error.response?.data?.errors;
        // Get first error message from each field
        const errorMessages = Object.values(validationErrors)
          .map((fieldErrors: unknown) => Array.isArray(fieldErrors) ? fieldErrors[0] : fieldErrors)
          .join('. ');

        toast.error("Verificá los datos ingresados", {
          description: errorMessages,
        })
      } else {
        const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Verificá tu conexión e intentá de nuevo."
        toast.error("No se pudo guardar el cliente", {
          description: errorMessage,
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex justify-center items-start min-h-[80vh] w-full">
      <div className="w-full">
        <div className="space-y-4 p-4 pt-16 md:p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {onCancel ? (
                <Button variant="outline" size="icon" onClick={onCancel}>
                  <ArrowLeft className="h-4 w-4" />
                  <span className="sr-only">Volver</span>
                </Button>
              ) : (
                <Button variant="outline" size="icon" asChild>
                  <Link to="/dashboard/clientes">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Volver</span>
                  </Link>
                </Button>
              )}
              <h2 className="text-3xl font-bold tracking-tight">
                {viewOnly ? "Ver Cliente" : customerId ? "Editar Cliente" : "Nuevo Cliente"}
              </h2>
            </div>
            {!viewOnly && (
              <Button type="submit" onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {customerId ? "Actualizando..." : "Creando..."}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {customerId ? "Guardar Cambios" : "Crear Cliente"}
                  </>
                )}
              </Button>
            )}
          </div>
          {isLoading && !customerData ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <Tabs defaultValue="personal" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="personal">Información Personal</TabsTrigger>
                  <TabsTrigger value="fiscal">Información Fiscal</TabsTrigger>
                </TabsList>

                <TabsContent value="personal" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Datos Personales</CardTitle>
                      <CardDescription>
                        {viewOnly ? "Información personal del cliente." : "Completa los datos personales del cliente. Los campos marcados con * son obligatorios."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="first_name">
                            Nombre (o Razón Social) <span className="text-red-500">*</span>
                          </Label>
                          <div className="relative">
                            <Input
                              id="first_name"
                              name="first_name"
                              value={formData.first_name}
                              onChange={handleInputChange}
                              disabled={viewOnly || isLoading}
                              required
                              className={nameError ? 'border-red-500 focus:border-red-500 focus:ring-red-500 focus:ring-2' : ''}
                              style={{ borderColor: nameError ? '#ef4444' : undefined }}
                            />
                            {isCheckingName && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="last_name">
                            Apellido
                          </Label>
                          <div className="relative">
                            <Input
                              id="last_name"
                              name="last_name"
                              value={formData.last_name}
                              onChange={handleInputChange}
                              disabled={viewOnly || isLoading}
                              required
                              className={nameError ? 'border-red-500 focus:border-red-500 focus:ring-red-500 focus:ring-2' : ''}
                              style={{ borderColor: nameError ? '#ef4444' : undefined }}
                            />
                            {isCheckingName && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="documento">DNI</Label>
                          <Input
                            id="documento"
                            name="documento"
                            value={formData.documento}
                            onChange={handleInputChange}
                            disabled={viewOnly || isLoading}
                            placeholder="Número de documento"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Correo Electrónico</Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            disabled={viewOnly || isLoading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Teléfono</Label>
                          <Input
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            disabled={viewOnly || isLoading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="address">Dirección</Label>
                          <Input
                            id="address"
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            disabled={viewOnly || isLoading}
                            placeholder="Calle y número"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">Provincia/Estado</Label>
                          <Input
                            id="state"
                            name="state"
                            value={formData.state}
                            onChange={handleInputChange}
                            disabled={viewOnly || isLoading}
                            placeholder="Provincia o estado"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="city">Ciudad</Label>
                          <Input
                            id="city"
                            name="city"
                            value={formData.city}
                            onChange={handleInputChange}
                            disabled={viewOnly || isLoading}
                            placeholder="Ciudad"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="postal_code">Código Postal</Label>
                          <Input
                            id="postal_code"
                            name="postal_code"
                            value={formData.postal_code}
                            onChange={handleInputChange}
                            disabled={viewOnly || isLoading}
                            placeholder="CP"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="active">Estado de la cuenta</Label>
                          <div className="flex items-center space-x-2 pt-2">
                            <Switch
                              id="active"
                              checked={formData.active}
                              onCheckedChange={handleSwitchChange}
                              disabled={viewOnly || isLoading}
                              className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500 cursor-pointer"
                            />
                            <Label htmlFor="active" className={`transition-colors cursor-pointer ${formData.active ? 'text-green-600' : 'text-red-600'}`}>
                              {formData.active ? "Activa" : "Inactiva"}
                            </Label>
                          </div>
                        </div>

                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="fiscal" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Información Fiscal y Financiera</CardTitle>
                      <CardDescription>
                        {viewOnly
                          ? "Datos fiscales y financieros del cliente."
                          : "Completa los datos fiscales y financieros del cliente. Puedes agregar múltiples CUITs/Razones Sociales."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Person Type Selection */}
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="person_type_id">Tipo de Persona</Label>
                          {viewOnly ? (
                            <Input
                              value={formData.person_type_id === "1" ? "Persona Física" : "Persona Jurídica"}
                              disabled
                              readOnly
                            />
                          ) : (
                            <Select
                              value={formData.person_type_id}
                              onValueChange={(value) => handleSelectChange("person_type_id", value)}
                              disabled={isLoading}
                            >
                              <SelectTrigger id="person_type_id" className="cursor-pointer">
                                <SelectValue placeholder="Seleccionar tipo de persona" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">Persona Física</SelectItem>
                                <SelectItem value="2">Persona Jurídica</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="credit_limit">Límite de Crédito ($)</Label>
                          <Input
                            id="credit_limit"
                            name="credit_limit"
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.credit_limit}
                            onChange={handleInputChange}
                            disabled={viewOnly || isLoading}
                            placeholder="Dejar vacío para límite infinito"
                          />
                          <p className="text-sm text-muted-foreground">
                            Dejar vacío para permitir crédito ilimitado
                          </p>
                        </div>
                      </div>

                      <Separator className="my-4" />

                      {/* Tax Identities Section */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-medium">Identidades Fiscales (CUITs)</h3>
                            <p className="text-sm text-muted-foreground">
                              {formData.person_type_id === "2"
                                ? "Una persona jurídica puede tener múltiples razones sociales/CUITs."
                                : "Datos fiscales del cliente."}
                            </p>
                          </div>
                          {!viewOnly && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addTaxIdentity}
                              disabled={isLoading}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Agregar CUIT
                            </Button>
                          )}
                        </div>

                        {taxIdentities.length === 0 ? (
                          <div className="rounded-lg border border-dashed p-6 text-center">
                            <p className="text-sm text-muted-foreground mb-2">
                              No hay identidades fiscales registradas.
                            </p>
                            {!viewOnly && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addTaxIdentity}
                                disabled={isLoading}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Agregar primer CUIT
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {taxIdentities.map((identity, index) => (
                              <Collapsible key={index} className="group">
                                <div className={`rounded-lg border ${identity.is_default ? "border-primary bg-primary/5" : "bg-background"}`}>
                                  {/* Header row - always visible */}
                                  <div className="flex items-center gap-3 p-4">
                                    <input
                                      type="radio"
                                      name="default-identity"
                                      checked={identity.is_default}
                                      onChange={() => !viewOnly && setDefaultTaxIdentity(index)}
                                      disabled={viewOnly || isLoading}
                                      className="h-4 w-4 cursor-pointer accent-primary shrink-0"
                                      title={identity.is_default ? "Predeterminado" : "Marcar como predeterminado"}
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1 min-w-0">
                                      <Input
                                        value={identity.cuit}
                                        onChange={(e) => updateTaxIdentity(index, "cuit", e.target.value)}
                                        disabled={viewOnly || isLoading}
                                        placeholder="CUIT/CUIL"
                                        className="h-9"
                                      />
                                      <Input
                                        value={identity.business_name}
                                        onChange={(e) => updateTaxIdentity(index, "business_name", e.target.value)}
                                        disabled={viewOnly || isLoading}
                                        placeholder="Razón Social / Alias"
                                        className="h-9"
                                      />
                                      <Select
                                        value={identity.fiscal_condition_id}
                                        onValueChange={(value) => updateTaxIdentity(index, "fiscal_condition_id", value)}
                                        disabled={viewOnly || isLoading || fiscalConditionsLoading}
                                      >
                                        <SelectTrigger className="h-9 cursor-pointer">
                                          <SelectValue placeholder={fiscalConditionsLoading ? "Cargando…" : "Condición fiscal"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {fiscalConditions
                                            .filter(fc => fc.afip_code !== '5' && !fc.name.toLowerCase().includes('consumidor final'))
                                            .map((fc) => (
                                              <SelectItem key={fc.id} value={String(fc.id)}>
                                                {fc.name}
                                              </SelectItem>
                                            ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <CollapsibleTrigger asChild>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-9 w-9 text-muted-foreground hover:text-foreground"
                                        >
                                          <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                                        </Button>
                                      </CollapsibleTrigger>
                                      {!viewOnly && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => removeTaxIdentity(index)}
                                          disabled={isLoading}
                                          className="h-9 w-9 text-muted-foreground hover:text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Expandable bank account section */}
                                  <CollapsibleContent>
                                    <div className="border-t px-4 py-4 bg-muted/30">
                                      <p className="text-sm font-medium text-muted-foreground mb-3">
                                        Datos de Pago <span className="font-normal">(CBU/CVU o Alias)</span>
                                      </p>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                          <Label className="text-xs text-muted-foreground">CBU / CVU</Label>
                                          <Input
                                            value={identity.cbu}
                                            onChange={(e) => {
                                              const value = e.target.value.replace(/\D/g, '').slice(0, 22);
                                              updateTaxIdentity(index, "cbu", value);
                                            }}
                                            disabled={viewOnly || isLoading}
                                            placeholder="22 dígitos"
                                            className="h-9 font-mono"
                                            maxLength={22}
                                          />
                                          {identity.cbu && identity.cbu.length > 0 && identity.cbu.length !== 22 && (
                                            <p className="text-xs text-amber-600">{identity.cbu.length}/22 dígitos</p>
                                          )}
                                        </div>
                                        <div className="space-y-1.5">
                                          <Label className="text-xs text-muted-foreground">Alias</Label>
                                          <Input
                                            value={identity.cbu_alias}
                                            onChange={(e) => updateTaxIdentity(index, "cbu_alias", e.target.value)}
                                            disabled={viewOnly || isLoading}
                                            placeholder="mi.alias.cbu"
                                            className="h-9"
                                            maxLength={50}
                                          />
                                        </div>
                                        <div className="space-y-1.5">
                                          <Label className="text-xs text-muted-foreground">Banco <span className="text-muted-foreground/60">(opcional)</span></Label>
                                          <Input
                                            value={identity.bank_name}
                                            onChange={(e) => updateTaxIdentity(index, "bank_name", e.target.value)}
                                            disabled={viewOnly || isLoading}
                                            placeholder="Ej: Banco Nación, Mercado Pago"
                                            className="h-9"
                                            maxLength={100}
                                          />
                                        </div>
                                        <div className="space-y-1.5">
                                          <Label className="text-xs text-muted-foreground">Titular <span className="text-muted-foreground/60">(opcional)</span></Label>
                                          <Input
                                            value={identity.account_holder}
                                            onChange={(e) => updateTaxIdentity(index, "account_holder", e.target.value)}
                                            disabled={viewOnly || isLoading}
                                            placeholder="Nombre del titular de la cuenta"
                                            className="h-9"
                                            maxLength={255}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            ))}
                          </div>
                        )}
                      </div>

                      <Separator className="my-4" />

                      <div className="space-y-2">
                        <Label htmlFor="notes">Notas</Label>
                        <Textarea
                          id="notes"
                          name="notes"
                          value={formData.notes}
                          onChange={handleInputChange}
                          rows={4}
                          disabled={viewOnly || isLoading}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

              </Tabs>
            </form>

          )}
        </div>
      </div>
    </div>
  )
}