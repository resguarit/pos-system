import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, Download, Search, Loader2, FileSpreadsheet, FileText } from 'lucide-react';
import { sileo } from "sileo"
import type { DateRange } from 'react-day-picker';
import { saleService } from '@/lib/api/saleService';

interface ImportSalesPanelProps {
    onImport: (items: { productId: number; quantity: number; productCode?: string; productName?: string; availableStock?: number }[]) => void;
    sourceBranchId?: string;
}

interface SoldProduct {
    id: number;
    code: string;
    name: string;
    category: string;
    quantity: number;
    availableStock: number;
}

export function ImportSalesPanel({ onImport, sourceBranchId }: ImportSalesPanelProps) {
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [category, setCategory] = useState<string>("all");
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<SoldProduct[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // Search sold products from API
    const handleSearch = async () => {
        if (!sourceBranchId) {
            sileo.error({ title: "Seleccione una sucursal de origen para buscar ventas" });
            return;
        }

        if (!dateRange?.from || !dateRange?.to) {
            sileo.error({ title: "Seleccione un rango de fechas" });
            return;
        }

        setLoading(true);
        setResults([]);
        setSelectedIds([]);

        try {
            const soldProducts = await saleService.getSoldProductsForTransfer({
                source_branch_id: sourceBranchId,
                from_date: dateRange.from,
                to_date: dateRange.to,
                ...(category !== "all" && { category_id: category }),
            });

            setResults(soldProducts);

            if (soldProducts.length === 0) {
                sileo.info({ title: "No se encontraron productos vendidos en el rango seleccionado" });
            } else {
                sileo.success({ title: `Se encontraron ${soldProducts.length} productos vendidos` });
            }
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error("Error fetching sold products:", error);
            sileo.error({ title: error?.response?.data?.message || "Error al buscar productos vendidos" });
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleSelect = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleToggleAll = () => {
        if (selectedIds.length === results.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(results.map(r => r.id));
        }
    };

    const handleImport = () => {
        const selectedProducts = results.filter(r => selectedIds.includes(r.id));

        if (selectedProducts.length === 0) {
            sileo.error({ title: "Seleccione al menos un producto para importar" });
            return;
        }

        // Pasar información completa del producto para evitar búsquedas
        const itemsToImport = selectedProducts.map(r => ({
            productId: r.id,
            quantity: r.quantity,
            productCode: r.code,
            productName: r.name,
            availableStock: r.availableStock
        }));

        onImport(itemsToImport);
        sileo.success({ title: `${itemsToImport.length} productos agregados a la transferencia` });

        // Reset selection
        setSelectedIds([]);
    };
    const handleExport = async (type: 'pdf' | 'excel') => {
        if (results.length === 0) {
            sileo.error({ title: "No hay datos para exportar" });
            return;
        }

        try {
            if (type === 'pdf') {
                // Importación dinámica de jsPDF y autoTable
                const { jsPDF } = await import('jspdf');
                await import('jspdf-autotable');

                const doc = new jsPDF() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

                // Título
                doc.setFontSize(16);
                doc.text('Productos Vendidos - Análisis de Stock', 14, 15);

                // Información del reporte
                doc.setFontSize(10);
                doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, 14, 25);
                if (dateRange?.from && dateRange?.to) {
                    doc.text(
                        `Período: ${format(dateRange.from, 'dd/MM/yyyy', { locale: es })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: es })}`,
                        14,
                        30
                    );
                }

                // Tabla de productos
                doc.autoTable({
                    startY: 35,
                    head: [['Código', 'Producto', 'Categoría', 'Cant. Vendida', 'Stock Disponible']],
                    body: results.map(item => [
                        item.code,
                        item.name,
                        item.category,
                        item.quantity.toString(),
                        item.availableStock.toString()
                    ]),
                    styles: { fontSize: 8 },
                    headStyles: { fillColor: [66, 139, 202] }
                });

                doc.save(`productos-vendidos-${new Date().getTime()}.pdf`);
                sileo.success({ title: "PDF generado exitosamente" });
            } else if (type === 'excel') {
                // Importación dinámica de xlsx
                const XLSX = await import('xlsx');

                // Crear workbook
                const wb = XLSX.utils.book_new();

                // Preparar datos
                const wsData = [
                    ['Productos Vendidos - Análisis de Stock'],
                    [`Fecha: ${new Date().toLocaleDateString('es-AR')}`],
                    dateRange?.from && dateRange?.to
                        ? [`Período: ${format(dateRange.from, 'dd/MM/yyyy', { locale: es })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: es })}`]
                        : [],
                    [],
                    ['Código', 'Producto', 'Categoría', 'Cant. Vendida', 'Stock Disponible'],
                    ...results.map(item => [
                        item.code,
                        item.name,
                        item.category,
                        item.quantity,
                        item.availableStock
                    ])
                ];

                // Crear worksheet
                const ws = XLSX.utils.aoa_to_sheet(wsData);

                // Ajustar anchos de columna
                ws['!cols'] = [
                    { wch: 15 },  // Código
                    { wch: 40 },  // Producto
                    { wch: 20 },  // Categoría
                    { wch: 15 },  // Cant. Vendida
                    { wch: 18 }   // Stock Disponible
                ];

                // Agregar worksheet al workbook
                XLSX.utils.book_append_sheet(wb, ws, 'Productos Vendidos');

                // Generar archivo
                XLSX.writeFile(wb, `productos-vendidos-${new Date().getTime()}.xlsx`);
                sileo.success({ title: "Excel generado exitosamente" });
            }
        } catch (error) {
            console.error('Error al exportar:', error);
            sileo.error({ title: `Error al generar ${type.toUpperCase()}` });
        }
    };

    return (
        <div className="flex flex-col gap-4 py-4 h-full">
            <div className="flex flex-wrap gap-4 items-end bg-muted/20 p-4 rounded-lg border">
                <div className="space-y-2 flex-1 min-w-[280px]">
                    <Label>Rango de Fechas</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !dateRange && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (
                                    dateRange.to ? (
                                        <>
                                            {format(dateRange.from, "P", { locale: es })} - {format(dateRange.to, "P", { locale: es })}
                                        </>
                                    ) : (
                                        format(dateRange.from, "P", { locale: es })
                                    )
                                ) : (
                                    "Seleccione rango de fechas"
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="range"
                                selected={dateRange}
                                onSelect={setDateRange}
                                numberOfMonths={2}
                                locale={es}
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="space-y-2 w-[200px]">
                    <Label>Categoría</Label>
                    <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger>
                            <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            <SelectItem value="Celulares">Celulares</SelectItem>
                            <SelectItem value="Laptops">Laptops</SelectItem>
                            <SelectItem value="Accesorios">Accesorios</SelectItem>
                            <SelectItem value="Audio">Audio</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Button onClick={handleSearch} disabled={loading} className="px-8">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                    Buscar
                </Button>
            </div>

            {/* Results Area */}
            <div className="rounded-md border flex flex-col">
                <div className="p-2 border-b bg-muted/30 flex justify-between items-center shrink-0">
                    <span className="text-sm text-muted-foreground ml-2">
                        {results.length > 0 ? `${results.length} resultados encontrados` : "Resultados"}
                    </span>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} disabled={results.length === 0}>
                            <FileText className="h-3 w-3 mr-1 text-red-600" /> PDF
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleExport('excel')} disabled={results.length === 0}>
                            <FileSpreadsheet className="h-3 w-3 mr-1 text-green-600" /> Excel
                        </Button>
                    </div>
                </div>

                <div className="max-h-[500px] overflow-y-auto">
                    <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                            <TableRow>
                                <TableHead className="w-[40px] bg-background">
                                    <Checkbox
                                        checked={results.length > 0 && selectedIds.length === results.length}
                                        onCheckedChange={handleToggleAll}
                                        disabled={results.length === 0}
                                    />
                                </TableHead>
                                <TableHead className="bg-background">Código</TableHead>
                                <TableHead className="bg-background">Producto</TableHead>
                                <TableHead className="bg-background">Categoría</TableHead>
                                <TableHead className="text-right bg-background">Cant. Vendida</TableHead>
                                <TableHead className="text-right bg-background">Stock Disponible</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                        <span className="text-muted-foreground text-sm mt-2 block">Buscando productos...</span>
                                    </TableCell>
                                </TableRow>
                            ) : results.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        {loading ? "Buscando..." : "Use los filtros para buscar productos vendidos"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                results.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedIds.includes(item.id)}
                                                onCheckedChange={() => handleToggleSelect(item.id)}
                                            />
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{item.code}</TableCell>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell>{item.category}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right">
                                            <span className={cn(
                                                "font-semibold",
                                                item.availableStock <= 0 && "text-red-600",
                                                item.availableStock > 0 && item.availableStock < item.quantity && "text-orange-600",
                                                item.availableStock >= item.quantity && "text-green-600"
                                            )}>
                                                {item.availableStock}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <div className="flex justify-end">
                <Button onClick={handleImport} disabled={selectedIds.length === 0} className="gap-2">
                    <Download className="h-4 w-4" />
                    Importar Seleccionados ({selectedIds.length})
                </Button>
            </div>
        </div>
    );
}
