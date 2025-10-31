import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Link } from "react-router-dom"
import useApi from "@/hooks/useApi"
import { toast } from "sonner"

export default function ConfiguracionPage() {
  // Auto-deploy test: v1.0.1-hela-ditos
  const [isLoading, setIsLoading] = useState(false)
  // Gestión de Tipos de Movimiento (Caja)
  const { request } = useApi()
  const [movementTypes, setMovementTypes] = useState<any[]>([])
  const [mtLoading, setMtLoading] = useState(false)
  const [settings, setSettings] = useState<Record<string, string>>({})

  const loadMovementTypes = async () => {
    setMtLoading(true)
    try {
      const resp = await request({ method: 'GET', url: '/movement-types' })
      const data = resp?.data?.data ?? resp?.data ?? []
      setMovementTypes(Array.isArray(data) ? data : [])
    } catch (e: any) {
      console.error('Error loading movement types', e)
      toast.error('Error al cargar los tipos de movimiento')
    } finally {
      setMtLoading(false)
    }
  }

  useEffect(() => {
    const loadInitialData = async () => {
      await loadMovementTypes()
      await loadSettings()
    }
    loadInitialData()
  }, [])

  const loadSettings = async () => {
    setIsLoading(true)
    try {
      const response = await request({ method: 'GET', url: '/settings' })
      const settingsData = response.data?.data || response.data || []
      // Convert array of settings to a key-value object
      const settingsMap = settingsData.reduce((acc: any, setting: any) => {
        acc[setting.key] = setting.value
        return acc
      }, {})
      setSettings(settingsMap)
    } catch (error) {
      console.error("Error al cargar la configuración:", error)
      toast.error("No se pudo cargar la configuración del sistema.")
    } finally {
      setIsLoading(false)
    }
  }

  const suggestedPaymentTypes = [
    {
      name: 'Venta por transferencia',
      description: 'Ingreso por venta realizada por transferencia',
      operation_type: 'entrada',
      is_cash_movement: true,
      is_current_account_movement: false,
      active: true,
    },
    {
      name: 'Venta con tarjeta de débito',
      description: 'Ingreso por venta pagada con tarjeta de débito',
      operation_type: 'entrada',
      is_cash_movement: true,
      is_current_account_movement: false,
      active: true,
    },
    {
      name: 'Venta con tarjeta de crédito',
      description: 'Ingreso por venta pagada con tarjeta de crédito',
      operation_type: 'entrada',
      is_cash_movement: true,
      is_current_account_movement: false,
      active: true,
    },
    {
      name: 'Venta por Mercado Pago',
      description: 'Ingreso por venta cobrada por Mercado Pago',
      operation_type: 'entrada',
      is_cash_movement: true,
      is_current_account_movement: false,
      active: true,
    },
    {
      name: 'Venta por cheque',
      description: 'Ingreso por venta cobrada con cheque',
      operation_type: 'entrada',
      is_cash_movement: true,
      is_current_account_movement: false,
      active: true,
    },
  ]

  const createSuggestedMovementTypes = async () => {
    try {
      setMtLoading(true)
      const existingNames = new Set((movementTypes || []).map((t: any) => String(t?.name || '').toLowerCase()))
      const toCreate = suggestedPaymentTypes.filter(t => !existingNames.has(t.name.toLowerCase()))

      if (toCreate.length === 0) {
        toast.info('Ya existen todos los tipos sugeridos')
        return
      }

      await Promise.all(toCreate.map(t => request({ method: 'POST', url: '/movement-types', data: t })))
      toast.success('Tipos de movimiento creados exitosamente')
      await loadMovementTypes()
    } catch (e: any) {
      console.error('Error creating movement types', e)
      const msg = e?.response?.data?.message || e?.response?.data?.errors ? JSON.stringify(e?.response?.data?.errors) : 'Error al crear los tipos sugeridos'
      toast.error(msg)
    } finally {
      setMtLoading(false)
    }
  }

  const handleSettingChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      // Convert the settings map back to an array of key-value pairs for the API
      const settingsPayload = Object.entries(settings).map(([key, value]) => ({ key, value }))
      await request({ method: 'POST', url: '/settings', data: { settings: settingsPayload } })
      toast.success("Configuración guardada exitosamente.")
    } catch (error) {
      console.error("Error al guardar la configuración:", error)
      toast.error("No se pudo guardar la configuración.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-3xl font-bold tracking-tight">Configuración del Sistema</h2>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="w-fit">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="facturacion">Facturación</TabsTrigger>
          <TabsTrigger value="inventario">Inventario</TabsTrigger>
          <TabsTrigger value="seguridad">Seguridad</TabsTrigger>
          {/* Nueva pestaña para Caja */}
          <TabsTrigger value="caja">Caja</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Información de la Empresa</CardTitle>
              <CardDescription>
                Configura la información básica de tu empresa que aparecerá en facturas y documentos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Nombre de la Empresa</Label>
                  <Input id="company-name" value={settings['company_name'] || ''} onChange={(e) => handleSettingChange('company_name', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax-id">RFC</Label>
                  <Input id="tax-id" value={settings['tax_id'] || ''} onChange={(e) => handleSettingChange('tax_id', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input id="address" value={settings['address'] || ''} onChange={(e) => handleSettingChange('address', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad</Label>
                  <Input id="city" value={settings['city'] || ''} onChange={(e) => handleSettingChange('city', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input id="state" value={settings['state'] || ''} onChange={(e) => handleSettingChange('state', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">Código Postal</Label>
                  <Input id="zip" value={settings['zip'] || ''} onChange={(e) => handleSettingChange('zip', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" value={settings['phone'] || ''} onChange={(e) => handleSettingChange('phone', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={settings['email'] || ''} onChange={(e) => handleSettingChange('email', e.target.value)} />
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

        <TabsContent value="facturacion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Facturación</CardTitle>
              <CardDescription>Configura los parámetros para la facturación electrónica.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tax-regime">Régimen Fiscal</Label>
                <Select defaultValue="601">
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar régimen fiscal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="601">General de Ley Personas Morales</SelectItem>
                    <SelectItem value="603">Personas Morales con Fines no Lucrativos</SelectItem>
                    <SelectItem value="605">Sueldos y Salarios e Ingresos Asimilados a Salarios</SelectItem>
                    <SelectItem value="606">Arrendamiento</SelectItem>
                    <SelectItem value="612">Personas Físicas con Actividades Empresariales y Profesionales</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-invoice">Facturación Automática</Label>
                  <p className="text-sm text-muted-foreground">Generar facturas automáticamente al completar ventas</p>
                </div>
                <Switch id="auto-invoice" />
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

        <TabsContent value="inventario" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Inventario</CardTitle>
              <CardDescription>Configura las opciones relacionadas con el manejo de inventario.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="stock-alerts">Alertas de Stock Bajo</Label>
                  <p className="text-sm text-muted-foreground">Recibir notificaciones cuando el stock esté bajo</p>
                </div>
                <Switch id="stock-alerts" defaultChecked />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock-threshold">Umbral de Stock Bajo</Label>
                <Input id="stock-threshold" type="number" defaultValue="5" />
                <p className="text-sm text-muted-foreground">Cantidad mínima de unidades para considerar stock bajo</p>
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
              <CardTitle>Configuración de Seguridad</CardTitle>
              <CardDescription>Configura las opciones de seguridad del sistema.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="two-factor">Autenticación de Dos Factores</Label>
                  <p className="text-sm text-muted-foreground">Requerir verificación adicional al iniciar sesión</p>
                </div>
                <Switch id="two-factor" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="session-timeout">Tiempo de Inactividad (minutos)</Label>
                <Input id="session-timeout" type="number" defaultValue="30" />
                <p className="text-sm text-muted-foreground">
                  Tiempo de inactividad antes de cerrar sesión automáticamente
                </p>
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

        {/* Pestaña Caja: Tipos de Movimiento */}
        <TabsContent value="caja" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tipos de Movimiento (Caja)</CardTitle>
              <CardDescription>
                Administra los tipos de movimiento que usa la caja. Crea los tipos sugeridos para métodos de pago para que las ventas no caigan en "efectivo" por defecto.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={loadMovementTypes} disabled={mtLoading} variant="outline">
                  {mtLoading ? 'Cargando...' : 'Recargar tipos'}
                </Button>
                <Button size="sm" onClick={createSuggestedMovementTypes} disabled={mtLoading}>
                  {mtLoading ? 'Procesando...' : 'Crear tipos sugeridos de pago'}
                </Button>
              </div>
              <div className="mt-2 text-sm">
                {movementTypes.length === 0 ? (
                  <p className="text-muted-foreground">No hay tipos cargados.</p>
                ) : (
                  <ul className="list-disc pl-5 space-y-1">
                    {movementTypes.map((t) => (
                      <li key={t.id}>
                        <span className="font-medium">{t.name}</span> — {t.description || 'Sin descripción'} ({String(t.operation_type).toLowerCase() === 'entrada' ? 'Entrada' : 'Salida'})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" asChild>
                <Link to="/dashboard">Volver</Link>
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
