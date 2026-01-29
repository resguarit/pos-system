import { useState, useEffect } from "react";
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
import { isInternalOnlyReceiptType } from "@/utils/afipReceiptTypes";
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
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUseSdk, setPreviewUseSdk] = useState(false);

  const afipCode =
    sale?.receipt_type && typeof sale.receipt_type === "object" && "afip_code" in sale.receipt_type
      ? (sale.receipt_type as { afip_code?: string }).afip_code
      : (sale as SaleHeader & { receipt_type_code?: string })?.receipt_type_code;
  const isInternalOnly = isInternalOnlyReceiptType(afipCode);
  const useSdkPreview = !isInternalOnly && !!sale?.id;

  useEffect(() => {
    if (!open || !sale?.id || !useSdkPreview) {
      setPreviewHtml(null);
      setPreviewUseSdk(false);
      return;
    }
    setPreviewUseSdk(true);
    setPreviewLoading(true);
    const format = isThermal ? "thermal" : "standard";
    request({
      method: "GET",
      url: `/pos/sales/${sale.id}/receipt-preview-html?format=${format}`,
    })
      .then((data: { html?: string }) => {
        setPreviewHtml(data?.html ?? null);
      })
      .catch(() => {
        setPreviewHtml(null);
      })
      .finally(() => {
        setPreviewLoading(false);
      });
  }, [open, sale?.id, isThermal, useSdkPreview]);

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
    try {
      // Usar el backend para generar el PDF
      const format = isThermal ? 'thermal' : 'standard';
      const response = await request({
        method: 'GET',
        url: `/pos/sales/${sale.id}/pdf?format=${format}`,
        responseType: 'blob'
      });

      if (!response || !(response instanceof Blob)) {
        throw new Error("La respuesta del servidor no es un archivo PDF válido.");
      }

      // Crear objeto blob y URL
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
      iframe.src = url;

      document.body.appendChild(iframe);

      // Esperar a que cargue y luego imprimir
      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.error('Error al imprimir:', e);
          } finally {
            // Limpiar
            setTimeout(() => {
              document.body.removeChild(iframe);
              window.URL.revokeObjectURL(url);
              setIsPrinting(false);
            }, 1000);
          }
        }, 500);
      };
    } catch (error: any) {
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

  const legacyContent = isThermal ? (
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

  const previewContent =
    previewUseSdk && (previewLoading || previewHtml !== null) ? (
      previewLoading ? (
        <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          Cargando vista previa...
        </div>
      ) : previewHtml ? (
        <div
          className={`bg-white text-black overflow-y-auto ${isThermal ? "max-w-[80mm] mx-auto" : "w-full"} px-2 py-2`}
          style={isThermal ? { width: "80mm", minHeight: "200px" } : undefined}
        >
          <div
            className="receipt-preview-html"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      ) : (
        legacyContent
      )
    ) : (
      legacyContent
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
          {previewContent}
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
