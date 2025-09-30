import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { Trash2, AlertTriangle } from "lucide-react"
import { deleteSupplier } from "@/lib/api/supplierService"
import type { Supplier } from "@/types/product"
import { toast } from "sonner"

interface DeleteSupplierDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier: Supplier | null
  onDelete: () => void
}

export function DeleteSupplierDialog({ open, onOpenChange, supplier, onDelete }: DeleteSupplierDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!supplier) return
    try {
      setIsDeleting(true)
      await deleteSupplier(supplier.id)
      setIsDeleting(false)
      onOpenChange(false)
      onDelete()
      toast.success("Proveedor eliminado correctamente", {
        description: `El proveedor "${supplier.name}" fue eliminado.`,
      })
    } catch (err) {
      setIsDeleting(false)
      toast.error("Error al eliminar proveedor", {
        description: "Ocurrió un error al eliminar el proveedor.",
      })
    }
  }

  if (!supplier) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Confirmar eliminación
          </DialogTitle>
          <DialogDescription>
            ¿Está seguro que desea eliminar el proveedor <span className="font-medium">"{supplier.name}"</span>?
            Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-between">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </DialogClose>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? (
              <>Eliminando...</>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar proveedor
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
