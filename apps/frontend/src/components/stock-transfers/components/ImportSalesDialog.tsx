import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
interface ImportSalesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImport: (items: { productId: number; quantity: number }[]) => void;
    sourceBranchId?: string;
}

// Mock data for the demo
const MOCK_SOLD_PRODUCTS = [
    { id: 101, code: 'IP13-128-MID', name: 'iPhone 13 128GB Midnight', quantity: 5, category: 'Celulares' },
    { id: 102, code: 'SAM-S21-GRAY', name: 'Samsung Galaxy S21 Gray', quantity: 3, category: 'Celulares' },
    { id: 103, code: 'MAC-M1-AIR', name: 'MacBook Air M1 Space Gray', quantity: 2, category: 'Laptops' },
    { id: 104, code: 'APP-AIRPODS-3', name: 'AirPods 3ra Gen', quantity: 8, category: 'Accesorios' },
    { id: 105, code: 'SAM-BUDS-PRO', name: 'Samsung Galaxy Buds Pro', quantity: 4, category: 'Accesorios' },
    { id: 106, code: 'JBL-FLIP-5', name: 'JBL Flip 5 Black', quantity: 6, category: 'Audio' },
];

export function ImportSalesDialog({ open, onOpenChange, onImport, sourceBranchId }: ImportSalesDialogProps) {
    const [dateFrom, setDateFrom] = useState<Date>();
    const [dateTo, setDateTo] = useState<Date>();
    const [category, setCategory] = useState<string>("all");
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<typeof MOCK_SOLD_PRODUCTS>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // Simulate searching
    const handleSearch = () => {
        if (!dateFrom || !dateTo) {
            sileo.error({ title: "Seleccione un rango de fechas" });
            return;
        }

        setLoading(true);
        setResults([]);

        // Simulate API delay
        setTimeout(() => {
            // Filter mock data by category if selected
            const filtered = category === "all"
                ? MOCK_SOLD_PRODUCTS
                : MOCK_SOLD_PRODUCTS.filter(p => p.category === category);

            setResults(filtered);
            setLoading(false);
            sileo.success({ title: `Se encontraron ${filtered.length} productos vendidos` });
        }, 1000); // 1.5s delay
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
        const itemsToImport = results
            .filter(r => selectedIds.includes(r.id))
            .map(r => ({ productId: r.id, quantity: r.quantity }));

        onImport(itemsToImport);
        onOpenChange(false);
        sileo.success({ title: `${itemsToImport.length} productos agregados a la transferencia` });

        // Reset state
        setResults([]);
        setSelectedIds([]);
    };

    const handleExport = (type: 'pdf' | 'excel') => {
        if (results.length === 0) {
            sileo.error({ title: "No hay datos para exportar" });
            return;
        }
        sileo.info({ title: `Exportando a ${type.toUpperCase()}... (Simulación)` });
        // Here we would use jspdf or xlsx
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Importar Productos Vendidos</DialogTitle>
                    <DialogDescription>
                        Busque productos vendidos en un rango de fechas para reponer stock.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-2">
                            <Label>Desde</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateFrom ? format(dateFrom, "P", { locale: es }) : "Seleccionar"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus locale={es} /></PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2">
                            <Label>Hasta</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateTo ? format(dateTo, "P", { locale: es }) : "Seleccionar"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus locale={es} /></PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2">
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

                        <Button onClick={handleSearch} disabled={loading || !sourceBranchId}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                            Buscar
                        </Button>
                    </div>

                    {/* Results Area */}
                    <div className="rounded-md border flex-1 overflow-hidden min-h-[300px] flex flex-col">
                        <div className="p-2 border-b bg-muted/30 flex justify-between items-center">
                            <span className="text-sm text-muted-foreground ml-2">
                                {results.length > 0 ? `${results.length} resultados encontrados` : "Realice una búsqueda para ver resultados"}
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

                        <div className="flex-1 overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[40px]">
                                            <Checkbox
                                                checked={results.length > 0 && selectedIds.length === results.length}
                                                onCheckedChange={handleToggleAll}
                                                disabled={results.length === 0}
                                            />
                                        </TableHead>
                                        <TableHead>Código</TableHead>
                                        <TableHead>Producto</TableHead>
                                        <TableHead>Categoría</TableHead>
                                        <TableHead className="text-right">Cant. Vendida</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                                <span className="text-muted-foreground text-sm mt-2 block">Buscando productos...</span>
                                            </TableCell>
                                        </TableRow>
                                    ) : results.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                No hay datos para mostrar
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
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleImport} disabled={selectedIds.length === 0} className="gap-2">
                        <Download className="h-4 w-4" />
                        Importar Seleccionados ({selectedIds.length})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
