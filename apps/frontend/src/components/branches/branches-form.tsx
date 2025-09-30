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
import { Loader2, Save, ArrowLeft } from "lucide-react"

// Hooks y Contexto
import useApi from "@/hooks/useApi"
import { useEntityContext } from "@/context/EntityContext"

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

  // Estados para validación de duplicados
  const [nameError, setNameError] = useState<string>("")
  const [isCheckingName, setIsCheckingName] = useState<boolean>(false)

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
          <Tabs defaultValue="general" className="space-y-4">
            <TabsList>
              <TabsTrigger value="general">Información General</TabsTrigger>
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
                      <Input id="email" name="email" type="email" value={formData.email || ""} onChange={handleChange} disabled={isReadOnly || loading}/>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="point_of_sale">Punto de venta</Label>
                      <Input id="point_of_sale" name="point_of_sale" value={formData.point_of_sale || ""} onChange={handleChange} disabled={isReadOnly || loading}/>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="color">Color</Label>
                      <Input id="color" name="color" type="color" value={formData.color || "#0ea5e9"} onChange={handleChange} disabled={isReadOnly || loading} className="h-10 w-full p-1 border-none bg-transparent"/>
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
          </Tabs>
        </form>
      )}
    </div>
  )
}
