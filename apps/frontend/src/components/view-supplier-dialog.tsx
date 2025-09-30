import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, User, Mail, Phone, MapPin, Hash, CalendarDays } from "lucide-react"
import type { Supplier } from "@/types"

interface ViewSupplierDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier: Supplier | null
}

export function ViewSupplierDialog({ open, onOpenChange, supplier }: ViewSupplierDialogProps) {
  const getStatusBadgeColor = (status?: string) => {
    const s = (status ?? '').toLowerCase()
    switch (s) {
      case 'active':
        return 'bg-green-50 text-green-700 hover:bg-green-50 hover:text-green-700'
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 hover:bg-yellow-50 hover:text-yellow-700'
      case 'inactive':
      case 'disabled':
        return 'bg-red-50 text-red-700 hover:bg-red-50 hover:text-red-700'
      default:
        return 'bg-gray-50 text-gray-700 hover:bg-gray-50 hover:text-gray-700'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Proveedor
          </DialogTitle>
          <DialogDescription>Información del proveedor seleccionado.</DialogDescription>
        </DialogHeader>

        {supplier ? (
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {supplier.name}
                </CardTitle>
                <Badge variant="outline" className={getStatusBadgeColor(supplier.status)}>
                  {supplier.status === 'active' ? 'Activo' : supplier.status === 'pending' ? 'En Revisión' : 'Inactivo'}
                </Badge>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />{supplier.contact_name || '-'} </div>
                <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{supplier.email}</div>
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{supplier.phone}</div>
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{supplier.address || '-'}</div>
                {supplier.cuit && (
                  <div className="flex items-center gap-2"><Hash className="h-4 w-4 text-muted-foreground" />CUIT: {supplier.cuit}</div>
                )}
                <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-muted-foreground" />Alta: {new Date(supplier.created_at).toLocaleDateString('es-ES')}</div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No hay información del proveedor.</div>
        )}
      </DialogContent>
    </Dialog>
  )
}