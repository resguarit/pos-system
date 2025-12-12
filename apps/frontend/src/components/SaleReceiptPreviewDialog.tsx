import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { type SaleHeader } from "@/types/sale";
import SaleReceiptContent from "./SaleReceiptContent";
import ThermalTicketContent from "./ThermalTicketContent";
import useApi from "@/hooks/useApi";
import { Loader2, Printer } from "lucide-react";

interface SaleReceiptPreviewDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  sale: SaleHeader | null;
  customerName: string;
  customerCuit?: string;
  formatDate: (dateString: string | null | undefined) => string;
  formatCurrency: (amount: number | null | undefined) => string;
  companyDetails?: {
    name: string;
    razonSocial: string;
    address: string;
    phone: string;
    email: string;
    cuit: string;
    iibb: string;
    startDate: string;
  };
  onPrint?: () => void;
  onDownloadPdf?: (sale: SaleHeader) => Promise<void>;
}

const SaleReceiptPreviewDialog: React.FC<SaleReceiptPreviewDialogProps> = ({
  open,
  onOpenChange,
  sale,
  customerName,
  customerCuit,
  formatDate,
  formatCurrency,
  companyDetails = {
    name: "",
    razonSocial: "",
    address: "",
    phone: "",
    email: "",
    cuit: "",
    iibb: "",
    startDate: "",
  },
  onPrint,
  onDownloadPdf,
}) => {
  const { request } = useApi();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isThermal, setIsThermal] = useState(true);

  if (!sale) {
    return null;
  }

  const handlePrint = async () => {
    if (onPrint) return onPrint();

    if (!sale || !sale.id) {
      alert("No se puede imprimir: ID de venta faltante.");
      return;
    }

    setIsPrinting(true);

    // Safety timeout to reset state if printing hangs
    const safetyTimeout = setTimeout(() => {
      if (isPrinting) {
        setIsPrinting(false);
      }
    }, 10000); // 10 seconds max wait

    try {
      const format = isThermal ? 'thermal' : 'standard';

      // Obtener el PDF como blob
      const response = await request({
        method: 'GET',
        url: `/pos/sales/${sale.id}/pdf?format=${format}`,
        responseType: 'blob'
      });

      if (!response || !(response instanceof Blob)) {
        throw new Error("La respuesta del servidor no es un archivo PDF válido.");
      }

      const blob = new Blob([response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      // Crear iframe oculto para imprimir
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';

      // Definir onload ANTES de asignar src y append
      iframe.onload = () => {
        clearTimeout(safetyTimeout); // Clear safety timeout as load succeeded
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.error('Error al imprimir:', e);
            alert('Error al intentar abrir el diálogo de impresión.');
          } finally {
            // Limpiar después de un tiempo prudente para permitir que se abra el diálogo
            setTimeout(() => {
              try {
                document.body.removeChild(iframe);
                window.URL.revokeObjectURL(url);
              } catch (e) {
                // Ignore cleanup errors
              }
              setIsPrinting(false);
            }, 2000); // Aumentado a 2s para asegurar que el diálogo de impresión se inicie
          }
        }, 500);
      };

      iframe.src = url;
      document.body.appendChild(iframe);

    } catch (error: any) {
      clearTimeout(safetyTimeout);
      console.error("Error al imprimir:", error);
      const errorMessage = error?.response?.data?.message ||
        error?.message ||
        "Error desconocido al imprimir";
      alert(`Error al imprimir: ${errorMessage}`);
      setIsPrinting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!sale) return;

    if (onDownloadPdf) {
      return onDownloadPdf(sale);
    }

    if (!sale.id || isDownloading) {
      if (isDownloading) return;
      console.error("Sale ID is missing, cannot download PDF.");
      alert("No se puede descargar el PDF: ID de venta faltante.");
      return;
    }

    setIsDownloading(true);
    try {
      const format = isThermal ? 'thermal' : 'standard';
      const response = await request({
        method: 'GET',
        url: `/pos/sales/${sale.id}/pdf?format=${format}`,
        responseType: 'blob'
      });

      if (!response || !(response instanceof Blob)) {
        throw new Error("La respuesta del servidor no es un archivo PDF válido.");
      }

      const blob = new Blob([response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const receiptTypeDesc = (typeof sale.receipt_type === 'string' ? sale.receipt_type : sale.receipt_type?.description || 'comprobante').replace(/\s+/g, '_');
      const receiptNumber = sale.receipt_number || sale.id;
      const fileName = `${receiptTypeDesc}_${receiptNumber}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_');
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Error downloading PDF:", error);
      const errorMessage = error?.response?.data?.message ||
        error?.message ||
        "Error desconocido al descargar PDF";
      alert(`Error al descargar PDF: ${errorMessage}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const content = isThermal ? (
    <ThermalTicketContent
      sale={sale}
      customerName={customerName}
      customerCuit={customerCuit}
      formatDate={formatDate}
      formatCurrency={formatCurrency}
      companyDetails={companyDetails}
    />
  ) : (
    <SaleReceiptContent
      sale={sale}
      customerName={customerName}
      customerCuit={customerCuit}
      formatDate={formatDate}
      formatCurrency={formatCurrency}
      companyDetails={companyDetails}
    />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`bg-background border border-border p-0 flex flex-col max-h-[85vh] ${isThermal ? 'max-w-sm' : 'max-w-3xl'}`}>
        <DialogHeader className="bg-background px-6 pt-4 pb-2 shrink-0">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-foreground">Vista Previa</DialogTitle>
            <div className="flex items-center space-x-2">
              <Switch id="thermal-mode" checked={isThermal} onCheckedChange={setIsThermal} />
              <Label htmlFor="thermal-mode">Modo Ticket</Label>
            </div>
          </div>
          <DialogDescription className="text-muted-foreground">
            {(typeof sale?.receipt_type === 'string' ? sale.receipt_type : sale?.receipt_type?.description) || "Comprobante"} {sale?.receipt_number} - {formatDate(sale?.date)}
          </DialogDescription>
        </DialogHeader>

        <div id="receipt-preview-content" className="bg-white text-black overflow-y-auto px-6 py-4 grow">
          {content}
        </div>

        <DialogFooter className="bg-background px-6 py-3 shrink-0">
          <Button variant="default" onClick={handlePrint} disabled={isPrinting}>
            {isPrinting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Imprimiendo...
              </>
            ) : (
              <>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </>
            )}
          </Button>
          {!isThermal && (
            <Button variant="outline" onClick={handleDownloadPdf} disabled={isDownloading}>
              {isDownloading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Descargando...
                </>
              ) : (
                "Descargar PDF"
              )}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaleReceiptPreviewDialog;
