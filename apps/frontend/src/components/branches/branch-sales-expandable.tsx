import * as React from "react";
import { Button } from "@/components/ui/button";
import { TableRow, TableCell } from "@/components/ui/table";
import { ChevronDown, ChevronRight, Eye, Edit, Trash2, BarChart2, AlertCircle, Info, RotateCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Local Branch interface, ensure consistency if imported from elsewhere in other contexts
interface Branch {
  id: string;
  description: string;
  address: string;
  phone: string;
  status: number;
  color: string;
  manager_id: number | null;
  manager?: { person: { first_name: string; last_name: string } } | null;
  // Sales summary fields (all optional)
  sales_count?: number;
  grand_total_amount?: number;
  grand_total_iva?: number;
  average_sale_amount?: number;
  budget_count?: number;
  client_count?: number;
}

// Props for a single, expandable branch row
export interface BranchSalesExpandableProps {
  branch: Branch; // Receives a single branch object
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSalesHistory: () => void;
  hasDateRangeSelected: boolean; // Indicates if a date range is selected in the parent
  isLoadingSummary: boolean;      // True if summary data for the selected range is loading
  summaryErrorMessage: string | null; // Error message if summary fetch failed
  hasSummaryData: boolean; // True if summary data is available for the current range & this specific branch
}

const formatCurrency = (amount: number | undefined) => {
  if (typeof amount !== 'number' || isNaN(amount)) return "N/A";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(amount);
};

export function BranchSalesExpandable({
  branch,
  onView,
  onEdit,
  onDelete,
  onSalesHistory,
  hasDateRangeSelected,
  isLoadingSummary,
  summaryErrorMessage,
  hasSummaryData
}: BranchSalesExpandableProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const getStatusBadge = (status: number) => {
    if (status === 1) return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">Activa</Badge>;
    if (status === 0) return <Badge variant="destructive">Inactiva</Badge>;
    return <Badge variant="outline">Desconocido</Badge>;
  };

  return (
    <>
      <TableRow className="hover:bg-muted/50">
        <TableCell className="w-[80px] hidden sm:table-cell font-medium" onClick={() => setIsExpanded(!isExpanded)} style={{cursor: 'pointer'}}>{branch.id}</TableCell>
        <TableCell onClick={() => setIsExpanded(!isExpanded)} style={{cursor: 'pointer'}}>
          <div className="flex items-center">
            <span 
              className="inline-block h-3 w-3 rounded-full mr-2 flex-shrink-0"
              style={{ backgroundColor: branch.color || "#cccccc" }} 
            />
            <span className="font-medium">{branch.description}</span>
          </div>
        </TableCell>
        <TableCell className="hidden md:table-cell" onClick={() => setIsExpanded(!isExpanded)} style={{cursor: 'pointer'}}>{branch.address}</TableCell>
        <TableCell className="hidden lg:table-cell" onClick={() => setIsExpanded(!isExpanded)} style={{cursor: 'pointer'}}>{branch.phone}</TableCell>
        <TableCell className="hidden lg:table-cell" onClick={() => setIsExpanded(!isExpanded)} style={{cursor: 'pointer'}}>
          {branch.manager ? `${branch.manager.person.first_name} ${branch.manager.person.last_name}` : "N/A"}
        </TableCell>
        <TableCell className="hidden sm:table-cell" onClick={() => setIsExpanded(!isExpanded)} style={{cursor: 'pointer'}}>{getStatusBadge(branch.status)}</TableCell>
        <TableCell className="text-right">
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onView(); }} title="Ver Detalles">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Editar">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onSalesHistory(); }} title="Historial de Ventas">
            <BarChart2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Eliminar">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} title={isExpanded ? "Colapsar" : "Expandir"}>
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </TableCell>
      </TableRow>

      {isExpanded && (
        <TableRow>
          <TableCell colSpan={7}> {/* Ensure colSpan matches the number of columns */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-md m-1 border border-slate-200 dark:border-slate-700">
              {isLoadingSummary ? (
                <div className="flex items-center text-sm text-muted-foreground p-3">
                  <RotateCw className="h-5 w-5 mr-2 animate-spin flex-shrink-0" />
                  <span>Cargando resumen de ventas...</span>
                </div>
              ) : summaryErrorMessage ? (
                <div className="flex items-center text-sm text-red-600 dark:text-red-400 p-3">
                  <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                  <span>Error: {summaryErrorMessage}</span>
                </div>
              ) : hasSummaryData && branch.sales_count !== undefined ? (
                // Display summary if data is available (either all-time or for a selected range)
                <Card className="shadow-none bg-transparent border-0">
                  <CardHeader className="pb-2 pt-2 px-3">
                    <CardTitle className="text-md font-semibold">
                      Resumen {hasDateRangeSelected ? "del Periodo" : "General"} (Sucursal: {branch.description})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                      <div><strong>Ventas:</strong> {branch.sales_count ?? 0}</div>
                      <div><strong>Presupuestos:</strong> {branch.budget_count ?? 0}</div>
                      <div><strong>Clientes Únicos:</strong> {branch.client_count ?? 0}</div>
                      <div className="sm:col-span-1"><strong>Monto Total:</strong> {formatCurrency(branch.grand_total_amount)}</div>
                      <div className="sm:col-span-1"><strong>IVA Total:</strong> {formatCurrency(branch.grand_total_iva)}</div>
                      <div className="sm:col-span-1"><strong>Promedio Venta:</strong> {formatCurrency(branch.average_sale_amount)}</div>
                    </div>
                  </CardContent>
                </Card>
              ) : !hasDateRangeSelected && !hasSummaryData && !isLoadingSummary && !summaryErrorMessage ? (
                // Initial state, no range selected, and no all-time summary data loaded yet or available for this branch
                <div className="flex items-center text-sm text-muted-foreground p-3">
                  <Info className="h-5 w-5 mr-2 flex-shrink-0" />
                  <span>No hay datos de resumen general para esta sucursal o aún no se han cargado.</span>
                </div>
              ) : hasDateRangeSelected && !hasSummaryData && !isLoadingSummary && !summaryErrorMessage ? (
                 // Date range selected, but no data for this specific branch in that range
                <div className="flex items-center text-sm text-muted-foreground p-3">
                  <Info className="h-5 w-5 mr-2 flex-shrink-0" />
                  <span>No hay datos de resumen de ventas para esta sucursal en el rango seleccionado.</span>
                </div>
              ) : (
                // Fallback for other unhandled states, e.g. data expected but not present for unknown reason
                <div className="flex items-center text-sm text-muted-foreground p-3">
                  <Info className="h-5 w-5 mr-2 flex-shrink-0" />
                  <span>{hasDateRangeSelected ? "No se encontraron datos de resumen para el periodo seleccionado." : "No hay datos de resumen disponibles para esta sucursal."}</span>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
