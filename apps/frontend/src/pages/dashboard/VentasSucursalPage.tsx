/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useParams, Link } from "react-router-dom"
import { format, startOfYear } from "date-fns"
import { es } from "date-fns/locale"
import * as XLSX from "xlsx"
import axios from "axios"

// Componentes de UI y Hooks
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import useApi from "@/hooks/useApi"
import { sileo } from "sileo"
import SalesHistoryChart from "@/components/dashboard/sucursales/sales-history-chart"
import ViewSaleDialog from "@/components/view-sale-dialog"
import SaleReceiptPreviewDialog from "@/components/SaleReceiptPreviewDialog"
import EmitCreditNoteDialog from "@/components/sales/EmitCreditNoteDialog"
import { ArcaStatusBadge } from "@/components/sales/ArcaStatusBadge"
import { useAuth } from "@/context/AuthContext"
import Pagination from "@/components/ui/pagination"

// Tipos y Utilidades
import type { SaleHeader } from "@/types/sale"
import type { DateRange } from "@/components/ui/date-range-picker"
import { getReceiptStyle } from "@/lib/receipt-styles"
import { NumberFormatter } from "@/lib/formatters/numberFormatter"

// Tipos
interface Branch {
  id: string | number;
  description: string;
  address?: string;
  phone?: string;
  status?: number;
}

// Iconos
import { ArrowLeft, Download, Search, Filter, Eye, FileText, /*Receipt,*/ BarChart, Users, Loader2, Undo2 } from "lucide-react"

// Tamaño de página para paginación
const PAGE_SIZE = 10;

// --- Componente Principal ---
export default function BranchSalesPage() {
  const params = useParams()
  const { request, loading } = useApi()
  const { hasPermission } = useAuth();
  const [branch, setBranch] = useState<Branch | null>(null)
  const [sales, setSales] = useState<SaleHeader[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [receiptTypeFilter, setReceiptTypeFilter] = useState("all")

  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: startOfYear(new Date()), to: new Date() });

  const [showChart, setShowChart] = useState(false)
  const [selectedSale, setSelectedSale] = useState<SaleHeader | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)
  const [isDevolutionDialogOpen, setIsDevolutionDialogOpen] = useState(false)
  const [saleToDevolve, setSaleToDevolve] = useState<SaleHeader | null>(null)
  const [stats, setStats] = useState({
    total_sales: 0,
    total_amount: 0,
    total_iva: 0,
    budget_count: 0,
    client_count: 0,
  })
  const [isExporting, setIsExporting] = useState(false)

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1)

  // Ref para hacer scroll a la tabla al cambiar de página
  const tableRef = useRef<HTMLDivElement>(null)

  // --- Carga de Datos ---
  const fetchBranchAndSales = useCallback(async (id: string, from: Date | undefined, to: Date | undefined, signal: AbortSignal) => {
    try {
      // Construir parámetros - solo incluir fechas si están definidas
      const apiParams: Record<string, any> = {
        branch_id: id,
      };

      // Solo agregar filtros de fecha si están definidos
      if (from && to) {
        apiParams.from_date = format(from, "yyyy-MM-dd");
        apiParams.to_date = format(to, "yyyy-MM-dd");
      }

      const [branchRes, salesRes, statsRes] = await Promise.all([
        request({ method: "GET", url: `/branches/${id}`, signal }),
        request({ method: "GET", url: `/sales`, params: apiParams, signal }),
        request({ method: "GET", url: `/sales/summary`, params: apiParams, signal })
      ]);

      if (signal.aborted) return;

      // El backend puede devolver los datos directamente o dentro de .data
      const statsData = statsRes.data || statsRes;

      setBranch((branchRes.data || { id, description: `Sucursal ${id}` }) as Branch);

      const salesData = salesRes.data || [];

      setSales(salesData);

      // Filtrar ventas por rango de fechas seleccionado (solo si hay fechas)
      if (from && to) {
        salesData.filter((sale: any) => {
          const saleDate = new Date(sale.date);
          return saleDate >= from && saleDate <= to;
        });
      }


      // Comentar esta línea para usar el filtro temporal
      // setSales(ventasFiltradas);
      setStats({
        total_sales: statsData?.sales_count ?? 0,
        total_amount: statsData?.grand_total_amount ?? 0,
        total_iva: statsData?.grand_total_iva ?? 0,
        budget_count: statsData?.budget_count ?? 0,
        client_count: statsData?.client_count ?? 0,
      });

    } catch (error) {
      if (!axios.isCancel(error)) {
        sileo.error({ title: "Error al cargar los datos de la sucursal." });
      }
    }
  }, [request]);

  useEffect(() => {
    const controller = new AbortController();

    // Si tenemos una fecha de inicio pero no de fin (selección en progreso), no hacemos fetch
    if (dateRange?.from && !dateRange?.to) {
      return;
    }

    // Siempre hacer fetch - con o sin fechas
    if (params.id) {
      fetchBranchAndSales(params.id, dateRange?.from, dateRange?.to, controller.signal);
    }
    return () => controller.abort();
  }, [params.id, dateRange, fetchBranchAndSales]);

  // --- Funciones Auxiliares y de Formateo ---
  const getCustomerName = (sale: SaleHeader): string => {
    const customer = sale.customer as any;


    if (typeof customer === 'string') {
      const trimmed = customer.trim();
      // Si es "Consumidor Final", devolver "-"
      if (trimmed === 'Consumidor Final') {
        return '-';
      }
      return trimmed || '-';
    }
    if (customer && typeof customer === 'object') {
      if (customer.person) {
        const p = customer.person;
        const nombre = [p.first_name, p.last_name].filter(Boolean).join(' ');
        if (nombre) return nombre;
      }
    }
    return '-';
  };
  const getItemsCount = (sale: SaleHeader) => sale.items_count || 0

  const getReceiptType = (sale: SaleHeader): { displayName: string; filterKey: string; arcaCode: string } => {
    if (sale.receipt_type && typeof sale.receipt_type === 'object') {
      const upperDescription = (sale.receipt_type.description || "").toUpperCase();
      const arcaCode = sale.receipt_type.afip_code || "N/A";
      return {
        displayName: upperDescription,
        filterKey: upperDescription,
        arcaCode: String(arcaCode),
      };
    }
    const actualReceiptType = (sale as any).receipt_type as any;
    const actualArcaCode = (sale as any).receipt_type_code as any;

    if (typeof actualReceiptType === 'string' && actualReceiptType.trim() !== '') {
      const upperDescription = actualReceiptType.toUpperCase();
      const arcaCode = (typeof actualArcaCode === 'string' && actualArcaCode.trim() !== '') ? actualArcaCode : "N/A";
      return {
        displayName: upperDescription,
        filterKey: upperDescription,
        arcaCode: arcaCode,
      };
    }
    return { displayName: "N/A", filterKey: "N/A", arcaCode: "N/A" };
  };

  const canIssueCreditNote = (sale: SaleHeader): boolean => {
    const receiptType = getReceiptType(sale).displayName;
    const afipCode = getReceiptType(sale).arcaCode;

    // Si es un comprobante que debería ir a ARCA pero no tiene CAE, no permitir emitir NC
    const isInternal = afipCode === '016' || afipCode === '017' || receiptType.includes('PRESUPUESTO') || receiptType.includes(' X');
    if (!isInternal && !sale.cae) {
      return false;
    }

    return !(
      receiptType.includes('NOTA DE CRÉDITO') ||
      receiptType.includes('DEVOLUCIÓN') ||
      receiptType.includes('PRESUPUESTO') ||
      receiptType.includes(' X') ||
      (sale.credit_notes && sale.credit_notes.length > 0)
    );
  };

  // Memoizar ventas filtradas para evitar recálculos innecesarios
  const filteredSales = useMemo(() => {
    return sales.filter((sale: SaleHeader) => {
      const receiptTypeInfo = getReceiptType(sale);
      const matchesSearch =
        searchTerm === "" ||
        getCustomerName(sale).toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesReceiptType = receiptTypeFilter === "all" || receiptTypeInfo.filterKey === receiptTypeFilter;
      return matchesSearch && matchesReceiptType;
    });
  }, [sales, searchTerm, receiptTypeFilter]);

  // Resetear a página 1 cuando cambien los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, receiptTypeFilter, dateRange]);

  // Memoizar cálculos de paginación
  const paginationData = useMemo(() => {
    const totalItems = filteredSales.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    const paginatedSales = filteredSales.slice(startIndex, endIndex);

    return { totalItems, totalPages, paginatedSales };
  }, [filteredSales, currentPage]);

  const goToPage = useCallback((pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= paginationData.totalPages && pageNumber !== currentPage) {
      setCurrentPage(pageNumber);
      // Scroll suave hacia la tabla
      tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentPage, paginationData.totalPages]);

  // La función ahora espera `DateRange` y no `DateRange | undefined`
  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
  }

  // Función para limpiar el filtro de fechas y volver al año actual
  const clearDateRange = () => {
    setDateRange({ from: startOfYear(new Date()), to: new Date() });
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: es });
    } catch {
      return dateString;
    }
  }

  const formatCurrency = (amount?: number | null) => {
    if (amount == null) return "$0.00";
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(amount);
  }

  const handleExportCSV = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const headers = ["Número", "Cliente", "Comprobante", "Fecha", "Items", "Total"];
      const data = filteredSales.map((sale: SaleHeader) => ({
        Número: sale.receipt_number || sale.id,
        Cliente: getCustomerName(sale),
        Comprobante: getReceiptType(sale).displayName,
        Fecha: formatDate(sale.date),
        Items: getItemsCount(sale),
        Total: formatCurrency(sale.total),
      }));
      const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "VentasSucursal");
      XLSX.writeFile(workbook, `ventas_sucursal_${params.id}.xlsx`);
      sileo.success({ title: "Exportación completada" });
    } catch {
      sileo.error({ title: "Error al exportar datos" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleViewDetail = async (sale: SaleHeader) => {
    try {
      const response = await request({ method: "GET", url: `/sales/${sale.id}` });
      const fullSaleData: SaleHeader = response.data?.data || response.data;
      setSelectedSale(fullSaleData);
      setIsDetailOpen(true);
    } catch {
      sileo.error({ title: "Error al cargar el detalle de la venta" });
      setSelectedSale(sale);
      setIsDetailOpen(true);
    }
  };

  /**
   * Maneja la actualización de una venta después de autorización AFIP
   */
  const handleSaleUpdated = async (updatedSale: SaleHeader) => {
    // Actualizar en la lista local
    setSales(prevSales =>
      prevSales.map(sale =>
        sale.id === updatedSale.id ? updatedSale : sale
      )
    );

    // Actualizar la venta seleccionada
    if (selectedSale && selectedSale.id === updatedSale.id) {
      setSelectedSale(updatedSale);
    }

    // Recargar datos si es necesario
    if (branch && dateRange?.from && dateRange?.to) {
      const apiParams = {
        branch_id: branch.id,
        from_date: format(dateRange?.from, "yyyy-MM-dd"),
        to_date: format(dateRange?.to, "yyyy-MM-dd"),
      };

      try {
        const [salesRes, statsRes] = await Promise.all([
          request({ method: "GET", url: `/sales`, params: apiParams }),
          request({ method: "GET", url: `/sales/summary`, params: apiParams })
        ]);

        const salesData = salesRes.data || [];
        setSales(Array.isArray(salesData) ? salesData : []);

        const statsData = statsRes.data || statsRes;
        setStats(statsData);
      } catch (error) {
        console.error("Error al recargar datos:", error);
      }
    }
  };

  /*
  const handleViewReceipt = async (sale: SaleHeader) => {
    try {
      const response = await request({ method: "GET", url: `/sales/${sale.id}` });
      const fullSaleData: SaleHeader = response.data?.data || response.data;
      setSelectedSale(fullSaleData);
      setIsReceiptOpen(true);
    } catch (error) {
      sileo.error({ title: "Error al cargar el comprobante" });
      setSelectedSale(sale);
      setIsReceiptOpen(true);
    }
  };
  */

  const handleDownloadPdf = async (sale: SaleHeader) => {
    if (!sale || !sale.id) {
      alert("No se puede descargar el PDF: ID de venta faltante.");
      return;
    }
    try {
      const response = await request({
        method: 'GET',
        url: `/pos/sales/${sale.id}/pdf`,
        responseType: 'blob'
      });
      if (!response || !(response instanceof Blob)) {
        throw new Error("La respuesta del servidor no es un archivo PDF válido.");
      }
      const blob = new Blob([response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const rawDesc = typeof sale.receipt_type === 'string' ? sale.receipt_type : sale.receipt_type?.description || 'comprobante';
      const receiptTypeDesc = rawDesc.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_');
      const receiptNumber = sale.receipt_number || sale.id;
      const fileName = `${receiptTypeDesc}_${receiptNumber}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '');
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Error al descargar PDF");
    }
  };

  const uniqueReceiptTypes = Array.from(new Set(sales.map(sale => getReceiptType(sale).filterKey)))
    .map(filterKey => getReceiptType(sales.find(s => getReceiptType(s).filterKey === filterKey)!))
    .filter(rt => rt.filterKey !== "N/A");

  // --- Renderizado ---
  return (
    <div className="flex-1 space-y-6 p-6 pt-8 md:p-10 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="cursor-pointer" asChild>
            <Link to="/dashboard/sucursales"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">
            Historial de Ventas
            {branch && (<span className="text-muted-foreground text-lg ml-2">- {branch.description || `Sucursal ${branch.id}`}</span>)}
          </h2>
        </div>
        <div className="flex gap-2">
          {hasPermission('exportar_reportes') && (
            <Button variant="outline" className="cursor-pointer" onClick={handleExportCSV} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
            <FileText className="h-4 w-4 text-sky-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold break-words">{NumberFormatter.formatNumber(stats.total_sales)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
            <BarChart className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-xl lg:text-2xl font-bold break-words leading-tight">{formatCurrency(stats.total_amount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total IVA</CardTitle>
            <BarChart className="h-4 w-4 text-violet-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-xl lg:text-2xl font-bold break-words leading-tight">{formatCurrency(stats.total_iva)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Presupuestos</CardTitle>
            <FileText className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold break-words">{NumberFormatter.formatNumber(stats.budget_count)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Únicos</CardTitle>
            <Users className="h-4 w-4 text-amber-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold break-words">{NumberFormatter.formatNumber(stats.client_count)}</div>
          </CardContent>
        </Card>
      </div>

      <Collapsible open={showChart} onOpenChange={setShowChart} className="w-full space-y-2">
        <div className="flex items-center justify-end space-x-4 px-1">
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="cursor-pointer"><BarChart className="mr-2 h-4 w-4" />{showChart ? "Ocultar Gráfico" : "Mostrar Gráfico"}</Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          {params.id && <SalesHistoryChart branchId={parseInt(params.id)} dateRange={dateRange} className="w-full" />}
        </CollapsibleContent>
      </Collapsible>

      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 md:space-x-4">
        <div className="flex flex-1 items-center space-x-2">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Buscar por cliente o código..." className="w-full pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <DatePickerWithRange selected={dateRange} onSelect={(range) => range && handleDateRangeChange(range)} className="w-full md:w-auto" showClearButton={true} onClear={clearDateRange} />
        </div>
        <div className="flex flex-col space-y-2 md:flex-row md:space-x-2 md:space-y-0">
          <Select value={receiptTypeFilter} onValueChange={setReceiptTypeFilter}>
            <SelectTrigger className="w-full md:w-[280px]"><Filter className="mr-2 h-4 w-4" /><SelectValue placeholder="Tipo de comprobante" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {uniqueReceiptTypes.map((rt) => (<SelectItem key={rt.filterKey} value={rt.filterKey}>{rt.displayName}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border" ref={tableRef}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Número</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Comprobante</TableHead>
              <TableHead className="hidden sm:table-cell">Fecha</TableHead>
              <TableHead className="hidden md:table-cell text-center">Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={7} className="text-center">Cargando ventas...</TableCell></TableRow>}
            {!loading && filteredSales.length === 0 && <TableRow><TableCell colSpan={7} className="text-center">No se encontraron ventas para el período seleccionado.</TableCell></TableRow>}
            {!loading && paginationData.paginatedSales.map((sale) => {
              const receiptTypeInfo = getReceiptType(sale);
              const { className: badgeClassName } = getReceiptStyle(receiptTypeInfo.displayName);

              return (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">{sale.receipt_number || sale.id}</TableCell>
                  <TableCell>{getCustomerName(sale)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge className={badgeClassName}>
                        {receiptTypeInfo.displayName}
                      </Badge>
                      <div className="flex flex-col gap-1 items-start">
                        <ArcaStatusBadge sale={sale} showConfigWarning />
                        {sale.original_sale_receipt && (
                          <Badge variant="outline" className="border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 font-normal text-xs" title="Revierte la venta original">
                            ANULA: {sale.original_sale_receipt}
                          </Badge>
                        )}
                        {sale.credit_notes && sale.credit_notes.length > 0 && (
                          <>
                            {sale.credit_notes.map(cn => (
                              <Badge key={cn.id} variant="outline" className="border-fuchsia-300 text-fuchsia-700 bg-fuchsia-50 hover:bg-fuchsia-100 font-normal text-xs" title="Venta con Nota de Crédito/Devolución emitida">
                                NC EMITIDA: {cn.receipt_number || cn.id}
                              </Badge>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{formatDate(sale.date)}</TableCell>
                  <TableCell className="hidden md:table-cell text-center">{getItemsCount(sale)}</TableCell>
                  <TableCell className="text-right">{NumberFormatter.formatCurrency(sale.total)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-2">
                      {hasPermission('ver_ventas') && (
                        <Button variant="ghost" size="icon" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer" onClick={() => handleViewDetail(sale)} title="Ver Detalle" disabled={loading}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}

                      {/* Emitir N/C - Accion Rapida */}
                      {hasPermission('emitir_notas_credito') && (sale.status === 'active' || sale.status === 'completed') && canIssueCreditNote(sale) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-orange-700 hover:text-orange-800 hover:bg-orange-100 cursor-pointer"
                          onClick={() => {
                            setSaleToDevolve(sale);
                            setIsDevolutionDialogOpen(true);
                          }}
                          title="Emitir Nota de Crédito / Devolución"
                          disabled={loading}
                        >
                          <Undo2 className="h-4 w-4" />
                        </Button>
                      )}

                      {hasPermission('reimprimir_comprobantes') && (
                        <Button variant="ghost" size="icon" className="text-amber-700 hover:text-amber-800 hover:bg-amber-100 cursor-pointer" onClick={() => handleDownloadPdf(sale)} title="Descargar PDF">
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {
        !loading && filteredSales.length > 0 && (
          <Pagination
            currentPage={currentPage}
            lastPage={paginationData.totalPages}
            total={paginationData.totalItems}
            itemName="ventas"
            onPageChange={goToPage}
            disabled={loading}
            className="mt-4"
          />
        )
      }

      {
        selectedSale && (<ViewSaleDialog open={isDetailOpen} onOpenChange={setIsDetailOpen} sale={selectedSale} getCustomerName={getCustomerName} formatDate={formatDate} getReceiptType={getReceiptType} onDownloadPdf={async (sale) => {
          if (!sale || !sale.id) {
            alert("No se puede descargar el PDF: ID de venta faltante.");
            return;
          }
          try {
            const response = await request({
              method: 'GET',
              url: `/pos/sales/${sale.id}/pdf`,
              responseType: 'blob'
            });
            if (!response || !(response instanceof Blob)) {
              throw new Error("La respuesta del servidor no es un archivo PDF válido.");
            }
            const blob = new Blob([response], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const receiptTypeDesc = (typeof sale.receipt_type === 'string' ? sale.receipt_type : sale.receipt_type?.description || 'comprobante').replace(/\s+/g, '_');
            const receiptNumber = sale.receipt_number || sale.id;
            const fileName = `${receiptTypeDesc}_${receiptNumber}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_');
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          } catch (error) {
            console.error("Error downloading PDF:", error);
            alert("Error al descargar PDF");
          }
        }}
          onSaleUpdated={handleSaleUpdated}
          onPrintPdf={async (sale) => {
            try {
              const response = await request({ method: 'GET', url: `/sales/${sale.id}` })
              const fullSale = (response as any)?.data?.data || (response as any)?.data || response
              setSelectedSale(fullSale)
              setIsReceiptOpen(true)
            } catch (error) {
              console.error('Error fetching sale details for receipt:', error)
              sileo.error({ title: 'No se pudo cargar el detalle del comprobante' })
              setSelectedSale(sale)
              setIsReceiptOpen(true)
            }
          }}
        />)
      }

      {/* Emit Credit Note Dialog */}
      {
        saleToDevolve && (
          <EmitCreditNoteDialog
            isOpen={isDevolutionDialogOpen}
            onClose={() => setIsDevolutionDialogOpen(false)}
            sale={saleToDevolve}
            onSuccess={() => {
              const controller = new AbortController();
              if (params.id) {
                fetchBranchAndSales(params.id, dateRange?.from, dateRange?.to, controller.signal);
              }
            }}
          />
        )
      }

      {
        selectedSale && branch && (
          <SaleReceiptPreviewDialog
            open={isReceiptOpen}
            onOpenChange={setIsReceiptOpen}
            sale={selectedSale}
            customerName={getCustomerName(selectedSale)}
            customerCuit={(selectedSale as any)?.customer?.person?.cuit || (selectedSale as any)?.customer?.cuit}
            formatDate={formatDate}
            formatCurrency={formatCurrency}
            onDownloadPdf={async (sale: SaleHeader) => {
              if (!sale || !sale.id) {
                alert("No se puede descargar el PDF: ID de venta faltante.");
                return;
              }
              try {
                const response = await request({
                  method: 'GET',
                  url: `/pos/sales/${sale.id}/pdf`,
                  responseType: 'blob'
                });
                if (!response || !(response instanceof Blob)) {
                  throw new Error("La respuesta del servidor no es un archivo PDF válido.");
                }
                const blob = new Blob([response], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                const receiptTypeDesc = (typeof sale.receipt_type === 'string' ? sale.receipt_type : sale.receipt_type?.description || 'comprobante').replace(/\s+/g, '_');
                const receiptNumber = sale.receipt_number || sale.id;
                const fileName = `${receiptTypeDesc}_${receiptNumber}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_');
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
              } catch (error) {
                console.error("Error downloading PDF:", error);
                alert("Error al descargar PDF");
              }
            }}
          />
        )
      }
    </div >
  );
}
