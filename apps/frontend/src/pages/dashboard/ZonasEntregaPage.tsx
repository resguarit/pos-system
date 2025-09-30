

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, User, Phone, Package, Home } from "lucide-react"
import { NewDeliveryDialog } from "@/components/new-delivery-dialog"
import ManageZonesDialog from "@/components/manage-zones-dialog"

// Zonas de entrega
const deliveryZones = [
  { id: "zn-001", name: "Zona Norte", cost: 50.0, time: "30 minutos" },
  { id: "zs-002", name: "Zona Sur", cost: 60.0, time: "1 hora" },
  { id: "ze-003", name: "Zona Este", cost: 70.0, time: "2 horas" },
  { id: "zo-004", name: "Zona Oeste", cost: 65.0, time: "1 hora" },
  { id: "zc-005", name: "Zona Centro", cost: 45.0, time: "30 minutos" },
]

// Repartidores
const deliveryPersonnel = [
  { id: "dp-001", name: "Carlos Méndez", status: "disponible", zone: "Zona Norte", vehicle: "Motocicleta" },
  { id: "dp-002", name: "Ana Ramírez", status: "en-ruta", zone: "Zona Sur", vehicle: "Automóvil" },
  { id: "dp-003", name: "Roberto Díaz", status: "disponible", zone: "Zona Este", vehicle: "Motocicleta" },
  { id: "dp-004", name: "Laura Torres", status: "descanso", zone: "Zona Oeste", vehicle: "Bicicleta" },
  { id: "dp-005", name: "Miguel Ángel", status: "en-ruta", zone: "Zona Centro", vehicle: "Motocicleta" },
]

export default function ZonasEntregaPage() {
  const [openNewDeliveryDialog, setOpenNewDeliveryDialog] = useState(false)
  const [openManageZonesDialog, setOpenManageZonesDialog] = useState(false)

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-3xl font-bold tracking-tight">Gestión de Entregas</h2>
        </div>
        <div className="flex space-x-2">
          <NewDeliveryDialog open={openNewDeliveryDialog} onOpenChange={setOpenNewDeliveryDialog} />
          <ManageZonesDialog open={openManageZonesDialog} onOpenChange={setOpenManageZonesDialog} />
        </div>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pendientes</TabsTrigger>
          <TabsTrigger value="in-progress">En Proceso</TabsTrigger>
          <TabsTrigger value="completed">Completadas</TabsTrigger>
          <TabsTrigger value="personnel">Repartidores</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="flex flex-1 items-center space-x-2">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Buscar entregas..." className="w-full pl-8" />
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Zona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las zonas</SelectItem>
                  {deliveryZones.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id}>
                      {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Dirección</TableHead>
                  <TableHead className="hidden md:table-cell">Zona</TableHead>
                  <TableHead className="hidden md:table-cell">Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">ENT-001</TableCell>
                  <TableCell>Juan Pérez</TableCell>
                  <TableCell className="hidden md:table-cell">Av. Principal 123, Col. Norte</TableCell>
                  <TableCell className="hidden md:table-cell">Zona Norte</TableCell>
                  <TableCell className="hidden md:table-cell">23/03/2023</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="bg-yellow-50 text-yellow-700 hover:bg-yellow-50 hover:text-yellow-700"
                    >
                      Pendiente
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      Asignar
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">ENT-002</TableCell>
                  <TableCell>María González</TableCell>
                  <TableCell className="hidden md:table-cell">Calle Sur 456, Col. Centro</TableCell>
                  <TableCell className="hidden md:table-cell">Zona Centro</TableCell>
                  <TableCell className="hidden md:table-cell">23/03/2023</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="bg-yellow-50 text-yellow-700 hover:bg-yellow-50 hover:text-yellow-700"
                    >
                      Pendiente
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      Asignar
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">ENT-003</TableCell>
                  <TableCell>Carlos Rodríguez</TableCell>
                  <TableCell className="hidden md:table-cell">Blvd. Este 789, Col. Oriental</TableCell>
                  <TableCell className="hidden md:table-cell">Zona Este</TableCell>
                  <TableCell className="hidden md:table-cell">23/03/2023</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="bg-yellow-50 text-yellow-700 hover:bg-yellow-50 hover:text-yellow-700"
                    >
                      Pendiente
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      Asignar
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="in-progress" className="space-y-4">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="flex flex-1 items-center space-x-2">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Buscar entregas..." className="w-full pl-8" />
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Repartidor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los repartidores</SelectItem>
                  {deliveryPersonnel.map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Dirección</TableHead>
                  <TableHead>Repartidor</TableHead>
                  <TableHead className="hidden md:table-cell">Hora Estimada</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">ENT-004</TableCell>
                  <TableCell>Ana Martínez</TableCell>
                  <TableCell className="hidden md:table-cell">Av. Sur 321, Col. Moderna</TableCell>
                  <TableCell>Ana Ramírez</TableCell>
                  <TableCell className="hidden md:table-cell">14:30</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50 hover:text-blue-700">
                      En ruta
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">ENT-005</TableCell>
                  <TableCell>Roberto López</TableCell>
                  <TableCell className="hidden md:table-cell">Calle Centro 654, Col. Histórica</TableCell>
                  <TableCell>Miguel Ángel</TableCell>
                  <TableCell className="hidden md:table-cell">15:15</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50 hover:text-blue-700">
                      En ruta
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="flex flex-1 items-center space-x-2">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Buscar entregas..." className="w-full pl-8" />
              </div>
              <Select defaultValue="today">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoy</SelectItem>
                  <SelectItem value="yesterday">Ayer</SelectItem>
                  <SelectItem value="week">Esta semana</SelectItem>
                  <SelectItem value="month">Este mes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Dirección</TableHead>
                  <TableHead>Repartidor</TableHead>
                  <TableHead className="hidden md:table-cell">Completada</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">ENT-006</TableCell>
                  <TableCell>Luis Hernández</TableCell>
                  <TableCell className="hidden md:table-cell">Calle Poniente 987, Col. Oeste</TableCell>
                  <TableCell>Carlos Méndez</TableCell>
                  <TableCell className="hidden md:table-cell">22/03/2023 16:45</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700 hover:bg-green-50 hover:text-green-700"
                    >
                      Completada
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      Detalles
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">ENT-007</TableCell>
                  <TableCell>Patricia Sánchez</TableCell>
                  <TableCell className="hidden md:table-cell">Av. Norte 456, Col. Industrial</TableCell>
                  <TableCell>Roberto Díaz</TableCell>
                  <TableCell className="hidden md:table-cell">22/03/2023 17:30</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700 hover:bg-green-50 hover:text-green-700"
                    >
                      Completada
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      Detalles
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="personnel" className="space-y-4">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="flex flex-1 items-center space-x-2">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Buscar repartidores..." className="w-full pl-8" />
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="disponible">Disponible</SelectItem>
                  <SelectItem value="en-ruta">En ruta</SelectItem>
                  <SelectItem value="descanso">En descanso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setOpenNewDeliveryDialog(true)}>Nuevo Repartidor</Button>
          </div>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {deliveryPersonnel.map((person) => (
              <Card key={person.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">{person.name}</CardTitle>
                    <Badge
                      variant="outline"
                      className={
                        person.status === "disponible"
                          ? "bg-green-50 text-green-700"
                          : person.status === "en-ruta"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-yellow-50 text-yellow-700"
                      }
                    >
                      {person.status === "disponible"
                        ? "Disponible"
                        : person.status === "en-ruta"
                          ? "En ruta"
                          : "En descanso"}
                    </Badge>
                  </div>
                  <CardDescription>
                    {person.zone} • {person.vehicle}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>ID: {person.id}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>+52 555 123 4567</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span>Entregas hoy: {Math.floor(Math.random() * 10)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <span>Dirección: Calle Principal 123</span>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" size="sm">
                    Ver Perfil
                  </Button>
                  <Button size="sm">Asignar Entrega</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

