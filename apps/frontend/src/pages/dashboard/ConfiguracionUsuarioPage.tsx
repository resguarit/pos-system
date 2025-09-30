
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bell, Mail, Moon, Sun, User } from "lucide-react"
import { useNavigate } from 'react-router-dom'; 

export default function ConfiguracionUsuarioPage() {
  const navigate = useNavigate(); 
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      navigate("/dashboard"); 
    }, 1500);
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Configuración de Usuario</h2>
      </div>

      <Tabs defaultValue="apariencia" className="space-y-4">
        <TabsList className="w-fit">
          <TabsTrigger value="apariencia">Apariencia</TabsTrigger>
          <TabsTrigger value="notificaciones">Notificaciones</TabsTrigger>
          <TabsTrigger value="accesibilidad">Accesibilidad</TabsTrigger>
          <TabsTrigger value="privacidad">Privacidad</TabsTrigger>
        </TabsList>

        <TabsContent value="apariencia" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tema y Apariencia</CardTitle>
              <CardDescription>Personaliza la apariencia del sistema según tus preferencias.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Tema</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="flex h-20 w-full items-center justify-center rounded-md border-2 border-primary bg-background">
                      <Sun className="h-10 w-10 text-primary" />
                    </div>
                    <Label htmlFor="theme-light" className="flex items-center space-x-2">
                      <input
                        id="theme-light"
                        type="radio"
                        name="theme"
                        value="light"
                        className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                        defaultChecked
                      />
                      <span>Claro</span>
                    </Label>
                  </div>
                  <div className="flex flex-col items-center space-y-2">
                    <div className="flex h-20 w-full items-center justify-center rounded-md border-2 border-muted bg-black">
                      <Moon className="h-10 w-10 text-white" />
                    </div>
                    <Label htmlFor="theme-dark" className="flex items-center space-x-2">
                      <input
                        id="theme-dark"
                        type="radio"
                        name="theme"
                        value="dark"
                        className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                      />
                      <span>Oscuro</span>
                    </Label>
                  </div>
                  <div className="flex flex-col items-center space-y-2">
                    <div className="flex h-20 w-full items-center justify-center rounded-md border-2 border-muted bg-gradient-to-br from-white to-black">
                      <div className="flex space-x-1">
                        <Sun className="h-10 w-10 text-black" />
                        <Moon className="h-10 w-10 text-white" />
                      </div>
                    </div>
                    <Label htmlFor="theme-system" className="flex items-center space-x-2">
                      <input
                        id="theme-system"
                        type="radio"
                        name="theme"
                        value="system"
                        className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                      />
                      <span>Sistema</span>
                    </Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color-scheme">Esquema de Color</Label>
                <Select defaultValue="blue">
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar esquema de color" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blue">Azul (Predeterminado)</SelectItem>
                    <SelectItem value="green">Verde</SelectItem>
                    <SelectItem value="purple">Púrpura</SelectItem>
                    <SelectItem value="orange">Naranja</SelectItem>
                    <SelectItem value="red">Rojo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="font-size">Tamaño de Fuente</Label>
                <Select defaultValue="medium">
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tamaño de fuente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Pequeño</SelectItem>
                    <SelectItem value="medium">Mediano (Predeterminado)</SelectItem>
                    <SelectItem value="large">Grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="animations">Animaciones</Label>
                  <p className="text-sm text-muted-foreground">Activar animaciones en la interfaz</p>
                </div>
                <Switch id="animations" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="compact-mode">Modo Compacto</Label>
                  <p className="text-sm text-muted-foreground">Reducir el espaciado en la interfaz</p>
                </div>
                <Switch id="compact-mode" />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="notificaciones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preferencias de Notificaciones</CardTitle>
              <CardDescription>Configura cómo y cuándo recibir notificaciones.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Notificaciones del Sistema</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Bell className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label htmlFor="notify-stock">Alertas de Stock</Label>
                        <p className="text-sm text-muted-foreground">Notificar cuando el stock esté bajo</p>
                      </div>
                    </div>
                    <Switch id="notify-stock" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Bell className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label htmlFor="notify-sales">Ventas</Label>
                        <p className="text-sm text-muted-foreground">Notificar sobre nuevas ventas</p>
                      </div>
                    </div>
                    <Switch id="notify-sales" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Bell className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label htmlFor="notify-orders">Pedidos</Label>
                        <p className="text-sm text-muted-foreground">Notificar sobre nuevos pedidos</p>
                      </div>
                    </div>
                    <Switch id="notify-orders" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Bell className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label htmlFor="notify-system">Actualizaciones del Sistema</Label>
                        <p className="text-sm text-muted-foreground">Notificar sobre actualizaciones del sistema</p>
                      </div>
                    </div>
                    <Switch id="notify-system" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Notificaciones por Correo Electrónico</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label htmlFor="email-reports">Reportes Diarios</Label>
                        <p className="text-sm text-muted-foreground">Recibir reportes diarios por correo</p>
                      </div>
                    </div>
                    <Switch id="email-reports" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label htmlFor="email-alerts">Alertas Críticas</Label>
                        <p className="text-sm text-muted-foreground">Recibir alertas críticas por correo</p>
                      </div>
                    </div>
                    <Switch id="email-alerts" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label htmlFor="email-marketing">Novedades y Promociones</Label>
                        <p className="text-sm text-muted-foreground">Recibir información sobre novedades</p>
                      </div>
                    </div>
                    <Switch id="email-marketing" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notification-frequency">Frecuencia de Notificaciones</Label>
                <Select defaultValue="realtime">
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar frecuencia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">Tiempo real</SelectItem>
                    <SelectItem value="hourly">Cada hora</SelectItem>
                    <SelectItem value="daily">Diariamente</SelectItem>
                    <SelectItem value="weekly">Semanalmente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="accesibilidad" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Opciones de Accesibilidad</CardTitle>
              <CardDescription>Configura opciones para mejorar la accesibilidad del sistema.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="high-contrast">Alto Contraste</Label>
                  <p className="text-sm text-muted-foreground">Aumentar el contraste de colores</p>
                </div>
                <Switch id="high-contrast" />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="reduce-motion">Reducir Movimiento</Label>
                  <p className="text-sm text-muted-foreground">Minimizar animaciones y transiciones</p>
                </div>
                <Switch id="reduce-motion" />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="screen-reader">Optimizado para Lectores de Pantalla</Label>
                  <p className="text-sm text-muted-foreground">Mejorar compatibilidad con lectores de pantalla</p>
                </div>
                <Switch id="screen-reader" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="text-size">Tamaño de Texto</Label>
                <div className="flex items-center space-x-2">
                  <span className="text-sm">A</span>
                  <input id="text-size" type="range" min="1" max="5" step="1" defaultValue="2" className="w-full" />
                  <span className="text-lg">A</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="keyboard-shortcuts">Atajos de Teclado</Label>
                <Select defaultValue="enabled">
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar opción" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enabled">Habilitados</SelectItem>
                    <SelectItem value="basic">Básicos solamente</SelectItem>
                    <SelectItem value="disabled">Deshabilitados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="privacidad" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Privacidad</CardTitle>
              <CardDescription>Administra tus preferencias de privacidad y datos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="activity-log">Registro de Actividad</Label>
                  <p className="text-sm text-muted-foreground">Registrar tu actividad en el sistema</p>
                </div>
                <Switch id="activity-log" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="data-collection">Recopilación de Datos de Uso</Label>
                  <p className="text-sm text-muted-foreground">
                    Permitir recopilación de datos para mejorar el sistema
                  </p>
                </div>
                <Switch id="data-collection" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="session-timeout">Tiempo de Inactividad</Label>
                  <p className="text-sm text-muted-foreground">Cerrar sesión automáticamente tras inactividad</p>
                </div>
                <Switch id="session-timeout" defaultChecked />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeout-duration">Duración de Inactividad (minutos)</Label>
                <Input id="timeout-duration" type="number" defaultValue="30" min="1" max="120" />
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Historial de Sesiones</h4>
                    <p className="text-sm text-muted-foreground">Ver y administrar tus sesiones activas</p>
                  </div>
                  <Button variant="outline">
                    <User className="mr-2 h-4 w-4" />
                    Ver Sesiones
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Exportar Mis Datos</h4>
                    <p className="text-sm text-muted-foreground">Descargar una copia de tus datos personales</p>
                  </div>
                  <Button variant="outline">Exportar</Button>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
