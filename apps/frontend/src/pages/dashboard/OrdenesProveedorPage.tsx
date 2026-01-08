

import { useState } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { ArrowLeft, CalendarRange, Download, FileText, Printer, Truck } from "lucide-react"
import { Link } from "react-router-dom"

type PageProps = {
  params: { id: string }
  searchParams?: Record<string, string | string[] | undefined>
}

export default function VerCompraPage({ params }: PageProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [openUpdateStatusDialog, setOpenUpdateStatusDialog] = useState(false)
  const [status, setStatus] = useState("pending")

  const purchaseData = {
    id: params.id,
    orderNumber: params.id,
    orderDate: "2023-03-22",
    expectedDate: "2023-03-29",
    status: status,
    supplier: {
      id: "PRV001",
      name: "Electrónicos del Norte",
      contact: "Roberto Gómez",
      phone: "+52 555 123 4567",
      email: "contacto@electronorte.com",
      address: "Av. Principal 123, Col. Centro",
    },
    items: [
      {
        id: "p1",
        name: 'Laptop HP 15"',
        sku: "LPT-001",
        quantity: 3,
        price: 750.0,
        subtotal: 2250.0,
        received: 3,
        currency: "USD",
      },
      {
        id: "p2",
        name: 'Monitor Samsung 24"',
        sku: "MON-002",
        quantity: 5,
        price: 190.0,
        subtotal: 950.0,
        received: 4,
        currency: "USD",
      },
      {
        id: "p3",
        name: "Teclado Mecánico RGB",
        sku: "TEC-003",
        quantity: 10,
        price: 65000.0,
        subtotal: 650000.0,
        received: 10,
        currency: "ARS",
      },
    ],
    notes: "Orden para reabastecimiento de tecnología",
    paymentMethod: "Crédito (30 días)",
    paymentStatus: "Pendiente",
    deliveryMethod: "Entrega del Proveedor",
    subtotal: 3850.0,
    tax: 616.0,
    total: 4466.0,
    history: [
      {
        date: "2023-03-22",
        time: "09:45",
        action: "Creación de la orden",
        user: "Admin",
      },
      {
        date: "2023-03-22",
        time: "10:30",
        action: "Envío de orden al proveedor",
        user: "Admin",
      },
      {
        date: "2023-03-25",
        time: "14:15",
        action: "Confirmación del proveedor",
        user: "Sistema",
      },
    ],
  }

  const handleUpdateStatus = () => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      setOpenUpdateStatusDialog(false)
      setStatus("received")
      alert("Estado de la compra actualizado correctamente")
    }, 1000)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "received":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50 hover:text-green-700">
            Recibida
          </Badge>
        )
      case "partial":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 hover:bg-yellow-50 hover:text-yellow-700">
            Recepción Parcial
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
            Cancelada
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button asChild variant="outline" size="icon">
            <Link to="/proveedores">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Volver a Proveedores</span>
            </Link>
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Orden de Compra #{params.id}</h2>
            <p className="text-muted-foreground">
              Fecha de orden: {purchaseData.orderDate} | Proveedor: {purchaseData.supplier.name}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={openUpdateStatusDialog} onOpenChange={setOpenUpdateStatusDialog}>
            <DialogTrigger asChild>
              <Button>
                <Truck className="mr-2 h-4 w-4" />
                Actualizar Estado
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Actualizar Estado de la Compra</DialogTitle>
                <DialogDescription>Actualiza el estado de recepción de esta orden de compra</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Estado Actual</Label>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(purchaseData.status)}
                    <span className="text-sm text-muted-foreground">Actualizado el {purchaseData.history[2].date}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-status">Nuevo Estado</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar nuevo estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="partial">Recepción Parcial</SelectItem>
                      <SelectItem value="received">Recibida</SelectItem>
                      <SelectItem value="cancelled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="received-date">Fecha de Recepción</Label>
                  <Input id="received-date" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status-notes">Notas sobre la recepción</Label>
                  <Textarea id="status-notes" placeholder="Observaciones sobre la recepción de productos" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenUpdateStatusDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdateStatus} disabled={isLoading}>
                  {isLoading ? "Actualizando..." : "Actualizar Estado"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Descargar PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Detalles de la Orden</span>
              {getStatusBadge(purchaseData.status)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Número de Orden</p>
                <p className="font-medium">{purchaseData.orderNumber}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fecha de Orden</p>
                <p>{purchaseData.orderDate}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fecha Esperada</p>
                <p>{purchaseData.expectedDate}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Método de Pago</p>
                <p>{purchaseData.paymentMethod}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Estado del Pago</p>
                <p>{purchaseData.paymentStatus}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Método de Entrega</p>
                <p>{purchaseData.deliveryMethod}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Productos</p>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-center">Cantidad</TableHead>
                      <TableHead className="text-center">Recibidos</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseData.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-center">
                          <span
                            className={
                              item.received === item.quantity
                                ? "text-green-600"
                                : item.received > 0
                                  ? "text-amber-600"
                                  : "text-muted-foreground"
                            }
                          >
                            {item.received}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">${item.price.toFixed(2)} {item.currency}</TableCell>
                        <TableCell className="text-right">${item.subtotal.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex flex-col items-end space-y-1.5">
                <div className="flex w-full justify-between md:w-60">
                  <span>Subtotal:</span>
                  <span>${purchaseData.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex w-full justify-between md:w-60">
                  <span>IVA (16%):</span>
                  <span>${purchaseData.tax.toFixed(2)}</span>
                </div>
                <div className="flex w-full justify-between md:w-60 text-lg font-bold">
                  <span>Total:</span>
                  <span>${purchaseData.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {purchaseData.notes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Notas</p>
                <p className="rounded-md border p-3">{purchaseData.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información del Proveedor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Empresa</p>
              <p className="font-medium">{purchaseData.supplier.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Contacto</p>
              <p>{purchaseData.supplier.contact}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Teléfono</p>
              <p>{purchaseData.supplier.phone}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p>{purchaseData.supplier.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Dirección</p>
              <p>{purchaseData.supplier.address}</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" asChild className="w-full">
              <Link to={`/proveedores/directorio/${purchaseData.supplier.id}`}>Ver Proveedor</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Tabs defaultValue="history" className="space-y-4">
        <TabsList className="w-fit">
          <TabsTrigger value="history">Historial</TabsTrigger>
          <TabsTrigger value="payments">Pagos</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de la Orden</CardTitle>
              <CardDescription>Seguimiento de las acciones realizadas en esta orden</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {purchaseData.history.map((event, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100">
                      <FileText className="h-4 w-4 text-blue-700" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{event.action}</p>
                        <span className="text-xs text-muted-foreground">
                          {event.date} {event.time}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{event.user}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pagos Realizados</CardTitle>
              <CardDescription>Histórico de pagos de esta orden</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Pago</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={6} className="text-center p-4">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <CalendarRange className="h-10 w-10 mb-2" />
                          <p className="font-medium">No hay pagos registrados</p>
                          <p className="text-sm mt-1">Esta orden aún no tiene pagos registrados</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4">
                <Button className="w-full">Registrar Nuevo Pago</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documentos Relacionados</CardTitle>
              <CardDescription>Archivos adjuntos a esta orden</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Orden de Compra</TableCell>
                      <TableCell>orden_compra_{params.id}.pdf</TableCell>
                      <TableCell>{purchaseData.orderDate}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          Descargar
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4">
                <Button variant="outline" className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  Adjuntar Documento
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}