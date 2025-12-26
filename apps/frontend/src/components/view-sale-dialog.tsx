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
import { Download, Printer, ShieldCheck, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { type Dispatch, type SetStateAction, useState, useEffect } from "react";
import { type SaleHeader } from "@/types/sale";
import { useAfipAuthorization } from "@/hooks/useAfipAuthorization";
import { Badge } from "@/components/ui/badge";
import { ConversionStatusBadge } from "@/components/sales/conversion-status-badge";


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
  onPrintPdf?: (sale: SaleHeader) => Promise<void>;
  onSaleUpdated?: (sale: SaleHeader) => void;
}

const ViewSaleDialog = ({
  open,
  onOpenChange,
  sale,
  getCustomerName,
  formatDate,
  getReceiptType,
  onDownloadPdf,
  onPrintPdf,
  onSaleUpdated,
}: ViewSaleDialogProps) => {
  const { authorizeSale, isAuthorizing } = useAfipAuthorization();
  const [currentSale, setCurrentSale] = useState<SaleHeader | null>(sale);

  // Actualizar venta cuando cambia la prop
  useEffect(() => {
    if (sale) {
      setCurrentSale(sale);
    }
  }, [sale]);

  const handleAuthorizeAfip = async () => {
    if (!currentSale) return;

    const result = await authorizeSale(currentSale);
    if (result && onSaleUpdated) {
      // Actualizar la venta con los nuevos datos
      const updatedSale: SaleHeader = {
        ...currentSale,
        cae: result.cae,
        cae_expiration_date: result.cae_expiration_date,
        receipt_number: result.invoice_number?.toString().padStart(8, '0') || currentSale.receipt_number,
      };
      setCurrentSale(updatedSale);
      onSaleUpdated(updatedSale);
    }
  };

  // Determinar si se puede autorizar
  const canAuthorize = (sale: SaleHeader | null): boolean => {
    if (!sale) return false;
    const receiptType = sale.receipt_type;
    if (receiptType?.afip_code === '016' || receiptType?.name?.toLowerCase().includes('presupuesto')) {
      return false;
    }
    if (!sale.customer) return false;
    if (sale.cae) return false;
    if (!sale.items || sale.items.length === 0) return false;
    if (!sale.total || sale.total <= 0) return false;
    return true;
  };

  const saleToDisplay = currentSale || sale;
  const formatCurrencyARS = (amount: number | null | undefined) => {
    if (amount == null) return '$0.00 ARS';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const formatUnitPrice = (item: any) => {
    if (!item || !item.product) return '$0.00';

    // sale_price es el precio de venta con IVA del producto
    const salePrice = Number(item.product.sale_price || 0);

    // Todos los precios de venta son en ARS
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(salePrice);
  };

  if (!saleToDisplay) {
    return null;
  }

  // --- INICIO DE LA MODIFICACIÓN ---

  // 1. Determinar si el comprobante es un presupuesto basándonos en los datos.
  const isBudget = (saleToDisplay.receipt_type as any)?.afip_code === '016' || (saleToDisplay.receipt_type as any)?.name === 'Presupuesto' || (typeof saleToDisplay.receipt_type === 'string' ? saleToDisplay.receipt_type : saleToDisplay.receipt_type?.description || '').toLowerCase().includes('presupuesto');

  // 2. Definir textos dinámicos basados en si es un presupuesto o una venta.
  const dialogTitle = isBudget ? "Detalle del Presupuesto" : "Detalle de Venta";
  const dialogDescription = isBudget ? "Información detallada del presupuesto." : "Información detallada de la venta.";

  // Usar el nombre directo del tipo de comprobante para mayor precisión.
  const receiptName = (typeof saleToDisplay.receipt_type === 'string' ? saleToDisplay.receipt_type : saleToDisplay.receipt_type?.description) || getReceiptType(saleToDisplay).displayName;

  // --- FIN DE LA MODIFICACIÓN ---

  // Helpers locales
  const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  const itemsArray = (saleToDisplay.items as any[]) || [];
  const itemsDiscountSum = round2(itemsArray.reduce((s, it: any) => s + Number(it.discount_amount || 0), 0));
  const totalDiscount = round2(Number((saleToDisplay as any).discount_amount || 0));
  const globalDiscount = Math.max(0, round2(totalDiscount - itemsDiscountSum));

  // Asegurarse de que los métodos de pago se obtienen correctamente
  const payments = Array.isArray((saleToDisplay as any).payments)
    ? (saleToDisplay as any).payments
    : Array.isArray((saleToDisplay as any).sale_payments)
      ? (saleToDisplay as any).sale_payments
      : Array.isArray((saleToDisplay as any).salePayments)
        ? (saleToDisplay as any).salePayments
        : [];

  // Estado AFIP
  const isAuthorized = !!saleToDisplay.cae;
  const canAuthorizeThis = canAuthorize(saleToDisplay);

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
          <div className="flex items-center justify-between">
            <div>
              {/* Título dinámico */}
              <DialogTitle className="text-lg flex items-center gap-2">
                <span>{dialogTitle}: {saleToDisplay.receipt_number || saleToDisplay.id}</span>
                <ConversionStatusBadge
                  convertedToSaleId={saleToDisplay.converted_to_sale_id}
                  convertedToSaleReceipt={saleToDisplay.converted_to_sale_receipt}
                  className="ml-2"
                />
                <ConversionStatusBadge
                  convertedFromBudgetId={saleToDisplay.converted_from_budget_id}
                  convertedFromBudgetReceipt={saleToDisplay.converted_from_budget_receipt}
                  className="ml-2"
                />
              </DialogTitle>
              {/* Descripción dinámica */}
              <DialogDescription>
                {dialogDescription}
              </DialogDescription>
            </div>
            {/* Badge de estado AFIP */}
            {isBudget ? (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`${saleToDisplay.status === 'approved' ? 'border-green-500 text-green-700 bg-green-50' :
                  saleToDisplay.status === 'pending' ? 'border-yellow-500 text-yellow-700 bg-yellow-50' :
                    saleToDisplay.status === 'annulled' ? 'border-red-500 text-red-700 bg-red-50' :
                      'border-gray-500 text-gray-700 bg-gray-50'
                  }`}>
                  {saleToDisplay.status === 'approved' ? 'Aprobado' :
                    saleToDisplay.status === 'pending' ? 'Pendiente' :
                      saleToDisplay.status === 'annulled' ? 'Anulado' :
                        'Borrador'}
                </Badge>
              </div>
            ) : (
              !isBudget && (
                <div className="flex items-center gap-2">
                  {isAuthorized ? (
                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Autorizada AFIP
                    </Badge>
                  ) : canAuthorizeThis ? (
                    <Badge variant="outline" className="border-amber-500 text-amber-700">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      Pendiente AFIP
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-gray-400 text-gray-600">
                      No autorizable
                    </Badge>
                  )}
                </div>
              )
            )}
          </div>
        </DialogHeader>
        <div className="overflow-y-auto px-6 py-4 grow">
          <Separator className="my-2" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div>
              <strong>Cliente:</strong> {getCustomerName(saleToDisplay)}
            </div>
            <div>
              <strong>Fecha:</strong> {formatDate(saleToDisplay.date)}
            </div>
            <div>
              {/* Nombre del comprobante corregido */}
              <strong>Comprobante:</strong> {receiptName}
            </div>
            <div>
              <strong>Número:</strong> {saleToDisplay.receipt_number}
            </div>
            <div>
              <strong>Vendedor:</strong> {saleToDisplay.seller_name || saleToDisplay.seller || 'N/A'}
            </div>
            {saleToDisplay.cae && (
              <div>
                <strong>CAE:</strong> {saleToDisplay.cae}
              </div>
            )}
            {saleToDisplay.cae_expiration_date && (
              <div>
                <strong>Vto. CAE:</strong> {formatDate(saleToDisplay.cae_expiration_date)}
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
              {saleToDisplay.items?.map((item) => {
                const salePrice = Number((item as any).product?.sale_price || 0);
                const quantity = Number((item as any).quantity || 0);
                const discountAmount = Number((item as any).discount_amount || 0);

                // Calcular el total del item: (precio de venta * cantidad) - descuento
                const itemTotal = (salePrice * quantity) - discountAmount;

                return (
                  <TableRow key={item.id}>
                    <TableCell>{(item as any).description || (item as any).product?.description || 'Sin descripción'}</TableCell>
                    <TableCell className="text-right">{quantity}</TableCell>
                    <TableCell className="text-right">{formatUnitPrice(item)}</TableCell>
                    <TableCell className="text-right">{formatCurrencyARS(discountAmount)}</TableCell>
                    <TableCell className="text-right">{formatCurrencyARS(itemTotal)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Resumen de totales */}
          <div className="mt-4 border-t pt-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal (sin IVA):</span>
                  <span>{formatCurrencyARS(Number(saleToDisplay.subtotal || 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA:</span>
                  <span>{formatCurrencyARS(Number(saleToDisplay.total_iva_amount || 0))}</span>
                </div>
                {(saleToDisplay as any).discount_amount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Descuentos:</span>
                    <span>-{formatCurrencyARS(Number((saleToDisplay as any).discount_amount || 0))}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>{formatCurrencyARS(Number(saleToDisplay.total || 0))}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="px-6 py-3 shrink-0">
          <div className="flex items-center gap-2">
            {/* Botón de autorización AFIP */}
            {!isBudget && canAuthorizeThis && !isAuthorized && (
              <Button
                onClick={handleAuthorizeAfip}
                size="sm"
                variant="default"
                disabled={isAuthorizing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isAuthorizing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Autorizando...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Autorizar con AFIP
                  </>
                )}
              </Button>
            )}
            {onPrintPdf && (
              <Button onClick={() => onPrintPdf(saleToDisplay)} size="sm" variant="default">
                <Printer className="mr-2 h-4 w-4" /> Imprimir
              </Button>
            )}
            <Button onClick={() => onDownloadPdf(saleToDisplay)} size="sm" variant="secondary">
              <Download className="mr-2 h-4 w-4" /> Descargar PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cerrar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ViewSaleDialog;