import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { ResizableTableHeader, ResizableTableCell } from '@/components/ui/resizable-table-header';
import {
  Download,
  Eye,
  FileText,
  TrendingUp,
  Users,
  Wallet,
  // Receipt, // Comentado por ocultar vista previa
  Loader2,
  RefreshCw,
  X,
  Printer,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ViewSaleDialog from "@/components/view-sale-dialog";
import AnnulSaleDialog from "@/components/AnnulSaleDialog";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import SalesHistoryChart from "@/components/dashboard/sucursales/sales-history-chart";
import SaleReceiptPreviewDialog from "@/components/SaleReceiptPreviewDialog";
import type { DateRange } from "@/components/ui/date-range-picker";
import Pagination from "@/components/ui/pagination";
import { format, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { useState, useEffect, useRef } from "react";
import useApi from "@/hooks/useApi";
import { type SaleHeader } from "@/types/sale";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import CashRegisterStatusBadge from "@/components/cash-register-status-badge";
import MultipleBranchesCashStatus from "@/components/cash-register-multiple-branches-status";
import { useLocation } from "react-router-dom";
import { useBranch } from "@/context/BranchContext";
import BranchRequiredWrapper from "@/components/layout/branch-required-wrapper";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Definimos el tamaño de página para cargar más ventas
const PAGE_SIZE = 5; // Temporalmente reducido para probar paginación

export default function VentasPage() {
  const { request } = useApi();
  const { hasPermission, isAdmin, user } = useAuth();
  
  // Debug inmediato para verificar que el código se ejecuta
  console.log('🚀 VentasPage cargado - Versión con debug de anular ventas');
  const { selectionChangeToken, selectedBranch, selectedBranchIds, branches } = useBranch();
  const [sales, setSales] = useState<SaleHeader[]>([]);
  const [stats, setStats] = useState({
    total_sales: 0,
    total_amount: 0,
    total_iva: 0,
    budget_count: 0,
    client_count: 0,
    average_sale_amount: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [showChart, setShowChart] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleHeader | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isAnnulDialogOpen, setIsAnnulDialogOpen] = useState(false);
  const [saleToAnnul, setSaleToAnnul] = useState<SaleHeader | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLoading, setPageLoading] = useState(true);
  const [allSales, setAllSales] = useState<SaleHeader[]>([]); // Para paginación del cliente
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});
  const location = useLocation();
  // Track handled navigation to avoid repeated detail fetches
  const handledOpenSaleIdRef = useRef<number | null>(null);

  // Cash register validation - usando la sucursal seleccionada
  const currentBranchId = selectedBranch?.id ? Number(selectedBranch.id) : 1;

  // Configuración de columnas redimensionables
  const columnConfig = [
    { id: 'receipt_number', minWidth: 100, maxWidth: 160, defaultWidth: 120 },
    { id: 'customer', minWidth: 150, maxWidth: 300, defaultWidth: 200 },
    { id: 'receipt_type', minWidth: 120, maxWidth: 200, defaultWidth: 150 },
    { id: 'branch', minWidth: 120, maxWidth: 250, defaultWidth: 180 },
    { id: 'items', minWidth: 80, maxWidth: 120, defaultWidth: 100 },
    { id: 'date', minWidth: 120, maxWidth: 180, defaultWidth: 140 },
    { id: 'total', minWidth: 120, maxWidth: 180, defaultWidth: 140 },
    { id: 'actions', minWidth: 120, maxWidth: 160, defaultWidth: 140 }
  ];

  const {
    getResizeHandleProps,
    getColumnHeaderProps,
    getColumnCellProps,
    tableRef
  } = useResizableColumns({
    columns: columnConfig,
    storageKey: 'ventas-column-widths',
    defaultWidth: 150
  });

  // Debounced fetch on date range changes
  useEffect(() => {
    const isFromValid = dateRange.from instanceof Date && !isNaN(dateRange.from.getTime());
    const isToValid = dateRange.to instanceof Date && !isNaN(dateRange.to.getTime());

    if (!isFromValid || !isToValid) {
      const today = new Date();
      const firstOfMonth = startOfMonth(today);
      setDateRange({ from: firstOfMonth, to: today });
      return; // wait for next render with valid dates
    }

    console.log('🔄 Cargando ventas - useEffect ejecutado');
    setPageLoading(true);
    setCurrentPage(1);
    setAllSales([]); // Limpiar caché cuando cambien las fechas
    const timer = setTimeout(() => {
      Promise.all([
        fetchSales(dateRange.from!, dateRange.to!, 1),
        fetchStats(dateRange.from!, dateRange.to!)
      ]).finally(() => {
        setPageLoading(false);
      });
    }, 350); // debounce to prevent multiple quick fetches while picking dates

    return () => clearTimeout(timer);
  }, [dateRange.from, dateRange.to]);

  useEffect(() => {
    const state = location.state as any;
    if (state?.openSaleId && Array.isArray(sales) && sales.length > 0) {
      if (handledOpenSaleIdRef.current !== state.openSaleId) {
        const found = sales.find(s => s.id === state.openSaleId);
        if (found) {
          handledOpenSaleIdRef.current = state.openSaleId;
          handleViewDetail(found);
        }
      }
    }
  }, [location.state, sales]);

  // Refetch cuando cambie la selección de sucursales
  useEffect(() => {
    // Reutiliza el rango actual y reinicia a la primera página
    setPageLoading(true);
    setAllSales([]); // Limpiar caché cuando cambie la sucursal
    Promise.all([
      fetchSales(dateRange.from!, dateRange.to!, 1),
      fetchStats(dateRange.from!, dateRange.to!),
    ]).finally(() => setPageLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionChangeToken]);

  const fetchSales = async (fromDate?: Date, toDate?: Date, currentPage = 1) => {
    try {
      // Para la primera carga, verificamos si necesitamos paginación del servidor
      const apiParams: any = {};
      
      if (fromDate && toDate) {
        apiParams.from_date = format(fromDate, "yyyy-MM-dd");
        apiParams.to_date = format(toDate, "yyyy-MM-dd");
      }
      
      // Solo agregar parámetros de paginación si es la primera carga o si sabemos que hay paginación del servidor
      if (currentPage === 1 || allSales.length === 0) {
        apiParams.page = currentPage;
        apiParams.limit = PAGE_SIZE;
        apiParams.per_page = PAGE_SIZE; // Probar también per_page
      }
      
      const response = await request({
        method: "GET",
        url: `/sales/global`,
        params: apiParams,
      });
      
      // Soportar múltiples formatos de respuesta (paginada, array directa, objeto directo)
      let salesData: SaleHeader[] = [];
      if (Array.isArray(response?.data?.data)) {
        salesData = response.data.data;
      } else if (Array.isArray(response?.data)) {
        salesData = response.data;
      } else if (Array.isArray(response)) {
        salesData = response;
      } else if (response?.data?.data) {
        salesData = [response.data.data].flat();
      } else if (response?.data) {
        salesData = [response.data].flat();
      } else if (response) {
        salesData = [response].flat();
      }
        
      // Verificar si la API devuelve paginación del servidor útil o si necesitamos paginación del cliente
      const hasServerPagination = (response.total !== undefined || response.data?.total !== undefined) && 
                                  (response.last_page > 1 || response.data?.last_page > 1);
      
      if (hasServerPagination) {
        // Paginación del servidor (Laravel)
        const paginationInfo = {
          total: response.total || response.data?.total || 0,
          currentPage: response.current_page || response.data?.current_page || 1,
          lastPage: response.last_page || response.data?.last_page || 1,
          perPage: response.per_page || response.data?.per_page || PAGE_SIZE,
        };
        
        setTotalItems(paginationInfo.total);
        setTotalPages(paginationInfo.lastPage);
        setCurrentPage(paginationInfo.currentPage);
        setSales(salesData);
      } else {
        // Paginación del cliente - la API devuelve todas las ventas
        
        // Solo cargar todas las ventas si no las tenemos o si cambiaron las fechas
        let allSalesData = allSales;
        if (allSales.length === 0 || currentPage === 1) {
          allSalesData = salesData;
          setAllSales(allSalesData);
        }
        
        // Calcular paginación del cliente
        const totalCount = allSalesData.length;
        const totalPagesCalculated = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
        const safeCurrentPage = Math.min(currentPage, totalPagesCalculated);
        const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
        const endIndex = startIndex + PAGE_SIZE;
        const paginatedSales = allSalesData.slice(startIndex, endIndex);
        
        setTotalItems(totalCount);
        setTotalPages(totalPagesCalculated);
        setCurrentPage(safeCurrentPage);
        setSales(paginatedSales);
      }
      
    } catch (error) {
      console.error('Error in fetchSales:', error);
      toast.error("Error", {
        description: "No se pudo cargar el historial de ventas.",
      });
      setSales([]);
    }
  };

  const fetchStats = async (fromDate?: Date, toDate?: Date) => {
    try {
      const apiParams: any = {};
      if (fromDate && toDate) {
        apiParams.from_date = format(fromDate, "yyyy-MM-dd");
        apiParams.to_date = format(toDate, "yyyy-MM-dd");
      }
      const response = await request({
        method: "GET",
        url: `/sales/global/summary`,
        params: apiParams,
      });
      const statsData =
        response.data &&
        typeof response.data === 'object' &&
        !Array.isArray(response.data)
          ? response.data
          : response &&
            typeof response === 'object' &&
            !Array.isArray(response)
          ? response
          : {};
          
      setStats({
        total_sales: statsData.sales_count ?? 0,
        total_amount: statsData.grand_total_amount ?? 0,
        total_iva: statsData.grand_total_iva ?? 0,
        budget_count: statsData.budget_count ?? 0,
        client_count: statsData.client_count ?? 0,
        average_sale_amount: statsData.average_sale_amount ?? (statsData.sales_count > 0 ? statsData.grand_total_amount / statsData.sales_count : 0),
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Error", {
        description: "No se pudieron cargar las estadísticas de ventas.",
      });
      setStats({
        total_sales: 0,
        total_amount: 0,
        total_iva: 0,
        budget_count: 0,
        client_count: 0,
        average_sale_amount: 0,
      });
    }
  };

  const getCustomerName = (sale: SaleHeader): string => {
    const customer = sale.customer as any;    
    if (typeof customer === 'string') {
      const trimmed = customer.trim();
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

  const getItemsCount = (sale: SaleHeader) => sale.items_count || 0;

  const getBranchColor = (sale: SaleHeader) => {
    let branchId: number | null = null;
    
    if (typeof sale.branch === 'object' && sale.branch?.id) {
      branchId = Number(sale.branch.id);
    } else if (typeof sale.branch === 'string') {
      // Si es string, buscar por descripción
      const branch = branches.find(b => b.description === sale.branch);
      branchId = branch?.id ? Number(branch.id) : null;
    }
    
    if (branchId) {
      const branch = branches.find(b => Number(b.id) === branchId);
      return branch?.color || '#6b7280';
    }
    
    return '#6b7280'; // Color por defecto
  };

  const getBranchName = (sale: SaleHeader) => {
    if (typeof sale.branch === 'string') {
      return sale.branch;
    }
    return sale.branch?.description || 'N/A';
  };

  const receiptTypeColors: Record<string, string> = {
    'FACTURAS A': 'bg-purple-50 text-purple-700 hover:bg-purple-50 hover:text-purple-700',
    'NOTAS DE DEBITO A': 'bg-orange-50 text-orange-700 hover:bg-orange-50 hover:text-orange-700',
    'NOTAS DE CREDITO A': 'bg-red-50 text-red-700 hover:bg-red-50 hover:text-red-700',
    'RECIBOS A': 'bg-yellow-50 text-yellow-700 hover:bg-yellow-50 hover:text-yellow-700',
    'NOTAS DE VENTA AL CONTADO A': 'bg-indigo-50 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-700',
    'FACTURAS B': 'bg-cyan-50 text-cyan-700 hover:bg-cyan-50 hover:text-cyan-700',
    'NOTAS DE DEBITO B': 'bg-orange-100 text-orange-800 hover:bg-orange-100 hover:text-orange-800',
    'NOTAS DE CREDITO B': 'bg-red-100 text-red-800 hover:bg-red-100 hover:text-red-800',
    'RECIBOS B': 'bg-lime-50 text-lime-700 hover:bg-lime-50 hover:text-lime-700',
    'NOTAS DE VENTA AL CONTADO B': 'bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-50 hover:text-fuchsia-700',
    'FACTURAS C': 'bg-teal-50 text-teal-700 hover:bg-teal-50 hover:text-teal-700',
    'NOTAS DE DEBITO C': 'bg-orange-200 text-orange-900 hover:bg-orange-200 hover:text-orange-900',
    'NOTAS DE CREDITO C': 'bg-red-200 text-red-900 hover:bg-red-200 hover:text-red-900',
    'RECIBOS C': 'bg-pink-50 text-pink-700 hover:bg-pink-50 hover:text-pink-700',
    'PRESUPUESTO': 'bg-green-50 text-green-700 hover:bg-green-50 hover:text-green-700',
    'FACTURA X': 'bg-gray-100 text-gray-700 hover:bg-gray-100 hover:text-gray-700',
  };

  const getReceiptType = (
    sale: SaleHeader
  ): { displayName: string; filterKey: string; afipCode: string } => {
    if (sale.receipt_type && typeof sale.receipt_type === 'object') {
      const upperDescription = (sale.receipt_type.description || "").toUpperCase();
      const afipCode = sale.receipt_type.afip_code || "N/A";
      return {
        displayName: upperDescription,
        filterKey: upperDescription,
        afipCode: afipCode,
      };
    }
    const actualReceiptType = (sale as any).receipt_type as string;
    const actualAfipCode = (sale as any).receipt_type_code as string;

    if (typeof actualReceiptType === 'string' && actualReceiptType.trim() !== '') {
      const upperDescription = actualReceiptType.toUpperCase();
      const afipCode = actualAfipCode || "N/A";
      return {
        displayName: upperDescription,
        filterKey: upperDescription,
        afipCode: afipCode,
      };
    }
    return { displayName: "N/A", filterKey: "N/A", afipCode: "N/A" };
  };

  const getReceiptTypeBadge = (
    receiptInfo: { displayName: string; filterKey: string; afipCode: string }
  ) => {
    const cssClasses =
      receiptTypeColors[receiptInfo.filterKey] ||
      'bg-gray-100 text-gray-700 hover:bg-gray-100 hover:text-gray-700';
    const textToShow =
      receiptInfo.displayName !== "N/A"
        ? receiptInfo.displayName
        : receiptInfo.afipCode;
    return <Badge className={cssClasses}>{textToShow}</Badge>;
  };

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'annulled'>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');

  const filteredSales = sales.filter((sale: SaleHeader) => {
    const receiptTypeInfo = getReceiptType(sale);
    const matchesSearch =
      searchTerm === "" ||
      sale.receipt_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCustomerName(sale).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (receiptTypeInfo.displayName || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (typeof sale.branch === 'string' ? sale.branch.toLowerCase() : (sale.branch?.description || "").toLowerCase())
        .includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ? true :
      statusFilter === 'active' ? sale.status !== 'annulled' :
      sale.status === 'annulled';

    const matchesBranch = branchFilter === 'all' ? true : 
      (() => {
        let branchId: number | null = null;
        if (typeof sale.branch === 'object' && sale.branch?.id) {
          branchId = Number(sale.branch.id);
        } else if (typeof sale.branch === 'string') {
          const branch = branches.find(b => b.description === sale.branch);
          branchId = branch?.id ? Number(branch.id) : null;
        }
        return branchId ? branchId.toString() === branchFilter : false;
      })();

    return matchesSearch && matchesStatus && matchesBranch;
  });
  
  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange({ from: range?.from ?? new Date(), to: range?.to ?? new Date() });
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Fecha inválida";
    try {
      const date = new Date(dateString); 
      return format(date, "dd/MM/yyyy HH:mm", { locale: es });
    } catch {
      return dateString; 
    }
  };
  
  const formatShortDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Fecha inválida";
    try {
      const date = new Date(dateString);
      return format(date, "dd/MM/yyyy", { locale: es });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "$0.00";
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount);
  };

  const handleExportCSV = () => {
    const headers = [
      "Número",
      "Comprobante",
      "Cliente",
      "Sucursal",
      "Total",
      "Fecha",
    ];
    const data = filteredSales.map((sale: SaleHeader) => ({
      Número: sale.receipt_number || sale.id,
      Comprobante: getReceiptType(sale).displayName,
      Cliente: getCustomerName(sale),
      Sucursal: typeof sale.branch === 'string' ? sale.branch : sale.branch?.description || "N/A",
      Total: formatCurrency(sale.total), 
      Fecha: formatShortDate(sale.date), 
    }));
    const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "VentasGlobales");
    XLSX.writeFile(workbook, 'ventas_globales.xlsx');
    toast.success("Exportación CSV generada.");
  };

  const handleViewDetail = async (sale: SaleHeader) => {
    const actionKey = `view-${sale.id}`;
    setLoadingActions(prev => ({ ...prev, [actionKey]: true }));
    
    try {
      const response = await request({
        method: "GET",
        url: `/sales/${sale.id}`,
      });
      const fullSaleData: SaleHeader = response.data?.data || response.data;
      setSelectedSale(fullSaleData); 
      setIsDetailOpen(true);
    } catch (error) {
      toast.error("Error", {
        description: "No se pudo cargar el detalle completo de la venta.",
      });
      setSelectedSale(sale);
      setIsDetailOpen(true);
    } finally {
      setLoadingActions(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Función comentada por ocultar vista previa
  /*
  const handleViewReceipt = async (sale: SaleHeader) => {
    try {
      const response = await request({
        method: "GET",
        url: `/sales/${sale.id}`,
      });
      const fullSaleData: SaleHeader = response.data?.data || response.data;
      setSelectedSale(fullSaleData); 
      setIsReceiptOpen(true);
    } catch (error) {
      toast.error("Error", {
        description: "No se pudo cargar el detalle completo para el comprobante.",
      });
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
          
          const actionKey = `download-${sale.id}`;
          setLoadingActions(prev => ({ ...prev, [actionKey]: true }));
          
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
            alert("Error al descargar PDF");
          } finally {
            setLoadingActions(prev => ({ ...prev, [actionKey]: false }));
          }
  };

  const handlePrintPdf = async (sale: SaleHeader) => {
    if (!sale || !sale.id) {
      toast.error("No se puede imprimir: ID de venta faltante.");
      return;
    }

    const actionKey = `print-${sale.id}`;
    setLoadingActions(prev => ({ ...prev, [actionKey]: true }));

    try {
      // Descargar el PDF con autenticación usando request (incluye token)
      const response = await request({ 
        method: 'GET', 
        url: `/pos/sales/${sale.id}/pdf`,
        responseType: 'blob'
      });
      
      if (!response || !(response instanceof Blob)) {
        throw new Error("La respuesta del servidor no es un archivo PDF válido.");
      }
      
      // Crear blob URL del PDF descargado
      const blob = new Blob([response], { type: 'application/pdf' });
      const blobUrl = window.URL.createObjectURL(blob);

      // Crear iframe oculto para imprimir
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.style.position = 'fixed';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      
      // Agregar al DOM
      document.body.appendChild(iframe);
      
      // Asignar blob URL al iframe
      iframe.src = blobUrl;
      
      // Cuando el iframe cargue, ejecutar print
      iframe.onload = () => {
        setTimeout(() => {
          try {
            // Ejecutar impresión desde el iframe
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (err) {
            toast.error("No se pudo abrir el diálogo de impresión.");
          }
          
          // Limpiar después de un tiempo
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
            window.URL.revokeObjectURL(blobUrl);
          }, 1000);
        }, 500);
      };
      
      // Timeout de seguridad
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
          window.URL.revokeObjectURL(blobUrl);
        }
      }, 10000);
      
      setLoadingActions(prev => ({ ...prev, [actionKey]: false }));

    } catch (error) {
      toast.error("Error al preparar la impresión.");
      setLoadingActions(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleAnnulSale = (sale: SaleHeader) => {
    setSaleToAnnul(sale);
    setIsAnnulDialogOpen(true);
  };

  const handleAnnulSuccess = () => {
    setIsAnnulDialogOpen(false);
    setSaleToAnnul(null);
    // Refresh the sales list and stats
    setCurrentPage(1);
    setAllSales([]); // Limpiar caché para forzar nueva carga
    Promise.all([
      fetchSales(dateRange.from, dateRange.to, 1),
      fetchStats(dateRange.from, dateRange.to),
    ]);
  };

  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages && pageNumber !== currentPage && !pageLoading) {
      setCurrentPage(pageNumber);
      
      // Si tenemos todas las ventas cargadas, hacer paginación del cliente
      if (allSales.length > 0) {
        // Calcular datos para la página solicitada
        const startIndex = (pageNumber - 1) * PAGE_SIZE;
        const endIndex = startIndex + PAGE_SIZE;
        const paginatedSales = allSales.slice(startIndex, endIndex);
        setSales(paginatedSales);
      } else {
        fetchSales(dateRange.from, dateRange.to, pageNumber);
      }
      
    }
  };


  // Botón de recarga: recarga ventas y stats manteniendo página y rango actual
  const reloadData = () => {
    if (pageLoading) return;
    setPageLoading(true);
    setAllSales([]); // Limpiar caché para forzar nueva carga
    Promise.all([
      fetchSales(dateRange.from, dateRange.to, 1), // Empezar desde página 1
      fetchStats(dateRange.from, dateRange.to),
    ]).finally(() => setPageLoading(false));
  };

  return (
    <ProtectedRoute permissions={['ver_ventas']} requireAny={true}>
      <BranchRequiredWrapper 
        title="Selecciona una sucursal" 
        description="Las ventas necesitan una sucursal seleccionada para mostrar los datos correspondientes."
        allowMultipleBranches={true}
      >
        <div className="h-full w-full flex flex-col gap-4 p-4 md:p-6">
      {/* Cash Register Status - Show appropriate component based on selection */}
      {selectedBranchIds.length > 1 ? (
        <MultipleBranchesCashStatus 
          className="mb-2"
          showOpenButton={true}
          compact={false}
        />
      ) : (
        <CashRegisterStatusBadge 
          branchId={currentBranchId}
          compact={true}
          showOperator={false}
          showOpenTime={false}
          className="mb-2"
        />
      )}
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Ventas Globales</h1>
          {isAdmin() && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    Admin
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Como administrador, tienes acceso a todas las funciones independientemente de los permisos configurados</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Botón de recarga (igual al de Inventario) */}
          <Button
            variant="outline"
            size="icon"
            onClick={reloadData}
            disabled={pageLoading}
            className="cursor-pointer"
            title="Recargar ventas"
            type="button"
          >
            <RefreshCw className={`h-4 w-4 ${pageLoading ? "animate-spin" : ""}`} />
          </Button>
          <div className="relative w-full md:w-auto">
            <input
              type="text"
              placeholder="Buscar ventas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background w-full"
            />
          </div>
          <DatePickerWithRange
            selected={dateRange} 
            onSelect={handleDateRangeChange} 
            className="md:w-auto"
          />
          {hasPermission('exportar_reportes') && (
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={handleExportCSV}
              disabled={pageLoading}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          )}
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={() => setShowChart(!showChart)}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            {showChart ? "Ocultar Gráfico" : "Mostrar Gráfico"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
            <Wallet className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total_sales}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.total_amount)} facturado
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IVA Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.total_iva)}
            </div>
            <p className="text-xs text-muted-foreground">
              Calculado sobre ventas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Presupuestos</CardTitle>
            <FileText className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.budget_count}</div>
            <p className="text-xs text-muted-foreground">
              Cantidad de presupuestos emitidos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Únicos</CardTitle>
            <Users className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.client_count}</div>
            <p className="text-xs text-muted-foreground">
              Clientes distintos en el período
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
            <Wallet className="h-4 w-4 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.average_sale_amount)}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor promedio por transacción
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | 'active' | 'annulled')} className="w-fit">
          <TabsList>
            <TabsTrigger value="all">
              <FileText className="w-4 h-4 mr-2" />
              Todas
            </TabsTrigger>
            <TabsTrigger value="active">
              <TrendingUp className="w-4 h-4 mr-2" />
              Vigentes
            </TabsTrigger>
            <TabsTrigger value="annulled">
              <X className="w-4 h-4 mr-2" />
              Anuladas
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Branch Filter - Only show when multiple branches are selected */}
        {selectedBranchIds.length > 1 && (
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Filtrar por sucursal:</Label>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todas las sucursales" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las sucursales</SelectItem>
                {branches?.filter(branch => selectedBranchIds.includes(branch.id.toString())).map((branch) => (
                  <SelectItem key={branch.id} value={branch.id.toString()}>
                    <div className="flex items-center gap-2">
                      {branch.color && (
                        <div 
                          className="w-3 h-3 rounded-full border"
                          style={{ backgroundColor: branch.color }}
                        />
                      )}
                      <span>{branch.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Chart Section */}
      {showChart && (
            <SalesHistoryChart dateRange={dateRange} /> 
      )}

      {/* Table Section */}
      <div className="rounded-md border">
        <Table ref={tableRef}>
          <TableHeader>
            <TableRow>
              <ResizableTableHeader
                columnId="receipt_number"
                getResizeHandleProps={getResizeHandleProps}
                getColumnHeaderProps={getColumnHeaderProps}
              >
                Nº Venta
              </ResizableTableHeader>
              <ResizableTableHeader
                columnId="customer"
                getResizeHandleProps={getResizeHandleProps}
                getColumnHeaderProps={getColumnHeaderProps}
              >
                Cliente
              </ResizableTableHeader>
              <ResizableTableHeader
                columnId="receipt_type"
                getResizeHandleProps={getResizeHandleProps}
                getColumnHeaderProps={getColumnHeaderProps}
              >
                Comprobante
              </ResizableTableHeader>
              <ResizableTableHeader
                columnId="branch"
                getResizeHandleProps={getResizeHandleProps}
                getColumnHeaderProps={getColumnHeaderProps}
                className={selectedBranchIds.length > 1 ? "" : "hidden md:table-cell"}
              >
                Sucursal
              </ResizableTableHeader>
              <ResizableTableHeader
                columnId="items"
                getResizeHandleProps={getResizeHandleProps}
                getColumnHeaderProps={getColumnHeaderProps}
                className="hidden md:table-cell text-center"
              >
                Items
              </ResizableTableHeader>
              <ResizableTableHeader
                columnId="date"
                getResizeHandleProps={getResizeHandleProps}
                getColumnHeaderProps={getColumnHeaderProps}
                className="hidden sm:table-cell"
              >
                Fecha
              </ResizableTableHeader>
              <ResizableTableHeader
                columnId="total"
                getResizeHandleProps={getResizeHandleProps}
                getColumnHeaderProps={getColumnHeaderProps}
                className="text-right"
              >
                Total
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
            {pageLoading && (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <Loader2 className="animate-spin h-6 w-6 text-primary mb-2" />
                    <span className="text-sm text-muted-foreground">Cargando ventas...</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {!pageLoading && filteredSales.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <FileText className="h-8 w-8 text-muted-foreground mb-2 opacity-40" />
                    <span className="text-muted-foreground">No se encontraron ventas para el período seleccionado.</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {!pageLoading &&
              filteredSales.map((sale: SaleHeader) => (
                <TableRow
                  key={sale.id}
                  className={sale.status === 'annulled' ? 'group bg-red-50 hover:bg-red-100 transition-colors' : ''}
                >
                  <ResizableTableCell
                    columnId="receipt_number"
                    getColumnCellProps={getColumnCellProps}
                    className={`font-medium ${sale.status === 'annulled' ? 'text-red-700' : ''}`}
                  >
                    {sale.receipt_number || sale.id}
                  </ResizableTableCell>
                  <ResizableTableCell columnId="customer" getColumnCellProps={getColumnCellProps}>
                    <div
                      className={`truncate ${sale.status === 'annulled' ? 'text-red-600' : ''}`}
                      title={getCustomerName(sale)}
                    >
                      {getCustomerName(sale)}
                    </div>
                  </ResizableTableCell>
                  <ResizableTableCell columnId="receipt_type" getColumnCellProps={getColumnCellProps}>
                    {getReceiptTypeBadge(getReceiptType(sale))}
                  </ResizableTableCell>
                  <ResizableTableCell
                    columnId="branch"
                    getColumnCellProps={getColumnCellProps}
                    className={selectedBranchIds.length > 1 ? "" : "hidden md:table-cell"}
                  >
                    {(() => {
                      const branchColor = getBranchColor(sale);
                      const branchName = getBranchName(sale);
                      
                      return (
                        <Badge 
                          variant="outline" 
                          className={`text-xs border-2 font-medium ${sale.status === 'annulled' ? 'opacity-60' : ''}`}
                          style={{
                            borderColor: branchColor,
                            color: branchColor,
                            backgroundColor: `${branchColor}10`
                          }}
                        >
                          {branchName}
                        </Badge>
                      );
                    })()}
                  </ResizableTableCell>
                  <ResizableTableCell
                    columnId="items"
                    getColumnCellProps={getColumnCellProps}
                    className="hidden md:table-cell text-center"
                  >
                    <span className={sale.status === 'annulled' ? 'text-red-600' : ''}>{getItemsCount(sale)}</span>
                  </ResizableTableCell>
                  <ResizableTableCell
                    columnId="date"
                    getColumnCellProps={getColumnCellProps}
                    className="hidden sm:table-cell"
                  >
                    <span className={sale.status === 'annulled' ? 'text-red-600' : ''}>{formatShortDate(sale.date)}</span>
                  </ResizableTableCell>
                  <ResizableTableCell
                    columnId="total"
                    getColumnCellProps={getColumnCellProps}
                    className="text-right"
                  >
                    <span
                      className={`${sale.status === 'annulled' ? 'line-through text-red-500 font-medium' : ''}`}
                      title={sale.status === 'annulled' ? 'Venta anulada' : ''}
                    >
                      {formatCurrency(sale.total)}
                    </span>
                  </ResizableTableCell>
                  <ResizableTableCell
                    columnId="actions"
                    getColumnCellProps={getColumnCellProps}
                    className="text-center"
                  >
                    <div className="flex justify-center items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-blue-700 hover:bg-blue-100 hover:text-blue-800 border-blue-200 cursor-pointer"
                        onClick={() => handleViewDetail(sale)}
                        title="Ver Detalle"
                        type="button"
                        disabled={loadingActions[`view-${sale.id}`]}
                      >
                        {loadingActions[`view-${sale.id}`] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        className={`text-amber-700 hover:bg-amber-100 hover:text-amber-800 border-amber-200 ${hasPermission('reimprimir_comprobantes') ? 'cursor-pointer' : 'invisible cursor-default'}`}
                        size="icon"
                        onClick={
                          hasPermission('reimprimir_comprobantes')
                            ? () => handleDownloadPdf(sale)
                            : undefined
                        }
                        title={
                          hasPermission('reimprimir_comprobantes') ? 'Descargar PDF' : ''
                        }
                        type="button"
                        disabled={loadingActions[`download-${sale.id}`]}
                      >
                        {loadingActions[`download-${sale.id}`] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        className={`text-green-700 hover:bg-green-100 hover:text-green-800 border-green-200 ${hasPermission('reimprimir_comprobantes') ? 'cursor-pointer' : 'invisible cursor-default'}`}
                        size="icon"
                        onClick={
                          hasPermission('reimprimir_comprobantes')
                            ? () => handlePrintPdf(sale)
                            : undefined
                        }
                        title={
                          hasPermission('reimprimir_comprobantes') ? 'Imprimir comprobante' : ''
                        }
                        type="button"
                        disabled={loadingActions[`print-${sale.id}`]}
                      >
                        {loadingActions[`print-${sale.id}`] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Printer className="h-4 w-4" />
                        )}
                      </Button>
                      {(() => {
                        const canAnnul = hasPermission('anular_ventas');
                        // Las ventas pueden anularse si están 'active' o 'completed'
                        const canBeAnnulled = sale.status === 'active' || sale.status === 'completed';
                        const shouldShow = canAnnul && canBeAnnulled;
                        
                        // Debug temporal para producción
                        if (sale.id === sales[0]?.id) {
                          console.log('🔍 DEBUG ANULAR VENTA:', {
                            saleId: sale.id,
                            saleStatus: sale.status,
                            canAnnul,
                            canBeAnnulled,
                            shouldShow,
                            userRole: user?.role?.name,
                            userPermissions: user?.permissions,
                            hasAnularVentas: user?.permissions?.includes('anular_ventas')
                          });
                        }
                        
                        return shouldShow ? (
                          <Button
                            variant="ghost"
                            className="text-red-700 hover:bg-red-100 hover:text-red-800 border-red-200 cursor-pointer"
                            size="icon"
                            onClick={() => handleAnnulSale(sale)}
                            title="Anular Venta"
                            type="button"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        ) : null;
                      })()}
                    </div>
                  </ResizableTableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
      
      {/* Paginación para ventas */}
      <Pagination
        currentPage={currentPage}
        lastPage={totalPages}
        total={totalItems}
        itemName="ventas"
        onPageChange={(page) => goToPage(page)}
        disabled={pageLoading}
        className="mt-4 mb-6"
      />
      
      {/* Dialogs */}
      {selectedSale && (
        <ViewSaleDialog
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          sale={selectedSale}
          getCustomerName={getCustomerName}
          formatDate={formatDate}
          getReceiptType={getReceiptType}
          onPrintPdf={async (sale) => {
            if (!sale || !sale.id) {
              toast.error("No se puede imprimir: ID de venta faltante.");
              return;
            }
            try {
              // Descargar el PDF con autenticación usando request (incluye token)
              const response = await request({ 
                method: 'GET', 
                url: `/pos/sales/${sale.id}/pdf`,
                responseType: 'blob'
              });
              
              if (!response || !(response instanceof Blob)) {
                throw new Error("La respuesta del servidor no es un archivo PDF válido.");
              }
              
              // Crear blob URL del PDF descargado
              const blob = new Blob([response], { type: 'application/pdf' });
              const blobUrl = window.URL.createObjectURL(blob);

              // Crear iframe oculto para imprimir
              const iframe = document.createElement('iframe');
              iframe.style.display = 'none';
              iframe.style.position = 'fixed';
              iframe.style.width = '0';
              iframe.style.height = '0';
              iframe.style.border = 'none';
              
              // Agregar al DOM
              document.body.appendChild(iframe);
              
              // Asignar blob URL al iframe
              iframe.src = blobUrl;
              
              // Cuando el iframe cargue, ejecutar print
              iframe.onload = () => {
                setTimeout(() => {
                  try {
                    // Ejecutar impresión desde el iframe
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                  } catch (err) {
                    toast.error("No se pudo abrir el diálogo de impresión.");
                  }
                  
                  // Limpiar después de un tiempo
                  setTimeout(() => {
                    if (document.body.contains(iframe)) {
                      document.body.removeChild(iframe);
                    }
                    window.URL.revokeObjectURL(blobUrl);
                  }, 1000);
                }, 500);
              };
              
              // Timeout de seguridad
              setTimeout(() => {
                if (document.body.contains(iframe)) {
                  document.body.removeChild(iframe);
                  window.URL.revokeObjectURL(blobUrl);
                }
              }, 10000);
            } catch (error) {
              toast.error("Error al imprimir el PDF");
            }
          }}
          onDownloadPdf={async (sale) => {
            if (!sale || !sale.id) {
              toast.error("No se puede descargar el PDF: ID de venta faltante.");
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
              toast.success("PDF descargado exitosamente");
            } catch (error) {
              toast.error("Error al descargar PDF");
            }
          }}
        />
      )}

      {/* Annul Sale Dialog */}
      {saleToAnnul && (
        <AnnulSaleDialog
          isOpen={isAnnulDialogOpen}
          onClose={() => setIsAnnulDialogOpen(false)}
          sale={saleToAnnul}
          onSuccess={handleAnnulSuccess}
        />
      )}

      {selectedSale && isReceiptOpen && (
        <SaleReceiptPreviewDialog
          open={isReceiptOpen}
          onOpenChange={setIsReceiptOpen}
          sale={selectedSale}
          customerName={getCustomerName(selectedSale)}
          customerCuit={(selectedSale as any)?.customer?.person?.cuit || (selectedSale as any)?.customer?.cuit}
          formatDate={formatDate}
          formatCurrency={formatCurrency}
          onPrint={() => window.print()}
        />
      )}

      <style>{`
        @media print {
          body > *:not(#print-area) { 
            display: none !important; 
          }
          #print-area { 
            display: block !important; 
            position: static !important; 
            left: 0 !important; 
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            font-size: 12pt !important;
          }
          * {
            color: black !important;
            background: transparent !important;
          }
        }
      `}</style>
        </div>
      </BranchRequiredWrapper>
    </ProtectedRoute>
  );
}
