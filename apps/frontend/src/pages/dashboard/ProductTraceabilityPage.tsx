import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useApi from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BranchBadge } from "@/components/BranchBadge";
import { getBranchColor } from "@/utils/branchColor";
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, RefreshCcw, DollarSign, History, AlertCircle } from "lucide-react";
import { NumberFormatter } from "@/lib/formatters/numberFormatter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { ResizableTableHeader, ResizableTableCell } from '@/components/ui/resizable-table-header';
import { useBranch } from "@/context/BranchContext";
import { useEntityContext } from "@/context/EntityContext";
import { type Branch } from "@/types/branch";

interface TimelineEvent {
    id: number | string;
    date: string;
    type: string;
    subtype: string;
    quantity_change: number;
    stock_balance: number | null;
    unit_price: number | null;
    sale_price: number | null;
    branch: string;
    branch_id: number;
    user: string;
    user_id: number;
    notes: string | null;
    reference: {
        type: string;
        id: number;
        label: string;
    } | null;
    old_unit_price?: number;
    displayBalance?: number;
}

interface ProductDetails {
    id: number;
    description: string;
    code: string;
    current_stock: number;
    current_price: number;
    current_sale_price: number;
    currency?: string;
}

const SUBTYPE_TRANSLATIONS: Record<string, string> = {
    'purchase_order': 'Orden de compra',
    'Purchase_order': 'Orden de compra',
    'purchase': 'Compra',
    'sale': 'Venta',
    'adjustment': 'Ajuste',
    'manual_update': 'Actualización Manual',
    'price_change': 'Cambio de Precio',
    'Initial': 'Inicial',
    'Transfer_in': 'Transferencia (Entrada)',
    'Transfer_out': 'Transferencia (Salida)',
    'StockTransfer': 'Transferencia',
    'manual': 'Manual',
    'bulk_update': 'Actualización Masiva',
    'import': 'Importación'
};

export default function ProductTraceabilityPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { request, loading } = useApi();
    const { selectedBranchIds } = useBranch();
    const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
    const [product, setProduct] = useState<ProductDetails | null>(null);
    const { state } = useEntityContext();
    const branches = state.branches ? (Object.values(state.branches) as Branch[]) : [];

    const columnConfig = [
        { id: 'date', minWidth: 140, maxWidth: 200, defaultWidth: 160 },
        { id: 'type', minWidth: 110, maxWidth: 160, defaultWidth: 130 },
        { id: 'detail', minWidth: 200, maxWidth: 600, defaultWidth: 320 },
        { id: 'branch', minWidth: 100, maxWidth: 200, defaultWidth: 150 },
        { id: 'user', minWidth: 100, maxWidth: 200, defaultWidth: 140 },
        { id: 'change', minWidth: 80, maxWidth: 120, defaultWidth: 90 },
        { id: 'balance', minWidth: 80, maxWidth: 120, defaultWidth: 100 },
        { id: 'price', minWidth: 100, maxWidth: 150, defaultWidth: 120 },
    ];

    const {
        getResizeHandleProps,
        getColumnHeaderProps,
        getColumnCellProps,
        tableRef
    } = useResizableColumns({
        columns: columnConfig,
        storageKey: 'product-traceability-columns',
        defaultWidth: 150
    });

    useEffect(() => {
        if (id) {
            fetchHistory();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchHistory defined below, stable by id/branchIds
    }, [id, selectedBranchIds]);

    const fetchHistory = async () => {
        try {
            const params = new URLSearchParams();
            if (selectedBranchIds.length > 0) {
                params.append('branch_ids', selectedBranchIds.join(','));
            }

            const response = await request({
                method: "GET",
                url: `/products/${id}/traceability?${params.toString()}`,
            });
            if (response) {
                // Calculate running total for multi-branch view
                // We start from current total and subtract quantity changes going backwards
                let timelineData = response.timeline || [];
                const productData = response.product || null;

                if (productData && (selectedBranchIds.length !== 1)) {
                    let runningTotal = productData.current_stock;
                    timelineData = timelineData.map((event: TimelineEvent) => {
                        const eventWithBalance = {
                            ...event,
                            displayBalance: runningTotal
                        };
                        // Backtrack: pre-event balance was runningTotal - change
                        runningTotal -= event.quantity_change;
                        return eventWithBalance;
                    });
                } else {
                    // Single branch view: use the branch-specific balance from backend
                    timelineData = timelineData.map((event: TimelineEvent) => ({
                        ...event,
                        displayBalance: event.stock_balance
                    }));
                }

                setTimeline(timelineData);
                setProduct(productData);
            }
        } catch (error) {
            console.error("Error fetching traceability history:", error);
        }
    };

    const getEventIcon = (type: string, subtype: string) => {
        if (type === "price_change") return <DollarSign className="h-4 w-4 text-orange-500" />;
        if (subtype === "sale") return <ArrowUpRight className="h-4 w-4 text-red-500" />;
        if (subtype === "purchase" || subtype === "Purchase_order") return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
        if (subtype === "adjustment") return <RefreshCcw className="h-4 w-4 text-blue-500" />;
        return <History className="h-4 w-4 text-gray-500" />;
    };

    const getEventColor = (type: string, subtype: string) => {
        if (type === "price_change") return "bg-orange-100 text-orange-800 border-orange-200";
        if (subtype === "sale") return "bg-red-50 text-red-700 border-red-100";
        if (subtype === "purchase" || subtype === "Purchase_order") return "bg-green-50 text-green-700 border-green-100";
        if (subtype === "adjustment") return "bg-blue-50 text-blue-700 border-blue-100";
        return "bg-gray-50 text-gray-700 border-gray-100";
    };

    const formatMoney = (amount: number, currency = 'ARS') => {
        return NumberFormatter.formatNumber(amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (currency === 'USD' ? ' USD' : '');
    }

    const translateSubtype = (subtype: string) => {
        return SUBTYPE_TRANSLATIONS[subtype] || subtype;
    };

    const resolveBranchColor = (branchId: number) =>
        getBranchColor({ branchId, branches: branches ?? undefined });

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6 w-full max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Trazabilidad del Producto</h1>
                    <p className="text-muted-foreground">
                        Historial completo de movimientos y cambios
                        {product && <span className="font-medium text-foreground ml-2">• {product.description} ({product.code})</span>}
                    </p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* KPI Cards */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {selectedBranchIds.length > 0 ? 'Stock en Sucursales Seleccionadas' : 'Stock Total (Global)'}
                        </CardTitle>
                        <History className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <div className="h-8 w-20 bg-gray-200 animate-pulse rounded" /> : (
                            <>
                                <div className="text-2xl font-bold">{product?.current_stock ?? 0}</div>
                                <p className="text-xs text-muted-foreground">
                                    {selectedBranchIds.length === 0
                                        ? 'Suma de todas las sucursales'
                                        : `Suma de ${selectedBranchIds.length} sucursal(es)`}
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Costo Unitario</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <div className="h-8 w-20 bg-gray-200 animate-pulse rounded" /> : (
                            <>
                                <div className="text-2xl font-bold">$ {formatMoney(product?.current_price ?? 0, product?.currency)}</div>
                                <p className="text-xs text-muted-foreground">Ultimo costo registrado</p>
                            </>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Precio Venta</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <div className="h-8 w-20 bg-gray-200 animate-pulse rounded" /> : (
                            <>
                                <div className="text-2xl font-bold">$ {formatMoney(product?.current_sale_price ?? 0)}</div>
                                <p className="text-xs text-muted-foreground">Precio de venta actual</p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Línea de Tiempo</CardTitle>
                    <CardDescription>Movimientos de inventario y cambios de precio ordenados cronológicamente.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border relative">
                        <Table ref={tableRef}>
                            <TableHeader>
                                <TableRow>
                                    <ResizableTableHeader
                                        columnId="date"
                                        getResizeHandleProps={getResizeHandleProps}
                                        getColumnHeaderProps={getColumnHeaderProps}
                                    >
                                        Fecha
                                    </ResizableTableHeader>
                                    <ResizableTableHeader
                                        columnId="type"
                                        getResizeHandleProps={getResizeHandleProps}
                                        getColumnHeaderProps={getColumnHeaderProps}
                                    >
                                        Tipo
                                    </ResizableTableHeader>
                                    <ResizableTableHeader
                                        columnId="detail"
                                        getResizeHandleProps={getResizeHandleProps}
                                        getColumnHeaderProps={getColumnHeaderProps}
                                    >
                                        Detalle / Referencia
                                    </ResizableTableHeader>
                                    <ResizableTableHeader
                                        columnId="branch"
                                        getResizeHandleProps={getResizeHandleProps}
                                        getColumnHeaderProps={getColumnHeaderProps}
                                    >
                                        Sucursal
                                    </ResizableTableHeader>
                                    <ResizableTableHeader
                                        columnId="user"
                                        getResizeHandleProps={getResizeHandleProps}
                                        getColumnHeaderProps={getColumnHeaderProps}
                                    >
                                        Usuario
                                    </ResizableTableHeader>
                                    <ResizableTableHeader
                                        columnId="change"
                                        getResizeHandleProps={getResizeHandleProps}
                                        getColumnHeaderProps={getColumnHeaderProps}
                                        className="text-right"
                                    >
                                        Cambio
                                    </ResizableTableHeader>
                                    <ResizableTableHeader
                                        columnId="balance"
                                        getResizeHandleProps={getResizeHandleProps}
                                        getColumnHeaderProps={getColumnHeaderProps}
                                        className="text-right"
                                    >
                                        {selectedBranchIds.length === 1 ? 'Balance (Sucursal)' : 'Balance (Suma)'}
                                    </ResizableTableHeader>
                                    <ResizableTableHeader
                                        columnId="price"
                                        getResizeHandleProps={getResizeHandleProps}
                                        getColumnHeaderProps={getColumnHeaderProps}
                                        className="text-right"
                                    >
                                        Precio
                                    </ResizableTableHeader>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><div className="h-4 w-24 bg-gray-200 animate-pulse rounded" /></TableCell>
                                            <TableCell><div className="h-6 w-20 bg-gray-200 animate-pulse rounded-full" /></TableCell>
                                            <TableCell><div className="h-4 w-32 bg-gray-200 animate-pulse rounded" /></TableCell>
                                            <TableCell><div className="h-4 w-24 bg-gray-200 animate-pulse rounded" /></TableCell>
                                            <TableCell><div className="h-4 w-24 bg-gray-200 animate-pulse rounded" /></TableCell>
                                            <TableCell><div className="h-4 w-12 bg-gray-200 animate-pulse rounded ml-auto" /></TableCell>
                                            <TableCell><div className="h-4 w-12 bg-gray-200 animate-pulse rounded ml-auto" /></TableCell>
                                            <TableCell><div className="h-4 w-16 bg-gray-200 animate-pulse rounded ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : timeline.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <AlertCircle className="h-6 w-6" />
                                                <p>No hay movimientos registrados para este producto aún.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    timeline.map((event) => (
                                        <TableRow key={`${event.type}-${event.id}`}>
                                            <ResizableTableCell
                                                columnId="date"
                                                getColumnCellProps={getColumnCellProps}
                                                className="font-medium"
                                            >
                                                {format(new Date(event.date), "dd/MM/yyyy HH:mm", { locale: es })}
                                            </ResizableTableCell>
                                            <ResizableTableCell
                                                columnId="type"
                                                getColumnCellProps={getColumnCellProps}
                                            >
                                                <Badge variant="outline" className={`gap-1 ${getEventColor(event.type, event.subtype)}`}>
                                                    {getEventIcon(event.type, event.subtype)}
                                                    <span className="capitalize">{translateSubtype(event.subtype)}</span>
                                                </Badge>
                                            </ResizableTableCell>
                                            <ResizableTableCell
                                                columnId="detail"
                                                getColumnCellProps={getColumnCellProps}
                                            >
                                                <div className="flex flex-col gap-1">
                                                    {event.reference && (
                                                        <span className="font-medium text-sm">{event.reference.label}</span>
                                                    )}
                                                    {event.notes && (
                                                        <span className="text-xs text-muted-foreground italic">"{event.notes}"</span>
                                                    )}
                                                    {(event.type === 'price_change' || event.subtype === 'Purchase_order') && event.old_unit_price !== undefined && (
                                                        <span className="text-xs">
                                                            Costo: ${formatMoney(event.old_unit_price)} → <span className="font-medium">${formatMoney(event.unit_price ?? 0)}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </ResizableTableCell>
                                            <ResizableTableCell
                                                columnId="branch"
                                                getColumnCellProps={getColumnCellProps}
                                                className="text-sm"
                                            >
                                                {event.branch !== 'Global' ? (
                                                    <BranchBadge
                                                        name={event.branch}
                                                        color={resolveBranchColor(event.branch_id)}
                                                    />
                                                ) : (
                                                    <span className="font-medium text-muted-foreground">{event.branch}</span>
                                                )}
                                            </ResizableTableCell>
                                            <ResizableTableCell
                                                columnId="user"
                                                getColumnCellProps={getColumnCellProps}
                                                className="text-sm text-muted-foreground"
                                            >
                                                {event.user}
                                            </ResizableTableCell>
                                            <ResizableTableCell
                                                columnId="change"
                                                getColumnCellProps={getColumnCellProps}
                                                className={`text-right font-bold ${event.quantity_change > 0 ? 'text-green-600' : event.quantity_change < 0 ? 'text-red-600' : ''}`}
                                            >
                                                {event.quantity_change !== 0 ? (event.quantity_change > 0 ? `+${event.quantity_change}` : event.quantity_change) : '-'}
                                            </ResizableTableCell>
                                            <ResizableTableCell
                                                columnId="balance"
                                                getColumnCellProps={getColumnCellProps}
                                                className="text-right text-muted-foreground font-mono"
                                            >
                                                {event.displayBalance !== undefined ? event.displayBalance : '-'}
                                            </ResizableTableCell>
                                            <ResizableTableCell
                                                columnId="price"
                                                getColumnCellProps={getColumnCellProps}
                                                className="text-right"
                                            >
                                                {event.unit_price ? `$${formatMoney(event.unit_price)}` : '-'}
                                            </ResizableTableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
