import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Upload, Building2, Mail, Phone, MapPin, FileText, Palette, ImageIcon, Settings, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/useAuth"
import { useSystemConfigContext } from "@/context/SystemConfigContext"
import { toast } from "sonner"
import api from "@/lib/api"

interface SystemConfig {
  logo_url?: string | null
  system_title?: string
  primary_color?: string
  company_name?: string
  company_ruc?: string
  company_address?: string
  company_email?: string
  company_phone?: string
}

export default function ConfiguracionSistemaPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const { refreshConfig } = useSystemConfigContext()
  
  const [config, setConfig] = useState<SystemConfig>({
    logo_url: null,
    favicon_url: null,
    system_title: "RG Gestión",
    primary_color: "#3B82F6",
    company_name: "",
    company_ruc: "",
    company_address: "",
    company_email: "",
    company_phone: ""
  })
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Check permissions - Admin siempre tiene acceso
  useEffect(() => {
    // No verificamos permisos aquí porque el ProtectedRoute ya lo hace
    // y Admin siempre tiene acceso automático
  }, [])

  // Load configuration
  useEffect(() => {
    loadConfiguration()
  }, [])

  const loadConfiguration = async () => {
    try {
      setLoading(true)
      const response = await api.get('/settings/system')
      if (response.data) {
        // Limpiar valores "null" string que vengan del backend
        const cleanedData = Object.entries(response.data).reduce((acc, [key, value]) => {
          // Si el valor es "null" como string o null real, usar string vacío
          if (value === 'null' || value === null) {
            acc[key] = ''
          } else if (typeof value === 'string' && value.trim() === 'null') {
            acc[key] = ''
          } else {
            acc[key] = value
          }
          return acc
        }, {} as SystemConfig)
        setConfig(cleanedData)
      }
    } catch (error) {
      console.error("Error loading configuration:", error)
      toast.error("Error al cargar la configuración")
    } finally {
      setLoading(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'logo')

    try {
      const response = await api.post('/settings/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      setConfig(prev => ({ ...prev, logo_url: response.data.url }))
      
      // Refresh system config to apply logo immediately
      await refreshConfig()
      
      toast.success("Logo actualizado correctamente")
    } catch (error) {
      toast.error("Error al subir el logo")
      console.error(error)
    }
  }

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'favicon')

    try {
      const response = await api.post('/settings/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      setConfig(prev => ({ ...prev, favicon_url: response.data.url }))
      
      // Refresh system config to apply favicon immediately
      await refreshConfig()
      
      toast.success("Favicon actualizado correctamente")
    } catch (error) {
      toast.error("Error al subir el favicon")
      console.error(error)
    }
  }

  const handleSave = async () => {
    if (!hasPermission('editar_configuracion_sistema')) {
      toast.error("No tienes permisos para editar la configuración")
      return
    }

    try {
      setSaving(true)
      await api.put('/settings/system', config)
      
      // Refresh system config to apply favicon and other changes immediately
      await refreshConfig()
      
      toast.success("Configuración guardada correctamente")
    } catch (error) {
      toast.error("Error al guardar la configuración")
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="rounded-lg"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Settings className="w-8 h-8 text-blue-600" />
              Configuración del Sistema
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Personaliza la apariencia y datos de tu empresa
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 max-w-5xl">
        {/* Logo y Favicon - Próximamente */}
        <Card className="opacity-60">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-600/10 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Identidad Visual
                  <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded-full font-normal">Próximamente</span>
                </CardTitle>
                <CardDescription>Logo y favicon de tu sistema</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400 text-center">
                Esta funcionalidad estará disponible próximamente.
                <br />
                <span className="text-sm">Por ahora el logo se maneja directamente desde el servidor.</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Apariencia */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600/10 rounded-lg flex items-center justify-center">
                <Palette className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>Apariencia</CardTitle>
                <CardDescription>Personaliza el título y color principal</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="systemTitle">Título del Sistema</Label>
                <Input
                  id="systemTitle"
                  value={config.system_title || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, system_title: e.target.value }))}
                  placeholder="Nombre de tu sistema"
                  disabled={!hasPermission('editar_configuracion_sistema')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Color Principal</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={config.primary_color || '#3B82F6'}
                    onChange={(e) => setConfig(prev => ({ ...prev, primary_color: e.target.value }))}
                    className="w-20 h-10 cursor-pointer"
                    disabled={!hasPermission('editar_configuracion_sistema')}
                  />
                  <Input
                    value={config.primary_color || '#3B82F6'}
                    onChange={(e) => setConfig(prev => ({ ...prev, primary_color: e.target.value }))}
                    placeholder="#3B82F6"
                    className="flex-1"
                    disabled={!hasPermission('editar_configuracion_sistema')}
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="mt-6 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
              <p className="text-xs text-gray-500 mb-3">Vista previa del color:</p>
              <div className="flex gap-3">
                <Button 
                  style={{ backgroundColor: config.primary_color || '#3B82F6' }} 
                  className="text-white"
                  disabled
                >
                  Botón Principal
                </Button>
                <div
                  className="w-12 h-10 rounded-lg border"
                  style={{ backgroundColor: config.primary_color || '#3B82F6' }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Datos de la Empresa */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600/10 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Datos de la Empresa</CardTitle>
                <CardDescription>Información general de tu negocio</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Nombre de la Empresa
                </Label>
                <Input
                  id="companyName"
                  value={config.company_name || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, company_name: e.target.value }))}
                  placeholder="Mi Empresa S.A."
                  disabled={!hasPermission('editar_configuracion_sistema')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ruc" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  RUC / CUIT / NIT
                </Label>
                <Input
                  id="ruc"
                  value={config.company_ruc || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, company_ruc: e.target.value }))}
                  placeholder="20123456789"
                  disabled={!hasPermission('editar_configuracion_sistema')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Dirección
              </Label>
              <Input
                id="address"
                value={config.company_address || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, company_address: e.target.value }))}
                placeholder="Av. Principal 123, Ciudad"
                disabled={!hasPermission('editar_configuracion_sistema')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Correo Electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={config.company_email || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, company_email: e.target.value }))}
                  placeholder="contacto@miempresa.com"
                  disabled={!hasPermission('editar_configuracion_sistema')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Teléfono
                </Label>
                <Input
                  id="phone"
                  value={config.company_phone || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, company_phone: e.target.value }))}
                  placeholder="+1 999 999 9999"
                  disabled={!hasPermission('editar_configuracion_sistema')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        {hasPermission('editar_configuracion_sistema') && (
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => navigate("/dashboard")}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
