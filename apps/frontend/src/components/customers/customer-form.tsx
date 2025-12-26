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
import { ArrowLeft, Loader2, Save } from "lucide-react"
import useApi from "@/hooks/useApi"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ClientServicesList from "./client-services-list"

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
}

interface DocumentType {
  id: number
  name: string
  code: string
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

  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([])

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
    fiscal_condition_id: "1",
    person_type_id: "1",
    credit_limit: "",
    active: true,
    notes: "",
    document_type_id: "",
    documento: "",
  })

  const [isLoading, setIsLoading] = useState(false)

  // Estados para validación de duplicados
  const [nameError, setNameError] = useState<string>("")
  const [isCheckingName, setIsCheckingName] = useState<boolean>(false)

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    async function fetchDocumentTypes() {
      try {
        const response = await request({ method: "GET", url: "/document-types", signal })
        if (response && response.data) {
          setDocumentTypes(response.data)
        } else if (response && Array.isArray(response)) {
          setDocumentTypes(response)
        } else {
          console.error("Formato de respuesta inesperado para tipos de documento:", response)
          setDocumentTypes([]);
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error("Error cargando tipos de documento:", error)
          setDocumentTypes([]);
        }
      }
    }

    fetchDocumentTypes()

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

  const loadCustomerData = async (id: string, signal?: AbortSignal) => {
    setIsLoading(true)
    try {
      const response = await request({ method: "GET", url: `/customers/${id}`, signal })
      if (response && response.success && response.data) {
        const customer = response.data
        dispatch({ type: 'SET_ENTITY', entityType: 'customers', id, entity: customer });
        populateFormWithCustomerData(customer);
      } else {
        toast.error("Error", {
          description: "No se pudo cargar la información del cliente",
        })
      }
    } catch (err) {
      toast.error("Error", {
        description: "No se pudo cargar la información del cliente",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // --- INICIO DE MODIFICACIÓN ---
  const populateFormWithCustomerData = (customer: any) => {
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
      document_type_id: customer.person.document_type_id ? customer.person.document_type_id.toString() : "",
      documento: customer.person.documento || "",
    });
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
        toast.error("Esta combinación de nombre y apellido ya existe", {
          description: "Por favor, verifica los datos del cliente."
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validación de campos obligatorios
    const errors: string[] = []

    if (!formData.first_name?.trim()) {
      errors.push("El nombre es obligatorio")
    }



    if (errors.length > 0) {
      toast.error("Campos obligatorios faltantes", {
        description: errors.join(", ")
      })
      return
    }

    setIsLoading(true)

    try {
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
        cuit: formData.cuit,
        fiscal_condition_id: formData.fiscal_condition_id ? parseInt(formData.fiscal_condition_id, 10) : 1,
        person_type_id: formData.person_type_id ? parseInt(formData.person_type_id, 10) : 1,
        credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : null,
        document_type_id: formData.document_type_id ? parseInt(formData.document_type_id, 10) : null,
        documento: formData.documento || null,
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

        toast.success(customerId ? "Cliente actualizado" : "Cliente creado", {
          description: customerId
            ? "Los datos del cliente han sido actualizados correctamente"
            : "El nuevo cliente ha sido creado correctamente",
        })

        // Ejecutar callback si viene desde POS u otra vista embebida
        if (onSuccess) {
          try { onSuccess(response.data as Customer) } catch { }
        }

        // Navegar solo si no está deshabilitado
        if (!disableNavigate) {
          navigate("/dashboard/clientes")
        }
      } else {
        const errorMessage =
          response?.message || (customerId ? "No se pudo actualizar el cliente" : "No se pudo crear el cliente")
        toast.error(customerId ? "Error al actualizar" : "Error al crear", {
          description: errorMessage,
        })
      }
    } catch (err: any) {
      console.error("Error al procesar la solicitud:", err)

      // Handle Laravel validation errors (422 status)
      if (err?.response?.data?.errors) {
        const validationErrors = err.response.data.errors;
        // Get first error message from each field
        const errorMessages = Object.values(validationErrors)
          .map((fieldErrors: any) => Array.isArray(fieldErrors) ? fieldErrors[0] : fieldErrors)
          .join('\n');

        toast.error("Error de validación", {
          description: errorMessages,
        })
      } else {
        const errorMessage =
          err?.response?.data?.message ||
          (customerId ? "No se pudo actualizar el cliente" : "No se pudo crear el cliente")
        toast.error(customerId ? "Error al actualizar" : "Error al crear", {
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
                  {customerId && <TabsTrigger value="services">Servicios</TabsTrigger>}
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
                          <Label htmlFor="document_type_id">Tipo de Documento</Label>
                          {viewOnly ? (
                            <Input
                              value={documentTypes.find((dt) => dt.id.toString() === formData.document_type_id)?.name || ""}
                              disabled
                              readOnly
                            />
                          ) : (
                            <Select
                              value={formData.document_type_id}
                              onValueChange={(value) => handleSelectChange("document_type_id", value)}
                              disabled={isLoading}
                            >
                              <SelectTrigger id="document_type_id" className="cursor-pointer">
                                <SelectValue placeholder="Seleccionar tipo de documento" />
                              </SelectTrigger>
                              <SelectContent>
                                {documentTypes.map((dt) => (
                                  <SelectItem key={dt.id} value={dt.id.toString()}>
                                    {dt.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="documento">Número de Documento</Label>
                          <Input
                            id="documento"
                            name="documento"
                            value={formData.documento}
                            onChange={handleInputChange}
                            disabled={viewOnly || isLoading}
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
                        <div className="space-y-2 md:col-span-2">
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
                          : "Completa los datos fiscales y financieros del cliente."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* ... existing fiscal content ... */}
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="cuit">CUIT/CUIL</Label>
                          <Input
                            id="cuit"
                            name="cuit"
                            value={formData.cuit}
                            onChange={handleInputChange}
                            disabled={viewOnly || isLoading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="fiscal_condition_id">Condición Fiscal</Label>
                          <Select
                            value={formData.fiscal_condition_id}
                            onValueChange={(value) => handleSelectChange("fiscal_condition_id", value)}
                            disabled={viewOnly || isLoading}
                          >
                            <SelectTrigger id="fiscal_condition_id" className="cursor-pointer">
                              <SelectValue placeholder="Seleccionar condición fiscal" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Consumidor Final</SelectItem>
                              <SelectItem value="2">Responsable Inscripto</SelectItem>
                              <SelectItem value="3">Monotributista</SelectItem>
                              <SelectItem value="4">Exento</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
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

                {/* New Services Tab - Only visible if customer exists (editing or viewing) */}
                {customerId && (
                  <TabsContent value="services" className="space-y-4">
                    <ClientServicesList customerId={customerId} viewOnly={viewOnly} />
                  </TabsContent>
                )}
              </Tabs>
            </form>

          )}
        </div>
      </div>
    </div>
  )
}