import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, FileText, Plus, Search } from "lucide-react"

export default function FacturacionPage() {
  const [searchTerm, setSearchTerm] = useState("")

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-3xl font-bold tracking-tight">Facturación</h2>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Factura
        </Button>
      </div>

      <Tabs defaultValue="facturas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="facturas">Facturas</TabsTrigger>
          <TabsTrigger value="clientes">Clientes Fiscales</TabsTrigger>
          <TabsTrigger value="configuracion">Configuración</TabsTrigger>
        </TabsList>

        <TabsContent value="facturas" className="space-y-4">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="flex flex-1 items-center space-x-2">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar facturas..."
                  className="w-full pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent style={{ maxHeight: 300, overflowY: 'auto' }}>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="paid">Pagada</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Factura</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Fecha</TableHead>
                  <TableHead className="hidden md:table-cell">Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden md:table-cell">RFC</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">FAC-2023-001</TableCell>
                  <TableCell>Juan Pérez</TableCell>
                  <TableCell className="hidden md:table-cell">23/03/2023</TableCell>
                  <TableCell className="hidden md:table-cell">$1,299.99</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700 hover:bg-green-50 hover:text-green-700"
                    >
                      Pagada
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">PERJ800101ABC</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      PDF
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">FAC-2023-002</TableCell>
                  <TableCell>María González</TableCell>
                  <TableCell className="hidden md:table-cell">24/03/2023</TableCell>
                  <TableCell className="hidden md:table-cell">$2,499.50</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700 hover:bg-green-50 hover:text-green-700"
                    >
                      Pagada
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">GONM750212DEF</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      PDF
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">FAC-2023-003</TableCell>
                  <TableCell>Carlos Rodríguez</TableCell>
                  <TableCell className="hidden md:table-cell">25/03/2023</TableCell>
                  <TableCell className="hidden md:table-cell">$899.99</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="bg-yellow-50 text-yellow-700 hover:bg-yellow-50 hover:text-yellow-700"
                    >
                      Pendiente
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">RODC680505GHI</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      PDF
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">FAC-2023-004</TableCell>
                  <TableCell>Ana Martínez</TableCell>
                  <TableCell className="hidden md:table-cell">26/03/2023</TableCell>
                  <TableCell className="hidden md:table-cell">$3,499.99</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50 hover:text-red-700">
                      Cancelada
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">MARA901010JKL</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      PDF
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">FAC-2023-005</TableCell>
                  <TableCell>Roberto López</TableCell>
                  <TableCell className="hidden md:table-cell">27/03/2023</TableCell>
                  <TableCell className="hidden md:table-cell">$1,599.99</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700 hover:bg-green-50 hover:text-green-700"
                    >
                      Pagada
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">LOPR650815MNO</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      PDF
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="clientes" className="space-y-4">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="flex flex-1 items-center space-x-2">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Buscar clientes fiscales..." className="w-full pl-8" />
              </div>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cliente Fiscal
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nombre/Razón Social</TableHead>
                  <TableHead className="hidden md:table-cell">RFC</TableHead>
                  <TableHead className="hidden md:table-cell">Régimen Fiscal</TableHead>
                  <TableHead className="hidden md:table-cell">Correo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">CF001</TableCell>
                  <TableCell>Juan Pérez Gómez</TableCell>
                  <TableCell className="hidden md:table-cell">PERJ800101ABC</TableCell>
                  <TableCell className="hidden md:table-cell">Persona Física</TableCell>
                  <TableCell className="hidden md:table-cell">juan.perez@email.com</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">CF002</TableCell>
                  <TableCell>María González López</TableCell>
                  <TableCell className="hidden md:table-cell">GONM750212DEF</TableCell>
                  <TableCell className="hidden md:table-cell">Persona Física</TableCell>
                  <TableCell className="hidden md:table-cell">maria.gonzalez@email.com</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">CF003</TableCell>
                  <TableCell>Tecnología Avanzada S.A. de C.V.</TableCell>
                  <TableCell className="hidden md:table-cell">TAV120505GHI</TableCell>
                  <TableCell className="hidden md:table-cell">Persona Moral</TableCell>
                  <TableCell className="hidden md:table-cell">contacto@tecavanzada.com</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">CF004</TableCell>
                  <TableCell>Ana Martínez Ruiz</TableCell>
                  <TableCell className="hidden md:table-cell">MARA901010JKL</TableCell>
                  <TableCell className="hidden md:table-cell">Persona Física</TableCell>
                  <TableCell className="hidden md:table-cell">ana.martinez@email.com</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">CF005</TableCell>
                  <TableCell>Distribuidora Global S.A.</TableCell>
                  <TableCell className="hidden md:table-cell">DGL080815MNO</TableCell>
                  <TableCell className="hidden md:table-cell">Persona Moral</TableCell>
                  <TableCell className="hidden md:table-cell">info@distribuidoraglobal.com</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="configuracion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Facturación Electrónica</CardTitle>
              <CardDescription>Configura los parámetros para la facturación electrónica (CFDI).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="rfc">RFC Emisor</Label>
                  <Input id="rfc" defaultValue="XAXX010101000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="razon-social">Razón Social</Label>
                  <Input id="razon-social" defaultValue="Mi Empresa S.A. de C.V." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regimen-fiscal">Régimen Fiscal</Label>
                  <Select defaultValue="601">
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar régimen fiscal" />
                    </SelectTrigger>
                    <SelectContent style={{ maxHeight: 300, overflowY: 'auto' }}>
                      <SelectItem value="601">General de Ley Personas Morales</SelectItem>
                      <SelectItem value="603">Personas Morales con Fines no Lucrativos</SelectItem>
                      <SelectItem value="605">Sueldos y Salarios e Ingresos Asimilados a Salarios</SelectItem>
                      <SelectItem value="606">Arrendamiento</SelectItem>
                      <SelectItem value="612">
                        Personas Físicas con Actividades Empresariales y Profesionales
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lugar-expedicion">Lugar de Expedición (CP)</Label>
                  <Input id="lugar-expedicion" defaultValue="01000" />
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Certificado SAT (.cer)</h4>
                    <p className="text-sm text-muted-foreground">Certificado de sello digital</p>
                  </div>
                  <Button variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    Subir
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Llave Privada (.key)</h4>
                    <p className="text-sm text-muted-foreground">Llave privada para el certificado</p>
                  </div>
                  <Button variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    Subir
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña FIEL</Label>
                <Input id="password" type="password" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serie">Serie de Facturación</Label>
                <Input id="serie" defaultValue="A" />
                <p className="text-sm text-muted-foreground">Serie para identificar las facturas (opcional)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="folio-inicial">Folio Inicial</Label>
                <Input id="folio-inicial" type="number" defaultValue="1" />
                <p className="text-sm text-muted-foreground">Número de folio inicial para las facturas</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button>Guardar Configuración</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Plantilla de Factura</CardTitle>
              <CardDescription>Personaliza la apariencia de tus facturas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="logo">Logo de la Empresa</Label>
                <div className="flex items-center gap-2">
                  <Input id="logo" type="file" className="flex-1" />
                  <Button variant="outline">Subir</Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color-primario">Color Primario</Label>
                <div className="flex items-center gap-2">
                  <Input id="color-primario" type="color" defaultValue="#0ea5e9" className="h-10 w-20" />
                  <span className="text-sm text-muted-foreground">#0ea5e9</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notas">Notas al Pie de Factura</Label>
                <textarea
                  id="notas"
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  defaultValue="Gracias por su preferencia. Para cualquier aclaración, favor de comunicarse al teléfono (55) 1234-5678."
                ></textarea>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="incluir-logo"
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  defaultChecked
                />
                <Label htmlFor="incluir-logo">Incluir logo en la factura</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="incluir-qr"
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  defaultChecked
                />
                <Label htmlFor="incluir-qr">Incluir código QR</Label>
              </div>
            </CardContent>
            <CardFooter>
              <Button>Guardar Plantilla</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
