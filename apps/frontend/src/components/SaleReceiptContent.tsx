import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { type SaleHeader } from "@/types/sale";
import { ARCA_CODES } from "@/lib/constants/arcaCodes";
import { normalizeArcaReceiptCode } from "@/utils/arcaReceiptTypes";

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
  type AnyRecord = Record<string, unknown>

  const asRecord = (v: unknown): AnyRecord => (v && typeof v === "object" ? (v as AnyRecord) : {})
  const asNumber = (v: unknown, fallback = 0): number => {
    const n = typeof v === "number" ? v : Number(v)
    return Number.isFinite(n) ? n : fallback
  }
  const asString = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : v == null ? fallback : String(v))

  // Normalizar venta y datos de sucursal del backend
  const saleWrapper = sale as unknown as { data?: unknown }
  const s = (saleWrapper?.data ?? sale) as SaleHeader
  const sRec = asRecord(s)
  const branchRaw = sRec.branch
  const branch = (branchRaw && typeof branchRaw === "object" ? asRecord(branchRaw) : null)
  const backendCompanyName = branch ? asString(branch.description || branch.name) : ""
  const backendRazonSocial = branch ? asString(branch.razonSocial) : ""
  const backendAddress = branch ? asString(branch.address) : ""
  const backendPhone = branch ? asString(branch.phone) : ""
  const backendEmail = branch ? asString(branch.email) : ""
  const backendCuit = branch ? asString(branch.cuit) : ""
  const backendIibb = branch ? asString(branch.iibb) : ""
  const backendStartDate = branch ? asString(branch.startDate) : ""

  // Valores de empresa a mostrar (sin guiones por defecto)
  const companyCuit = (backendCuit || companyDetails.cuit || '').toString().trim();
  const companyIibb = (backendIibb || companyDetails.iibb || '').toString().trim();
  const companyStartDate = (backendStartDate || companyDetails.startDate || '').toString().trim();

  // Derivar nombre del cliente desde backend si no llega por prop
  const derivedCustomerName = customerName || (
    (s.customer?.person
      ? `${s.customer.person.first_name || ''} ${s.customer.person.last_name || ''}`.trim()
      : s.customer?.business_name || 'Consumidor Final')
  );

  // Derivar CUIT/CUIL del cliente con prioridad backend
  const derivedCustomerCuit =
    customerCuit ||
    s.customer?.person?.cuit ||
    asString(sRec.sale_document_number) ||
    asString(asRecord(sRec.customer).cuit) ||
    "N/A";

  const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

  const receiptAfipCode: string | null =
    normalizeArcaReceiptCode(
      asRecord(sRec.receipt_type).afip_code ?? asRecord(sRec.receiptType).afip_code ?? sRec.receipt_type_code ?? null
    )
  const receiptDescription: string = String(
    asRecord(sRec.receipt_type).description || asRecord(sRec.receiptType).description || asRecord(sRec.receiptType).name || ''
  ).toLowerCase()
  const isFacturaX: boolean =
    receiptAfipCode === ARCA_CODES.FACTURA_X || receiptDescription.includes('factura x')

  // Descuentos: calcular por ítem desde tipo/valor y derivar global-only desde cabecera
  const itemsArray: unknown[] = Array.isArray(sRec.items) ? (sRec.items as unknown[]) : []
  const computePerItemOriginalDiscount = (it: unknown) => {
    const itemRec = asRecord(it)
    // Preferir el monto persistido por ítem si existe
    const persisted = asNumber(itemRec.discount_amount, 0)
    if (!isNaN(persisted) && persisted > 0) return round2(persisted)
    const qty = asNumber(itemRec.quantity, 0)
    const unit = asNumber(itemRec.unit_price, 0)
    const base = qty * unit
    const t = itemRec.discount_type
    const v = asNumber(itemRec.discount_value, 0)
    let disc = 0
    if (t && v > 0) {
      disc = t === 'percent' ? base * (v / 100) : v
    }
    disc = Math.max(0, Math.min(disc, base))
    return round2(disc)
  }
  const sumItemOriginalDiscount: number = itemsArray.reduce((acc: number, it) => acc + computePerItemOriginalDiscount(it), 0)
  const totalDiscountApplied: number = Math.round(asNumber(sRec.discount_amount, 0))
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
            {asString(asRecord(sRec.receipt_type).description || asRecord(sRec.receiptType).description || asRecord(sRec.receiptType).name || "Comprobante")}
          </h1>
          <p className="font-semibold">
            Nº: {asString(sRec.receipt_number || s.id)}
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
            {itemsArray.length > 0 ? (
              itemsArray.map((rawItem, index: number) => {
                const itemRec = asRecord(rawItem)
                const productRec = asRecord(itemRec.product)
                const idKey = itemRec.id
                const key = typeof idKey === "number" || typeof idKey === "string" ? idKey : `row-${index}`

                const qty = asNumber(itemRec.quantity, 0)
                const unit = asNumber(itemRec.unit_price, 0)
                const discount = computePerItemOriginalDiscount(rawItem)
                const computedSubtotal = qty * unit - discount
                const subtotal = asNumber(itemRec.item_subtotal, computedSubtotal)
                const description = asString(itemRec.description || productRec.description || "Producto sin descripción")

                return (
                  <TableRow key={key}>
                    <TableCell>{description}</TableCell>
                    <TableCell className="text-right">{qty}</TableCell>
                    <TableCell className="text-right">{formatCurrency(unit)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(discount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(subtotal)}</TableCell>
                  </TableRow>
                )
              })
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
          {!isFacturaX && (
            <div className="flex justify-between py-1">
              <span>Subtotal:</span>
              <span>{formatCurrency(asNumber(sRec.subtotal, 0))}</span>
            </div>
          )}
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
          {!isFacturaX && (
            Array.isArray(sRec.saleIvas) && (sRec.saleIvas as unknown[]).length > 0 ? (
              (sRec.saleIvas as unknown[]).map((rawIva, index: number) => {
                const ivaDetail = asRecord(rawIva)
                const iva = asRecord(ivaDetail.iva)
                const rate = asString(iva.percentage ?? iva.rate ?? "0")
                const amount = asNumber(ivaDetail.iva_amount, 0)
                return (
                  <div key={index} className="flex justify-between py-1">
                    <span>IVA ({rate}%):</span>
                    <span>{formatCurrency(amount)}</span>
                  </div>
                )
              })
            ) : (
              <div className="flex justify-between py-1">
                <span>IVA:</span>
                <span>{formatCurrency(asNumber(sRec.total_iva_amount, 0))}</span>
              </div>
            )
          )}
          {asNumber(sRec.iibb, 0) > 0 && (
            <div className="flex justify-between py-1">
              <span>IIBB:</span>
              <span>{formatCurrency(asNumber(sRec.iibb, 0))}</span>
            </div>
          )}
          {asNumber(sRec.internal_tax, 0) > 0 && (
            <div className="flex justify-between py-1">
              <span>Imp. Internos:</span>
              <span>{formatCurrency(asNumber(sRec.internal_tax, 0))}</span>
            </div>
          )}
          <div className="flex justify-between py-1 border-t font-bold mt-1">
            <span>TOTAL:</span>
            <span>{formatCurrency(asNumber(sRec.total, 0))}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaleReceiptContent;
