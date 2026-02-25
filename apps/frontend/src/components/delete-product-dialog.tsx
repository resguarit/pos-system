import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Trash2, AlertTriangle } from "lucide-react";
import type { Product } from "@/types/product";
import useApi from "@/hooks/useApi";
import { sileo } from "sileo"
interface DeleteProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onProductDeleted: () => void;
}

export function DeleteProductDialog({ open, onOpenChange, product, onProductDeleted }: DeleteProductDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { request } = useApi();

  const handleDelete = async () => {
    if (!product) return;

    try {
      setIsDeleting(true);
      await request({
        method: "DELETE",
        url: `/products/${product.id}`,
      });

      setIsDeleting(false);
      onOpenChange(false);
      onProductDeleted(); // Call the success handler

      sileo.success({ title: "Producto eliminado correctamente",
        description: `El producto "${product.description}" fue eliminado del inventario.`,
      });
    } catch (err) {
      console.error("Error al eliminar producto:", err);
      setIsDeleting(false);

      sileo.error({ title: "Error al eliminar producto",
        description: "Ocurrió un error al eliminar el producto.",
      });
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Confirmar eliminación
          </DialogTitle>
          <DialogDescription>
            ¿Está seguro que desea eliminar el producto <span className="font-medium">"{product.description}"</span>?
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
                Eliminar producto
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
