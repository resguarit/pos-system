import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { stockTransferService } from "@/lib/api/stockTransferService"
import { ArrowRight, Package, Calendar, FileText, User as UserIcon } from "lucide-react"

interface ViewStockTransferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transferId: number | null
}

export function ViewStockTransferDialog({
  open,
  onOpenChange,
  transferId,
}: ViewStockTransferDialogProps) {
  const [transfer, setTransfer] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && transferId) {
      loadTransfer()
    }
  }, [open, transferId])

  const loadTransfer = async () => {
    if (!transferId) return
    try {
      setLoading(true)
      const data = await stockTransferService.getById(transferId)
      setTransfer(data)
    } catch (error) {
      console.error("Error loading transfer:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status?: string) => {
    const s = (status ?? "").toLowerCase()
    switch (s) {
      case "pending":
        return <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendiente</Badge>
      case "completed":
        return <Badge className="bg-green-50 text-green-700 border-green-200">Completada</Badge>
      case "cancelled":
        return <Badge className="bg-red-50 text-red-700 border-red-200">Cancelada</Badge>
      default:
        return <Badge variant="outline">Desconocido</Badge>
    }
  }

  const getSourceBranch = () => {
    return transfer?.source_branch || transfer?.sourceBranch
  }

  const getDestinationBranch = () => {
    return transfer?.destination_branch || transfer?.destinationBranch
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Transferencia #{transfer?.id}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-muted-foreground">Cargando...</span>
          </div>
        ) : transfer ? (
          <div className="space-y-6">
            {/* Status and Date */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {new Date(transfer.transfer_date).toLocaleDateString("es-ES", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              {getStatusBadge(transfer.status)}
            </div>

            <Separator />

            {/* Branches */}
            <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Origen</p>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getSourceBranch()?.color || "#6b7280" }}
                  />
                  <span className="font-medium">
                    {getSourceBranch()?.description || getSourceBranch()?.name || "N/A"}
                  </span>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Destino</p>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getDestinationBranch()?.color || "#6b7280" }}
                  />
                  <span className="font-medium">
                    {getDestinationBranch()?.description || getDestinationBranch()?.name || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Requested by */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Solicitada por</p>
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {transfer?.user?.name || transfer?.user?.username || 'N/A'}
                </span>
              </div>
            </div>

            <Separator />

            {/* Notes */}
            {transfer.notes && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Notas</span>
                  </div>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                    {transfer.notes}
                  </p>
                </div>
                <Separator />
              </>
            )}

            {/* Items */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Productos ({transfer.items?.length || 0})
              </h4>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfer.items?.length > 0 ? (
                      transfer.items.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">
                            {item.product?.code || item.product?.barcode || "-"}
                          </TableCell>
                          <TableCell>{item.product?.description || "Producto no disponible"}</TableCell>
                          <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                          No hay productos en esta transferencia
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Timestamps */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Creado: {new Date(transfer.created_at).toLocaleString("es-ES")}</p>
              {transfer.updated_at !== transfer.created_at && (
                <p>Actualizado: {new Date(transfer.updated_at).toLocaleString("es-ES")}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <span className="text-muted-foreground">No se encontró la transferencia</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
