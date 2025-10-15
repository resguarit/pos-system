import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { type Product } from "@/types/product"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useBranch } from "@/context/BranchContext"
import { useAuth } from "@/hooks/useAuth"

interface ViewProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product
}

export function ViewProductDialog({ open, onOpenChange, product }: ViewProductDialogProps) {
  const { branches } = useBranch();
  const { hasPermission } = useAuth();

  // Función para formatear el markup
  const formatMarkup = (markup: number | string): string => {
    // El markup viene del backend como decimal (ej: 0.20), convertir a porcentaje (20)
    const num = parseFloat(markup.toString()) * 100;
    if (isNaN(num)) return '0';
    
    // Si es un número entero, no mostrar decimales
    if (num % 1 === 0) {
      return num.toString();
    }
    
    // Si tiene decimales, mostrar hasta 2 decimales (eliminar ceros al final)
    return parseFloat(num.toFixed(2)).toString();
  };

  const resolveBranchName = (branchId: number, embedded?: { description?: string; name?: string }) => {
    if (embedded?.description || embedded?.name) return embedded.description || embedded.name || `Sucursal ${branchId}`;
    const b = branches.find((bb) => String(bb.id) === String(branchId));
    return b?.description || (b as any)?.name || `Sucursal ${branchId}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span>Detalles del Producto</span>
            <DialogClose className="rounded-full h-6 w-6 p-0 flex items-center justify-center">
            </DialogClose>
          </DialogTitle>
        </DialogHeader>
        {product && (
          <div className="grid gap-2 py-2 max-h-[80vh] overflow-y-auto">
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="font-medium text-right">Código:</span>
              <span className="col-span-3">{product.code}</span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="font-medium text-right">Descripción:</span>
              <span className="col-span-3">{product.description}</span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="font-medium text-right">Categoría:</span>
              <span className="col-span-3">{product.category?.name || product.category_id}</span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="font-medium text-right">Unidad de Medida:</span>
              <span className="col-span-3">{product.measure?.name || product.measure_id}</span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="font-medium text-right">Proveedor:</span>
              <span className="col-span-3">{product.supplier?.name || product.supplier_id}</span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="font-medium text-right">IVA:</span>
              <span className="col-span-3">{product.iva?.rate ? `${product.iva.rate}%` : '0%'}</span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="font-medium text-right">Precio Unitario:</span>
              <span className="col-span-3">${Number.parseFloat(product.unit_price).toFixed(2)} {product.currency}</span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="font-medium text-right">Markup (%):</span>
              <span className="col-span-3">{formatMarkup(product.markup)}%</span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="font-medium text-right">Precio Venta:</span>
              <span className="col-span-3">${Number.parseFloat(product.sale_price.toString()).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ARS</span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="font-medium text-right">Estado:</span>
              <span className="col-span-3">
                <Badge 
                  variant="outline" 
                  className={
                    product.status 
                      ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" 
                      : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                  }
                >
                  {product.status ? "Activo" : "Inactivo"}
                </Badge>
              </span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="font-medium text-right">Visible en Web:</span>
              <span className="col-span-3">{product.web ? "Sí" : "No"}</span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="font-medium text-right">Observaciones:</span>
              <span className="col-span-3">{product.observaciones || '-'}</span>
            </div>
            {hasPermission('ver_stock') && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Stock por Sucursal</h3>
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sucursal</TableHead>
                        <TableHead>Stock Actual</TableHead>
                        <TableHead>Stock Mínimo</TableHead>
                        <TableHead>Stock Máximo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {product.stocks && product.stocks.length > 0 ? (
                        product.stocks.map((stock) => (
                          <TableRow key={stock.id}>
                            <TableCell>{resolveBranchName(stock.branch_id, stock.branch)}</TableCell>
                            <TableCell>{stock.current_stock}</TableCell>
                            <TableCell>{stock.min_stock}</TableCell>
                            <TableCell>{stock.max_stock}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center">
                            No hay información de stock disponible
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
