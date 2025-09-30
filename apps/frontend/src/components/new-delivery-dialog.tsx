

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, Clock, Minus, Package, Plus, Trash2, Truck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

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

// Productos disponibles para seleccionar
const availableProducts = [
  { id: "p1", name: "Laptop HP 15\"", price: 899.99 },
  { id: "p2", name: "Monitor Samsung 24\"", price: 249.99 },
  { id: "p3", name: "Teclado Mecánico RGB", price: 89.99 },
  { id: "p4", name: "Mouse Inalámbrico", price: 29.99 },
  { id: "p5", name: "Auriculares Bluetooth", price: 59.99 },
  { id: "p6", name: "Impresora Láser", price: 199.99 },
  { id: "p7", name: "Disco Duro Externo 1TB", price: 79.99 },
  { id: "p8", name: "Memoria USB 64GB", price: 19.99 },
]

interface NewDeliveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewDeliveryDialog({ open, onOpenChange }: NewDeliveryDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedZone, setSelectedZone] = useState("")
  const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState("")
  const [deliveryType, setDeliveryType] = useState("standard")

  const [selectedProduct, setSelectedProduct] = useState("")
  const [productQuantity, setProductQuantity] = useState(1)
  const [orderProducts, setOrderProducts] = useState<{id: string; name: string; price: number; quantity: number}[]>([])

  const handleAddProduct = () => {
    if (selectedProduct && productQuantity > 0) {
      const product = availableProducts.find(p => p.id === selectedProduct);
      if (product) {
        setOrderProducts([...orderProducts, {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: productQuantity
        }]);
        setSelectedProduct("");
        setProductQuantity(1);
      }
    }
  }

  const handleUpdateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    const newProducts = [...orderProducts];
    newProducts[index].quantity = newQuantity;
    setOrderProducts(newProducts);
  }

  const handleRemoveProduct = (index: number) => {
    const newProducts = [...orderProducts];
    newProducts.splice(index, 1);
    setOrderProducts(newProducts);
  }

  const handleSaveDelivery = () => {
    setIsLoading(true)
    // Simular guardado
    setTimeout(() => {
      setIsLoading(false)
      onOpenChange(false) 
      // Limpiar el formulario
      setOrderProducts([]);
      setSelectedZone("");
      setSelectedDeliveryPerson("");
      setDeliveryType("standard");
    }, 1000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Entrega
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Registrar Nueva Entrega</DialogTitle>
          <DialogDescription>Registra una nueva entrega para que sea asignada a un repartidor.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Tabs defaultValue="customer" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="customer">Cliente</TabsTrigger>
              <TabsTrigger value="order">Pedido</TabsTrigger>
              <TabsTrigger value="delivery">Entrega</TabsTrigger>
            </TabsList>
            <TabsContent value="customer" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer-name">Nombre del Cliente</Label>
                  <Input id="customer-name" placeholder="Nombre completo" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-phone">Teléfono</Label>
                  <Input id="customer-phone" placeholder="Ej: +52 555 123 4567" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="customer-address">Dirección</Label>
                  <Input id="customer-address" placeholder="Calle, número, colonia" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-city">Ciudad</Label>
                  <Input id="customer-city" defaultValue="Ciudad de México" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-postal">Código Postal</Label>
                  <Input id="customer-postal" placeholder="Ej: 01000" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="customer-notes">Instrucciones de entrega</Label>
                  <Textarea id="customer-notes" placeholder="Ej: Tocar el timbre, edificio azul, etc." />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="order" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="order-number">Número de Pedido</Label>
                  <Input id="order-number" defaultValue="PED-2023-0045" readOnly />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="order-date">Fecha del Pedido</Label>
                  <Input id="order-date" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Productos</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAddProduct}
                  >
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
                          {product.name} - ${product.price.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="w-24">
                    <Input 
                      type="number" 
                      min="1" 
                      value={productQuantity} 
                      onChange={(e) => setProductQuantity(parseInt(e.target.value) || 1)}
                      placeholder="Cant."
                    />
                  </div>
                </div>
                
                {orderProducts.length > 0 ? (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead className="text-right">Precio</TableHead>
                          <TableHead className="text-center">Cantidad</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderProducts.map((product, index) => (
                          <TableRow key={`${product.id}-${index}`}>
                            <TableCell>{product.name}</TableCell>
                            <TableCell className="text-right">${product.price.toFixed(2)}</TableCell>
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
                            <TableCell className="text-right">
                              ${(product.price * product.quantity).toFixed(2)}
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
                    <p className="text-sm">Selecciona productos para agregar al pedido</p>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>${orderProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>IVA (16%):</span>
                  <span>${(orderProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0) * 0.16).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Total:</span>
                  <span>${(orderProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0) * 1.16).toFixed(2)}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="payment-method">Método de Pago</Label>
                <Select defaultValue="card">
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card">Tarjeta (Pagado)</SelectItem>
                    <SelectItem value="cash">Efectivo (Contra entrega)</SelectItem>
                    <SelectItem value="transfer">Transferencia (Pagado)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
            <TabsContent value="delivery" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo de Entrega</Label>
                  <RadioGroup
                    value={deliveryType}
                    onValueChange={setDeliveryType}
                    className="flex flex-col space-y-2"
                  >
                    <div className="flex items-center space-x-2 rounded-md border p-3">
                      <RadioGroupItem value="standard" id="standard" />
                      <Label htmlFor="standard" className="flex items-center gap-2 font-normal">
                        <Truck className="h-4 w-4" />
                        <div>
                          <p className="font-medium">Estándar</p>
                          <p className="text-sm text-muted-foreground">Entrega en horario regular</p>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 rounded-md border p-3">
                      <RadioGroupItem value="express" id="express" />
                      <Label htmlFor="express" className="flex items-center gap-2 font-normal">
                        <Clock className="h-4 w-4" />
                        <div>
                          <p className="font-medium">Express</p>
                          <p className="text-sm text-muted-foreground">Entrega prioritaria (costo adicional)</p>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 rounded-md border p-3">
                      <RadioGroupItem value="scheduled" id="scheduled" />
                      <Label htmlFor="scheduled" className="flex items-center gap-2 font-normal">
                        <Calendar className="h-4 w-4" />
                        <div>
                          <p className="font-medium">Programada</p>
                          <p className="text-sm text-muted-foreground">Entrega en fecha y hora específica</p>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {deliveryType === "scheduled" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="delivery-date">Fecha de Entrega</Label>
                      <Input id="delivery-date" type="date" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="delivery-time">Hora de Entrega</Label>
                      <Input id="delivery-time" type="time" />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="delivery-zone">Zona de Entrega</Label>
                  <Select value={selectedZone} onValueChange={setSelectedZone}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar zona" />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryZones.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id}>
                          {zone.name} - ${zone.cost.toFixed(2)} ({zone.time})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delivery-person">Repartidor</Label>
                  <Select value={selectedDeliveryPerson} onValueChange={setSelectedDeliveryPerson}>
                    <SelectTrigger>
                      <SelectValue placeholder="Asignar repartidor" />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryPersonnel
                        .filter((person) => person.status === "disponible")
                        .map((person) => (
                          <SelectItem key={person.id} value={person.id}>
                            {person.name} - {person.zone} ({person.vehicle})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSaveDelivery} disabled={isLoading}>
            {isLoading ? "Guardando..." : "Registrar Entrega"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
