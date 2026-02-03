import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import axios from "axios"

// Componentes de UI
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Loader2, Save, ArrowLeft, RefreshCw, Check } from "lucide-react"

// Hooks y Contexto
import useApi from "@/hooks/useApi"
import { useEntityContext } from "@/context/EntityContext"
import { useAfip, type AfipPointOfSale, type AfipReceiptType } from "@/hooks/useAfip"

// Interfaces
interface User {
  id: number
  email: string
  username: string
  active: boolean
  person: {
    id: number
    first_name: string
    last_name: string
  }
  full_name?: string
}

interface Branch {
  id?: number
  description: string
  address: string
  phone: string
  email?: string
  manager_id?: number | null
  status: number
  point_of_sale?: string
  color?: string
  cuit?: string
  razon_social?: string
  domicilio_comercial?: string
  enabled_receipt_types?: number[]
  iibb?: string
  start_date?: string
}

interface BranchFormProps {
  branch?: Branch
  isReadOnly?: boolean
}

const initialBranch: Branch = {
  description: "",
  address: "",
  phone: "",
  email: "",
  manager_id: null,
  status: 1,
  point_of_sale: "",
  color: "#0ea5e9",
  cuit: "",
  razon_social: "",
  domicilio_comercial: "",
  enabled_receipt_types: [],
  iibb: "",
  start_date: "",
}

function initializeFormState(currentBranch?: Branch): Branch {
  if (currentBranch && currentBranch.id) {
    return {
      id: currentBranch.id,
      description: currentBranch.description || "",
      address: currentBranch.address || "",
      phone: currentBranch.phone || "",
      email: currentBranch.email || "",
      manager_id: currentBranch.manager_id ?? null,
      status:
        typeof currentBranch.status === "boolean"
          ? currentBranch.status ? 1 : 0
          : typeof currentBranch.status === "number"
            ? currentBranch.status
            : initialBranch.status,
      point_of_sale: currentBranch.point_of_sale || "",
      color:
        typeof currentBranch.color === "string" &&
          currentBranch.color.startsWith("#") &&
          currentBranch.color.length === 7
          ? currentBranch.color
          : initialBranch.color,
      cuit: currentBranch.cuit || "",
      razon_social: currentBranch.razon_social || "",
      domicilio_comercial: (currentBranch as any).domicilio_comercial || "",
      enabled_receipt_types: (currentBranch as any).enabled_receipt_types || [],
      iibb: (currentBranch as any).iibb || "",
      start_date: (currentBranch as any).start_date || "",
    }
  }
  return initialBranch
}

export function BranchesForm({ branch, isReadOnly = false }: BranchFormProps) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<Branch>(() => initializeFormState(branch))
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const { request } = useApi()
  const { dispatch } = useEntityContext()
  const { getPointsOfSale, getReceiptTypes, checkCuitCertificate, validCertificates } = useAfip()

  // Estados para validación de duplicados
  const [nameError, setNameError] = useState<string>("")
  const [isCheckingName, setIsCheckingName] = useState<boolean>(false)

  // Estado para la pestaña activa
  const [activeTab, setActiveTab] = useState("general")

  // Estados para puntos de venta AFIP
  const [afipPointsOfSale, setAfipPointsOfSale] = useState<AfipPointOfSale[]>([])
  const [loadingAfipPoints, setLoadingAfipPoints] = useState(false)

  // Estados para tipos de comprobantes AFIP
  const [afipReceiptTypes, setAfipReceiptTypes] = useState<AfipReceiptType[]>([])
  const [loadingReceiptTypes, setLoadingReceiptTypes] = useState(false)

  const isEditing = !!branch?.id

  useEffect(() => {
    setFormData(initializeFormState(branch))
  }, [branch])

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    fetchUsers(signal);

    return () => {
      controller.abort();
    };
  }, [])

  const fetchUsers = async (signal?: AbortSignal) => {
    setLoadingUsers(true)
    try {
      const response = await request({ method: "GET", url: "/users", signal })

      let usersData: any[] = []
      if (response && Array.isArray(response)) {
        usersData = response
      } else if (response && response.data && Array.isArray(response.data)) {
        usersData = response.data
      } else if (response && response.data && response.data.data && Array.isArray(response.data.data)) {
        usersData = response.data.data
      }

      if (usersData && usersData.length > 0) {
        const mappedUsers = usersData
          .map((user: any) => {
            let fullName = user.full_name || `${user.person?.first_name || ""} ${user.person?.last_name || ""}`.trim()
            if (!fullName) {
              fullName = user.email || user.username || "Usuario sin nombre"
            }
            return {
              ...user,
              id: Number(user.id),
              full_name: fullName,
            }
          })
          .filter((user) => user.id && !isNaN(user.id))
        setUsers(mappedUsers)
      } else {
        setUsers([])
      }
    } catch (error: any) {
      if (!axios.isCancel(error)) {
        console.error("Error fetching users for branch form:", error)
        toast.error("No se pudieron cargar los usuarios")
      }
      setUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }

  // Función para verificar si el nombre ya existe
  const checkNameExists = async (name: string) => {
    if (!name.trim()) {
      setNameError("");
      return;
    }

    setIsCheckingName(true);
    try {
      const response = await request({
        method: 'GET',
        url: `/branches/check-name/${encodeURIComponent(name)}`
      });

      if (response.exists && name !== (branch?.description || '')) {
        setNameError("Este nombre ya está en uso");
        toast.error("Este nombre ya está en uso", {
          description: "Por favor, elige un nombre diferente para la sucursal."
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

  // Cargar puntos de venta desde AFIP cuando se ingresa un CUIT
  // Solo carga si el CUIT tiene certificado válido registrado (multi-CUIT)
  const loadAfipPointsOfSale = async (cuit: string, silent = false) => {
    const cleanCuit = cuit.replace(/[^0-9]/g, '')
    if (cleanCuit.length !== 11) {
      setAfipPointsOfSale([])
      return
    }

    // Verificar si el CUIT tiene certificado válido
    const certCheck = await checkCuitCertificate(cleanCuit)
    if (!certCheck.has_certificate || !certCheck.is_valid) {
      setAfipPointsOfSale([])
      if (!silent) {
        toast.warning('Este CUIT no tiene certificado configurado', {
          description: 'Registre el certificado AFIP para este CUIT en Configuración.'
        })
      }
      return
    }

    setLoadingAfipPoints(true)
    try {
      const points = await getPointsOfSale(cleanCuit, { suppressError: silent })

      if (points === null) {
        // Error ocurred (handled by hook)
        setAfipPointsOfSale([])
        return
      }

      if (points && points.length > 0) {
        setAfipPointsOfSale(points)
        if (!silent) {
          toast.success(`Se encontraron ${points.length} punto(s) de venta habilitado(s) en AFIP`)
        }
      } else {
        setAfipPointsOfSale([])
        if (!silent) {
          toast.info('No se encontraron puntos de venta habilitados para este CUIT en AFIP')
        }
      }
    } catch (error) {
      setAfipPointsOfSale([])
    } finally {
      setLoadingAfipPoints(false)
    }
  }

  // Cargar tipos de comprobantes desde AFIP
  // Solo carga si el CUIT tiene certificado válido registrado
  const loadAfipReceiptTypes = async (cuit: string, silent = false) => {
    const cleanCuit = cuit.replace(/[^0-9]/g, '')
    if (cleanCuit.length !== 11) {
      setAfipReceiptTypes([])
      return
    }

    // Verificar si el CUIT tiene certificado válido
    const certCheck = await checkCuitCertificate(cleanCuit)
    if (!certCheck.has_certificate || !certCheck.is_valid) {
      setAfipReceiptTypes([])
      if (!silent) {
        toast.warning('Este CUIT no tiene certificado configurado', {
          description: 'Solo puede emitir comprobantes AFIP para CUITs con certificado válido registrado en el sistema.'
        })
      }
      return
    }

    setLoadingReceiptTypes(true)
    try {
      const types = await getReceiptTypes(cleanCuit)

      if (types === null) {
        setAfipReceiptTypes([])
        return
      }

      if (types && types.length > 0) {
        setAfipReceiptTypes(types)

        if (!silent) {
          toast.success(`Se encontraron ${types.length} tipo(s) de comprobante disponible(s)`)
        }
      } else {
        setAfipReceiptTypes([])
        if (!silent) {
          toast.info('No se encontraron tipos de comprobantes para este CUIT')
        }
      }
    } catch (error) {
      setAfipReceiptTypes([])
    } finally {
      setLoadingReceiptTypes(false)
    }
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    if (value === "fiscal" && formData.cuit) {
      const cleanCuit = formData.cuit.replace(/[^0-9]/g, "")
      if (cleanCuit.length === 11) {
        // Cargar puntos de venta si no hay cargados
        if (afipPointsOfSale.length === 0) {
          loadAfipPointsOfSale(cleanCuit, true)
        }
        // Cargar tipos de comprobantes si no hay cargados
        if (afipReceiptTypes.length === 0) {
          loadAfipReceiptTypes(cleanCuit, true)
        }
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Validación de duplicados con debounce para el nombre
    if (name === 'description') {
      const timeoutId = setTimeout(() => {
        checkNameExists(value);
      }, 500);
      return () => clearTimeout(timeoutId);
    }

    // Cargar puntos de venta cuando se ingresa un CUIT
    if (name === 'cuit') {
      const cleanCuit = value.replace(/[^0-9]/g, '')
      if (cleanCuit.length === 11) {
        setTimeout(() => loadAfipPointsOfSale(cleanCuit), 500)
      } else {
        setAfipPointsOfSale([])
      }
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    if (name === "manager_id") {
      setFormData((prev) => ({ ...prev, [name]: value ? Number.parseInt(value) : null }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validación de campos obligatorios
    const errors: string[] = []

    if (!formData.description?.trim()) {
      errors.push("El nombre de la sucursal es obligatorio")
    }

    if (!formData.address?.trim()) {
      errors.push("La dirección es obligatoria")
    }

    if (errors.length > 0) {
      toast.error("Campos obligatorios faltantes", {
        description: errors.join(", ")
      })
      return
    }

    setLoading(true)

    try {
      const branchDataToSave = {
        description: formData.description,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        manager_id: formData.manager_id,
        status: formData.status === 1,
        point_of_sale: formData.point_of_sale,
        color: formData.color,
        cuit: formData.cuit || null,
        razon_social: formData.razon_social || null,
        domicilio_comercial: formData.domicilio_comercial || null,
        enabled_receipt_types: formData.enabled_receipt_types || [],
        iibb: formData.iibb || null,
        start_date: formData.start_date || null,
      }

      let response;
      if (isEditing) {
        response = await request({
          method: "PUT",
          url: `/branches/${branch?.id}`,
          data: branchDataToSave,
        });
      } else {
        response = await request({
          method: "POST",
          url: "/branches",
          data: branchDataToSave,
        });
      }

      const savedBranch = response?.data || response;

      if (savedBranch && savedBranch.id) {
        const normalizedBranch = {
          ...savedBranch,
          status: savedBranch.status === true || savedBranch.status === 1 ? 1 : 0,
        };
        dispatch({ type: "SET_ENTITY", entityType: "branches", id: String(savedBranch.id), entity: normalizedBranch });
      }

      toast.success(isEditing ? "Sucursal actualizada" : "Sucursal creada")
      navigate("/dashboard/sucursales")
    } catch (error: any) {
      console.error("Error saving branch:", error)
      toast.error(isEditing ? "Error al actualizar" : "Error al crear")
    } finally {
      setLoading(false)
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link to="/dashboard/sucursales">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Volver</span>
            </Link>
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">
            {isReadOnly ? "Ver Sucursal" : isEditing ? "Editar Sucursal" : "Nueva Sucursal"}
          </h2>
        </div>
        {!isReadOnly && (
          <Button type="submit" onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEditing ? "Actualizando..." : "Creando..."}</>
            ) : (
              <><Save className="mr-2 h-4 w-4" />{isEditing ? "Guardar Cambios" : "Crear Sucursal"}</>
            )}
          </Button>
        )}
      </div>
      {loading && isEditing ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
            <TabsList>
              <TabsTrigger value="general">Información General</TabsTrigger>
              <TabsTrigger value="fiscal">Facturación Electrónica</TabsTrigger>
            </TabsList>
            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Información de la Sucursal</CardTitle>
                  <CardDescription>
                    {isReadOnly ? "Información general de la sucursal." : "Completa los datos de la sucursal. Los campos marcados con * son obligatorios."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="description">
                        Nombre <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="description"
                          name="description"
                          value={formData.description}
                          onChange={handleChange}
                          disabled={isReadOnly || loading}
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
                      <Label htmlFor="address">
                        Dirección <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        disabled={isReadOnly || loading}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Teléfono</Label>
                      <Input
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        disabled={isReadOnly || loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" name="email" type="email" value={formData.email || ""} onChange={handleChange} disabled={isReadOnly || loading} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="color">Color</Label>
                      <Input id="color" name="color" type="color" value={formData.color || "#0ea5e9"} onChange={handleChange} disabled={isReadOnly || loading} className="h-10 w-full p-1 border-none bg-transparent" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manager_id">Encargado</Label>
                      <Select
                        value={formData.manager_id ? String(formData.manager_id) : ""}
                        onValueChange={(value) => handleSelectChange("manager_id", value)}
                        disabled={isReadOnly || loading || loadingUsers}
                      >
                        <SelectTrigger id="manager_id">
                          <SelectValue placeholder="Sin Encargado" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={String(user.id)}>
                              {user.full_name || user.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* --- INICIO DE MODIFICACIÓN --- */}
                    <div className="flex items-center space-x-4 pt-4">
                      <Switch
                        id="status"
                        checked={formData.status === 1}
                        onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, status: checked ? 1 : 0 }))}
                        disabled={isReadOnly || loading}
                        className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500"
                      />
                      <Label htmlFor="status" className={`font-semibold transition-colors ${formData.status === 1 ? 'text-green-600' : 'text-red-600'}`}>
                        {formData.status === 1 ? "Sucursal Activa" : "Sucursal Inactiva"}
                      </Label>
                    </div>
                    {/* --- FIN DE MODIFICACIÓN --- */}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="fiscal" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Facturación Electrónica AFIP</CardTitle>
                  <CardDescription>
                    Configure el CUIT y razón social para habilitar la facturación electrónica en esta sucursal.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="cuit">
                        CUIT <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={formData.cuit || ""}
                        onValueChange={(value) => {
                          // Actualizar CUIT y razón social automáticamente
                          const selectedCert = validCertificates.find(c => c.cuit === value);
                          setFormData(prev => ({
                            ...prev,
                            cuit: value,
                            razon_social: selectedCert?.razon_social || prev.razon_social
                          }));

                          // Cargar datos AFIP para el CUIT seleccionado
                          if (value) {
                            loadAfipPointsOfSale(value);
                            loadAfipReceiptTypes(value);
                          }
                        }}
                        disabled={isReadOnly || loading}
                      >
                        <SelectTrigger id="cuit">
                          <SelectValue placeholder="Seleccione un CUIT con certificado válido">
                            {formData.cuit || "Seleccione un CUIT"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {validCertificates.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground text-center">
                              No hay certificados AFIP configurados
                            </div>
                          ) : (
                            validCertificates.map((cert) => (
                              <SelectItem key={cert.cuit} value={cert.cuit}>
                                {cert.cuit} - {cert.razon_social}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Solo se muestran CUITs con certificado AFIP válido registrado.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="razon_social">
                        Razón Social <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="razon_social"
                        name="razon_social"
                        value={formData.razon_social || ""}
                        disabled={true}
                        placeholder="Se completa automáticamente al seleccionar CUIT"
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        Se obtiene automáticamente del certificado AFIP registrado.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="domicilio_comercial">Domicilio comercial</Label>
                    <Input
                      id="domicilio_comercial"
                      name="domicilio_comercial"
                      value={formData.domicilio_comercial || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, domicilio_comercial: e.target.value }))}
                      placeholder="Ej: Av. Principal 123, Ciudad"
                      disabled={isReadOnly}
                    />
                    <p className="text-xs text-muted-foreground">
                      Dirección que aparecerá en los PDFs de facturación electrónica (ticket y factura A4).
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="iibb">Ingresos Brutos (IIBB)</Label>
                      <Input
                        id="iibb"
                        name="iibb"
                        value={formData.iibb || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, iibb: e.target.value }))}
                        placeholder="Ej: 30718708997"
                        disabled={isReadOnly}
                      />
                      <p className="text-xs text-muted-foreground">
                        Número de inscripción en Ingresos Brutos.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Fecha Inicio de Actividades</Label>
                      <Input
                        id="start_date"
                        name="start_date"
                        type="date"
                        value={formData.start_date || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                        disabled={isReadOnly}
                      />
                      <p className="text-xs text-muted-foreground">
                        Fecha de inicio de actividades fiscales.
                      </p>
                    </div>
                  </div>

                  {formData.cuit && formData.cuit.replace(/[^0-9]/g, '').length === 11 && (
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-2">
                        <Label>Puntos de Venta Disponibles en AFIP</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => loadAfipPointsOfSale(formData.cuit || '')}
                          disabled={loadingAfipPoints || isReadOnly}
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${loadingAfipPoints ? 'animate-spin' : ''}`} />
                          Actualizar
                        </Button>
                      </div>

                      {loadingAfipPoints ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          <span className="ml-2 text-sm text-muted-foreground">Consultando AFIP...</span>
                        </div>
                      ) : afipPointsOfSale.length > 0 ? (
                        <div className="border rounded-md">
                          <table className="w-full">
                            <thead className="bg-muted">
                              <tr>
                                <th className="px-4 py-2 text-left text-sm font-medium w-[100px]">Selección</th>
                                <th className="px-4 py-2 text-left text-sm font-medium">Punto de Venta</th>
                                <th className="px-4 py-2 text-left text-sm font-medium">Tipo</th>
                                <th className="px-4 py-2 text-left text-sm font-medium">Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {afipPointsOfSale.map((pos) => {
                                const isSelected = String(pos.number) === String(formData.point_of_sale);
                                return (
                                  <tr
                                    key={pos.number}
                                    className={`border-t transition-colors ${isSelected ? 'bg-blue-50/50' : 'hover:bg-muted/50'}`}
                                    onClick={() => !isReadOnly && setFormData(prev => ({ ...prev, point_of_sale: String(pos.number) }))}
                                    style={{ cursor: isReadOnly ? 'default' : 'pointer' }}
                                  >
                                    <td className="px-4 py-2 text-sm">
                                      <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-input'}`}>
                                        {isSelected && <Check className="h-3 w-3" />}
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 text-sm font-medium">{pos.number}</td>
                                    <td className="px-4 py-2 text-sm text-muted-foreground">{pos.type}</td>
                                    <td className="px-4 py-2 text-sm">
                                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${pos.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                        {pos.enabled ? 'Habilitado' : 'Deshabilitado'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <p className="text-sm">No se encontraron puntos de venta para este CUIT</p>
                          <p className="text-xs mt-1">Verifique que el CUIT esté habilitado en AFIP</p>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground mt-2">
                        Seleccione el punto de venta que desea utilizar para esta sucursal haciendo clic en la fila correspondiente.
                      </p>

                      {/* Tipos de Comprobantes Disponibles (informativo) */}
                      <div className="mt-8 pt-6 border-t">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <Label className="text-base font-semibold">Tipos de Comprobantes Disponibles</Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              Comprobantes que se pueden emitir según la condición fiscal del CUIT.
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => loadAfipReceiptTypes(formData.cuit || '')}
                            disabled={loadingReceiptTypes}
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${loadingReceiptTypes ? 'animate-spin' : ''}`} />
                            Consultar AFIP
                          </Button>
                        </div>

                        {loadingReceiptTypes ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-sm text-muted-foreground">Consultando tipos de comprobantes...</span>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* Tipos Internos (siempre disponibles) */}
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Tipos Internos</p>
                              <div className="flex flex-wrap gap-2">
                                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                                  ✓ Presupuesto
                                </span>
                                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                                  ✓ Factura X
                                </span>
                              </div>
                            </div>

                            {/* Tipos AFIP (según condición fiscal) */}
                            {afipReceiptTypes.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Facturas AFIP habilitadas</p>
                                <div className="flex flex-wrap gap-2">
                                  {afipReceiptTypes
                                    .filter((type) => type.description?.toLowerCase().includes('factura'))
                                    .map((type) => (
                                      <span
                                        key={type.id}
                                        className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200"
                                      >
                                        ✓ {type.description}
                                      </span>
                                    ))}
                                </div>
                              </div>
                            )}

                            {afipReceiptTypes.length === 0 && (
                              <div className="text-center py-4 text-muted-foreground border rounded-lg bg-muted/20">
                                <p className="text-sm">Haga clic en "Consultar AFIP" para ver los tipos disponibles</p>
                              </div>
                            )}
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground mt-3">
                          Los tipos internos siempre están disponibles. Las facturas AFIP (A, B o C) dependen de la condición fiscal del CUIT.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </form>
      )}
    </div>
  )
}
