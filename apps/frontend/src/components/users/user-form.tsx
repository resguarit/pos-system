import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import axios from "axios";

// Componentes de UI
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { sileo } from "sileo"
import useApi from "@/hooks/useApi"
import { useEntityContext } from "@/context/EntityContext"

// Utilidades y Iconos
import { getRoleStyle } from "@/types/roles-styles"
import { ArrowLeft, Save, Loader2, Eye, EyeOff, UserPlus, Link as LinkIcon } from "lucide-react"
import features from "@/config/features"


// --- Interfaces ---
interface Branch {
  id: string
  description: string
  color: string
}

interface Role {
  id: string
  name: string
  description: string
}

interface Employee {
  id: number
  first_name: string
  last_name: string
  person: {
    first_name: string
    last_name: string
    address?: string
    phone?: string
    cuit?: string
  }
  user_id?: number
}

interface UserFormProps {
  userId?: string
  viewOnly?: boolean
}


export default function UserForm({ userId, viewOnly = false }: UserFormProps) {
  const navigate = useNavigate()
  const { request } = useApi()
  const { dispatch } = useEntityContext()

  // --- Estados del Componente ---
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    password: "",
    roleId: "",
    active: true,
    branches: [] as string[],
    employeeId: "",
    isEmployee: false,
  })

  const [repeatPassword, setRepeatPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")

  const [allBranches, setAllBranches] = useState<Branch[]>([])
  const [allRoles, setAllRoles] = useState<Role[]>([])
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([])
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDataLoading, setIsDataLoading] = useState(true)

  const [showPassword, setShowPassword] = useState(false)
  const [showRepeatPassword, setShowRepeatPassword] = useState(false)
  const [linkToEmployee, setLinkToEmployee] = useState(false)

  // Estados para validación de duplicados
  const [usernameError, setUsernameError] = useState<string>("")
  const [isCheckingUsername, setIsCheckingUsername] = useState<boolean>(false)
  const [emailError, setEmailError] = useState<string>("")
  const [isCheckingEmail, setIsCheckingEmail] = useState<boolean>(false)
  const [nameError, setNameError] = useState<string>("")
  const [isCheckingName, setIsCheckingName] = useState<boolean>(false)
  const [usernameTimeoutId, setUsernameTimeoutId] = useState<number | null>(null)
  const [emailTimeoutId, setEmailTimeoutId] = useState<number | null>(null)
  const [nameTimeoutId, setNameTimeoutId] = useState<number | null>(null)

  // --- Efecto de Carga de Datos ---
  useEffect(() => {
    const controller = new AbortController()
    const signal = controller.signal

    const loadData = async () => {
      setIsDataLoading(true)
      try {
        const [branchesRes, rolesRes] = await Promise.all([
          request({ method: "GET", url: "/branches", signal }),
          request({ method: "GET", url: "/roles", signal })
        ])

        // Correcting the employee fetch strategy
        let employeesData: Employee[] = [];
        if (!userId) {
          const empResponse = await request({ method: "GET", url: "/employees?limit=100", signal });
          // Filter employees that don't have a user_id
          const allEmployees = empResponse.data || empResponse.data.data || [];
          employeesData = allEmployees.filter((e: Employee) => !e.user_id);
        }

        if (signal.aborted) return

        const branchesData = branchesRes.data || [];
        const rolesData = rolesRes.data || [];

        setAllBranches(branchesData)
        setAllRoles(rolesData)
        setAvailableEmployees(employeesData)

        if (userId) {
          const userRes = await request({ method: "GET", url: `/users/${userId}`, signal })
          if (signal.aborted) return

          const userData = userRes.data || userRes;
          populateFormWithUserData(userData);
          dispatch({ type: 'SET_ENTITY', entityType: 'users', id: userId, entity: userData });
        }
      } catch (error: any) {
        if (!axios.isCancel(error)) {
          console.error("Error fetching user form data:", error);
          sileo.error({ title: "Error al cargar datos", description: "No se pudieron obtener los datos para el formulario." });
        }
      } finally {
        if (!signal.aborted) {
          setIsDataLoading(false)
        }
      }
    }

    loadData()
    return () => controller.abort()
  }, [userId, request, dispatch])


  // Efecto para actualizar el rol seleccionado
  useEffect(() => {
    setSelectedRole(allRoles.find((r) => r.id === formData.roleId) || null)
  }, [formData.roleId, allRoles])

  // Limpiar timeouts al desmontar el componente
  useEffect(() => {
    return () => {
      if (usernameTimeoutId) {
        clearTimeout(usernameTimeoutId);
      }
      if (emailTimeoutId) {
        clearTimeout(emailTimeoutId);
      }
      if (nameTimeoutId) {
        clearTimeout(nameTimeoutId);
      }
    };
  }, [usernameTimeoutId, emailTimeoutId, nameTimeoutId]);

  // --- Funciones y Manejadores ---
  const populateFormWithUserData = (user: any) => {
    // Guardar las sucursales del usuario
    const userBranches = user.branches?.map((b: any) => String(b.id)) || [];

    setFormData(prev => ({
      firstName: user.person?.first_name || "",
      lastName: user.person?.last_name || "",
      email: user.email || "",
      username: user.username || "",
      password: "",
      roleId: String(user.role_id || ""),
      active: !!user.active,
      branches: userBranches, // Preservar las sucursales
      employeeId: "", // On edit we don't support relinking yet
      isEmployee: false,
    }))
  }

  // Función para verificar si el username ya existe
  const checkUsernameExists = async (username: string) => {
    if (!username.trim()) {
      setUsernameError("");
      return;
    }

    setIsCheckingUsername(true);
    try {
      const response = await request({
        method: 'GET',
        url: `/users/check-username/${encodeURIComponent(username)}`
      });

      if (response.exists && username !== (userId ? formData.username : '')) {
        setUsernameError("Este nombre de usuario ya está en uso");
        sileo.error({ title: "Este nombre de usuario ya está en uso",
          description: "Por favor, elige un nombre de usuario diferente."
        });
      } else {
        setUsernameError("");
      }
    } catch (error) {
      console.error("Error checking username:", error);
      setUsernameError("");
    } finally {
      setIsCheckingUsername(false);
    }
  };

  // Función para verificar si el email ya existe
  const checkEmailExists = async (email: string) => {
    if (!email.trim()) {
      setEmailError("");
      return;
    }

    setIsCheckingEmail(true);
    try {
      const response = await request({
        method: 'GET',
        url: `/users/check-email/${encodeURIComponent(email)}`
      });

      if (response.exists && email !== (userId ? formData.email : '')) {
        setEmailError("Este email ya está en uso");
        sileo.error({ title: "Este email ya está en uso",
          description: "Por favor, elige un email diferente."
        });
      } else {
        setEmailError("");
      }
    } catch (error) {
      console.error("Error checking email:", error);
      setEmailError("");
    } finally {
      setIsCheckingEmail(false);
    }
  };

  // Función para verificar si la combinación nombre + apellido ya existe
  const checkNameExists = async (firstName: string, lastName: string) => {
    if (!firstName.trim() || !lastName.trim() || linkToEmployee) {
      setNameError("");
      return;
    }

    setIsCheckingName(true);
    try {
      const response = await request({
        method: 'GET',
        url: `/users/check-name/${encodeURIComponent(firstName)}/${encodeURIComponent(lastName)}`
      });

      if (response.exists && (firstName !== (userId ? formData.firstName : '') || lastName !== (userId ? formData.lastName : ''))) {
        setNameError("Esta combinación de nombre y apellido ya está en uso");
        sileo.error({ title: "Esta combinación de nombre y apellido ya está en uso",
          description: "Por favor, elige un nombre o apellido diferente."
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
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))

    // Validación de duplicados con debounce para username y email
    if (e.target.name === 'username') {
      // Limpiar timeout anterior si existe
      if (usernameTimeoutId) {
        clearTimeout(usernameTimeoutId);
      }
      const newTimeoutId = setTimeout(() => {
        checkUsernameExists(e.target.value);
      }, 500);
      setUsernameTimeoutId(newTimeoutId);
    }

    if (e.target.name === 'email') {
      // Limpiar timeout anterior si existe
      if (emailTimeoutId) {
        clearTimeout(emailTimeoutId);
      }
      const newTimeoutId = setTimeout(() => {
        checkEmailExists(e.target.value);
      }, 500);
      setEmailTimeoutId(newTimeoutId);
    }

    // Validación de duplicados para combinación nombre + apellido
    if ((e.target.name === 'firstName' || e.target.name === 'lastName') && !linkToEmployee) {
      // Limpiar timeout anterior si existe
      if (nameTimeoutId) {
        clearTimeout(nameTimeoutId);
      }
      const newTimeoutId = setTimeout(() => {
        const firstName = e.target.name === 'firstName' ? e.target.value : formData.firstName;
        const lastName = e.target.name === 'lastName' ? e.target.value : formData.lastName;
        checkNameExists(firstName, lastName);
      }, 500);
      setNameTimeoutId(newTimeoutId);
    }
  }

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  const handleLinkToEmployeeChange = (checked: boolean) => {
    setLinkToEmployee(checked);
    if (!checked) {
      setFormData(prev => ({
        ...prev,
        employeeId: "",
        firstName: "",
        lastName: ""
      }));
    }
  }

  const handleEmployeeSelect = (employeeId: string) => {
    const employee = availableEmployees.find(e => e.id === Number(employeeId));
    if (employee) {
      setFormData(prev => ({
        ...prev,
        employeeId: employeeId,
        firstName: employee.person.first_name,
        lastName: employee.person.last_name,
      }));
    }
  }

  const handleRoleChange = (value: string) => {
    const isAdmin = allRoles.find(r => r.id === value)?.name.toLowerCase() === 'admin';
    const newBranches = isAdmin ? allBranches.map((branch) => branch.id) : [];
    setFormData((prev) => ({ ...prev, roleId: value, branches: newBranches }));
  }

  const handleBranchChange = (branchId: string, checked: boolean) => {
    setFormData((prev) => {
      const isSeller = allRoles.find(r => r.id === prev.roleId)?.name.toLowerCase() === 'vendedor';
      if (isSeller && checked) {
        return { ...prev, branches: [branchId] };
      }
      const newBranches = checked ? [...prev.branches, branchId] : prev.branches.filter((id) => id !== branchId);
      return { ...prev, branches: newBranches };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password && formData.password !== repeatPassword) {
      setPasswordError("Las contraseñas no coinciden");
      sileo.error({ title: "Error de validación", description: "Las contraseñas no coinciden." });
      return;
    }
    const requiredFields = ['firstName', 'lastName', 'email', 'username', 'roleId'];
    if (requiredFields.some(field => !formData[field as keyof typeof formData])) {
      sileo.error({ title: "Error de validación", description: "Por favor, completa todos los campos obligatorios." });
      return;
    }
    if (!userId && !formData.password) {
      sileo.error({ title: "Error de validación", description: "La contraseña es obligatoria para nuevos usuarios." });
      return;
    }
    if (formData.branches.length === 0) {
      sileo.error({ title: "Error de validación", description: "Debe asignar al menos una sucursal." });
      return;
    }

    setPasswordError("");
    setIsSubmitting(true);

    try {
      const payload = {
        email: formData.email,
        username: formData.username,
        role_id: Number(formData.roleId),
        active: formData.active,
        ...(formData.password && { password: formData.password }),
        person: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          cuit: formData.cuit || null,
          address: formData.address || "",
          phone: formData.phone || "",
        },
        employee_id: formData.employeeId ? Number(formData.employeeId) : null,
        is_employee: formData.isEmployee
      };

      if (userId) {
        await request({ method: "PUT", url: `/users/${userId}`, data: payload });
        await request({ method: "PUT", url: `/users/${userId}/branches`, data: { branch_ids: formData.branches.map(Number) } });
        sileo.success({ title: "Usuario actualizado correctamente." });
      } else {
        const fullPayload = { ...payload, branches: formData.branches.map(Number) };
        await request({ method: "POST", url: "/users", data: fullPayload });
        sileo.success({ title: "Usuario creado correctamente." });
      }
      navigate("/dashboard/usuarios");

    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || "Ocurrió un error inesperado.";
      sileo.error({ title: "Error al guardar", description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Renderizado del Componente ---
  const SelectedRoleIcon = getRoleStyle(selectedRole?.name).icon;
  const selectedRoleColor = getRoleStyle(selectedRole?.name).color;

  if (isDataLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link to="/dashboard/usuarios"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">
            {viewOnly ? "Ver Usuario" : userId ? "Editar Usuario" : "Nuevo Usuario"}
          </h2>
        </div>
        {!viewOnly && (
          <Button type="submit" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isSubmitting ? (userId ? "Guardando..." : "Creando...") : (userId ? "Guardar Cambios" : "Crear Usuario")}
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">Información General</TabsTrigger>
            <TabsTrigger value="sucursales">Sucursales</TabsTrigger>
          </TabsList>
          <TabsContent value="general" className="space-y-4">

            {/* Sección de Vinculación con Empleado (Solo en creación y si el módulo de gastos está habilitado) */}
            {!userId && !viewOnly && features.gastos && (
              <Card className="border-blue-200 bg-blue-50/30 max-w-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-blue-600" />
                    Vinculación con Empleado
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Vincular a empleado existente o crear uno nuevo.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="link-employee"
                      checked={linkToEmployee}
                      onCheckedChange={handleLinkToEmployeeChange}
                    />
                    <Label htmlFor="link-employee" className="text-sm">Vincular con un empleado existente</Label>
                  </div>

                  {linkToEmployee ? (
                    <div className="space-y-2">
                      <Label className="text-sm">Seleccionar Empleado</Label>
                      <Select onValueChange={handleEmployeeSelect} value={formData.employeeId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Buscar empleado..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableEmployees.map(emp => (
                            <SelectItem key={emp.id} value={String(emp.id)}>
                              {emp.person.first_name} {emp.person.last_name} (DNI: {emp.person.cuit || 'N/A'})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="create-employee"
                        checked={formData.isEmployee}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isEmployee: checked === true }))}
                      />
                      <Label htmlFor="create-employee" className="cursor-pointer text-sm">
                        Registrar automáticamente como nuevo empleado
                      </Label>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Información del Usuario</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nombre <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Input
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        disabled={viewOnly || isSubmitting || linkToEmployee}
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
                    <Label htmlFor="lastName">Apellido <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Input
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        disabled={viewOnly || isSubmitting || linkToEmployee}
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
                    <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        disabled={viewOnly || isSubmitting}
                        required
                        className={emailError ? 'border-red-500 focus:border-red-500 focus:ring-red-500 focus:ring-2' : ''}
                        style={{ borderColor: emailError ? '#ef4444' : undefined }}
                      />
                      {isCheckingEmail && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Nombre de Usuario <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Input
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        disabled={viewOnly || isSubmitting}
                        required
                        className={usernameError ? 'border-red-500 focus:border-red-500 focus:ring-red-500 focus:ring-2' : ''}
                        style={{ borderColor: usernameError ? '#ef4444' : undefined }}
                      />
                      {isCheckingUsername && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Rol <span className="text-red-500">*</span></Label>
                    <Select value={formData.roleId || ""} onValueChange={handleRoleChange} disabled={viewOnly || isSubmitting}>
                      <SelectTrigger id="role" className={selectedRole ? selectedRoleColor : ""}>
                        <div className="flex items-center gap-2">
                          {selectedRole && <SelectedRoleIcon className="h-4 w-4" />}
                          <SelectValue placeholder="Seleccionar rol" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {allRoles.map((role) => {
                          const RoleIcon = getRoleStyle(role.name).icon;
                          const roleColor = getRoleStyle(role.name).color;
                          return (
                            <SelectItem key={String(role.id)} value={String(role.id)} className={roleColor}>
                              <div className="flex items-center gap-2"><RoleIcon className="h-4 w-4" /><span>{role.name}</span></div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Separator className="my-6" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="password">{userId ? "Nueva Contraseña (opcional)" : <>Contraseña <span className="text-red-500">*</span></>}</Label>
                    <div className="relative">
                      <Input id="password" name="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleInputChange} disabled={viewOnly || isSubmitting} placeholder="••••••••" required={!userId} />
                      <button type="button" className="absolute right-2.5 top-2.5" onClick={() => setShowPassword(v => !v)} disabled={viewOnly}><span className="sr-only">Toggle password visibility</span>{showPassword ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}</button>
                    </div>
                    {passwordError && <p className="text-sm text-red-500 mt-1">{passwordError}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="repeatPassword">Confirmar Contraseña</Label>
                    <div className="relative">
                      <Input id="repeatPassword" type={showRepeatPassword ? "text" : "password"} value={repeatPassword} onChange={(e) => setRepeatPassword(e.target.value)} disabled={viewOnly || isSubmitting || !formData.password} placeholder="••••••••" required={!userId && !!formData.password} />
                      <button type="button" className="absolute right-2.5 top-2.5" onClick={() => setShowRepeatPassword(v => !v)} disabled={viewOnly}><span className="sr-only">Toggle password visibility</span>{showRepeatPassword ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}</button>
                    </div>
                  </div>
                </div>
                {/* --- INICIO DE MODIFICACIÓN --- */}
                <div className="flex items-center space-x-4 pt-4">
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={(checked) => handleSwitchChange("active", checked)}
                    disabled={viewOnly || isSubmitting}
                    className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500"
                  />
                  <Label htmlFor="active" className={`font-semibold ${formData.active ? 'text-green-600' : 'text-red-600'}`}>
                    {formData.active ? "Usuario Activo" : "Usuario Inactivo"}
                  </Label>
                </div>
                {/* --- FIN DE MODIFICACIÓN --- */}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="sucursales" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Acceso a Sucursales <span className="text-red-500">*</span></CardTitle>
                <CardDescription>Selecciona las sucursales a las que tendrá acceso este usuario.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {allBranches.length > 0 ? (
                    allBranches.map((branch) => (
                      <div key={branch.id} className="rounded-md border p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: branch.color || '#ccc' }}></span>
                            <Label htmlFor={`branch-${branch.id}`} className="font-medium cursor-pointer">{branch.description}</Label>
                          </div>
                          <Checkbox
                            id={`branch-${branch.id}`}
                            checked={formData.branches.includes(String(branch.id))}
                            onCheckedChange={(checked) => handleBranchChange(String(branch.id), checked === true)}
                            disabled={viewOnly || isSubmitting || (allRoles.find(r => r.id === formData.roleId)?.name.toLowerCase() === 'admin')}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground text-center py-4">No hay sucursales para mostrar.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  )
}
