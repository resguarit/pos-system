import { useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Check, Clock, FileText, MoreHorizontal, PlusCircle, Search, User, X } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Datos de ejemplo para los próximos turnos
const upcomingAppointments = [
  {
    id: "APT-001",
    client: {
      id: "CLT-001",
      name: "María Rodríguez",
      phone: "+52 555 123 4567",
      avatar: "/placeholder-user.jpg",
    },
    service: "Corte de cabello y tinte",
    staff: "Ana López",
    date: "2023-04-01",
    time: "10:00",
    duration: 90,
    status: "confirmed",
    price: 750.0,
  },
  {
    id: "APT-002",
    client: {
      id: "CLT-002",
      name: "José González",
      phone: "+52 555 234 5678",
      avatar: "/placeholder-user.jpg",
    },
    service: "Masaje relajante",
    staff: "Carlos Martínez",
    date: "2023-04-01",
    time: "11:30",
    duration: 60,
    status: "confirmed",
    price: 600.0,
  },
  {
    id: "APT-003",
    client: {
      id: "CLT-003",
      name: "Laura Torres",
      phone: "+52 555 345 6789",
      avatar: "/placeholder-user.jpg",
    },
    service: "Manicura y pedicura",
    staff: "Ana López",
    date: "2023-04-01",
    time: "13:00",
    duration: 75,
    status: "pending",
    price: 450.0,
  },
  {
    id: "APT-004",
    client: {
      id: "CLT-004",
      name: "Pedro Sánchez",
      phone: "+52 555 456 7890",
      avatar: "/placeholder-user.jpg",
    },
    service: "Corte de barba",
    staff: "Roberto Díaz",
    date: "2023-04-01",
    time: "14:30",
    duration: 30,
    status: "confirmed",
    price: 250.0,
  },
  {
    id: "APT-005",
    client: {
      id: "CLT-005",
      name: "Carmen Mendoza",
      phone: "+52 555 567 8901",
      avatar: "/placeholder-user.jpg",
    },
    service: "Tratamiento facial",
    staff: "María Vásquez",
    date: "2023-04-01",
    time: "16:00",
    duration: 60,
    status: "confirmed",
    price: 550.0,
  },
]

// Lista de servicios disponibles
const availableServices = [
  { id: "SVC-001", name: "Corte de cabello", duration: 45, price: 350.0 },
  { id: "SVC-002", name: "Tinte", duration: 60, price: 500.0 },
  { id: "SVC-003", name: "Corte de cabello y tinte", duration: 90, price: 750.0 },
  { id: "SVC-004", name: "Peinado", duration: 30, price: 300.0 },
  { id: "SVC-005", name: "Manicura", duration: 45, price: 250.0 },
  { id: "SVC-006", name: "Pedicura", duration: 45, price: 300.0 },
  { id: "SVC-007", name: "Manicura y pedicura", duration: 75, price: 450.0 },
  { id: "SVC-008", name: "Tratamiento facial", duration: 60, price: 550.0 },
  { id: "SVC-009", name: "Masaje relajante", duration: 60, price: 600.0 },
  { id: "SVC-010", name: "Corte de barba", duration: 30, price: 250.0 },
]

// Personal disponible
const availableStaff = [
  { id: "STF-001", name: "Ana López", role: "Estilista", avatar: "/placeholder-user.jpg" },
  { id: "STF-002", name: "Carlos Martínez", role: "Masajista", avatar: "/placeholder-user.jpg" },
  { id: "STF-003", name: "María Vásquez", role: "Esteticista", avatar: "/placeholder-user.jpg" },
  { id: "STF-004", name: "Roberto Díaz", role: "Barbero", avatar: "/placeholder-user.jpg" },
]

// Clientes registrados
const registeredClients = [
  {
    id: "CLT-001",
    name: "María Rodríguez",
    phone: "+52 555 123 4567",
    avatar: "/placeholder-user.jpg",
    email: "maria@email.com",
  },
  {
    id: "CLT-002",
    name: "José González",
    phone: "+52 555 234 5678",
    avatar: "/placeholder-user.jpg",
    email: "jose@email.com",
  },
  {
    id: "CLT-003",
    name: "Laura Torres",
    phone: "+52 555 345 6789",
    avatar: "/placeholder-user.jpg",
    email: "laura@email.com",
  },
  {
    id: "CLT-004",
    name: "Pedro Sánchez",
    phone: "+52 555 456 7890",
    avatar: "/placeholder-user.jpg",
    email: "pedro@email.com",
  },
  {
    id: "CLT-005",
    name: "Carmen Mendoza",
    phone: "+52 555 567 8901",
    avatar: "/placeholder-user.jpg",
    email: "carmen@email.com",
  },
]

// Generar horarios disponibles
const generateTimeSlots = () => {
  const slots = []
  for (let hour = 9; hour <= 19; hour++) {
    slots.push(`${hour.toString().padStart(2, "0")}:00`)
    if (hour !== 19) {
      slots.push(`${hour.toString().padStart(2, "0")}:30`)
    }
  }
  return slots
}

const timeSlots = generateTimeSlots()

export default function TurnosPage() {
  const [date, setDate] = useState<Date>(new Date())
  const { hasPermission } = useAuth();
  const [openNewAppointmentDialog, setOpenNewAppointmentDialog] = useState(false)
  const [openClientFileDialog, setOpenClientFileDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedService, setSelectedService] = useState("")
  const [selectedStaff, setSelectedStaff] = useState("")
  const [selectedClient, setSelectedClient] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedClientFile, setSelectedClientFile] = useState<(typeof registeredClients)[0] | null>(null)

  const handleNewAppointment = () => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      setOpenNewAppointmentDialog(false)
      alert("Turno creado correctamente")
    }, 1000)
  }

  const openClientFileDetails = (client: (typeof registeredClients)[0]) => {
    setSelectedClientFile(client)
    setOpenClientFileDialog(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50 hover:text-green-700">
            Confirmado
          </Badge>
        )
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 hover:bg-yellow-50 hover:text-yellow-700">
            Pendiente
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50 hover:text-red-700">
            Cancelado
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50 hover:text-blue-700">
            Completado
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Gestión de Turnos</h2>
        {hasPermission('crear_turnos') && (
          <Dialog open={openNewAppointmentDialog} onOpenChange={setOpenNewAppointmentDialog}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Turno
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Nuevo Turno</DialogTitle>
                <DialogDescription>Crea un nuevo turno para un cliente</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client">Cliente</Label>
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                      <SelectContent style={{ maxHeight: 300, overflowY: 'auto' }}>
                        {registeredClients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service">Servicio</Label>
                    <Select value={selectedService} onValueChange={setSelectedService}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar servicio" />
                      </SelectTrigger>
                      <SelectContent style={{ maxHeight: 300, overflowY: 'auto' }}>
                        {availableServices.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name} (${service.price})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Fecha</Label>
                    <Input
                      id="date"
                      type="date"
                      value={date.toISOString().split("T")[0]}
                      onChange={(e) => setDate(new Date(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Hora</Label>
                    <Select value={selectedTime} onValueChange={setSelectedTime}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar hora" />
                      </SelectTrigger>
                      <SelectContent style={{ maxHeight: 300, overflowY: 'auto' }}>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="staff">Profesional</Label>
                    <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar profesional" />
                      </SelectTrigger>
                      <SelectContent style={{ maxHeight: 300, overflowY: 'auto' }}>
                        {availableStaff.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id}>
                            {staff.name} ({staff.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Estado</Label>
                    <Select defaultValue="confirmed">
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="confirmed">Confirmado</SelectItem>
                        <SelectItem value="pending">Pendiente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="notes">Notas</Label>
                    <Textarea id="notes" placeholder="Notas o instrucciones especiales" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="send-notification" />
                      <Label htmlFor="send-notification">Enviar recordatorio al cliente</Label>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenNewAppointmentDialog(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleNewAppointment}
                  disabled={isLoading || !selectedClient || !selectedService || !selectedStaff || !selectedTime}
                >
                  {isLoading ? "Guardando..." : "Crear Turno"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">Calendario</TabsTrigger>
          <TabsTrigger value="upcoming">Próximos Turnos</TabsTrigger>
          <TabsTrigger value="clients">Clientes</TabsTrigger>
          <TabsTrigger value="staff">Personal</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-7">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Seleccionar Fecha</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    if (d instanceof Date) setDate(d)
                  }}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>

            <Card className="md:col-span-5">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>
                    Turnos para{" "}
                    {date.toLocaleDateString("es-ES", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 divide-y">
                  {upcomingAppointments.map((appointment) => (
                    <div key={appointment.id} className="p-4 flex items-start justify-between hover:bg-muted/40">
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <Clock className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {appointment.time} - {appointment.service}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={appointment.client.avatar} alt={appointment.client.name} />
                              <AvatarFallback>{appointment.client.name.substring(0, 2)}</AvatarFallback>
                            </Avatar>
                            <p className="text-sm text-muted-foreground">{appointment.client.name}</p>
                            <Badge variant="outline" className="ml-2">
                              {appointment.duration} min
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(appointment.status)}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem>
                              <Check className="mr-2 h-4 w-4" /> Marcar como completado
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Clock className="mr-2 h-4 w-4" /> Reprogramar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              <X className="mr-2 h-4 w-4" /> Cancelar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="flex flex-1 items-center space-x-2">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar turnos..."
                  className="w-full pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select defaultValue="today">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoy</SelectItem>
                  <SelectItem value="tomorrow">Mañana</SelectItem>
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
                  <TableHead>Servicio</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Profesional</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingAppointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell className="font-medium">{appointment.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={appointment.client.avatar} alt={appointment.client.name} />
                          <AvatarFallback>{appointment.client.name.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <span>{appointment.client.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{appointment.service}</TableCell>
                    <TableCell>{appointment.date}</TableCell>
                    <TableCell>{appointment.time}</TableCell>
                    <TableCell>{appointment.staff}</TableCell>
                    <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <span>Acciones</span>
                            <MoreHorizontal className="ml-2 h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuItem>
                            <Check className="mr-2 h-4 w-4" /> Marcar como completado
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Clock className="mr-2 h-4 w-4" /> Reprogramar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <X className="mr-2 h-4 w-4" /> Cancelar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="flex flex-1 items-center space-x-2">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Buscar clientes..." className="w-full pl-8" />
              </div>
            </div>
            <Button>
              <User className="mr-2 h-4 w-4" />
              Nuevo Cliente
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Última Visita</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registeredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={client.avatar} alt={client.name} />
                          <AvatarFallback>{client.name.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <span>{client.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>{client.phone}</TableCell>
                    <TableCell>23/03/2023</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openClientFileDetails(client)}>
                        <FileText className="mr-2 h-4 w-4" />
                        Ficha
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Dialog open={openClientFileDialog} onOpenChange={setOpenClientFileDialog}>
            <DialogContent className="sm:max-w-[700px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Ficha de Cliente
                </DialogTitle>
                <DialogDescription>Información detallada y preferencias del cliente</DialogDescription>
              </DialogHeader>
              {selectedClientFile && (
                <div className="grid gap-4 py-4">
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={selectedClientFile.avatar} alt={selectedClientFile.name} />
                      <AvatarFallback>{selectedClientFile.name.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-bold">{selectedClientFile.name}</h3>
                      <p className="text-muted-foreground">Cliente desde: Enero 2023</p>
                    </div>
                  </div>

                  <Tabs defaultValue="info" className="mt-4">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="info">Información</TabsTrigger>
                      <TabsTrigger value="history">Historial</TabsTrigger>
                      <TabsTrigger value="preferences">Preferencias</TabsTrigger>
                      <TabsTrigger value="notes">Notas</TabsTrigger>
                    </TabsList>
                    <TabsContent value="info" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">Nombre completo</p>
                          <p>{selectedClientFile.name}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">Email</p>
                          <p>{selectedClientFile.email}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">Teléfono</p>
                          <p>{selectedClientFile.phone}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">Fecha de nacimiento</p>
                          <p>15/06/1985</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">Dirección</p>
                          <p>Av. Principal 123, Col. Centro</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">Ciudad</p>
                          <p>Ciudad de México</p>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="history" className="space-y-4 mt-4">
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fecha</TableHead>
                              <TableHead>Servicio</TableHead>
                              <TableHead>Profesional</TableHead>
                              <TableHead className="text-right">Precio</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell>23/03/2023</TableCell>
                              <TableCell>Corte de cabello y tinte</TableCell>
                              <TableCell>Ana López</TableCell>
                              <TableCell className="text-right">$750.00</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>15/02/2023</TableCell>
                              <TableCell>Tratamiento facial</TableCell>
                              <TableCell>María Vásquez</TableCell>
                              <TableCell className="text-right">$550.00</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>05/01/2023</TableCell>
                              <TableCell>Corte de cabello</TableCell>
                              <TableCell>Ana López</TableCell>
                              <TableCell className="text-right">$350.00</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>
                    <TabsContent value="preferences" className="space-y-4 mt-4">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <h4 className="font-medium">Servicios Preferidos</h4>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">Corte de cabello</Badge>
                            <Badge variant="secondary">Tinte</Badge>
                            <Badge variant="secondary">Tratamiento facial</Badge>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium">Profesionales Preferidos</h4>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">Ana López</Badge>
                            <Badge variant="secondary">María Vásquez</Badge>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium">Preferencias de Contacto</h4>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox id="email-notifications" defaultChecked />
                              <Label htmlFor="email-notifications">Recordatorios por Email</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id="sms-notifications" defaultChecked />
                              <Label htmlFor="sms-notifications">Recordatorios por SMS</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id="special-offers" />
                              <Label htmlFor="special-offers">Promociones especiales</Label>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium">Alergias o Condiciones Especiales</h4>
                          <p>Alergia leve a productos con aloe vera.</p>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="notes" className="space-y-4 mt-4">
                      <div className="space-y-4">
                        <div className="rounded-md border p-3">
                          <div className="flex justify-between mb-2">
                            <span className="font-medium">Ana López</span>
                            <span className="text-sm text-muted-foreground">23/03/2023</span>
                          </div>
                          <p className="text-sm">
                            Cliente muy satisfecha con el nuevo color de tinte. Prefiere tonos cálidos. Programar
                            recordatorio para retoques cada 6 semanas.
                          </p>
                        </div>

                        <div className="rounded-md border p-3">
                          <div className="flex justify-between mb-2">
                            <span className="font-medium">María Vásquez</span>
                            <span className="text-sm text-muted-foreground">15/02/2023</span>
                          </div>
                          <p className="text-sm">
                            Piel sensible. Utilizó productos de la línea suave. Recomendar tratamiento hidratante para
                            uso en casa.
                          </p>
                        </div>

                        <div className="mt-4">
                          <Label htmlFor="new-note">Agregar Nueva Nota</Label>
                          <Textarea
                            id="new-note"
                            placeholder="Escribir una nueva nota sobre este cliente"
                            className="mt-2"
                          />
                          <Button className="mt-2">Guardar Nota</Button>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenClientFileDialog(false)}>
                  Cerrar
                </Button>
                <Button>Editar Información</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="staff" className="space-y-4">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="flex flex-1 items-center space-x-2">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Buscar personal..." className="w-full pl-8" />
              </div>
            </div>
            <Button>
              <User className="mr-2 h-4 w-4" />
              Agregar Personal
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {availableStaff.map((staff) => (
              <Card key={staff.id}>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <Avatar className="h-20 w-20 mb-4">
                      <AvatarImage src={staff.avatar} alt={staff.name} />
                      <AvatarFallback>{staff.name.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <h3 className="font-bold text-lg">{staff.name}</h3>
                    <p className="text-muted-foreground">{staff.role}</p>

                    <div className="mt-4 w-full space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Turnos hoy:</span>
                        <span>3</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Horario:</span>
                        <span>9:00 - 18:00</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Especialidades:</span>
                        <span>4</span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline">
                        Ver Perfil
                      </Button>
                      <Button size="sm">Agendar</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

