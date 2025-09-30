

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface ManageZonesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }
  
  export default function ManageZonesDialog({ open, onOpenChange }: ManageZonesDialogProps) {
    const [zoneName, setZoneName] = useState("");
    const [zoneCode, setZoneCode] = useState("");
    const [zoneDeliveryTime, setZoneDeliveryTime] = useState("");
    const [zoneCost, setZoneCost] = useState("");
    const [zoneDescription, setZoneDescription] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [zoneCity, setZoneCity] = useState("");
    const [zonePostalCodes, setZonePostalCodes] = useState("");
    
    const handleSaveZone = () => {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        onOpenChange(false);
        // Limpiar el formulario
        setZoneName("");
        setZoneCode("");
        setZoneDeliveryTime("");
        setZoneCost("");
        setZoneDescription("");
        setZoneCity("");
        setZonePostalCodes("");
      }, 1500);
    };
  

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">Gestionar Zonas</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Gestionar Zonas de Entrega</DialogTitle>
          <DialogDescription>Añade o modifica zonas de entrega para el servicio de delivery.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="zone-name">Nombre de la Zona</Label>
              <Input 
                id="zone-name" 
                placeholder="Ej: Zona Norte" 
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone-code">Código</Label>
              <Input 
                id="zone-code" 
                placeholder="Ej: ZN-001" 
                value={zoneCode}
                onChange={(e) => setZoneCode(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone-city">Ciudad</Label>
              <Input 
                id="zone-city" 
                placeholder="Ej: Ciudad de México" 
                value={zoneCity}
                onChange={(e) => setZoneCity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone-postal-codes">Códigos Postales</Label>
              <Input 
                id="zone-postal-codes" 
                placeholder="Ej: 01000, 01020, 01030" 
                value={zonePostalCodes}
                onChange={(e) => setZonePostalCodes(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone-delivery-time">Tiempo Estimado de Entrega</Label>
              <Select value={zoneDeliveryTime} onValueChange={setZoneDeliveryTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tiempo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30min">30 minutos</SelectItem>
                  <SelectItem value="1h">1 hora</SelectItem>
                  <SelectItem value="2h">2 horas</SelectItem>
                  <SelectItem value="3h">3 horas</SelectItem>
                  <SelectItem value="same-day">Mismo día</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone-cost">Costo de Envío</Label>
              <Input 
                id="zone-cost" 
                type="number" 
                placeholder="Ej: 50.00" 
                value={zoneCost}
                onChange={(e) => setZoneCost(e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="zone-description">Descripción</Label>
              <Textarea 
                id="zone-description" 
                placeholder="Descripción detallada de la zona" 
                value={zoneDescription}
                onChange={(e) => setZoneDescription(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSaveZone} disabled={isLoading}>
            {isLoading ? "Guardando..." : "Guardar Zona"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
