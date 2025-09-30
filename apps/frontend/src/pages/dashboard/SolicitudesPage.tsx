

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ExternalLink, Search } from "lucide-react"
import { NewRequestDialog } from "@/components/new-request-dialog"

export default function SolicitudesPage() {
  const [openNewRequestDialog, setOpenNewRequestDialog] = useState(false)

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-3xl font-bold tracking-tight">Solicitudes de Stock</h2>
        </div>
        <NewRequestDialog open={openNewRequestDialog} onOpenChange={setOpenNewRequestDialog} />
      </div>

      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex flex-1 items-center space-x-2">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Buscar solicitudes..." className="w-full pl-8" />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="approved">Aprobada</SelectItem>
              <SelectItem value="rejected">Rechazada</SelectItem>
              <SelectItem value="completed">Completada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead className="hidden md:table-cell">Producto</TableHead>
              <TableHead className="hidden md:table-cell">Cantidad</TableHead>
              <TableHead className="hidden md:table-cell">Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">SOL-001</TableCell>
              <TableCell>Transferencia</TableCell>
              <TableCell>
                <div className="flex items-center">
                  <span className="mr-2 h-2 w-2 rounded-full bg-[#0ea5e9]"></span>
                  Central
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  <span className="mr-2 h-2 w-2 rounded-full bg-[#10b981]"></span>
                  Norte
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">Laptop HP 15&quot;</TableCell>
              <TableCell className="hidden md:table-cell">3</TableCell>
              <TableCell className="hidden md:table-cell">15/03/2023</TableCell>
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
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ver
                </Button>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">SOL-002</TableCell>
              <TableCell>Préstamo</TableCell>
              <TableCell>
                <div className="flex items-center">
                  <span className="mr-2 h-2 w-2 rounded-full bg-[#f59e0b]"></span>
                  Sur
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  <span className="mr-2 h-2 w-2 rounded-full bg-[#8b5cf6]"></span>
                  Este
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">Monitor Samsung 24&quot;</TableCell>
              <TableCell className="hidden md:table-cell">2</TableCell>
              <TableCell className="hidden md:table-cell">14/03/2023</TableCell>
              <TableCell>
                <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50 hover:text-green-700">
                  Aprobada
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ver
                </Button>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">SOL-003</TableCell>
              <TableCell>Emergencia</TableCell>
              <TableCell>
                <div className="flex items-center">
                  <span className="mr-2 h-2 w-2 rounded-full bg-[#10b981]"></span>
                  Norte
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  <span className="mr-2 h-2 w-2 rounded-full bg-[#0ea5e9]"></span>
                  Central
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">Mouse Inalámbrico</TableCell>
              <TableCell className="hidden md:table-cell">10</TableCell>
              <TableCell className="hidden md:table-cell">13/03/2023</TableCell>
              <TableCell>
                <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50 hover:text-red-700">
                  Rechazada
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ver
                </Button>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">SOL-004</TableCell>
              <TableCell>Transferencia</TableCell>
              <TableCell>
                <div className="flex items-center">
                  <span className="mr-2 h-2 w-2 rounded-full bg-[#8b5cf6]"></span>
                  Este
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  <span className="mr-2 h-2 w-2 rounded-full bg-[#f59e0b]"></span>
                  Sur
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">Auriculares Bluetooth</TableCell>
              <TableCell className="hidden md:table-cell">5</TableCell>
              <TableCell className="hidden md:table-cell">12/03/2023</TableCell>
              <TableCell>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50 hover:text-blue-700">
                  Completada
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ver
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
