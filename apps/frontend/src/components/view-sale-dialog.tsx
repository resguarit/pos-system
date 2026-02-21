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
import { Download, Printer, ShieldCheck, Loader2, Building2 } from "lucide-react";
import { type Dispatch, type SetStateAction, useState, useEffect } from "react";
import { type SaleHeader } from "@/types/sale";
import { useArcaAuthorization } from "@/hooks/useArcaAuthorization";
import useApi from "@/hooks/useApi";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ConversionStatusBadge } from "@/components/sales/conversion-status-badge";
import { ArcaStatusBadge } from "@/components/sales/ArcaStatusBadge";
import { isInternalOnlyReceiptType } from "@/utils/arcaReceiptTypes";



interface ViewSaleDialogProps {
    open: boolean;
    onOpenChange: Dispatch<SetStateAction<boolean>>;
    sale: SaleHeader | null;
    getCustomerName: (sale: SaleHeader) => string;
    formatDate: (dateString: string | null | undefined) => string;
    getReceiptType: (
        sale: SaleHeader
    ) => { displayName: string; arcaCode: string };
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
    const { authorizeSale, canAuthorize, isAuthorizing } = useArcaAuthorization();

    const { request } = useApi();
    const [currentSale, setCurrentSale] = useState<SaleHeader | null>(sale);
    const [showChooseCuitDialog, setShowChooseCuitDialog] = useState(false);
    const [chosenTaxIdentityId, setChosenTaxIdentityId] = useState<number | null>(null);
    const [isUpdatingCuit, setIsUpdatingCuit] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Actualizar venta cuando cambia la prop
    useEffect(() => {
        if (sale) {
            setCurrentSale(sale);
        }
    }, [sale]);

    const customerTaxIdentities = currentSale?.customer?.tax_identities ?? [];
    const needsCuitChoice = !!(currentSale?.customer_id && customerTaxIdentities.length > 1 && !currentSale.customer_tax_identity_id);

    /**
     * Updates the sale's tax identity and returns the updated sale.
     * Extracted for reusability between auto-selection and manual selection flows.
     */
    const updateSaleTaxIdentity = async (saleId: number, taxIdentityId: number): Promise<SaleHeader | null> => {
        try {
            const res = await request({
                method: "PUT",
                url: `/sales/${saleId}`,
                data: { customer_tax_identity_id: taxIdentityId },
            });
            return (res as { data?: SaleHeader })?.data ?? res as SaleHeader;
        } catch (err) {
            console.error("Error al actualizar identidad fiscal:", err);
            return null;
        }
    };

    const handleAuthorizeArcaClick = async () => {
        if (!currentSale) return;

        // If CUIT selection is needed, auto-select the default or first available
        if (needsCuitChoice) {
            const defaultTaxIdentityId = customerTaxIdentities.find(t => t.is_default)?.id
                ?? customerTaxIdentities[0]?.id;

            if (!defaultTaxIdentityId) {
                console.error("No hay identidad fiscal disponible para el cliente");
                return;
            }

            setIsUpdatingCuit(true);
            const updatedSale = await updateSaleTaxIdentity(currentSale.id, defaultTaxIdentityId);
            setIsUpdatingCuit(false);

            if (!updatedSale) return;

            setCurrentSale(updatedSale);
            onSaleUpdated?.(updatedSale);
            await handleAuthorizeArca(updatedSale);
            return;
        }

        handleAuthorizeArca(currentSale);
    };

    const handleConfirmCuitAndAuthorize = async () => {
        if (!currentSale || chosenTaxIdentityId == null) return;

        setIsUpdatingCuit(true);
        const updatedSale = await updateSaleTaxIdentity(currentSale.id, chosenTaxIdentityId);
        setIsUpdatingCuit(false);

        if (!updatedSale) return;

        setCurrentSale(updatedSale);
        onSaleUpdated?.(updatedSale);
        setShowChooseCuitDialog(false);
        await handleAuthorizeArca(updatedSale);
    };

    const handleAuthorizeArca = async (saleToUse: SaleHeader) => {
        if (!saleToUse) return;

        const result = await authorizeSale(saleToUse);
        if (result && onSaleUpdated) {
            const updatedSale: SaleHeader = {
                ...saleToUse,
                cae: result.cae,
                cae_expiration_date: result.cae_expiration_date,
                receipt_number: result.invoice_number?.toString().padStart(8, '0') || saleToUse.receipt_number,
            };
            setCurrentSale(updatedSale);
            onSaleUpdated(updatedSale);
        }
    };

    // Determinar si se puede autorizar usando el hook que verifica certificados AFIP
    const canAuthorizeCheck = (sale: SaleHeader | null): boolean => {
        if (!sale) return false;
        const result = canAuthorize(sale);
        return result.can;
    };



    const saleToDisplay = currentSale || sale;
    const formatCurrencyARS = (amount: number | null | undefined) => {
        if (amount == null) return '$0.00 ARS';
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
        }).format(amount);
    };

    const formatUnitPrice = (item: { unit_price?: number | string; product?: { sale_price?: number | string } }) => {
        // Usar el precio unitario GUARDADO en la venta (unit_price), no el precio actual del producto
        const unitPrice = Number(item.unit_price || item.product?.sale_price || 0);

        // Todos los precios de venta son en ARS
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
        }).format(unitPrice);
    };

    if (!saleToDisplay) {
        return null;
    }

    // --- INICIO DE LA MODIFICACIÓN ---

    // 1. Determinar si el comprobante es un presupuesto basándonos en los datos.
    const receiptType = saleToDisplay.receipt_type as { afip_code?: string; name?: string; description?: string } | string;
    const isBudget = (typeof receiptType !== 'string' && receiptType?.afip_code === '016') || (typeof receiptType !== 'string' && receiptType?.name === 'Presupuesto') || (typeof receiptType === 'string' ? receiptType : receiptType?.description || '').toLowerCase().includes('presupuesto');

    // 2. Definir textos dinámicos basados en si es un presupuesto o una venta.
    const dialogTitle = isBudget ? "Detalle del Presupuesto" : "Detalle de Venta";
    const dialogDescription = isBudget ? "Información detallada del presupuesto." : "Información detallada de la venta.";

    // Usar el nombre directo del tipo de comprobante para mayor precisión.
    const receiptName = (typeof receiptType === 'string' ? receiptType : receiptType?.description) || getReceiptType(saleToDisplay).displayName;

    // Presupuesto y Factura X son solo uso interno: no muestran estado ARCA ni botón "Autorizar con ARCA".
    const receiptInfo = getReceiptType(saleToDisplay);
    const isInternalOnly = isInternalOnlyReceiptType(receiptInfo.arcaCode ?? (receiptInfo as { afipCode?: string }).afipCode ?? '');

    // --- FIN DE LA MODIFICACIÓN ---

    // Helpers locales
    const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
    const totalDiscount = round2(Number((saleToDisplay as { discount_amount?: number | string }).discount_amount || 0));

    // Asegurarse de que los métodos de pago se obtienen correctamente
    type PaymentData = { id?: number; amount?: number | string; payment_method?: { name?: string; description?: string }; paymentMethod?: { name?: string; description?: string }; method?: { name?: string; description?: string }; method_name?: string; name?: string };
    const saleWithPayments = saleToDisplay as { payments?: PaymentData[]; sale_payments?: PaymentData[]; salePayments?: PaymentData[] };
    const payments = Array.isArray(saleWithPayments.payments)
        ? saleWithPayments.payments
        : Array.isArray(saleWithPayments.sale_payments)
            ? saleWithPayments.sale_payments
            : Array.isArray(saleWithPayments.salePayments)
                ? saleWithPayments.salePayments
                : [];

    // Estado AFIP
    const isAuthorized = !!saleToDisplay.cae;
    const canAuthorizeThis = canAuthorizeCheck(saleToDisplay);
    // Mostrar UI de ARCA si:
    // 1. La venta ya está autorizada (tiene CAE), O
    // 2. El tipo de comprobante soporta ARCA (no es interno ni presupuesto)
    // Nota: Eliminamos la dependencia de hasBranchCertificate para la visibilidad,
    // para que canAuthorize pueda mostrar el error si falta el certificado.
    const showArcaUI = isAuthorized || (!isBudget && !isInternalOnly);

    const getPaymentMethodName = (p: PaymentData) =>
        p?.payment_method?.name ||
        p?.payment_method?.description ||
        p?.paymentMethod?.name ||
        p?.paymentMethod?.description ||
        p?.method?.name ||
        p?.method?.description ||
        p?.method_name ||
        p?.name ||
        "Método";

    const handleDownloadPdf = async () => {
        if (!saleToDisplay) return;
        try {
            setIsDownloading(true);
            await onDownloadPdf(saleToDisplay);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <>
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
                            {/* Badge de estado ARCA - Solo mostrar si la sucursal tiene certificado */}
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
                                !isBudget && showArcaUI && !isInternalOnly && (
                                    <div className="flex flex-col gap-1">
                                        <ArcaStatusBadge sale={saleToDisplay} />
                                        {!canAuthorizeThis && !isAuthorized && (() => {
                                            const { reason } = canAuthorize(saleToDisplay);
                                            return reason ? (
                                                <span className="text-xs text-muted-foreground" title={reason}>
                                                    {reason}
                                                </span>
                                            ) : null;
                                        })()}
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
                            {(saleToDisplay.customer_tax_identity?.cuit ?? saleToDisplay.sale_document_number) && (
                                <div className="md:col-span-2">
                                    <strong>CUIT de facturación:</strong>{' '}
                                    {saleToDisplay.customer_tax_identity?.cuit ?? saleToDisplay.sale_document_number}
                                    {saleToDisplay.customer_tax_identity?.business_name && (
                                        <span className="text-muted-foreground"> — {saleToDisplay.customer_tax_identity.business_name}</span>
                                    )}
                                </div>
                            )}
                            <div>
                                <strong>Fecha:</strong> {formatDate(saleToDisplay.date)}
                            </div>
                            <div>
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
                                        {payments.map((p, idx: number) => (
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
                                    type SaleItem = { id: number; unit_price?: number | string; product?: { sale_price?: number | string; description?: string }; quantity?: number | string; discount_amount?: number | string; description?: string };
                                    const saleItem = item as SaleItem;
                                    const unitPrice = Number(saleItem.unit_price || saleItem.product?.sale_price || 0);
                                    const quantity = Number(saleItem.quantity || 0);
                                    const discountAmount = Number(saleItem.discount_amount || 0);
                                    const itemTotal = (unitPrice * quantity) - discountAmount;

                                    return (
                                        <TableRow key={saleItem.id}>
                                            <TableCell>{saleItem.description || saleItem.product?.description || 'Sin descripción'}</TableCell>
                                            <TableCell className="text-right">{quantity}</TableCell>
                                            <TableCell className="text-right">{formatUnitPrice(saleItem)}</TableCell>
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
                                    {totalDiscount > 0 && (
                                        <div className="flex justify-between text-red-600">
                                            <span>Descuentos:</span>
                                            <span>-{formatCurrencyARS(totalDiscount)}</span>
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
                            {/* Botón de autorización ARCA - No mostrar para Presupuesto ni Factura X (solo uso interno) */}
                            {!isBudget && showArcaUI && !isInternalOnly && canAuthorizeThis && !isAuthorized && (
                                <Button
                                    onClick={handleAuthorizeArcaClick}
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
                                            Autorizar con ARCA
                                        </>
                                    )}
                                </Button>
                            )}
                            {onPrintPdf && (
                                <Button onClick={() => onPrintPdf(saleToDisplay)} size="sm" variant="default">
                                    <Printer className="mr-2 h-4 w-4" /> Imprimir
                                </Button>
                            )}
                            <Button
                                onClick={handleDownloadPdf}
                                size="sm"
                                variant="secondary"
                                disabled={isDownloading}
                            >
                                {isDownloading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Descargando...
                                    </>
                                ) : (
                                    <>
                                        <Download className="mr-2 h-4 w-4" /> Descargar PDF
                                    </>
                                )}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cerrar</Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Diálogo: elegir CUIT del cliente antes de autorizar con ARCA */}
            <Dialog open={showChooseCuitDialog} onOpenChange={setShowChooseCuitDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Elegir CUIT para autorizar con ARCA</DialogTitle>
                        <DialogDescription>
                            Este cliente tiene varias identidades fiscales (CUIT). Elegí cuál usar para esta factura.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Identidad fiscal
                        </Label>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {customerTaxIdentities.map((ti) => (
                                <label
                                    key={ti.id}
                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${chosenTaxIdentityId === ti.id ? "border-primary bg-primary/10" : "hover:bg-muted/50"
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="choose-cuit"
                                        value={ti.id}
                                        checked={chosenTaxIdentityId === ti.id}
                                        onChange={() => setChosenTaxIdentityId(ti.id)}
                                        className="h-4 w-4 accent-primary"
                                    />
                                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <div className="min-w-0">
                                        <span className="font-medium block truncate">{ti.business_name || "Sin razón social"}</span>
                                        <span className="text-xs text-muted-foreground">CUIT {ti.cuit}</span>
                                        {ti.fiscal_condition?.name && (
                                            <span className="text-xs text-muted-foreground ml-1"> · {ti.fiscal_condition.name}</span>
                                        )}
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowChooseCuitDialog(false)} disabled={isUpdatingCuit}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleConfirmCuitAndAuthorize}
                            disabled={chosenTaxIdentityId == null || isUpdatingCuit}
                        >
                            {isUpdatingCuit ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <ShieldCheck className="mr-2 h-4 w-4" />
                                    Confirmar y autorizar con ARCA
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default ViewSaleDialog;