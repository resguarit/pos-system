import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Eye,
    Pencil,
    MoreVertical,
    FileText,
    User,
    Phone,
    Wrench,
    Clock,
    AlertTriangle,
    CheckCircle,
    Package,
    Truck,
} from "lucide-react";
import type { Repair, RepairStatus, RepairPriority, KanbanColumn } from "@/types/repairs";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<RepairStatus, {
    color: string;
    bgColor: string;
    borderColor: string;
    icon: React.ReactNode;
}> = {
    "Recibido": {
        color: "text-blue-700",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        icon: <Package className="h-4 w-4" />,
    },
    "En diagnóstico": {
        color: "text-yellow-700",
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-200",
        icon: <AlertTriangle className="h-4 w-4" />,
    },
    "Reparación Interna": {
        color: "text-orange-700",
        bgColor: "bg-orange-50",
        borderColor: "border-orange-200",
        icon: <Wrench className="h-4 w-4" />,
    },
    "Reparación Externa": {
        color: "text-cyan-700",
        bgColor: "bg-cyan-50",
        borderColor: "border-cyan-200",
        icon: <Wrench className="h-4 w-4" />,
    },
    "Esperando repuestos": {
        color: "text-purple-700",
        bgColor: "bg-purple-50",
        borderColor: "border-purple-200",
        icon: <Clock className="h-4 w-4" />,
    },
    "Terminado": {
        color: "text-green-700",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        icon: <CheckCircle className="h-4 w-4" />,
    },
    "Entregado": {
        color: "text-gray-700",
        bgColor: "bg-gray-50",
        borderColor: "border-gray-200",
        icon: <Truck className="h-4 w-4" />,
    },
};

const PRIORITY_CONFIG: Record<RepairPriority, { color: string; bgColor: string }> = {
    "Alta": { color: "text-red-700", bgColor: "bg-red-100" },
    "Media": { color: "text-yellow-700", bgColor: "bg-yellow-100" },
    "Baja": { color: "text-green-700", bgColor: "bg-green-100" },
};

type RepairKanbanViewProps = {
    columns: KanbanColumn[];
    onView: (repair: Repair) => void;
    onEdit: (repair: Repair) => void;
    onStatusChange: (repairId: number, newStatus: RepairStatus) => void;
    onDownloadPdf: (repair: Repair) => void;
    loading?: boolean;
};

function RepairCard({
    repair,
    onView,
    onEdit,
    onStatusChange,
    onDownloadPdf,
}: {
    repair: Repair;
    onView: () => void;
    onEdit: () => void;
    onStatusChange: (status: RepairStatus) => void;
    onDownloadPdf: () => void;
}) {
    const priorityConfig = PRIORITY_CONFIG[repair.priority];

    return (
        <Card className="mb-3 last:mb-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
            <CardContent className="p-3">
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-gray-700">
                            {repair.code}
                        </span>
                        <Badge
                            variant="outline"
                            className={cn("text-xs", priorityConfig.bgColor, priorityConfig.color)}
                        >
                            {repair.priority}
                        </Badge>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={onView}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver detalle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onEdit}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onDownloadPdf}>
                                <FileText className="h-4 w-4 mr-2" />
                                Descargar PDF
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Device */}
                <div className="mb-2">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">
                        {repair.device}
                    </p>
                </div>

                {/* Customer */}
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                                <User className="h-3 w-3" />
                                <span className="line-clamp-1">{repair.customer?.name || "Sin cliente"}</span>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <div className="text-sm">
                                <p className="font-medium">{repair.customer?.name}</p>
                                {repair.customer?.phone && (
                                    <p className="flex items-center gap-1 text-muted-foreground">
                                        <Phone className="h-3 w-3" />
                                        {repair.customer.phone}
                                    </p>
                                )}
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                {/* Issue preview */}
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                    {repair.issue_description}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs">
                    {repair.technician?.name ? (
                        <div className="flex items-center gap-1 text-gray-500">
                            <Wrench className="h-3 w-3" />
                            <span className="line-clamp-1">{repair.technician.name}</span>
                        </div>
                    ) : (
                        <span className="text-gray-400 italic">Sin técnico</span>
                    )}

                    {repair.sale_price && (
                        <span className="font-medium text-gray-700">
                            ${repair.sale_price.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                        </span>
                    )}
                </div>

                {/* Quick status change buttons */}
                <div className="mt-3 pt-2 border-t flex gap-1 flex-wrap opacity-0 group-hover:opacity-100 transition-opacity">
                    {Object.keys(STATUS_CONFIG)
                        .filter((s) => s !== repair.status)
                        .slice(0, 3)
                        .map((status) => (
                            <Button
                                key={status}
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs px-2"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onStatusChange(status as RepairStatus);
                                }}
                            >
                                → {status.split(" ")[0]}
                            </Button>
                        ))}
                </div>
            </CardContent>
        </Card>
    );
}

function KanbanColumnComponent({
    column,
    onView,
    onEdit,
    onStatusChange,
    onDownloadPdf,
}: {
    column: KanbanColumn;
    onView: (repair: Repair) => void;
    onEdit: (repair: Repair) => void;
    onStatusChange: (repairId: number, newStatus: RepairStatus) => void;
    onDownloadPdf: (repair: Repair) => void;
}) {
    const config = STATUS_CONFIG[column.id];

    return (
        <div
            className={cn(
                "flex-shrink-0 w-72 rounded-lg border flex flex-col",
                config.bgColor,
                config.borderColor
            )}
        >
            <CardHeader className="py-3 px-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className={config.color}>{config.icon}</span>
                        <CardTitle className={cn("text-sm font-semibold", config.color)}>
                            {column.title}
                        </CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                        {column.items.length}
                    </Badge>
                </div>
            </CardHeader>
            <div className="px-3 pb-3 flex-1 overflow-auto" style={{ minHeight: 0 }}>
                {column.items.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                        Sin reparaciones
                    </div>
                ) : (
                    <>
                        {column.items.map((repair) => (
                            <RepairCard
                                key={repair.id}
                                repair={repair}
                                onView={() => onView(repair)}
                                onEdit={() => onEdit(repair)}
                                onStatusChange={(status) => onStatusChange(repair.id, status)}
                                onDownloadPdf={() => onDownloadPdf(repair)}
                            />
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}

export default function RepairKanbanView({
    columns,
    onView,
    onEdit,
    onStatusChange,
    onDownloadPdf,
    loading,
}: RepairKanbanViewProps) {
    if (loading) {
        return (
            <div className="flex gap-4 overflow-x-auto pb-4">
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        className="flex-shrink-0 w-72 h-96 rounded-lg bg-gray-100 animate-pulse"
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 items-start">
            {columns.map((column) => (
                <KanbanColumnComponent
                    key={column.id}
                    column={column}
                    onView={onView}
                    onEdit={onEdit}
                    onStatusChange={onStatusChange}
                    onDownloadPdf={onDownloadPdf}
                />
            ))}
        </div>
    );
}
