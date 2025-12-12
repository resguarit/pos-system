import React from "react";
import { type SaleHeader, type SaleItem } from "@/types/sale";

interface ThermalTicketContentProps {
    sale: SaleHeader;
    customerName: string;
    customerCuit?: string;
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

const ThermalTicketContent: React.FC<ThermalTicketContentProps> = ({
    sale,
    customerName,
    formatDate,
    companyDetails,
}) => {
    // Normalizar venta y datos de sucursal del backend
    const s: any = (sale as any)?.data ?? sale;
    const branch: any = (s?.branch && typeof s.branch === 'object') ? s.branch : null;
    const backendCompanyName = branch?.description || branch?.name || '';
    const backendAddress = branch?.address || '';
    const backendPhone = branch?.phone || '';

    // Valores de empresa a mostrar
    const companyName = companyDetails.name || backendCompanyName || 'Empresa';

    // Derivar nombre del cliente
    const derivedCustomerName = customerName || (
        s?.customer?.person
            ? `${s.customer.person.first_name || ''} ${s.customer.person.last_name || ''}`.trim()
            : s?.customer?.business_name || 'Consumidor Final'
    );

    // Calcular IVA total
    const saleIvas = s?.saleIvas || s?.sale_ivas || [];
    const totalIva = Array.isArray(saleIvas)
        ? saleIvas.reduce((acc: number, iva: any) => acc + (Number(iva?.amount) || 0), 0)
        : 0;

    // Formato simple sin decimales
    const formatSimple = (n: number) => {
        const rounded = Math.round(n);
        return `$${rounded.toLocaleString('es-AR')}`;
    };

    return (
        <div className="bg-white p-1 text-[8px] font-mono w-full max-w-[70mm]">
            {/* Header */}
            <div className="text-center mb-1">
                <h2 className="text-[10px] font-bold">{companyName}</h2>
                {backendAddress && <p className="text-[8px]">{backendAddress}</p>}
                {(backendPhone || companyDetails.phone) && (
                    <p className="text-[8px]">Tel: {backendPhone || companyDetails.phone}</p>
                )}
                {branch?.description && branch.description !== companyName && (
                    <p className="text-[8px] font-bold">Suc: {branch.description}</p>
                )}
            </div>

            <div className="border-b border-dashed border-black my-1"></div>

            {/* Número */}
            <div className="text-center mb-1">
                <p className="font-bold text-[10px]">N° {s?.receipt_number || s?.id}</p>
                <p className="text-[8px]">{formatDate(s?.date)}</p>
            </div>

            <div className="border-b border-dashed border-black my-1"></div>

            {/* Cliente */}
            <div className="mb-1 text-[8px]">
                <span className="font-bold">Cli:</span> {derivedCustomerName}
            </div>

            <div className="border-b border-dashed border-black my-1"></div>

            {/* Items */}
            <div className="mb-1">
                {s.items && s.items.length > 0 ? (
                    s.items.map((item: SaleItem, index: number) => {
                        const qty = Math.round((item as any).quantity || 0);
                        const total = Math.round((item as any).item_total || 0);
                        return (
                            <div key={index} className="mb-1">
                                <p className="font-bold text-[8px]">
                                    {(item as any).description || (item as any).product?.description}
                                </p>
                                <div className="flex justify-between text-[8px]">
                                    <span>x{qty}</span>
                                    <span>{formatSimple(total)}</span>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <p className="text-center text-[8px]">No hay productos</p>
                )}
            </div>

            <div className="border-b border-dashed border-black my-1"></div>

            {/* Totales centrados */}
            <div className="text-center text-[9px] mb-1">
                <p>Subtotal: {formatSimple(s?.subtotal || 0)}</p>
                {totalIva > 0 && <p>IVA: {formatSimple(totalIva)}</p>}
                {(s?.discount_amount || 0) > 0 && (
                    <p>Desc: -{formatSimple(s?.discount_amount || 0)}</p>
                )}
            </div>

            <div className="border-y border-dashed border-black py-1 my-1">
                <p className="text-center font-bold text-[10px]">
                    Total {formatSimple(s?.total || 0)}
                </p>
            </div>

            {/* Footer */}
            <div className="text-center text-[8px] mt-1">
                <p>¡Gracias por su compra!</p>
            </div>
        </div>
    );
};

export default ThermalTicketContent;
