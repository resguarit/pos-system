

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Minus, Package, Plus, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// Productos disponibles para seleccionar
const availableProducts = [
  { id: "p1", name: 'Laptop HP 15"' },
  { id: "p2", name: 'Monitor Samsung 24"' },
  { id: "p3", name: "Teclado Mecánico RGB" },
  { id: "p4", name: "Mouse Inalámbrico" },
  { id: "p5", name: "Auriculares Bluetooth" },
  { id: "p6", name: "Impresora Láser" },
  { id: "p7", name: "Disco Duro Externo 1TB" },
  { id: "p8", name: "Memoria USB 64GB" },
]

interface NewRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewRequestDialog({ open, onOpenChange }: NewRequestDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const [requestType, setRequestType] = useState("transfer")
  const [priority, setPriority] = useState("normal")
  const [fromBranch, setFromBranch] = useState("central")
  const [toBranch, setToBranch] = useState("")
  const [notes, setNotes] = useState("")
  const [dateNeeded, setDateNeeded] = useState("")
  const [requestedBy, setRequestedBy] = useState("Admin")

  const [selectedProduct, setSelectedProduct] = useState("")
  const [productQuantity, setProductQuantity] = useState(1)
  const [requestProducts, setRequestProducts] = useState<{ id: string; name: string; quantity: number }[]>([])

  const handleAddProduct = () => {
    if (selectedProduct && productQuantity > 0) {
      const product = availableProducts.find((p) => p.id === selectedProduct)
      if (product) {
        setRequestProducts([
          ...requestProducts,
          {
            id: product.id,
            name: product.name,
            quantity: productQuantity,
          },
        ])
        setSelectedProduct("")
        setProductQuantity(1)
      }
    }
  }

  const handleUpdateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return

    const newProducts = [...requestProducts]
    newProducts[index].quantity = newQuantity
    setRequestProducts(newProducts)
  }

  const handleRemoveProduct = (index: number) => {
    const newProducts = [...requestProducts]
    newProducts.splice(index, 1)
    setRequestProducts(newProducts)
  }

  const handleSave = () => {
    setIsLoading(true)
    // Simular guardado
    setTimeout(() => {
      setIsLoading(false)
      onOpenChange(false)
      // Limpiar el formulario
      setRequestProducts([])
      setRequestType("transfer")
      setPriority("normal")
      setFromBranch("central")
      setToBranch("")
      setNotes("")
      setDateNeeded("")
    }, 1000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Solicitud
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Nueva Solicitud de Stock</DialogTitle>
          <DialogDescription>Solicitar productos a otra sucursal</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="request-type">Tipo de Solicitud</Label>
              <Select value={requestType} onValueChange={setRequestType}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transfer">Transferencia de Stock</SelectItem>
                  <SelectItem value="loan">Préstamo Temporal</SelectItem>
                  <SelectItem value="emergency">Emergencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridad</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar prioridad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="from-branch">Sucursal Solicitante</Label>
              <Select value={fromBranch} onValueChange={setFromBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sucursal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="central">Sucursal Central</SelectItem>
                  <SelectItem value="norte">Sucursal Norte</SelectItem>
                  <SelectItem value="sur">Sucursal Sur</SelectItem>
                  <SelectItem value="este">Sucursal Este</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="to-branch">Sucursal Destino</Label>
              <Select value={toBranch} onValueChange={setToBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sucursal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="central">Sucursal Central</SelectItem>
                  <SelectItem value="norte">Sucursal Norte</SelectItem>
                  <SelectItem value="sur">Sucursal Sur</SelectItem>
                  <SelectItem value="este">Sucursal Este</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-4 md:col-span-2">
              <div className="flex justify-between items-center">
                <Label>Productos Solicitados</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddProduct}>
                  <Plus className="h-4 w-4 mr-1" /> Agregar Producto
                </Button>
              </div>

              <div className="flex space-x-2 mb-2">
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Seleccionar producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="w-24">
                  <Input
                    type="number"
                    min="1"
                    value={productQuantity}
                    onChange={(e) => setProductQuantity(Number.parseInt(e.target.value) || 1)}
                    placeholder="Cant."
                  />
                </div>
              </div>

              {requestProducts.length > 0 ? (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-center">Cantidad</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requestProducts.map((product, index) => (
                        <TableRow key={`${product.id}-${index}`}>
                          <TableCell>{product.name}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleUpdateQuantity(index, product.quantity - 1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center">{product.quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleUpdateQuantity(index, product.quantity + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleRemoveProduct(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-4 border rounded-md text-muted-foreground">
                  <Package className="h-8 w-8 mb-2" />
                  <p>No hay productos agregados</p>
                  <p className="text-sm">Selecciona productos para agregar a la solicitud</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                placeholder="Añade cualquier información adicional relevante"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-needed">Fecha Requerida</Label>
              <Input id="date-needed" type="date" value={dateNeeded} onChange={(e) => setDateNeeded(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requested-by">Solicitado por</Label>
              <Input id="requested-by" value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Enviando..." : "Enviar Solicitud"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

