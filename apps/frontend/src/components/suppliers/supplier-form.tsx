import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useEntityContext } from "@/context/EntityContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Loader2, Save, Plus, Trash2, ChevronDown } from "lucide-react"
import useApi from "@/hooks/useApi"
import { useFiscalConditions } from "@/hooks/useFiscalConditions"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { Supplier, SupplierTaxIdentity } from "@/types/product"

interface SupplierFormProps {
  supplierId?: string
  viewOnly?: boolean
  supplierData?: Supplier
  onSuccess?: (supplier: Supplier) => void
  disableNavigate?: boolean
  onCancel?: () => void
}

export default function SupplierForm({ supplierId, viewOnly = false, supplierData, onSuccess, disableNavigate = false, onCancel }: SupplierFormProps) {
  const navigate = useNavigate()
  const { request } = useApi()
  const { dispatch } = useEntityContext()

  const [formData, setFormData] = useState({
    name: "",
    contact_name: "",
    email: "",
    phone: "",
    address: "",
    cuit: "",
    fiscal_condition_id: "1",
    person_type_id: "1",
    status: "active",
  })

  // Tax identities state for multiple CUITs
  const [taxIdentities, setTaxIdentities] = useState<SupplierTaxIdentity[]>([])

  const { fiscalConditions, isLoading: fiscalConditionsLoading } = useFiscalConditions()

  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingName, setIsCheckingName] = useState(false)
  const [nameError, setNameError] = useState("")

  // Load supplier data if editing
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (supplierId && !supplierData) {
      loadSupplier()
    } else if (supplierData) {
      populateFormWithSupplierData(supplierData)
    }
  }, [supplierId, supplierData])

  const loadSupplier = async () => {
    setIsLoading(true)
    try {
      const response = await request({
        method: "GET",
        url: `/suppliers/${supplierId}`
      })

      if (response && response.data) {
        populateFormWithSupplierData(response.data)
      }
    } catch (error) {
      console.error("Error loading supplier:", error)
      toast.error("Error al cargar los datos del proveedor")
    } finally {
      setIsLoading(false)
    }
  }

  const populateFormWithSupplierData = (supplier: Supplier) => {
    if (!supplier) {
      console.error("El objeto proveedor es inválido", supplier)
      return
    }

    setFormData({
      name: supplier.name ?? "",
      contact_name: supplier.contact_name ?? "",
      email: supplier.email ?? "",
      phone: supplier.phone ?? "",
      address: supplier.address ?? "",
      cuit: supplier.cuit ?? "",
      fiscal_condition_id: "1",
      person_type_id: (supplier.person_type_id ?? 1).toString(),
      status: supplier.status ?? "active",
    })

    // Populate tax identities
    if (supplier.tax_identities && supplier.tax_identities.length > 0) {
      setTaxIdentities(supplier.tax_identities.map((ti: SupplierTaxIdentity) => ({
        id: ti.id,
        supplier_id: ti.supplier_id,
        cuit: ti.cuit || "",
        business_name: ti.business_name || "",
        fiscal_condition_id: (ti.fiscal_condition_id ?? "1").toString(),
        is_default: ti.is_default || false,
        cbu: ti.cbu || "",
        cbu_alias: ti.cbu_alias || "",
        bank_name: ti.bank_name || "",
        account_holder: ti.account_holder || "",
      })))
    } else if (supplier.cuit) {
      // Create a default tax identity from supplier.cuit if not already in tax_identities
      setTaxIdentities([{
        cuit: supplier.cuit,
        business_name: supplier.name,
        fiscal_condition_id: "1",
        is_default: true,
        cbu: "",
        cbu_alias: "",
        bank_name: "",
        account_holder: "",
      }])
    }
  }

  const checkNameExists = async (name: string) => {
    if (!name.trim()) {
      setNameError("")
      return
    }

    setIsCheckingName(true)
    try {
      const response = await request({
        method: 'GET',
        url: `/suppliers/check-name/${encodeURIComponent(name)}`
      })

      if (response.exists && name !== (supplierData?.name || '')) {
        setNameError("Un proveedor con este nombre ya existe")
        toast.error("Proveedor duplicado", {
          description: "Ya existe un proveedor con este nombre."
        })
      } else {
        setNameError("")
      }
    } catch (error) {
      console.error("Error checking name:", error)
      setNameError("")
    } finally {
      setIsCheckingName(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Validación de duplicados con debounce para nombre
    if (name === 'name') {
      const timeoutId = setTimeout(() => {
        checkNameExists(value)
      }, 500)
      return () => clearTimeout(timeoutId)
    }
  }

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, status: checked ? "active" : "inactive" }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Tax Identity management functions
  const addTaxIdentity = () => {
    const newIdentity: SupplierTaxIdentity = {
      cuit: "",
      business_name: "",
      fiscal_condition_id: "1",
      is_default: taxIdentities.length === 0,
      cbu: "",
      cbu_alias: "",
      bank_name: "",
      account_holder: "",
    }
    setTaxIdentities([...taxIdentities, newIdentity])
  }

  const removeTaxIdentity = (index: number) => {
    const updated = taxIdentities.filter((_, i) => i !== index)
    if (taxIdentities[index].is_default && updated.length > 0) {
      updated[0].is_default = true
    }
    setTaxIdentities(updated)
  }

  const updateTaxIdentity = (index: number, field: keyof SupplierTaxIdentity, value: string | boolean) => {
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

    const errors: string[] = []

    if (!formData.name?.trim()) {
      errors.push("El nombre del proveedor es obligatorio")
    }

    if (errors.length > 0) {
      toast.error("Completá los campos requeridos", {
        description: errors.join(". ")
      })
      return
    }

    setIsLoading(true)

    try {
      const defaultTaxIdentity = taxIdentities.find(ti => ti.is_default) || taxIdentities[0]
      
      const supplierPayload = {
        name: formData.name,
        contact_name: formData.contact_name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        cuit: defaultTaxIdentity?.cuit || formData.cuit,
        fiscal_condition_id: defaultTaxIdentity?.fiscal_condition_id 
          ? parseInt(defaultTaxIdentity.fiscal_condition_id as string, 10) 
          : 1,
        person_type_id: formData.person_type_id ? parseInt(formData.person_type_id, 10) : 1,
        status: formData.status,
        tax_identities: taxIdentities.length > 0 ? taxIdentities.map(ti => ({
          id: ti.id,
          cuit: ti.cuit || null,
          business_name: ti.business_name || null,
          fiscal_condition_id: ti.fiscal_condition_id ? parseInt(ti.fiscal_condition_id as string, 10) : 1,
          is_default: ti.is_default,
          cbu: ti.cbu || null,
          cbu_alias: ti.cbu_alias || null,
          bank_name: ti.bank_name || null,
          account_holder: ti.account_holder || null,
        })) : undefined,
      }

      const response = await request({
        method: supplierId ? "PUT" : "POST",
        url: supplierId ? `/suppliers/${supplierId}` : "/suppliers",
        data: supplierPayload,
      })

      if (response && response.success) {
        if (supplierId) {
          dispatch({
            type: 'SET_ENTITY',
            entityType: 'suppliers',
            id: supplierId,
            entity: response.data
          })
        }

        toast.success(supplierId ? "¡Proveedor actualizado!" : "¡Proveedor creado!", {
          description: supplierId
            ? `Los cambios de "${formData.name}" fueron guardados.`
            : `"${formData.name}" fue agregado a tu lista de proveedores.`,
        })

        if (onSuccess) {
          try { onSuccess(response.data as Supplier) } catch { /* Ignorar errores del callback */ }
        }

        if (!disableNavigate) {
          navigate("/dashboard/proveedores")
        }
      } else {
        const errorMessage = response?.message || "Ocurrió un problema al guardar los datos."
        toast.error("No se pudo guardar", {
          description: errorMessage,
        })
      }
    } catch (err: unknown) {
      const error = err as unknown as { response?: { data?: { errors?: Record<string, string[]>; message?: string } }; message?: string }
      console.error("Error al procesar la solicitud:", error)

      if (error?.response?.data?.errors) {
        const validationErrors = error.response.data.errors
        const errorMessages = Object.values(validationErrors)
          .map((fieldErrors: unknown) => Array.isArray(fieldErrors) ? fieldErrors[0] : fieldErrors)
          .join('. ')

        toast.error("Verificá los datos ingresados", {
          description: errorMessages,
        })
      } else {
        const errorMessage = error?.response?.data?.message || "Verificá tu conexión e intentá de nuevo."
        toast.error("No se pudo guardar el proveedor", {
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
                  <Link to="/dashboard/proveedores">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Volver</span>
                  </Link>
                </Button>
              )}
              <h2 className="text-3xl font-bold tracking-tight">
                {viewOnly ? "Ver Proveedor" : supplierId ? "Editar Proveedor" : "Nuevo Proveedor"}
              </h2>
            </div>
            {!viewOnly && (
              <Button type="submit" onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {supplierId ? "Actualizando..." : "Creando..."}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {supplierId ? "Guardar Cambios" : "Crear Proveedor"}
                  </>
                )}
              </Button>
            )}
          </div>
          {isLoading && !supplierData ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <Tabs defaultValue="personal" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="personal">Información General</TabsTrigger>
                  <TabsTrigger value="fiscal">Información Fiscal</TabsTrigger>
                </TabsList>

                <TabsContent value="personal" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Datos Generales</CardTitle>
                      <CardDescription>
                        {viewOnly ? "Información general del proveedor." : "Completa los datos generales del proveedor. Los campos marcados con * son obligatorios."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="name">
                            Nombre o Empresa <span className="text-red-500">*</span>
                          </Label>
                          <div className="relative">
                            <Input
                              id="name"
                              name="name"
                              value={formData.name}
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
                          <Label htmlFor="contact_name">Persona de Contacto</Label>
                          <Input
                            id="contact_name"
                            name="contact_name"
                            value={formData.contact_name}
                            onChange={handleInputChange}
                            disabled={viewOnly || isLoading}
                            placeholder="Nombre del contacto"
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
                        <div className="flex flex-col items-start justify-start gap-2 mt-2">
                          <Label htmlFor="status" className="mb-0">Estado</Label>
                          <div className="flex items-center gap-3">
                            <p className="text-sm text-muted-foreground m-0">
                              {formData.status === "active" ? "Activo" : "Inactivo"}
                            </p>
                            {!viewOnly && (
                              <Switch
                                id="status"
                                checked={formData.status === "active"}
                                onCheckedChange={handleSwitchChange}
                                disabled={isLoading}
                              />
                            )}
                          </div>
                        </div>
                      </div>

                      <Separator className="my-4" />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="fiscal" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Información Fiscal y Financiera</CardTitle>
                      <CardDescription>
                        Completa los datos fiscales y financieros del proveedor. Puedes agregar múltiples CUITs/Razones Sociales.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                      </div>

                      <Separator className="my-4" />

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold">Identidades Fiscales (CUITs)</h4>
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
                                        value={identity.fiscal_condition_id as string}
                                        onValueChange={(value) => updateTaxIdentity(index, "fiscal_condition_id", value)}
                                        disabled={viewOnly || isLoading || fiscalConditionsLoading}
                                      >
                                        <SelectTrigger className="h-9 cursor-pointer">
                                          <SelectValue placeholder={fiscalConditionsLoading ? "Cargando…" : "Condición fiscal"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {fiscalConditions.map((fc) => (
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
                                              const value = e.target.value.replace(/\D/g, '').slice(0, 22)
                                              updateTaxIdentity(index, "cbu", value)
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
