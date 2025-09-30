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
import { type SaleHeader } from "@/types/sale";
import SaleReceiptContent from "./SaleReceiptContent";
import useApi from "@/hooks/useApi";
import { Loader2 } from "lucide-react";

interface SaleReceiptPreviewDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  sale: SaleHeader | null;
  customerName: string;
  customerCuit?: string; // CUIT explícito desde el llamador
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
  
  if (!sale) {
    return null;
  }

  const handlePrint = () => {
    if (onPrint) return onPrint();
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (onDownloadPdf) {
      return onDownloadPdf(sale);
    }
    
    if (!sale || !sale.id || isDownloading) {
      if (isDownloading) return; // Prevenir múltiples descargas
      console.error("Sale ID is missing, cannot download PDF.");
      alert("No se puede descargar el PDF: ID de venta faltante.");
      return;
    }
    
    setIsDownloading(true);
    try {
      const response = await request({ 
        method: 'GET', 
        url: `/pos/sales/${sale.id}/pdf`,
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl bg-background border border-border print-container p-0 flex flex-col max-h-[85vh]">
          <DialogHeader className="print:hidden bg-background px-6 pt-4 pb-2 shrink-0">
            <DialogTitle className="text-foreground">Vista Previa del Comprobante</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {(typeof sale?.receipt_type === 'string' ? sale.receipt_type : sale?.receipt_type?.description) || "Comprobante"} {sale?.receipt_number} - {formatDate(sale?.date)}
            </DialogDescription>
          </DialogHeader>
          <div className="print-content bg-background overflow-y-auto px-6 py-4 grow">
            <SaleReceiptContent
              sale={sale}
              customerName={customerName}
              customerCuit={customerCuit}
              formatDate={formatDate}
              formatCurrency={formatCurrency}
              companyDetails={companyDetails}
            />
          </div>
          <DialogFooter className="print:hidden bg-background px-6 py-3 shrink-0">
            <Button variant="outline" onClick={handlePrint}>
              Imprimir
            </Button>
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
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SaleReceiptPreviewDialog;
