import { useState, useEffect } from "react"
import { Package, User, MapPin, Phone, Mail, Truck, Calendar, DollarSign, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import api from "@/lib/api"
import { toast } from "sonner"

interface ShipmentFormData {
  client_name: string
  client_phone: string
  client_email?: string
  delivery_address: string
  city?: string
  postal_code?: string
  type: "normal" | "urgente"
  status: "preparando" | "en_ruta" | "entregado" | "cancelado"
  observations?: string
  driver_id?: number
  zone_id?: number
  shipping_cost?: number
  estimated_delivery?: string
}

interface ShippingFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: ShipmentFormData) => void
  shipment?: any
}

export default function ShippingFormModal({ isOpen, onClose, onSave, shipment }: ShippingFormModalProps) {
  const [formData, setFormData] = useState<ShipmentFormData>({
    client_name: "",
    client_phone: "",
    client_email: "",
    delivery_address: "",
    city: "",
    postal_code: "",
    type: "normal",
    status: "preparando",
    observations: "",
    driver_id: 0,
    zone_id: 0,
    shipping_cost: 0,
    estimated_delivery: ""
  })

  const [drivers, setDrivers] = useState<any[]>([])
  const [zones, setZones] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (shipment) {
      setFormData({
        client_name: shipment.client_name || "",
        client_phone: shipment.client_phone || "",
        client_email: shipment.client_email || "",
        delivery_address: shipment.delivery_address || "",
        city: shipment.city || "",
        postal_code: shipment.postal_code || "",
        type: shipment.type || "normal",
        status: shipment.status || "preparando",
        observations: shipment.observations || "",
        driver_id: shipment.driver_id,
        zone_id: shipment.zone_id,
        shipping_cost: shipment.shipping_cost || 0,
        estimated_delivery: shipment.estimated_delivery || ""
      })
    }
    loadDriversAndZones()
  }, [shipment])

  const loadDriversAndZones = async () => {
    try {
      // Load drivers (users with driver role)
      const driversResponse = await api.get('/users', { 
        params: { role: 'driver' } 
      })
      setDrivers(driversResponse.data.data || [])

      // Load delivery zones
      const zonesResponse = await api.get('/delivery-zones')
      setZones(zonesResponse.data.data || [])
    } catch (error) {
      console.error("Error loading data:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.client_name || !formData.client_phone || !formData.delivery_address) {
      toast.error("Por favor completa los campos requeridos")
      return
    }

    setLoading(true)
    try {
      // Preparar datos para enviar (convertir 0 a null para driver_id y zone_id)
      const dataToSend = {
        ...formData,
        driver_id: formData.driver_id === 0 ? null : formData.driver_id,
        zone_id: formData.zone_id === 0 ? null : formData.zone_id,
      }
      
      await onSave(dataToSend)
      onClose()
    } catch (error) {
      console.error("Error saving shipment:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof ShipmentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const statusColors = {
    preparando: "bg-yellow-100 text-yellow-800",
    en_ruta: "bg-blue-100 text-blue-800",
    entregado: "bg-green-100 text-green-800",
    cancelado: "bg-red-100 text-red-800"
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            {shipment ? "Editar Envío" : "Nuevo Envío"}
          </DialogTitle>
          <DialogDescription>
            {shipment 
              ? "Modifica los datos del envío existente"
              : "Completa la información para crear un nuevo envío"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Client Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <User className="w-4 h-4" />
              Información del Cliente
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client_name">
                  Nombre del Cliente <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="client_name"
                  value={formData.client_name}
                  onChange={(e) => handleInputChange("client_name", e.target.value)}
                  placeholder="Nombre completo"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_phone">
                  Teléfono <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="client_phone"
                    value={formData.client_phone}
                    onChange={(e) => handleInputChange("client_phone", e.target.value)}
                    placeholder="+54 11 1234-5678"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="client_email">Correo Electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="client_email"
                    type="email"
                    value={formData.client_email}
                    onChange={(e) => handleInputChange("client_email", e.target.value)}
                    placeholder="cliente@email.com"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Información de Entrega
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="delivery_address">
                  Dirección de Entrega <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="delivery_address"
                  value={formData.delivery_address}
                  onChange={(e) => handleInputChange("delivery_address", e.target.value)}
                  placeholder="Calle, número, piso, depto"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    placeholder="Buenos Aires"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postal_code">Código Postal</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => handleInputChange("postal_code", e.target.value)}
                    placeholder="1234"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zone_id">Zona de Entrega</Label>
                  <Select 
                    value={formData.zone_id?.toString() || "0"} 
                    onValueChange={(value) => handleInputChange("zone_id", value === "0" ? undefined : parseInt(value))}
                  >
                    <SelectTrigger id="zone_id">
                      <SelectValue placeholder="Seleccionar zona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Sin zona</SelectItem>
                      {zones.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id.toString()}>
                          {zone.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Shipment Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Detalles del Envío
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Envío</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value: "normal" | "urgente") => handleInputChange("type", value)}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgente">
                      <span className="text-red-600 font-semibold">Urgente</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: any) => handleInputChange("status", value)}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preparando">
                      <span className={statusColors.preparando}>Preparando</span>
                    </SelectItem>
                    <SelectItem value="en_ruta">
                      <span className={statusColors.en_ruta}>En Ruta</span>
                    </SelectItem>
                    <SelectItem value="entregado">
                      <span className={statusColors.entregado}>Entregado</span>
                    </SelectItem>
                    <SelectItem value="cancelado">
                      <span className={statusColors.cancelado}>Cancelado</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="driver_id">Conductor Asignado</Label>
                <Select 
                  value={formData.driver_id?.toString() || "0"} 
                  onValueChange={(value) => handleInputChange("driver_id", value === "0" ? undefined : parseInt(value))}
                >
                  <SelectTrigger id="driver_id">
                    <SelectValue placeholder="Seleccionar conductor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sin asignar</SelectItem>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id.toString()}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shipping_cost">Costo de Envío</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="shipping_cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.shipping_cost}
                    onChange={(e) => handleInputChange("shipping_cost", parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="estimated_delivery">Fecha Estimada de Entrega</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="estimated_delivery"
                    type="datetime-local"
                    value={formData.estimated_delivery}
                    onChange={(e) => handleInputChange("estimated_delivery", e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Observations */}
          <div className="space-y-2">
            <Label htmlFor="observations" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Observaciones
            </Label>
            <Textarea
              id="observations"
              value={formData.observations}
              onChange={(e) => handleInputChange("observations", e.target.value)}
              placeholder="Notas adicionales sobre el envío..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
              {loading ? "Guardando..." : shipment ? "Actualizar Envío" : "Crear Envío"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
