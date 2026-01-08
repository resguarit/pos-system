import { useState } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, FilePlus, Minus, PackagePlus, Plus, Trash2 } from "lucide-react"
import { Link } from "react-router-dom"

// Productos disponibles para seleccionar
const availableProducts = [
  { id: "p1", name: 'Laptop HP 15"', price: 750.0, sku: "LPT-001", currency: "USD" },
  { id: "p2", name: 'Monitor Samsung 24"', price: 190.0, sku: "MON-002", currency: "USD" },
  { id: "p3", name: "Teclado Mecánico RGB", price: 65.0, sku: "TEC-003", currency: "USD" },
  { id: "p4", name: "Mouse Inalámbrico", price: 22000.0, sku: "MOU-004", currency: "ARS" },
  { id: "p5", name: "Auriculares Bluetooth", price: 45000.0, sku: "AUR-005", currency: "ARS" },
  { id: "p6", name: "Impresora Láser", price: 180.0, sku: "IMP-006", currency: "USD" },
  { id: "p7", name: "Disco Duro Externo 1TB", price: 65.0, sku: "HDD-007", currency: "USD" },
  { id: "p8", name: "Memoria USB 64GB", price: 15000.0, sku: "USB-008", currency: "ARS" },
]

// Proveedores disponibles
const suppliers = [
  { id: "PRV001", name: "Electrónicos del Norte", contact: "Roberto Gómez", phone: "+52 555 123 4567" },
  { id: "PRV002", name: "Distribuidora Tecnológica", contact: "Laura Sánchez", phone: "+52 555 234 5678" },
  { id: "PRV003", name: "Muebles Modernos", contact: "Carlos Vega", phone: "+52 555 345 6789" },
  { id: "PRV004", name: "Textiles del Sur", contact: "Ana Jiménez", phone: "+52 555 456 7890" },
  { id: "PRV005", name: "Importadora Global", contact: "Miguel Torres", phone: "+52 555 567 8901" },
]

export default function NuevaCompraPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState("")
  const [selectedProduct, setSelectedProduct] = useState("")
  const [productQuantity, setProductQuantity] = useState(1)
  const [productPrice, setProductPrice] = useState<number | "">("")
  const [purchaseDate, setPurchaseDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [expectedDate, setExpectedDate] = useState("")
  const [notes, setNotes] = useState("")
  const [orderProducts, setOrderProducts] = useState<
    { id: string; name: string; price: number; quantity: number; subtotal: number; currency: string; }[]
  >([])

  const handleAddProduct = () => {
    if (selectedProduct && productQuantity > 0 && productPrice !== "") {
      const product = availableProducts.find((p) => p.id === selectedProduct)
      if (product) {
        const price = typeof productPrice === "string" ? Number.parseFloat(productPrice) : productPrice
        setOrderProducts([
          ...orderProducts,
          {
            id: product.id,
            name: product.name,
            price: price,
            quantity: productQuantity,
            subtotal: price * productQuantity,
            currency: product.currency,
          },
        ])
        setSelectedProduct("")
        setProductQuantity(1)
        setProductPrice("")
      }
    }
  }

  const handleUpdateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return

    const newProducts = [...orderProducts]
    newProducts[index].quantity = newQuantity
    newProducts[index].subtotal = newProducts[index].price * newQuantity
    setOrderProducts(newProducts)
  }

  const handleRemoveProduct = (index: number) => {
    const newProducts = [...orderProducts]
    newProducts.splice(index, 1)
    setOrderProducts(newProducts)
  }

  const handleSave = () => {
    setIsLoading(true)
    // Simular guardado
    setTimeout(() => {
      setIsLoading(false)
      alert("Orden de compra creada correctamente")
      // Aquí se podría redirigir al usuario a otra página
    }, 1000)
  }

  const subtotal = orderProducts.reduce((sum, product) => sum + product.subtotal, 0)
  const tax = subtotal * 0.16 // 16% de impuesto
  const total = subtotal + tax

  // Cuando se selecciona un producto, prellenamos su precio
  const handleProductSelect = (productId: string) => {
    setSelectedProduct(productId)
    const product = availableProducts.find((p) => p.id === productId)
    if (product) {
      setProductPrice(product.price)
    } else {
      setProductPrice("")
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button asChild variant="outline" size="icon">
            <Link to="/dashboard/proveedores">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Volver a Proveedores</span>
            </Link>
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">Nueva Compra a Proveedor</h2>
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList className="w-fit">
          <TabsTrigger value="details">Detalles de Compra</TabsTrigger>
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="extra">Información Adicional</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Información de la Compra</CardTitle>
              <CardDescription>Ingresa los detalles básicos de esta compra</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="purchase-id">Número de Orden</Label>
                  <Input
                    id="purchase-id"
                    defaultValue={`OC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`}
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchase-date">Fecha de Orden</Label>
                  <div className="flex">
                    <Input
                      id="purchase-date"
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier">Proveedor</Label>
                  <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expected-date">Fecha Esperada de Entrega</Label>
                  <div className="flex">
                    <Input
                      id="expected-date"
                      type="date"
                      value={expectedDate}
                      onChange={(e) => setExpectedDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes">Notas de la Compra</Label>
                  <Textarea
                    id="notes"
                    placeholder="Información adicional sobre esta compra"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedSupplier && (
            <Card>
              <CardHeader>
                <CardTitle>Detalles del Proveedor</CardTitle>
                <CardDescription>Información del proveedor seleccionado</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const supplier = suppliers.find((s) => s.id === selectedSupplier)
                  if (!supplier) return null

                  return (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Empresa</p>
                        <p>{supplier.name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Contacto</p>
                        <p>{supplier.contact}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Teléfono</p>
                        <p>{supplier.phone}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">ID Proveedor</p>
                        <p>{supplier.id}</p>
                      </div>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Productos a Comprar</CardTitle>
              <CardDescription>Agrega los productos que deseas comprar a este proveedor</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Agregar Productos</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddProduct}>
                  <Plus className="h-4 w-4 mr-1" /> Agregar Producto
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                <div className="md:col-span-5">
                  <Select value={selectedProduct} onValueChange={handleProductSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar producto" />
                    </SelectTrigger>
                    <SelectContent style={{ maxHeight: 300, overflowY: 'auto' }}>
                      {availableProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} (SKU: {product.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-3">
                  <Input
                    type="number"
                    placeholder="Precio unitario"
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value ? Number.parseFloat(e.target.value) : "")}
                  />
                </div>
                <div className="md:col-span-2">
                  <Input
                    type="number"
                    min="1"
                    value={productQuantity}
                    onChange={(e) => setProductQuantity(Number.parseInt(e.target.value) || 1)}
                    placeholder="Cantidad"
                  />
                </div>
                <div className="md:col-span-2">
                  <Button className="w-full" onClick={handleAddProduct} disabled={!selectedProduct || !productPrice}>
                    Agregar
                  </Button>
                </div>
              </div>

              {orderProducts.length > 0 ? (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Precio Unitario</TableHead>
                        <TableHead className="text-center">Cantidad</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderProducts.map((product, index) => (
                        <TableRow key={`${product.id}-${index}`}>
                          <TableCell>{product.name}</TableCell>
                          <TableCell className="text-right">${product.price.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {product.currency}</TableCell>
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
                          <TableCell className="text-right">${product.subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
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
                <div className="flex flex-col items-center justify-center p-8 border rounded-md text-muted-foreground">
                  <PackagePlus className="h-12 w-12 mb-4" />
                  <p className="text-lg font-medium mb-1">No hay productos en la compra</p>
                  <p className="text-sm text-center">Selecciona productos para agregar a la orden de compra</p>
                </div>
              )}

              {orderProducts.length > 0 && (
                <div className="flex flex-col items-end space-y-1.5 pt-4">
                  <div className="flex w-full justify-between md:w-80">
                    <span>Subtotal:</span>
                    <span>${subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex w-full justify-between md:w-80">
                    <span>IVA (16%):</span>
                    <span>${tax.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex w-full justify-between md:w-80 text-lg font-bold">
                    <span>Total:</span>
                    <span>${total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="extra" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Información Adicional</CardTitle>
              <CardDescription>Detalles adicionales para esta compra</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="payment-method">Método de Pago</Label>
                  <Select defaultValue="credit">
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar método de pago" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit">Crédito (30 días)</SelectItem>
                      <SelectItem value="credit60">Crédito (60 días)</SelectItem>
                      <SelectItem value="transfer">Transferencia inmediata</SelectItem>
                      <SelectItem value="cash">Efectivo</SelectItem>
                      <SelectItem value="check">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-status">Estado del Pago</Label>
                  <Select defaultValue="pending">
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="partial">Parcial</SelectItem>
                      <SelectItem value="paid">Pagado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery-method">Método de Entrega</Label>
                  <Select defaultValue="pickup">
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pickup">Recoger en Proveedor</SelectItem>
                      <SelectItem value="delivery">Entrega del Proveedor</SelectItem>
                      <SelectItem value="courier">Mensajería</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="request-documents">Documentos Requeridos</Label>
                  <Select defaultValue="all">
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar documentos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos (Factura, Remisión, Garantía)</SelectItem>
                      <SelectItem value="invoice">Solo Factura</SelectItem>
                      <SelectItem value="basic">Documentos Básicos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="purchase-attachments">Archivos Adjuntos</Label>
                  <div className="flex items-center gap-2">
                    <Input id="purchase-attachments" type="file" className="flex-1" />
                    <Button variant="outline">
                      <FilePlus className="mr-2 h-4 w-4" />
                      Adjuntar
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-between">
        <Button variant="outline" asChild>
          <Link to="/proveedores">Cancelar</Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline">Guardar como Borrador</Button>
          <Button onClick={handleSave} disabled={isLoading || orderProducts.length === 0 || !selectedSupplier}>
            {isLoading ? "Guardando..." : "Crear Orden de Compra"}
          </Button>
        </div>
      </div>
    </div>
  )
}
