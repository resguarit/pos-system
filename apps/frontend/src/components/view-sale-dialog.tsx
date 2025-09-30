import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Download } from "lucide-react";
import { type Dispatch, type SetStateAction } from "react";
import { type SaleHeader } from "@/types/sale";

interface ViewSaleDialogProps {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  sale: SaleHeader | null;
  getCustomerName: (sale: SaleHeader) => string;
  formatDate: (dateString: string | null | undefined) => string;
  getReceiptType: (
    sale: SaleHeader
  ) => { displayName: string; afipCode: string };
  onDownloadPdf: (sale: SaleHeader) => Promise<void>;
}

const ViewSaleDialog = ({
  open,
  onOpenChange,
  sale,
  getCustomerName,
  formatDate,
  getReceiptType,
  onDownloadPdf,
}: ViewSaleDialogProps) => {
  const formatCurrencyARS = (amount: number | null | undefined) => {
    if (amount == null) return '$0.00 ARS';
    return new Intl.NumberFormat('es-AR', { 
      style: 'currency', 
      currency: 'ARS' 
    }).format(amount);
  };

  const formatUnitPrice = (item: any) => {
    if (!item || !item.product) return '$0.00';
    
    const unitPrice = Number(item.unit_price || 0);
    
    // Todos los precios de venta son en ARS
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(unitPrice);
  };

  if (!sale) {
    return null;
  }

  // --- INICIO DE LA MODIFICACIÓN ---

  // 1. Determinar si el comprobante es un presupuesto basándonos en los datos.
  const isBudget = (typeof sale.receipt_type === 'string' ? sale.receipt_type : sale.receipt_type?.description || '').toLowerCase().includes('presupuesto');

  // 2. Definir textos dinámicos basados en si es un presupuesto o una venta.
  const dialogTitle = isBudget ? "Detalle del Presupuesto" : "Detalle de Venta";
  const dialogDescription = isBudget ? "Información detallada del presupuesto." : "Información detallada de la venta.";
  
  // Usar el nombre directo del tipo de comprobante para mayor precisión.
  const receiptName = (typeof sale.receipt_type === 'string' ? sale.receipt_type : sale.receipt_type?.description) || getReceiptType(sale).displayName;

  // --- FIN DE LA MODIFICACIÓN ---

  // Helpers locales
  const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  const itemsArray = (sale.items as any[]) || [];
  const itemsDiscountSum = round2(itemsArray.reduce((s, it: any) => s + Number(it.discount_amount || 0), 0));
  const totalDiscount = round2(Number((sale as any).discount_amount || 0));
  const globalDiscount = Math.max(0, round2(totalDiscount - itemsDiscountSum));

  // Asegurarse de que los métodos de pago se obtienen correctamente
  const payments = Array.isArray((sale as any).payments)
    ? (sale as any).payments
    : Array.isArray((sale as any).sale_payments)
      ? (sale as any).sale_payments
      : Array.isArray((sale as any).salePayments)
        ? (sale as any).salePayments
        : [];

  const getPaymentMethodName = (p: any) =>
    p?.payment_method?.name ||
    p?.payment_method?.description ||
    p?.paymentMethod?.name ||
    p?.paymentMethod?.description ||
    p?.method?.name ||
    p?.method?.description ||
    p?.method_name ||
    p?.name ||
    "Método";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full p-0 flex flex-col max-h-[85vh]">
        <DialogHeader className="px-6 pt-4 pb-2 shrink-0">
          {/* Título dinámico */}
          <DialogTitle className="text-lg">
            {dialogTitle}: {sale.receipt_number || sale.id}
          </DialogTitle>
          {/* Descripción dinámica */}
          <DialogDescription>
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto px-6 py-4 grow">
          <Separator className="my-2" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div>
              <strong>Cliente:</strong> {getCustomerName(sale)}
            </div>
            <div>
              <strong>Fecha:</strong> {formatDate(sale.date)}
            </div>
            <div>
              {/* Nombre del comprobante corregido */}
              <strong>Comprobante:</strong> {receiptName}
            </div>
            <div>
              <strong>Número:</strong> {sale.receipt_number}
            </div>
            <div>
              <strong>Vendedor:</strong> {sale.seller_name || sale.seller || 'N/A'}
            </div>
            <div>
              <strong>Total:</strong> {formatCurrencyARS(sale.total)}
            </div>
            <div>
              <strong>Subtotal (sin IVA):</strong> {formatCurrencyARS((sale as any).subtotal)}
            </div>
            <div>
              <strong>IVA:</strong> {formatCurrencyARS((sale as any).total_iva_amount)}
            </div>
            <div>
              <strong>Desc. por ítems:</strong> - {formatCurrencyARS(itemsDiscountSum)}
            </div>
            <div>
              <strong>Desc. global:</strong> - {formatCurrencyARS(globalDiscount)}
            </div>
            {sale.cae && (
              <div>
                <strong>CAE:</strong> {sale.cae}
              </div>
            )}
            {sale.cae_expiration_date && (
              <div>
                <strong>Vto. CAE:</strong> {formatDate(sale.cae_expiration_date)}
              </div>
            )}
          </div>
          {payments.length > 0 && (
            <>
              <Separator className="my-2" />
              <h4 className="font-semibold mb-2 text-sm">Pagos:</h4>
              <Table className="text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Método</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p: any, idx: number) => (
                    <TableRow key={p.id || idx}>
                      <TableCell>{getPaymentMethodName(p)}</TableCell>
                      <TableCell className="text-right">{formatCurrencyARS(Number(p.amount || 0))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
          <Separator className="my-2" />
          <h4 className="font-semibold mb-2 text-sm">Items:</h4>
          <Table className="text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Precio de venta unitario</TableHead>
                <TableHead className="text-right">Desc.</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.items?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{(item as any).description || (item as any).product?.description || 'Sin descripción'}</TableCell>
                  <TableCell className="text-right">{(item as any).quantity}</TableCell>
                  <TableCell className="text-right">{formatUnitPrice(item)}</TableCell>
                  <TableCell className="text-right">{formatCurrencyARS(Number((item as any).discount_amount || 0))}</TableCell>
                  <TableCell className="text-right">{formatCurrencyARS(Number((item as any).item_total))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <DialogFooter className="px-6 py-3 shrink-0">
          <Button onClick={() => onDownloadPdf(sale)} size="sm">
            <Download className="mr-2 h-4 w-4" /> Descargar PDF del Comprobante
          </Button>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ViewSaleDialog;