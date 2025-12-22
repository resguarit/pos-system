import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBranch } from "@/context/BranchContext";
import {
    CalendarDays,
    Clock,
    Plus,
    Search,
    Wrench,
    Eye,
    Pencil,
    RotateCw,
    LayoutGrid,
    List,
    Trash2,
    Download,
    CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DatePickerWithRange, DateRange } from "@/components/ui/date-range-picker";
import { useResizableColumns } from "@/hooks/useResizableColumns";
import { ResizableTableHeader, ResizableTableCell } from "@/components/ui/resizable-table-header";
import BranchRequiredWrapper from "@/components/layout/branch-required-wrapper";
import RepairsStatusCard from "@/components/cards/RepairsStatusCard";
import RepairKanbanView from "@/components/RepairKanbanView";
import NewRepairDialog from "@/components/modals/NewRepairDialog";
import RepairDetailDialogV2 from "@/components/modals/RepairDetailDialogV2";
import { useRepairs } from "@/hooks/useRepairs";
import type { Repair, RepairStatus, RepairPriority } from "@/types/repairs";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// Badge color configs
const STATUS_BADGE_COLORS: Record<RepairStatus, string> = {
    Recibido: "bg-blue-50 text-blue-700 hover:bg-blue-50",
    "En diagnóstico": "bg-yellow-50 text-yellow-700 hover:bg-yellow-50",
    "Reparación Interna": "bg-orange-50 text-orange-700 hover:bg-orange-50",
    "Reparación Externa": "bg-cyan-50 text-cyan-700 hover:bg-cyan-50",
    "Esperando repuestos": "bg-purple-50 text-purple-700 hover:bg-purple-50",
    Terminado: "bg-green-50 text-green-700 hover:bg-green-50",
    Entregado: "bg-gray-50 text-gray-700 hover:bg-gray-50",
};

const PRIORITY_BADGE_COLORS: Record<RepairPriority, string> = {
    Alta: "bg-red-50 text-red-700 hover:bg-red-50",
    Media: "bg-yellow-50 text-yellow-700 hover:bg-yellow-50",
    Baja: "bg-green-50 text-green-700 hover:bg-green-50",
};

export default function ReparacionesPage() {
    const { hasPermission } = useAuth();
    const { selectedBranchIds } = useBranch();

    // View mode: table or kanban
    const [viewMode, setViewMode] = useState<"table" | "kanban">("table");

    // Hook for repairs data
    const {
        repairs,
        stats,
        kanbanData,
        options,
        loading,
        filters,
        setFilters,
        fetchKanban,
        createRepair,
        updateRepair,
        deleteRepair,
        updateStatus,
        addNote,
        getRepair,
        downloadPdf,
        refresh,
    } = useRepairs();

    // Resizable columns configuration
    const columnConfig = [
        { id: "code", minWidth: 100, maxWidth: 150, defaultWidth: 120 },
        { id: "customer", minWidth: 150, maxWidth: 300, defaultWidth: 200 },
        { id: "device", minWidth: 120, maxWidth: 250, defaultWidth: 180 },
        { id: "status", minWidth: 120, maxWidth: 180, defaultWidth: 150 },
        { id: "priority", minWidth: 80, maxWidth: 120, defaultWidth: 100 },
        { id: "cost", minWidth: 100, maxWidth: 150, defaultWidth: 120 },
        { id: "sale_price", minWidth: 100, maxWidth: 150, defaultWidth: 120 },
        { id: "actions", minWidth: 180, maxWidth: 250, defaultWidth: 200 },
    ];

    const {
        getResizeHandleProps,
        getColumnHeaderProps,
        getColumnCellProps,
        tableRef,
    } = useResizableColumns({
        columns: columnConfig,
        storageKey: "repairs-column-widths",
        defaultWidth: 150,
    });

    // Date filter using DateRangePicker
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

    // Dialog states
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [editMode, setEditMode] = useState(false);

    // Delete confirmation
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [repairToDelete, setRepairToDelete] = useState<Repair | null>(null);

    // Apply date range to filters
    useEffect(() => {
        if (dateRange?.from) {
            setFilters((f) => ({
                ...f,
                from_date: format(dateRange.from, "yyyy-MM-dd"),
                to_date: dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
            }));
        } else {
            setFilters((f) => ({
                ...f,
                from_date: undefined,
                to_date: undefined,
            }));
        }
    }, [dateRange, setFilters]);

    // Fetch kanban data when switching to kanban view
    useEffect(() => {
        if (viewMode === "kanban") {
            fetchKanban();
        }
    }, [viewMode, fetchKanban]);

    // View repair detail
    const handleView = async (repair: Repair) => {
        setDetailLoading(true);
        setDetailDialogOpen(true);
        setEditMode(false);
        try {
            const fullRepair = await getRepair(repair.id);
            setSelectedRepair(fullRepair);
        } finally {
            setDetailLoading(false);
        }
    };

    // Edit repair
    const handleEdit = async (repair: Repair) => {
        setDetailLoading(true);
        setDetailDialogOpen(true);
        setEditMode(true);
        try {
            const fullRepair = await getRepair(repair.id);
            setSelectedRepair(fullRepair);
        } finally {
            setDetailLoading(false);
        }
    };

    // Save repair changes (including staged notes)
    const handleSaveRepair = async (data: Partial<Repair>, notes?: string[]) => {
        if (!selectedRepair) return;
        const updated = await updateRepair(selectedRepair.id, data as any);
        if (updated) {
            // Save any staged notes
            if (notes && notes.length > 0) {
                for (const note of notes) {
                    await addNote(selectedRepair.id, note);
                }
                // Refresh to get the new notes
                const refreshed = await getRepair(selectedRepair.id);
                setSelectedRepair(refreshed);
            } else {
                setSelectedRepair(updated);
            }
            setEditMode(false);
            refresh();
        }
    };

    // Create repair
    const handleCreateRepair = async (data: Parameters<typeof createRepair>[0]) => {
        const repair = await createRepair(data);
        if (repair) {
            refresh();
            return true;
        }
        return false;
    };

    // Delete repair
    const handleDeleteConfirm = async () => {
        if (!repairToDelete) return;
        const success = await deleteRepair(repairToDelete.id);
        if (success) {
            refresh();
            setDeleteDialogOpen(false);
            setRepairToDelete(null);
        }
    };

    // Status change (from Kanban)
    const handleStatusChange = async (repairId: number, newStatus: RepairStatus) => {
        const updated = await updateStatus(repairId, newStatus);
        if (updated) {
            if (viewMode === "kanban") {
                fetchKanban();
            }
            refresh();
        }
    };

    // Download PDF
    const handleDownloadPdf = async (repair: Repair) => {
        await downloadPdf(repair.id);
    };

    // Format currency
    const formatCurrency = (amount: number | null | undefined) => {
        if (amount === null || amount === undefined) return "-";
        return `$${amount.toLocaleString("es-AR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    };

    // Get branch ID for creating repairs
    const branchId =
        selectedBranchIds && selectedBranchIds[0] && selectedBranchIds[0] !== "all"
            ? selectedBranchIds[0]
            : null;

    return (
        <BranchRequiredWrapper
            title="Selecciona una sucursal"
            description="Las reparaciones necesitan una sucursal seleccionada para funcionar correctamente."
            allowMultipleBranches={true}
        >
            <div className="h-full w-full flex flex-col space-y-4 p-4 md:p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-bold tracking-tight">Reparaciones</h2>
                    <div className="flex items-center gap-2">
                        {/* View Toggle */}
                        <div className="flex items-center border rounded-md">
                            <Button
                                variant={viewMode === "table" ? "secondary" : "ghost"}
                                size="sm"
                                className="rounded-r-none"
                                onClick={() => setViewMode("table")}
                            >
                                <List className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={viewMode === "kanban" ? "secondary" : "ghost"}
                                size="sm"
                                className="rounded-l-none"
                                onClick={() => setViewMode("kanban")}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                        </div>

                        <Button variant="outline" size="icon" onClick={refresh} disabled={loading} title="Refrescar">
                            <RotateCw className={cn("h-4 w-4", loading && "animate-spin")} />
                        </Button>

                        {hasPermission("crear_reparaciones") && (
                            <Button onClick={() => setCreateDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Nueva Reparación
                            </Button>
                        )}
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <RepairsStatusCard
                        title="Total Reparaciones"
                        icon={<Wrench className="h-4 w-4 text-blue-600" />}
                        count={stats.total}
                        loading={loading}
                        footer={<p className="text-xs text-muted-foreground">Total en sistema</p>}
                    />
                    <RepairsStatusCard
                        title="En Proceso"
                        icon={<Clock className="h-4 w-4 text-orange-600" />}
                        count={stats.enProceso}
                        loading={loading}
                        footer={<p className="text-xs text-muted-foreground">Actualmente</p>}
                    />
                    <RepairsStatusCard
                        title="Terminadas"
                        icon={<CalendarDays className="h-4 w-4 text-green-600" />}
                        count={stats.terminadas}
                        loading={loading}
                        footer={<p className="text-xs text-muted-foreground">Pendientes de entrega</p>}
                    />
                    <RepairsStatusCard
                        title="Entregadas"
                        icon={<CheckCircle2 className="h-4 w-4 text-gray-600" />}
                        count={stats.entregadas}
                        loading={loading}
                        footer={<p className="text-xs text-muted-foreground">Completadas</p>}
                    />
                </div>

                {/* Filters */}
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div className="flex flex-1 items-center gap-2">
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Buscar reparaciones..."
                                className="w-full pl-8"
                                value={filters.search || ""}
                                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                            />
                        </div>
                        <Select
                            value={filters.status || "all"}
                            onValueChange={(v) =>
                                setFilters((f) => ({
                                    ...f,
                                    status: v === "all" ? undefined : (v as RepairStatus),
                                }))
                            }
                        >
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los estados</SelectItem>
                                {options.statuses.map((s) => (
                                    <SelectItem key={s} value={s}>
                                        {s}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DatePickerWithRange
                        selected={dateRange}
                        onSelect={setDateRange}
                        className="w-full md:w-auto"
                    />
                </div>

                {/* Content: Table or Kanban */}
                {viewMode === "table" ? (
                    // Table View
                    loading ? (
                        <div className="flex items-center justify-center py-12 text-muted-foreground">
                            <RotateCw className="animate-spin mr-2 h-5 w-5" /> Cargando reparaciones...
                        </div>
                    ) : (
                        <div className="rounded-md border bg-card">
                            {repairs.length > 0 ? (
                                <div className="relative">
                                    <Table ref={tableRef} className="w-full">
                                        <TableHeader>
                                            <TableRow>
                                                <ResizableTableHeader
                                                    columnId="code"
                                                    getResizeHandleProps={getResizeHandleProps}
                                                    getColumnHeaderProps={getColumnHeaderProps}
                                                >
                                                    Código
                                                </ResizableTableHeader>
                                                <ResizableTableHeader
                                                    columnId="customer"
                                                    getResizeHandleProps={getResizeHandleProps}
                                                    getColumnHeaderProps={getColumnHeaderProps}
                                                >
                                                    Cliente
                                                </ResizableTableHeader>
                                                <ResizableTableHeader
                                                    columnId="device"
                                                    getResizeHandleProps={getResizeHandleProps}
                                                    getColumnHeaderProps={getColumnHeaderProps}
                                                >
                                                    Equipo
                                                </ResizableTableHeader>
                                                <ResizableTableHeader
                                                    columnId="status"
                                                    getResizeHandleProps={getResizeHandleProps}
                                                    getColumnHeaderProps={getColumnHeaderProps}
                                                >
                                                    Estado
                                                </ResizableTableHeader>
                                                <ResizableTableHeader
                                                    columnId="priority"
                                                    getResizeHandleProps={getResizeHandleProps}
                                                    getColumnHeaderProps={getColumnHeaderProps}
                                                >
                                                    Prioridad
                                                </ResizableTableHeader>
                                                <ResizableTableHeader
                                                    columnId="cost"
                                                    getResizeHandleProps={getResizeHandleProps}
                                                    getColumnHeaderProps={getColumnHeaderProps}
                                                >
                                                    Costo
                                                </ResizableTableHeader>
                                                <ResizableTableHeader
                                                    columnId="sale_price"
                                                    getResizeHandleProps={getResizeHandleProps}
                                                    getColumnHeaderProps={getColumnHeaderProps}
                                                >
                                                    Precio Venta
                                                </ResizableTableHeader>
                                                <ResizableTableHeader
                                                    columnId="actions"
                                                    getResizeHandleProps={getResizeHandleProps}
                                                    getColumnHeaderProps={getColumnHeaderProps}
                                                    className="text-center"
                                                >
                                                    Acciones
                                                </ResizableTableHeader>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {repairs.map((rep) => (
                                                <TableRow key={rep.id}>
                                                    <ResizableTableCell
                                                        columnId="code"
                                                        getColumnCellProps={getColumnCellProps}
                                                    >
                                                        <span className="font-mono font-medium">
                                                            {rep.code || rep.id}
                                                        </span>
                                                    </ResizableTableCell>
                                                    <ResizableTableCell
                                                        columnId="customer"
                                                        getColumnCellProps={getColumnCellProps}
                                                    >
                                                        {rep.customer?.name || "-"}
                                                    </ResizableTableCell>
                                                    <ResizableTableCell
                                                        columnId="device"
                                                        getColumnCellProps={getColumnCellProps}
                                                    >
                                                        {rep.device}
                                                    </ResizableTableCell>
                                                    <ResizableTableCell
                                                        columnId="status"
                                                        getColumnCellProps={getColumnCellProps}
                                                    >
                                                        <Badge
                                                            variant="outline"
                                                            className={STATUS_BADGE_COLORS[rep.status]}
                                                        >
                                                            {rep.status}
                                                        </Badge>
                                                    </ResizableTableCell>
                                                    <ResizableTableCell
                                                        columnId="priority"
                                                        getColumnCellProps={getColumnCellProps}
                                                    >
                                                        <Badge
                                                            variant="outline"
                                                            className={PRIORITY_BADGE_COLORS[rep.priority]}
                                                        >
                                                            {rep.priority}
                                                        </Badge>
                                                    </ResizableTableCell>
                                                    <ResizableTableCell
                                                        columnId="cost"
                                                        getColumnCellProps={getColumnCellProps}
                                                    >
                                                        {formatCurrency(rep.cost)}
                                                    </ResizableTableCell>
                                                    <ResizableTableCell
                                                        columnId="sale_price"
                                                        getColumnCellProps={getColumnCellProps}
                                                    >
                                                        {formatCurrency(rep.sale_price)}
                                                    </ResizableTableCell>
                                                    <ResizableTableCell
                                                        columnId="actions"
                                                        getColumnCellProps={getColumnCellProps}
                                                        className="text-right"
                                                    >
                                                        <div className="flex justify-end gap-1">
                                                            {hasPermission("ver_reparaciones") && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="hover:bg-blue-100 group"
                                                                    onClick={() => handleView(rep)}
                                                                    title="Ver"
                                                                >
                                                                    <Eye className="h-4 w-4 text-blue-600 group-hover:text-blue-700" />
                                                                </Button>
                                                            )}
                                                            {hasPermission("editar_reparaciones") && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="hover:bg-orange-100 group"
                                                                    onClick={() => handleEdit(rep)}
                                                                    title="Editar"
                                                                >
                                                                    <Pencil className="h-4 w-4 text-orange-600 group-hover:text-orange-700" />
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="hover:bg-amber-100 group"
                                                                onClick={() => handleDownloadPdf(rep)}
                                                                title="Descargar PDF"
                                                            >
                                                                <Download className="h-4 w-4 text-amber-600 group-hover:text-amber-700" />
                                                            </Button>
                                                            {hasPermission("eliminar_reparaciones") && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="hover:bg-red-100 group"
                                                                    onClick={() => {
                                                                        setRepairToDelete(rep);
                                                                        setDeleteDialogOpen(true);
                                                                    }}
                                                                    title="Eliminar"
                                                                >
                                                                    <Trash2 className="h-4 w-4 text-red-600 group-hover:text-red-700" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </ResizableTableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="p-4 text-center text-muted-foreground">Sin resultados</div>
                            )}
                        </div>
                    )
                ) : (
                    // Kanban View
                    <RepairKanbanView
                        columns={kanbanData}
                        onView={handleView}
                        onEdit={handleEdit}
                        onStatusChange={handleStatusChange}
                        onDownloadPdf={handleDownloadPdf}
                        loading={loading}
                    />
                )}

                {/* Dialogs */}
                <NewRepairDialog
                    open={createDialogOpen}
                    onOpenChange={setCreateDialogOpen}
                    onSubmit={handleCreateRepair}
                    branchId={branchId}
                    options={options}
                />

                <RepairDetailDialogV2
                    open={detailDialogOpen}
                    onOpenChange={(open) => {
                        setDetailDialogOpen(open);
                        if (!open) {
                            setSelectedRepair(null);
                            setEditMode(false);
                        }
                    }}
                    repair={selectedRepair}
                    loading={detailLoading}
                    editMode={editMode}
                    onSave={handleSaveRepair}
                    onCancelEdit={() => setEditMode(false)}
                    onDownloadPdf={
                        selectedRepair ? () => handleDownloadPdf(selectedRepair) : undefined
                    }
                    options={options}
                />

                {/* Delete Confirmation */}
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar reparación?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminará la reparación{" "}
                                <strong>{repairToDelete?.code}</strong> del sistema.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteConfirm}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                Eliminar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </BranchRequiredWrapper>
    );
}
