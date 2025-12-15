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
    formatDate,
    companyDetails,
}) => {
    // Normalizar venta y datos de sucursal del backend
    const s: any = (sale as any)?.data ?? sale;
    const branch: any = (s?.branch && typeof s.branch === 'object') ? s.branch : null;
    const backendCompanyName = branch?.description || branch?.name || '';
    const backendAddress = branch?.address || '';

    // Valores de empresa a mostrar (igual que blade: usa company_name o branch description)
    const companyName = companyDetails.name || backendCompanyName || 'SUCURSAL';

    // Formatear número con 2 decimales (igual que blade)
    const formatMoney = (n: number) => {
        return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Formatear fecha como dd/mm/yyyy
    const formatDateShort = (dateString: string | null | undefined) => {
        if (!dateString) return new Date().toLocaleDateString('es-AR');
        const d = new Date(dateString);
        return d.toLocaleDateString('es-AR');
    };

    // Formatear hora como HH:mm
    const formatTime = (dateString: string | null | undefined) => {
        if (!dateString) return new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        const d = new Date(dateString);
        return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="bg-white text-[9px] font-sans w-[60mm] max-w-[60mm] ml-[10mm]">
            {/* Header - igual que blade */}
            <div className="text-center text-[11px] font-bold uppercase">
                {companyName}
            </div>
            {backendAddress && (
                <div className="text-center text-[8px]">{backendAddress}</div>
            )}
            <div className="text-center text-[8px]">RESPONSABLE INSCRIPTO</div>

            <div className="border-b border-dashed border-black my-[3px]"></div>

            {/* Fecha y Hora en la misma fila - igual que blade */}
            <div className="flex justify-between text-[9px]">
                <span className="font-bold">Fecha: {formatDateShort(s?.date)}</span>
                <span className="font-bold">Hora: {formatTime(s?.date)}</span>
            </div>

            <div className="border-b border-dashed border-black my-[3px]"></div>

            {/* Encabezados de columna - igual que blade */}
            <div className="flex text-[8px] font-bold mb-[2px]">
                <span className="w-[15%] text-left">CANT</span>
                <span className="w-[40%] text-left">P.UNIT</span>
                <span className="w-[45%] text-right">IMPORTE</span>
            </div>

            {/* Items - igual que blade: descripción arriba, números abajo */}
            {s.items && s.items.length > 0 ? (
                s.items.map((item: SaleItem, index: number) => {
                    const qty = Number((item as any).quantity) || 0;
                    const unitPrice = Number((item as any).unit_price) || 0;
                    const lineTotal = Number((item as any).item_total) || 0;
                    const description = (item as any).product?.description || 'Item';

                    return (
                        <div key={index}>
                            {/* Descripción del producto */}
                            <div className="text-[9px] font-bold pt-[3px]">
                                {description}
                            </div>
                            {/* Cantidad, Precio Unitario, Importe */}
                            <div className="flex font-mono text-[9px]">
                                <span className="w-[15%] text-left">{qty}</span>
                                <span className="w-[40%] text-left">{formatMoney(unitPrice)}</span>
                                <span className="w-[45%] text-right font-bold">{formatMoney(lineTotal)}</span>
                            </div>
                        </div>
                    );
                })
            ) : (
                <div className="text-center text-[8px]">No hay productos</div>
            )}

            <div className="border-b border-dashed border-black my-[3px]"></div>

            {/* Totales - igual que blade */}
            <div className="text-[10px]">
                <div className="flex justify-end">
                    <span className="text-right">Subtotal:</span>
                    <span className="text-right font-mono ml-2">{formatMoney(s?.subtotal || 0)}</span>
                </div>
                {(s?.discount_amount || 0) > 0 && (
                    <div className="flex justify-end">
                        <span className="text-right">Descuento:</span>
                        <span className="text-right font-mono ml-2">-{formatMoney(s?.discount_amount || 0)}</span>
                    </div>
                )}
                <div className="flex justify-end text-[12px] font-bold pt-[5px]">
                    <span className="text-right">TOTAL:</span>
                    <span className="text-right font-mono ml-2">{formatMoney(s?.total || 0)}</span>
                </div>
            </div>

            <div className="border-b border-dashed border-black my-[3px]"></div>

            {/* Footer */}
            <div className="text-center text-[9px] mt-[5px]">
                ¡Gracias por su compra!
            </div>
        </div>
    );
};

export default ThermalTicketContent;
