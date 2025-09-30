import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { type SaleHeader, type SaleItem } from "@/types/sale";

interface SaleReceiptContentProps {
  sale: SaleHeader;
  customerName: string;
  customerCuit?: string; // NEW: explicit CUIT passed in
  formatDate: (dateString: string | null | undefined) => string;
  formatCurrency: (amount: number | null | undefined) => string;
  companyDetails: {
    name: string;
    razonSocial: string;
    address: string;
    phone: string;
    email: string;
    cuit: string;
    iibb: string;
    startDate: string;
  };
}

const SaleReceiptContent: React.FC<SaleReceiptContentProps> = ({
  sale,
  customerName,
  customerCuit,
  formatDate,
  formatCurrency,
  companyDetails,
}) => {
  // Normalizar venta y datos de sucursal del backend
  const s: any = (sale as any)?.data ?? sale;
  const branch: any = (s?.branch && typeof s.branch === 'object') ? s.branch : null;
  const backendCompanyName = branch?.description || branch?.name || '';
  const backendRazonSocial = branch?.razonSocial || '';
  const backendAddress = branch?.address || '';
  const backendPhone = branch?.phone || '';
  const backendEmail = branch?.email || '';
  const backendCuit = branch?.cuit || '';
  const backendIibb = branch?.iibb || '';
  const backendStartDate = branch?.startDate || '';

  // Valores de empresa a mostrar (sin guiones por defecto)
  const companyCuit = (backendCuit || companyDetails.cuit || '').toString().trim();
  const companyIibb = (backendIibb || companyDetails.iibb || '').toString().trim();
  const companyStartDate = (backendStartDate || companyDetails.startDate || '').toString().trim();

  // Derivar nombre del cliente desde backend si no llega por prop
  const derivedCustomerName = customerName || (
    s?.customer?.person
      ? `${s.customer.person.first_name || ''} ${s.customer.person.last_name || ''}`.trim()
      : s?.customer?.business_name || 'Consumidor Final'
  );

  // Derivar CUIT/CUIL del cliente con prioridad backend
  const derivedCustomerCuit = customerCuit || s?.customer?.person?.cuit || s?.sale_document_number || s?.customer?.cuit || 'N/A';

  const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

  // Descuentos: calcular por ítem desde tipo/valor y derivar global-only desde cabecera
  const itemsArray: any[] = Array.isArray(s?.items) ? s.items : []
  const computePerItemOriginalDiscount = (it: any) => {
    // Preferir el monto persistido por ítem si existe
    const persisted = Number(it?.discount_amount ?? 0)
    if (!isNaN(persisted) && persisted > 0) return round2(persisted)
    const qty = Number(it?.quantity || 0)
    const unit = Number(it?.unit_price || 0)
    const base = qty * unit
    const t = it?.discount_type
    const v = Number(it?.discount_value ?? 0)
    let disc = 0
    if (t && v > 0) {
      disc = t === 'percent' ? base * (v / 100) : v
    }
    disc = Math.max(0, Math.min(disc, base))
    return round2(disc)
  }
  const sumItemOriginalDiscount: number = itemsArray.reduce((acc: number, it: any) => acc + computePerItemOriginalDiscount(it), 0)
  const totalDiscountApplied: number = Math.round(Number(s?.discount_amount) || 0)
  const globalOnlyDiscount: number = Math.max(0, totalDiscountApplied - sumItemOriginalDiscount)
  const hasGlobalDiscount: boolean = globalOnlyDiscount > 0

  return (
    <div className="bg-white p-6 sm:p-8 text-sm w-full max-w-2xl mx-auto print:p-2 print:max-w-none">      {/* Company and Receipt Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <h2 className="text-lg sm:text-xl font-bold mb-1">
            {backendCompanyName || companyDetails.name || '-'}
          </h2>
          <p>Razón Social: {backendRazonSocial || companyDetails.razonSocial || '-'}</p>
          <p>Dirección: {backendAddress || companyDetails.address || '-'}</p>
          <p>Teléfono: {backendPhone || companyDetails.phone || '-'}</p>
          <p>Email: {backendEmail || companyDetails.email || '-'}</p>
        </div>
        <div className="text-left sm:text-right">
          <h1 className="text-xl sm:text-2xl font-bold uppercase mb-1">
            {s?.receipt_type?.description || s?.receiptType?.description || s?.receiptType?.name || "Comprobante"}
          </h1>
          <p className="font-semibold">
            Nº: {s?.receipt_number || s?.id}
          </p>
          <p>Fecha: {formatDate(s?.date)}</p>
          {companyCuit && (<p>CUIT: {companyCuit}</p>)}
          {companyIibb && (<p>Ing. Brutos: {companyIibb}</p>)}
          {companyStartDate && (<p>Inicio Actividades: {companyStartDate}</p>)}
        </div>
      </div>

      {/* Client Details */}
      <div className="border-b pb-4 mb-4">
        <h3 className="font-medium mb-2">Cliente:</h3>
        <p className="text-sm">
          Razón Social: {derivedCustomerName}
        </p>
        <p className="text-sm">
          CUIT/CUIL: {derivedCustomerCuit}
        </p>
        <p className="text-sm">
          Condición frente al IVA: {s?.saleFiscalCondition?.name || s?.sale_fiscal_condition?.name || 'Consumidor Final'}
        </p>
      </div>

      {/* Items Table */}
      <div className="mb-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Cant.</TableHead>
              <TableHead className="text-right">Precio Unit.</TableHead>
              <TableHead className="text-right">Desc.</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {s.items && s.items.length > 0 ? (
              s.items.map((item: SaleItem, index: number) => (
                <TableRow key={(item as any).id || `row-${index}`}>
                  <TableCell>{(item as any).description || (item as any).product?.description || 'Producto sin descripción'}</TableCell>
                  <TableCell className="text-right">{(item as any).quantity || 0}</TableCell>
                  <TableCell className="text-right">{formatCurrency((item as any).unit_price || 0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(computePerItemOriginalDiscount(item))}</TableCell>
                  <TableCell className="text-right">{formatCurrency((item as any).item_subtotal || (((item as any).quantity || 0) * ((item as any).unit_price || 0) - computePerItemOriginalDiscount(item)))}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No hay productos en esta venta
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Totals Section */}
      <div className="flex justify-end">
        <div className="w-full sm:w-64">
          <div className="flex justify-between py-1">
            <span>Subtotal:</span>
            <span>{formatCurrency(s?.subtotal || 0)}</span>
          </div>
          {sumItemOriginalDiscount > 0 && (
            <div className="flex justify-between py-1">
              <span>Desc. Ítems:</span>
              <span>-{formatCurrency(sumItemOriginalDiscount)}</span>
            </div>
          )}
          {hasGlobalDiscount && (
            <div className="flex justify-between py-1">
              <span>Desc. Global:</span>
              <span>-{formatCurrency(globalOnlyDiscount)}</span>
            </div>
          )}
          {s?.saleIvas && s.saleIvas.length > 0 ? (
            s.saleIvas.map((ivaDetail: any, index: number) => (
              <div key={index} className="flex justify-between py-1">
                <span>IVA ({ivaDetail.iva?.percentage || ivaDetail.iva?.rate || '0'}%):</span>
                <span>{formatCurrency(ivaDetail.iva_amount || 0)}</span>
              </div>
            ))
          ) : (
            <div className="flex justify-between py-1">
              <span>IVA:</span>
              <span>{formatCurrency(s?.total_iva_amount || 0)}</span>
            </div>
          )}
          {(s?.iibb || 0) > 0 && (
            <div className="flex justify-between py-1">
              <span>IIBB:</span>
              <span>{formatCurrency(s?.iibb || 0)}</span>
            </div>
          )}
          {(s?.internal_tax || 0) > 0 && (
            <div className="flex justify-between py-1">
              <span>Imp. Internos:</span>
              <span>{formatCurrency(s?.internal_tax || 0)}</span>
            </div>
          )}
          <div className="flex justify-between py-1 border-t font-bold mt-1">
            <span>TOTAL:</span>
            <span>{formatCurrency(s?.total || 0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaleReceiptContent;
