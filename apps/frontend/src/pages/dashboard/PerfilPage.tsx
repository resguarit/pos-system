

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, CalendarDays, Mail, Phone, MapPin, Building, Shield, Loader2 } from 'lucide-react'
import { Link } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import useApi from "@/hooks/useApi"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ProtectedRoute } from "@/components/ProtectedRoute"

interface UserProfile {
  id: string;
  email: string;
  username: string;
  person?: {
    first_name: string;
    last_name: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    bio?: string;
  };
  role?: {
    id: number;
    name: string;
    description?: string;
  };
  branches?: Array<{
    id: string;
    description: string;
    address?: string;
  }>;
  created_at?: string;
  last_login?: string;
}

export default function PerfilPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    bio: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: ''
  })
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const { user, currentBranch, isAuthenticated } = useAuth()
  const { request } = useApi()

  // Cargar datos del perfil al montar el componente
  useEffect(() => {
    const loadProfile = async () => {
      if (!isAuthenticated || !user) {
        setIsDataLoading(false)
        return
      }

      try {
        const response = await request({
          method: "GET",
          url: "/profile"
        })
        
        const userData = response.data || response
        setProfile(userData)
        
        // Inicializar formulario con datos del usuario
        setFormData({
          first_name: userData.person?.first_name || '',
          last_name: userData.person?.last_name || '',
          email: userData.email || '',
          phone: userData.person?.phone || '',
          bio: userData.person?.bio || '',
          address: userData.person?.address || '',
          city: userData.person?.city || '',
          state: userData.person?.state || '',
          postal_code: userData.person?.postal_code || '',
          country: userData.person?.country || 'México'
        })
      } catch (error) {
        console.error('Error loading profile:', error)
        toast.error('Error al cargar el perfil')
      } finally {
        setIsDataLoading(false)
      }
    }

    loadProfile()
  }, [isAuthenticated, user, request])

  // Función para actualizar el perfil
  const handleSave = async () => {
    setIsLoading(true)
    try {
      await request({
        method: "PUT", 
        url: "/profile",
        data: {
          person: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            phone: formData.phone,
            bio: formData.bio,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            postal_code: formData.postal_code,
            country: formData.country
          },
          email: formData.email
        }
      })
      
      toast.success('Perfil actualizado correctamente')
    } catch (error: any) {
      console.error('Error updating profile:', error)
      toast.error('Error al actualizar el perfil: ' + (error?.response?.data?.message || error?.message || 'Error desconocido'))
    } finally {
      setIsLoading(false)
    }
  }

  // Función para manejar cambios en el formulario
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Función para manejar cambios en el formulario de contraseña
  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Función para actualizar contraseña
  const handlePasswordUpdate = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    if (passwordData.new_password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setIsLoading(true)
    try {
      await request({
        method: "PUT",
        url: "/profile/password",
        data: {
          current_password: passwordData.current_password,
          new_password: passwordData.new_password,
          new_password_confirmation: passwordData.confirm_password
        }
      })
      
      toast.success('Contraseña actualizada correctamente')
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      })
    } catch (error: any) {
      console.error('Error updating password:', error)
      toast.error('Error al actualizar la contraseña: ' + (error?.response?.data?.message || error?.message || 'Error desconocido'))
    } finally {
      setIsLoading(false)
    }
  }

  // Función para obtener las iniciales del usuario
  const getUserInitials = () => {
    if (profile?.person?.first_name && profile?.person?.last_name) {
      return (profile.person.first_name.charAt(0) + profile.person.last_name.charAt(0)).toUpperCase()
    }
    if (profile?.username) {
      return profile.username.substring(0, 2).toUpperCase()
    }
    return 'US'
  }

  // Función para obtener el nombre completo del usuario
  const getUserFullName = () => {
    if (profile?.person?.first_name && profile?.person?.last_name) {
      return `${profile.person.first_name} ${profile.person.last_name}`
    }
    return profile?.username || 'Usuario'
  }

  // Función para formatear fechas
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No disponible'
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: es })
    } catch {
      return 'Fecha inválida'
    }
  }

  if (isDataLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-muted-foreground">Cargando perfil...</p>
          </div>
        </div>
      </div>
    )
  }

return (
  <ProtectedRoute permissions={['ver_perfil']} requireAny={true}>
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <Button asChild variant="outline" size="icon">
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Volver al Dashboard</span>
          </Link>
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Mi Perfil</h2>
      </div>
    </div>

    <div className="grid gap-4 md:grid-cols-[1fr_3fr]">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-32 w-32">
              <AvatarImage src="/placeholder-user.jpg" alt="Foto de perfil" />
              <AvatarFallback className="text-4xl">{getUserInitials()}</AvatarFallback>
            </Avatar>
            <div className="space-y-1 text-center">
              <h3 className="text-2xl font-bold">{getUserFullName()}</h3>
              <p className="text-sm text-muted-foreground">{profile?.email || 'Sin email'}</p>
              <Badge className="mt-2">{profile?.role?.description || profile?.role?.name || 'Sin rol'}</Badge>
            </div>
            <Button variant="outline" className="w-full">
              Cambiar Foto
            </Button>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span>{currentBranch?.description || 'Sin sucursal asignada'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span>Miembro desde: {formatDate(profile?.created_at)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{profile?.email || 'Sin email'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{profile?.person?.phone || 'Sin teléfono'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{profile?.person?.city ? `${profile.person.city}, ${profile.person.country || 'México'}` : 'Sin ubicación'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span>Último acceso: {formatDate(profile?.last_login)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Tabs defaultValue="informacion" className="space-y-4">
          <TabsList className="w-fit">
            <TabsTrigger value="informacion">Información Personal</TabsTrigger>
            <TabsTrigger value="seguridad">Seguridad</TabsTrigger>
            <TabsTrigger value="preferencias">Preferencias</TabsTrigger>
          </TabsList>

          <TabsContent value="informacion" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Información Personal</CardTitle>
                <CardDescription>Actualiza tu información personal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="first-name">Nombre</Label>
                    <Input 
                      id="first-name" 
                      value={formData.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last-name">Apellido</Label>
                    <Input 
                      id="last-name" 
                      value={formData.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo Electrónico</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input 
                      id="phone" 
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">Cargo</Label>
                    <Input 
                      id="position" 
                      value={profile?.role?.description || profile?.role?.name || ''}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Departamento</Label>
                    <Input 
                      id="department" 
                      value={currentBranch?.description || 'Sin asignar'}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Biografía</Label>
                  <Textarea
                    id="bio"
                    rows={4}
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" asChild>
                  <Link to="/dashboard">Volver</Link>
                </Button>
                <Button onClick={handleSave} disabled={isLoading}>
                  {isLoading ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dirección</CardTitle>
                <CardDescription>Actualiza tu información de contacto</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="address">Dirección</Label>
                    <Input 
                      id="address" 
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Ciudad</Label>
                    <Input 
                      id="city" 
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Input 
                      id="state" 
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip">Código Postal</Label>
                    <Input 
                      id="zip" 
                      value={formData.postal_code}
                      onChange={(e) => handleInputChange('postal_code', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="country">País</Label>
                    <Input 
                      id="country" 
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" asChild>
                  <Link to="/dashboard">Volver</Link>
                </Button>
                <Button onClick={handleSave} disabled={isLoading}>
                  {isLoading ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="seguridad" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cambiar Contraseña</CardTitle>
                <CardDescription>Actualiza tu contraseña de acceso al sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Contraseña Actual</Label>
                  <Input 
                    id="current-password" 
                    type="password" 
                    value={passwordData.current_password}
                    onChange={(e) => handlePasswordChange('current_password', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nueva Contraseña</Label>
                  <Input 
                    id="new-password" 
                    type="password" 
                    value={passwordData.new_password}
                    onChange={(e) => handlePasswordChange('new_password', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Nueva Contraseña</Label>
                  <Input 
                    id="confirm-password" 
                    type="password" 
                    value={passwordData.confirm_password}
                    onChange={(e) => handlePasswordChange('confirm_password', e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" asChild>
                  <Link to="/dashboard">Volver</Link>
                </Button>
                <Button onClick={handlePasswordUpdate} disabled={isLoading}>
                  {isLoading ? "Actualizando..." : "Actualizar Contraseña"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="preferencias" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Preferencias de Usuario</CardTitle>
                <CardDescription>Personaliza tu experiencia en el sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Idioma</Label>
                  <select
                    id="language"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="es">Español</option>
                    <option value="en">Inglés</option>
                    <option value="fr">Francés</option>
                    <option value="de">Alemán</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Zona Horaria</Label>
                  <select
                    id="timezone"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="america-mexico">América/Ciudad de México (UTC-6)</option>
                    <option value="america-bogota">América/Bogotá (UTC-5)</option>
                    <option value="america-santiago">América/Santiago (UTC-4)</option>
                    <option value="america-buenos_aires">América/Buenos Aires (UTC-3)</option>
                    <option value="europe-madrid">Europa/Madrid (UTC+1)</option>
                  </select>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" asChild>
                  <Link to="/dashboard">Volver</Link>
                </Button>
                <Button onClick={handleSave} disabled={isLoading}>
                  {isLoading ? "Guardando..." : "Guardar Preferencias"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </div>
  </ProtectedRoute>
)
}
