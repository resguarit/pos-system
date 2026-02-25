/**
 * Stock Transfer Export Utilities
 * Generates PDF and Excel exports for stock transfers
 * Following best practices: separation of concerns, reusable functions
 */

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { StockTransfer } from '@/types/stockTransfer';
import { sileo } from "sileo"
import { resolveSystemImageUrl } from '@/lib/imageUtils';

interface TransferExportData {
    transfer: StockTransfer;
    getStatusLabel: (status?: string) => string;
    getBranchName: (transfer: StockTransfer, type: 'source' | 'destination') => string;
}

/**
 * Helper to fetch image from URL and convert to Base64
 */
async function getImageDataUrl(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Could not get canvas context'));
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (e) => reject(e);
        img.src = url;
    });
}

/**
 * Export a single transfer to PDF with professional formatting
 */
export async function exportTransferToPDF({ transfer, getStatusLabel, getBranchName }: TransferExportData): Promise<void> {
    try {
        const jsPDFModule = await import('jspdf');
        const autoTable = (await import('jspdf-autotable')).default;

        const doc = new jsPDFModule.jsPDF() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        const pageWidth = doc.internal.pageSize.getWidth();

        // Add Logo
        try {
            // Use null to get the default system logo URL
            const logoUrl = resolveSystemImageUrl(null);
            // Fetch and convert to base64
            const logoData = await getImageDataUrl(logoUrl);

            const logoWidth = 30;
            const logoHeight = 30; // Aspect ratio allows distortion if not calculated, but logo usually fits in square

            // Initial X centered
            doc.addImage(logoData, 'PNG', (pageWidth - logoWidth) / 2, 10, logoWidth, logoHeight);
        } catch (error) {
            console.warn('Could not load logo for PDF:', error);
            // Proceed without logo
        }

        // Header - moved down to accommodate logo
        const headerY = 50;
        doc.setFontSize(18);
        doc.setTextColor(40, 40, 40);
        doc.text('Transferencia de Stock', pageWidth / 2, headerY, { align: 'center' });

        // Transfer number badge
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`N° ${transfer.id || '-'}`, pageWidth / 2, headerY + 8, { align: 'center' });

        // Info section
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);

        const infoY = headerY + 20;
        const col1X = 14;
        const col2X = 110;

        // Left column
        doc.setFont(undefined, 'bold');
        doc.text('Fecha:', col1X, infoY);
        doc.setFont(undefined, 'normal');
        doc.text(transfer.transfer_date ? format(new Date(transfer.transfer_date), 'dd/MM/yyyy', { locale: es }) : '-', col1X + 25, infoY);

        doc.setFont(undefined, 'bold');
        doc.text('Estado:', col1X, infoY + 7);
        doc.setFont(undefined, 'normal');
        doc.text(getStatusLabel(transfer.status), col1X + 25, infoY + 7);

        doc.setFont(undefined, 'bold');
        doc.text('Creado por:', col1X, infoY + 14);
        doc.setFont(undefined, 'normal');
        doc.text(transfer.user?.name || transfer.user?.username || '-', col1X + 30, infoY + 14);

        // Right column
        doc.setFont(undefined, 'bold');
        doc.text('Sucursal Origen:', col2X, infoY);
        doc.setFont(undefined, 'normal');
        doc.text(getBranchName(transfer, 'source'), col2X + 40, infoY);

        doc.setFont(undefined, 'bold');
        doc.text('Sucursal Destino:', col2X, infoY + 7);
        doc.setFont(undefined, 'normal');
        doc.text(getBranchName(transfer, 'destination'), col2X + 40, infoY + 7);

        // Products table
        const items = transfer.items || [];
        if (items.length > 0) {
            autoTable(doc, {
                startY: infoY + 30,
                head: [['Código', 'Producto', 'Cantidad']],
                body: items.map(item => [
                    item.product?.sku || item.product?.barcode || '-',
                    item.product?.description || `Producto #${item.product_id}`,
                    item.quantity.toString()
                ]),
                styles: { fontSize: 9, cellPadding: 3 },
                headStyles: { fillColor: [59, 130, 246], textColor: 255 },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: {
                    0: { cellWidth: 35 },
                    1: { cellWidth: 'auto' },
                    2: { cellWidth: 25, halign: 'center' }
                }
            });
        }

        // Notes section
        if (transfer.notes) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const finalY = (doc as any).lastAutoTable?.finalY || infoY + 30;
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text('Notas:', 14, finalY + 15);
            doc.setFont(undefined, 'normal');
            doc.text(transfer.notes, 14, finalY + 22, { maxWidth: pageWidth - 28 });
        }

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Generado el ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`, 14, doc.internal.pageSize.getHeight() - 10);

        doc.save(`transferencia-${transfer.id}.pdf`);
        sileo.success({ title: 'PDF generado exitosamente' });
    } catch (error) {
        console.error('Error generating PDF:', error);
        sileo.error({ title: 'Error al generar el PDF' });
    }
}

/**
 * Export a single transfer to Excel with formatted worksheet
 */
export async function exportTransferToExcel({ transfer, getStatusLabel, getBranchName }: TransferExportData): Promise<void> {
    try {
        const XLSX = await import('xlsx');

        const wb = XLSX.utils.book_new();

        // Prepare header information
        const headerData = [
            ['TRANSFERENCIA DE STOCK'],
            [],
            ['N° Transferencia:', transfer.id?.toString() || '-'],
            ['Fecha:', transfer.transfer_date ? format(new Date(transfer.transfer_date), 'dd/MM/yyyy', { locale: es }) : '-'],
            ['Estado:', getStatusLabel(transfer.status)],
            ['Sucursal Origen:', getBranchName(transfer, 'source')],
            ['Sucursal Destino:', getBranchName(transfer, 'destination')],
            ['Creado por:', transfer.user?.name || transfer.user?.username || '-'],
            [],
            ['PRODUCTOS'],
            ['Código', 'Producto', 'Cantidad']
        ];

        // Add items
        const items = transfer.items || [];
        const itemRows = items.map(item => [
            item.product?.sku || item.product?.barcode || '-',
            item.product?.description || `Producto #${item.product_id}`,
            item.quantity
        ]);

        const allData = [...headerData, ...itemRows];

        // Add notes if present
        if (transfer.notes) {
            allData.push([]);
            allData.push(['Notas:', transfer.notes]);
        }

        const ws = XLSX.utils.aoa_to_sheet(allData);

        // Column widths
        ws['!cols'] = [
            { wch: 20 },
            { wch: 45 },
            { wch: 12 }
        ];

        // Merge title cell
        ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];

        XLSX.utils.book_append_sheet(wb, ws, 'Transferencia');
        XLSX.writeFile(wb, `transferencia-${transfer.id}.xlsx`);

        sileo.success({ title: 'Excel generado exitosamente' });
    } catch (error) {
        console.error('Error generating Excel:', error);
        sileo.error({ title: 'Error al generar el Excel' });
    }
}
