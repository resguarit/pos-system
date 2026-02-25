import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { ChevronDown, ChevronUp, Download, FileText, Filter, Printer, RefreshCw, TrendingUp, Users, Wallet, X, Loader2, Eye, Undo2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";



import ViewSaleDialog from "@/components/view-sale-dialog";
import AnnulSaleDialog from "@/components/AnnulSaleDialog";
import EmitCreditNoteDialog from "@/components/sales/EmitCreditNoteDialog";
import { ArcaStatusBadge } from "@/components/sales/ArcaStatusBadge";
import { ConversionStatusBadge } from "@/components/sales/conversion-status-badge";
import { getReceiptTypeBadgeStyle } from "@/utils/arcaReceiptTypes";

import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import SalesHistoryChart from "@/components/dashboard/sucursales/sales-history-chart";
import SaleReceiptPreviewDialog from "@/components/SaleReceiptPreviewDialog";
import type { DateRange } from "@/components/ui/date-range-picker";
import Pagination from "@/components/ui/pagination";
import { format, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { useState, useEffect, useRef, useMemo } from "react";
import useApi from "@/hooks/useApi";
import { type SaleHeader } from "@/types/sale";
import { sileo } from "sileo"
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import CashRegisterStatusBadge from "@/components/cash-register-status-badge";
import MultipleBranchesCashStatus from "@/components/cash-register-multiple-branches-status";
import { useLocation } from "react-router-dom";
import { useBranch } from "@/context/BranchContext";
import BranchRequiredWrapper from "@/components/layout/branch-required-wrapper";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { BranchBadge } from "@/components/BranchBadge";
import { getBranchColor } from "@/utils/branchColor";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PresupuestosPage from "./PresupuestosPage";
import { useBudgets } from "@/hooks/useBudgets";
import { useCashRegisterStatus } from "@/hooks/useCashRegisterStatus";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { AsyncMultiSelect, type Option } from "@/components/ui/async-multi-select";

// Configuración de paginación
const PAGE_SIZE = 20; // Tamaño óptimo para producción

export default function VentasPage() {
  const { request } = useApi();
  const { hasPermission } = useAuth();

  const { selectionChangeToken, selectedBranch, selectedBranchIds, branches } = useBranch();
  const [sales, setSales] = useState<SaleHeader[]>([]);
  const [stats, setStats] = useState({
    total_sales: 0,
    total_amount: 0,
    total_iva: 0,
    budget_count: 0,
    converted_budget_count: 0,
    client_count: 0,
    average_sale_amount: 0,
  });
  const [usingServerPagination, setUsingServerPagination] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [showChart, setShowChart] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleHeader | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isAnnulDialogOpen, setIsAnnulDialogOpen] = useState(false);
  const [saleToAnnul, setSaleToAnnul] = useState<SaleHeader | null>(null);
  const [isDevolutionDialogOpen, setIsDevolutionDialogOpen] = useState(false);
  const [saleToDevolve, setSaleToDevolve] = useState<SaleHeader | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLoading, setPageLoading] = useState(true);
  const [allSales, setAllSales] = useState<SaleHeader[]>([]); // Para paginación del cliente
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});
  const location = useLocation();
  // Track handled navigation to avoid repeated detail fetches
  const handledOpenSaleIdRef = useRef<number | null>(null);

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'annulled' | 'budgets'>('all');
  const [branchFilterIds, setBranchFilterIds] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]); // Estado para productos seleccionados
  const [productOptions, setProductOptions] = useState<Option[]>([]); // Estado para opciones de productos
  const [productLabelMap, setProductLabelMap] = useState<Record<string, string>>({});
  const [debouncedProductQuery, setDebouncedProductQuery] = useState("");
  const [productPage, setProductPage] = useState(1);
  const [productHasMore, setProductHasMore] = useState(false);
  const [productLoading, setProductLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Presupuestos State & Hook
  const [budgetStatus, setBudgetStatus] = useState<'active' | 'converted' | 'annulled' | 'all'>('active');
  const [currentBudgetPage, setCurrentBudgetPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search for budgets
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Calculate effective branch IDs for budgets
  const budgetBranchIds = useMemo(() => {
    return branchFilterIds.length === 0
      ? selectedBranchIds.map(Number)
      : branchFilterIds.map(Number);
  }, [branchFilterIds, selectedBranchIds]);

  const effectiveBranchIds = useMemo(() => {
    if (branchFilterIds.length === 0) return selectedBranchIds.map(Number);
    return branchFilterIds.map(Number);
  }, [branchFilterIds, selectedBranchIds]);

  const branchFilterSummary = useMemo(() => {
    if (branchFilterIds.length === 0) return "Todas";
    const map = new Map(branches.map((b) => [b.id.toString(), b.description]));
    const first = map.get(branchFilterIds[0]) || "Sucursal";
    if (branchFilterIds.length === 1) return first;
    return `${first} +${branchFilterIds.length - 1}`;
  }, [branchFilterIds, branches]);

  const toggleBranchFilter = (value: string) => {
    if (branchFilterIds.includes(value)) {
      setBranchFilterIds(branchFilterIds.filter((v) => v !== value));
    } else {
      setBranchFilterIds([...branchFilterIds, value]);
    }
  };

  const {
    budgets,
    loading: loadingBudgets,
    actionLoading: actionLoadingBudgets,
    fetchBudgets,
    convertToSale,
    approveBudget,
    deleteBudget,
    pagination: budgetPagination
  } = useBudgets({
    branchIds: budgetBranchIds,
    toDate: dateRange?.to ? format(dateRange?.to, 'yyyy-MM-dd') : undefined,
    search: debouncedSearch,
    page: currentBudgetPage,
    limit: 99999
  });

  // Cash register validation - usando la sucursal seleccionada
  // Si selectedBranch no está disponible, usar el primer ID de selectedBranchIds
  const currentBranchId = selectedBranch?.id
    ? Number(selectedBranch.id)
    : (selectedBranchIds.length > 0 ? Number(selectedBranchIds[0]) : 1);

  // Hook para obtener el estado de la caja
  const { status: cashRegisterStatus, isOpen: isCashRegisterOpen } = useCashRegisterStatus(currentBranchId);
  const currentCashRegisterId = isCashRegisterOpen && cashRegisterStatus?.cash_register?.id
    ? cashRegisterStatus.cash_register.id
    : null;

  // Wrapper function to refresh sales after converting budget
  const handleConvertToSale = async (budgetId: number, receiptTypeId: number, cashRegisterId?: number, paymentMethodId?: number) => {
    const result = await convertToSale(budgetId, receiptTypeId, cashRegisterId, paymentMethodId);
    // Refresh sales list after successful conversion
    if (dateRange?.from && dateRange?.to) {
      await fetchSales(dateRange?.from, dateRange?.to, currentPage, debouncedSearch);
      await fetchStats(dateRange?.from, dateRange?.to);
    }
    return result;
  };

  // Configuración de columnas redimensionables
  const columnConfig = [
    { id: 'receipt_number', minWidth: 100, maxWidth: 300, defaultWidth: 220 },
    { id: 'customer', minWidth: 100, maxWidth: 200, defaultWidth: 120 },
    { id: 'receipt_type', minWidth: 150, maxWidth: 350, defaultWidth: 220 },
    { id: 'branch', minWidth: 120, maxWidth: 150, defaultWidth: 120 },
    { id: 'items', minWidth: 80, maxWidth: 100, defaultWidth: 100 },
    { id: 'date', minWidth: 100, maxWidth: 150, defaultWidth: 120 },
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
    // Si dateRange tiene fechas, validarlas primero
    if (dateRange) {
      const isFromValid = dateRange?.from instanceof Date && !isNaN(dateRange?.from.getTime());
      const isToValid = dateRange?.to instanceof Date && !isNaN(dateRange?.to.getTime());

      if (!isFromValid || !isToValid) {
        const today = new Date();
        const firstOfMonth = startOfMonth(today);
        setDateRange({ from: firstOfMonth, to: today });
        return; // wait for next render with valid dates
      }
    }

    setPageLoading(true);
    setCurrentPage(1);
    setAllSales([]); // Limpiar caché cuando cambien las fechas
    const timer = setTimeout(() => {
      Promise.all([
        fetchSales(dateRange?.from, dateRange?.to, 1, searchTerm),
        fetchStats(dateRange?.from, dateRange?.to)
      ]).finally(() => {
        setPageLoading(false);
      });
    }, 350); // debounce to prevent multiple quick fetches while picking dates

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange?.from, dateRange?.to, searchTerm]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, sales]);

  // Refetch cuando cambie la selección de sucursales o productos
  useEffect(() => {
    // Reutiliza el rango actual y reinicia a la primera página
    setPageLoading(true);
    setAllSales([]); // Limpiar caché cuando cambie la sucursal o productos
    Promise.all([
      fetchSales(dateRange?.from, dateRange?.to, 1, searchTerm),
      fetchStats(dateRange?.from, dateRange?.to),
    ]).finally(() => setPageLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionChangeToken, selectedProductIds]); // Agregar selectedProductIds a las dependencias

  useEffect(() => {
    const valid = branchFilterIds.filter(id => selectedBranchIds.includes(id));
    if (valid.length !== branchFilterIds.length) {
      setBranchFilterIds(valid);
    }
  }, [branchFilterIds, selectedBranchIds]);

  // Refetch cuando cambie el término de búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setPageLoading(true);
      setCurrentPage(1);
      setAllSales([]);
      fetchSales(dateRange?.from, dateRange?.to, 1, searchTerm).finally(() => {
        setPageLoading(false);
      });
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Cargar productos para el filtro
  useEffect(() => {
    setProductOptions([]);
    setProductHasMore(false);
    setProductPage(1);
  }, [debouncedProductQuery, selectionChangeToken, selectedBranchIds]);

  useEffect(() => {
    const fetchProducts = async () => {
      const query = debouncedProductQuery.trim();
      if (query.length < 2) {
        setProductOptions([]);
        setProductHasMore(false);
        return;
      }

      setProductLoading(true);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const params: Record<string, any> = {
          search: query,
          page: productPage,
          per_page: 50,
        };
        if (selectedBranchIds.length > 0) {
          params["branch_ids[]"] = selectedBranchIds.map(id => Number(id));
        }

        const response = await request({
          method: 'GET',
          url: '/products',
          params
        });

        const responseData = response?.data ?? response;
        const rawProducts =
          (response?.success ? response?.data?.data ?? response?.data : undefined) ??
          responseData?.data ??
          responseData ??
          [];

        const items = Array.isArray(rawProducts) ? rawProducts : [];
        const options: Option[] = items.map((p: any) => {
          const code = p.code ?? p.sku ?? p.barcode ?? p.id;
          const name = p.name ?? p.description ?? "Sin nombre";
          return {
            label: `${code} - ${name}`,
            value: p.id.toString()
          };
        });

        setProductOptions((prev) => {
          if (productPage === 1) return options;
          const map = new Map(prev.map((opt) => [opt.value, opt]));
          options.forEach((opt) => map.set(opt.value, opt));
          return Array.from(map.values());
        });
        setProductHasMore(items.length === 50);
        setProductLabelMap((prev) => {
          const next = { ...prev };
          options.forEach((opt) => {
            next[opt.value] = opt.label;
          });
          return next;
        });
      } catch (error) {
        console.error("Error fetching products:", error);
        if (productPage === 1) setProductOptions([]);
        setProductHasMore(false);
      } finally {
        setProductLoading(false);
      }
    };

    fetchProducts();
  }, [request, debouncedProductQuery, productPage, selectedBranchIds]);



  const fetchSales = async (fromDate?: Date, toDate?: Date, page = 1, search = "") => {
    try {
      // Construir parámetros de forma canónica
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const apiParams: Record<string, any> = {};

      if (fromDate && toDate) {
        apiParams.from_date = format(fromDate, "yyyy-MM-dd");
        apiParams.to_date = format(toDate, "yyyy-MM-dd");
      }

      // Filtrar por sucursales seleccionadas - siempre como array para consistencia
      if (effectiveBranchIds.length > 0) {
        // Usar 'branch_id[]' para que Laravel reciba un array
        apiParams['branch_id[]'] = effectiveBranchIds;
      }

      // Agregar búsqueda al backend
      if (search) {
        apiParams.search = search;
      }

      // Siempre incluir parámetros de paginación
      apiParams.page = page;
      apiParams.per_page = PAGE_SIZE;

      // Filtro por productos
      if (selectedProductIds.length > 0) {
        apiParams.product_ids = selectedProductIds.map(id => parseInt(id, 10));
      }

      const response = await request({
        method: "GET",
        url: `/sales/global`,
        params: apiParams,
      });

      // useApi devuelve response.data de Axios, por lo que "response" ya es el cuerpo deserializado.
      // Laravel LengthAwarePaginator serializa a: { current_page, data, last_page, per_page, total, ... }
      // Si el backend devuelve un array plano, response será ese array directamente.

      // Detectar si es un paginador de Laravel (tiene data como array y total/last_page como números)
      const isLaravelPaginator = (
        response &&
        typeof response === 'object' &&
        !Array.isArray(response) &&
        Array.isArray(response.data) &&
        typeof response.total === 'number' &&
        typeof response.last_page === 'number'
      );

      let salesData: SaleHeader[] = [];

      if (isLaravelPaginator) {
        // Paginador de Laravel: los datos están en response.data
        salesData = response.data;
      } else if (Array.isArray(response)) {
        // Array plano
        salesData = response;
      } else if (Array.isArray(response?.data)) {
        // Objeto con data como array (pero sin metadatos de paginación)
        salesData = response.data;
      } else if (response?.data) {
        // Objeto único
        salesData = [response.data].flat();
      } else if (response) {
        salesData = [response].flat();
      }

      // Usar paginación del servidor si es un paginador de Laravel válido
      const hasServerPagination = isLaravelPaginator && response.last_page > 0;
      setUsingServerPagination(hasServerPagination);

      if (hasServerPagination) {
        // Paginación del servidor (Laravel LengthAwarePaginator)
        const paginationInfo = {
          total: response.total,
          currentPage: response.current_page,
          lastPage: response.last_page,
          perPage: response.per_page,
        };

        setTotalItems(paginationInfo.total);
        setTotalPages(paginationInfo.lastPage);
        setCurrentPage(paginationInfo.currentPage);
        setSales(salesData);
      } else {
        // Paginación del cliente - la API devuelve todas las ventas

        // Solo cargar todas las ventas si no las tenemos o si cambiaron las fechas
        let allSalesData = allSales;
        if (allSales.length === 0 || page === 1) {
          allSalesData = salesData;
          setAllSales(allSalesData);
        }

        // Calcular paginación del cliente
        const totalCount = allSalesData.length;
        const totalPagesCalculated = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
        const safeCurrentPage = Math.min(page, totalPagesCalculated);
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
      sileo.error({
        title: "Error",
        description: "No se pudo cargar el historial de ventas.",
      });
      setSales([]);
    }
  };

  const fetchStats = async (fromDate?: Date, toDate?: Date) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const apiParams: any = {};
      if (fromDate && toDate) {
        apiParams.from_date = format(fromDate, "yyyy-MM-dd");
        apiParams.to_date = format(toDate, "yyyy-MM-dd");
      }
      // Filtrar por sucursales seleccionadas
      if (effectiveBranchIds.length > 0) {
        effectiveBranchIds.forEach(id => {
          if (!apiParams['branch_id[]']) apiParams['branch_id[]'] = [];
          apiParams['branch_id[]'].push(id);
        });
      }
      if (selectedProductIds.length > 0) {
        apiParams.product_ids = selectedProductIds.map(id => parseInt(id, 10));
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
        converted_budget_count: statsData.converted_budget_count ?? 0,
        client_count: statsData.client_count ?? 0,
        average_sale_amount: statsData.average_sale_amount ?? (statsData.sales_count > 0 ? statsData.grand_total_amount / statsData.sales_count : 0),
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      sileo.error({
        title: "Error",
        description: "No se pudieron cargar las estadísticas de ventas.",
      });
      setStats({
        total_sales: 0,
        total_amount: 0,
        total_iva: 0,
        budget_count: 0,
        converted_budget_count: 0,
        client_count: 0,
        average_sale_amount: 0,
      });
    }
  };

  const getCustomerName = (sale: SaleHeader): string => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const resolveBranchColor = (sale: SaleHeader) => {
    let branchId: number | string | null = null;
    if (typeof sale.branch === 'object' && sale.branch?.id) branchId = Number(sale.branch.id);
    else if (typeof sale.branch === 'string') {
      const b = branches.find((x) => x.description === sale.branch);
      branchId = b?.id ?? null;
    }
    return getBranchColor({ branchId, branches: branches ?? [] });
  };

  const getBranchName = (sale: SaleHeader) => {
    if (typeof sale.branch === 'string') {
      return sale.branch;
    }
    return sale.branch?.description || 'N/A';
  };

  const getReceiptType = (
    sale: SaleHeader
  ): { displayName: string; filterKey: string; arcaCode: string } => {
    if (sale.receipt_type && typeof sale.receipt_type === 'object') {
      const upperDescription = (sale.receipt_type.description || "").toUpperCase();
      const arcaCode = sale.receipt_type.afip_code || "N/A";
      return {
        displayName: upperDescription,
        filterKey: upperDescription,
        arcaCode: String(arcaCode),
      };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actualReceiptType = (sale as any).receipt_type as string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actualArcaCode = (sale as any).receipt_type_code as string;

    if (typeof actualReceiptType === 'string' && actualReceiptType.trim() !== '') {
      const upperDescription = actualReceiptType.toUpperCase();
      const arcaCode = actualArcaCode || "N/A";
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

  const canAnnulSale = (sale: SaleHeader): boolean => {
    const receiptType = getReceiptType(sale).displayName;
    return !(
      receiptType.includes('NOTA DE CRÉDITO') ||
      receiptType.includes('DEVOLUCIÓN')
    );
  };

  const getReceiptTypeBadge = (
    receiptInfo: { displayName: string; filterKey: string; arcaCode: string }
  ) => {
    const textToShow =
      receiptInfo.displayName !== "N/A"
        ? receiptInfo.displayName
        : receiptInfo.arcaCode;
    const style = getReceiptTypeBadgeStyle(receiptInfo.arcaCode);

    return (
      <Badge
        variant="outline"
        className={`${style.bg} ${style.text} ${style.border}`}
      >
        {textToShow}
      </Badge>
    );
  };

  // Helper to check if a sale is a budget (ARCA code 016)
  const isBudget = (sale: SaleHeader): boolean => {
    if (sale.receipt_type && typeof sale.receipt_type === 'object') {
      return sale.receipt_type.afip_code === '016';
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const arcaCode = (sale as any).receipt_type_code as string;
    return arcaCode === '016';
  };

  // Helper to get budget status badge - matches PresupuestosPage styling
  const getBudgetStatusBadge = (sale: SaleHeader) => {
    if (!isBudget(sale)) return null;

    const status = sale.status;

    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">Pendiente</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Aprobado</Badge>;
      case 'active':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Vigente</Badge>;
      case 'converted':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Convertido</Badge>;
      case 'annulled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">Anulado</Badge>;
      default:
        return null;
    }
  };


  const [annulledSales, setAnnulledSales] = useState<SaleHeader[]>([]);
  const [loadingAnnulled, setLoadingAnnulled] = useState(false);

  // Estado para el diálogo de impresión
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [selectedReceiptSale, setSelectedReceiptSale] = useState<SaleHeader | null>(null);

  // Cargar todas las ventas anuladas cuando se selecciona el filtro
  useEffect(() => {
    if (statusFilter === 'annulled') {
      const fetchAllAnnulled = async () => {
        setLoadingAnnulled(true);
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const apiParams: any = {};

          if (dateRange?.from && dateRange?.to) {
            apiParams.from_date = format(dateRange?.from, "yyyy-MM-dd");
            apiParams.to_date = format(dateRange?.to, "yyyy-MM-dd");
          }

          // Incluir filtro de sucursales si hay selección
          if (effectiveBranchIds.length > 0) {
            apiParams.branch_id = effectiveBranchIds;
          }

          // Buscar sin paginación para obtener todas las anuladas
          apiParams.paginate = 'false';

          if (searchTerm) {
            apiParams.search = searchTerm;
          }

          const response = await request({
            method: "GET",
            url: `/sales/global`,
            params: apiParams,
          });

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

          // Filtrar solo las anuladas
          const annulled = salesData.filter((sale: SaleHeader) => sale.status === 'annulled');
          setAnnulledSales(annulled);
        } catch (error) {
          console.error('Error fetching annulled sales:', error);
          sileo.error({
            title: "Error",
            description: "No se pudieron cargar las ventas anuladas.",
          });
          setAnnulledSales([]);
        } finally {
          setLoadingAnnulled(false);
        }
      };

      fetchAllAnnulled();
    } else {
      // Limpiar cuando cambiamos de filtro
      setAnnulledSales([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, dateRange?.from, dateRange?.to, searchTerm, selectionChangeToken]);

  // Determinar qué ventas mostrar según el filtro
  const filteredSales = (() => {
    if (statusFilter === 'budgets') return [];
    if (statusFilter === 'annulled') {
      // Para anuladas, usar todas las anuladas cargadas
      const sourceSales = annulledSales.length > 0 ? annulledSales : sales.filter((s: SaleHeader) => s.status === 'annulled');

      // Aplicar filtro de sucursal
      return sourceSales.filter((sale: SaleHeader) => {
        const matchesBranch = branchFilterIds.length === 0 ? true :
          (() => {
            let branchId: number | null = null;
            if (typeof sale.branch === 'object' && sale.branch?.id) {
              branchId = Number(sale.branch.id);
            } else if (typeof sale.branch === 'string') {
              const branch = branches.find(b => b.description === sale.branch);
              branchId = branch?.id ? Number(branch.id) : null;
            }
            return branchId ? branchFilterIds.includes(branchId.toString()) : false;
          })();

        return matchesBranch;
      });
    }

    // Para 'all' y 'active', usar el filtrado normal
    return sales.filter((sale: SaleHeader) => {
      const matchesStatus =
        statusFilter === 'all' ? true :
          statusFilter === 'active' ? sale.status !== 'annulled' :
            sale.status === 'annulled';

      const matchesBranch = branchFilterIds.length === 0 ? true :
        (() => {
          let branchId: number | null = null;
          if (typeof sale.branch === 'object' && sale.branch?.id) {
            branchId = Number(sale.branch.id);
          } else if (typeof sale.branch === 'string') {
            const branch = branches.find(b => b.description === sale.branch);
            branchId = branch?.id ? Number(branch.id) : null;
          }
          return branchId ? branchFilterIds.includes(branchId.toString()) : false;
        })();

      return matchesStatus && matchesBranch;
    });
  })();

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange({ from: range?.from ?? new Date(), to: range?.to ?? new Date() });
  };

  // Función para limpiar el filtro de fechas y volver al mes actual
  const clearDateRange = () => {
    setDateRange(undefined);
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
    sileo.success({ title: "Exportación CSV generada." });
  };

  const handleExportPDF = () => {
    if (filteredSales.length === 0) {
      sileo.error({ title: "No hay ventas para exportar." });
      return;
    }

    const doc = new jsPDF();

    const tableColumn = ["Número", "Comprobante", "Cliente", "Sucursal", "Total", "Fecha"];
    const tableRows: string[][] = [];

    filteredSales.forEach((sale) => {
      const saleData = [
        (sale.receipt_number || sale.id).toString(),
        getReceiptType(sale).displayName,
        getCustomerName(sale),
        typeof sale.branch === 'string' ? sale.branch : sale.branch?.description || "N/A",
        formatCurrency(sale.total),
        formatShortDate(sale.date),
      ];
      tableRows.push(saleData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });

    doc.text("Reporte de Ventas", 14, 15);
    doc.save("reporte_ventas.pdf");
    sileo.success({ title: "Exportación PDF generada." });
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      sileo.error({
        title: "Error",
        description: "No se pudo cargar el detalle completo de la venta.",
      });
      setSelectedSale(sale);
      setIsDetailOpen(true);
    } finally {
      setLoadingActions(prev => ({ ...prev, [actionKey]: false }));
    }
  };



  /**
   * Maneja la actualización de una venta después de autorización ARCA
   * Actualiza la venta en la lista local y recarga si es necesario
   */
  const handleSaleUpdated = async (updatedSale: SaleHeader) => {
    // Actualizar en la lista local
    setSales(prevSales =>
      prevSales.map(sale =>
        sale.id === updatedSale.id ? updatedSale : sale
      )
    );
    setAllSales(prevSales =>
      prevSales.map(sale =>
        sale.id === updatedSale.id ? updatedSale : sale
      )
    );

    // Actualizar la venta seleccionada
    if (selectedSale && selectedSale.id === updatedSale.id) {
      setSelectedSale(updatedSale);
    }

    // Recargar estadísticas para reflejar cambios
    if (dateRange?.from && dateRange?.to) {
      fetchStats(dateRange?.from, dateRange?.to);
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
      sileo.error({ title: "Error",
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
      const rawDesc = typeof sale.receipt_type === 'string' ? sale.receipt_type : sale.receipt_type?.description || 'comprobante';
      const receiptTypeDesc = rawDesc.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_');
      const receiptNumber = sale.receipt_number || sale.id;
      const fileName = `${receiptTypeDesc}_${receiptNumber}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '');
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      alert("Error al descargar PDF");
    } finally {
      setLoadingActions(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handlePrintReceipt = async (sale: SaleHeader) => {
    try {
      const response = await request({ method: 'GET', url: `/sales/${sale.id}` })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fullSale = (response as any)?.data?.data || (response as any)?.data || response
      setSelectedReceiptSale(fullSale)
      setShowReceiptPreview(true)
    } catch (error) {
      console.error('Error fetching sale details for receipt:', error)
      sileo.error({ title: 'No se pudo cargar el detalle del comprobante' })
      setSelectedReceiptSale(sale)
      setShowReceiptPreview(true)
    }
  };

  // Deprecated: handlePrintPdf replaced by handlePrintReceipt
  /*
  const handlePrintPdf = async (sale: SaleHeader) => {
    // ... logic moved to SaleReceiptPreviewDialog or deprecated
  };
  */

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
      fetchSales(dateRange?.from, dateRange?.to, 1),
      fetchStats(dateRange?.from, dateRange?.to),
    ]);
  };

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages && pageNumber !== currentPage && !pageLoading) {
      setCurrentPage(pageNumber);

      // Si el backend pagina, solicitar la página directamente
      if (usingServerPagination) {
        fetchSales(dateRange?.from, dateRange?.to, pageNumber, searchTerm);
        return;
      }

      // Paginación del cliente si tenemos todas las ventas cargadas
      if (allSales.length > 0) {
        const startIndex = (pageNumber - 1) * PAGE_SIZE;
        const endIndex = startIndex + PAGE_SIZE;
        const paginatedSales = allSales.slice(startIndex, endIndex);
        setSales(paginatedSales);
      } else {
        fetchSales(dateRange?.from, dateRange?.to, pageNumber, searchTerm);
      }

    }
  };


  // Botón de recarga: recarga ventas y stats manteniendo página y rango actual
  const reloadData = () => {
    if (pageLoading) return;

    if (statusFilter === 'budgets') {
      fetchBudgets();
      return;
    }

    setPageLoading(true);
    setAllSales([]); // Limpiar caché para forzar nueva carga
    Promise.all([
      fetchSales(dateRange?.from, dateRange?.to, 1), // Empezar desde página 1
      fetchStats(dateRange?.from, dateRange?.to),
    ]).finally(() => setPageLoading(false));
  };

  return (
    <ProtectedRoute permissions={['ver_ventas']} requireAny={true}>
      <>
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
              </div>

              <div className="flex gap-2 items-center justify-end">
                {/* Botón de recarga */}
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
                {hasPermission('exportar_reportes') && (
                  <DropdownMenu>
                    {/* @ts-expect-error - UI component props mismatch */}
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="cursor-pointer lg:w-auto lg:px-3"
                        disabled={pageLoading}
                        title="Exportar"
                      >
                        <Download className="h-4 w-4 lg:mr-2" />
                        <span className="hidden lg:inline">Exportar</span>
                      </Button>
                    </DropdownMenuTrigger>
                    {/* @ts-expect-error - UI component props mismatch */}
                    <DropdownMenuContent align="end">
                      {/* @ts-expect-error - UI component props mismatch */}
                      <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer">
                        <FileText className="mr-2 h-4 w-4" />
                        Exportar CSV
                      </DropdownMenuItem>
                      {/* @ts-expect-error - UI component props mismatch */}
                      <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
                        <FileText className="mr-2 h-4 w-4" />
                        Exportar PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  className="cursor-pointer lg:w-auto lg:px-3"
                  onClick={() => setShowChart(!showChart)}
                  title={showChart ? "Ocultar Gráfico" : "Mostrar Gráfico"}
                >
                  <TrendingUp className="h-4 w-4 lg:mr-2" />
                  <span className="hidden lg:inline">{showChart ? "Ocultar Gráfico" : "Mostrar Gráfico"}</span>
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
                    {stats.total_sales.toLocaleString("es-AR")}
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
                  <div className="text-2xl font-bold">
                    {stats.budget_count.toLocaleString("es-AR")}
                    <span className="text-green-600 text-lg ml-2">({stats.converted_budget_count})</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Emitidos (convertidos)
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Clientes Únicos</CardTitle>
                  <Users className="h-4 w-4 text-amber-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.client_count.toLocaleString("es-AR")}</div>
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

            {/* @ts-expect-error - UI component props mismatch */}
            <Tabs
              value={statusFilter}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onValueChange={(value) => setStatusFilter(value as any)}
              className="w-full space-y-4"
            >
              <div className="flex flex-col gap-3">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
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
                    <TabsTrigger value="budgets">
                      <FileText className="w-4 h-4 mr-2" />
                      Presupuestos
                    </TabsTrigger>
                  </TabsList>

                  <div className="flex items-center gap-2 ml-auto">
                    <Button
                      variant={filtersOpen ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFiltersOpen(!filtersOpen)}
                      className="flex items-center gap-2"
                    >
                      <Filter className="h-4 w-4" />
                      Filtros
                      {filtersOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
                  <CollapsibleContent className="pt-1">
                    <div className="flex flex-wrap gap-2 p-3 rounded-lg border bg-muted/30">
                      <div className="relative w-full sm:w-[280px]">
                        <input
                          type="text"
                          placeholder="Buscar por cliente, teléfono o comprobante..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background w-full"
                        />
                      </div>

                      <DatePickerWithRange
                        selected={dateRange}
                        onSelect={handleDateRangeChange}
                        className="md:w-auto"
                        showClearButton={true}
                        onClear={clearDateRange}
                      />

                      {statusFilter === 'budgets' ? (
                        <>
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium">Estado:</Label>
                            <Select
                              value={budgetStatus}
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              onValueChange={(value: any) => setBudgetStatus(value)}
                            >
                              {/* @ts-expect-error - UI component props mismatch */}
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Estado" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Activos</SelectItem>
                                <SelectItem value="converted">Convertidos</SelectItem>
                                <SelectItem value="annulled">Anulados</SelectItem>
                                <SelectItem value="all">Todos</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      ) : null}

                      {selectedBranchIds.length > 1 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="justify-between min-w-[160px]"
                              title="Seleccionar sucursales"
                            >
                              <span className="truncate">Sucursales</span>
                              <span className="ml-2 flex items-center gap-1 text-muted-foreground text-xs">
                                <span className="truncate max-w-[70px]">{branchFilterSummary}</span>
                                <ChevronDown className="h-3 w-3 opacity-70" />
                              </span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72" style={{ maxHeight: 320, overflowY: 'auto' }}>
                            <div className="mb-2 text-xs text-muted-foreground">Selecciona sucursales</div>
                            <div className="grid gap-2">
                              {branches?.filter(branch => selectedBranchIds.includes(branch.id.toString())).map((branch) => (
                                <label key={branch.id} className="flex items-center gap-2 text-sm">
                                  <Checkbox
                                    checked={branchFilterIds.includes(branch.id.toString())}
                                    onCheckedChange={() => toggleBranchFilter(branch.id.toString())}
                                  />
                                  <div className="flex items-center gap-2">
                                    {branch.color && (
                                      <div
                                        className="w-3 h-3 rounded-full border"
                                        style={{ backgroundColor: branch.color }}
                                      />
                                    )}
                                    <span className="truncate">{branch.description}</span>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}

                      {statusFilter !== 'budgets' && (
                        <div className="w-[300px] shrink-0">
                          <AsyncMultiSelect
                            options={productOptions}
                            selected={selectedProductIds}
                            onChange={setSelectedProductIds}
                            onSearch={(query) => {
                              setDebouncedProductQuery(query);
                            }}
                            loading={productLoading}
                            hasMore={productHasMore}
                            onLoadMore={() => setProductPage(p => p + 1)}
                            placeholder="Productos"
                            searchPlaceholder="Buscar producto..."
                            emptyMessage={debouncedProductQuery.trim().length < 2 ? "Escribi al menos 2 caracteres para buscar." : "No se encontraron productos"}
                            selectedLabelMap={productLabelMap}
                          />
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {statusFilter === 'budgets' ? (
                <div className="space-y-4">
                  <PresupuestosPage
                    budgets={budgets}
                    loading={loadingBudgets}
                    actionLoading={actionLoadingBudgets}
                    showBranchColumn={selectedBranchIds.length > 1}
                    cashRegisterId={currentCashRegisterId}
                    onConvert={handleConvertToSale}
                    onDelete={deleteBudget}
                    onApprove={approveBudget}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onViewDetail={(budget) => handleViewDetail(budget as any)}

                  />

                  {/* Pagination for Budgets */}
                  <div className="mt-4">
                    <Pagination
                      currentPage={budgetPagination.current_page}
                      lastPage={budgetPagination.last_page}
                      onPageChange={setCurrentBudgetPage}
                      total={budgetPagination.total}
                      itemName="presupuestos"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {/* Chart Section */}
                    {showChart && (
                      <SalesHistoryChart dateRange={dateRange} />
                    )}

                    <div className="rounded-md border mt-4">
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
                              className={selectedBranchIds.length > 1 ? "" : "hidden"}
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
                          {(pageLoading || (statusFilter === 'annulled' && loadingAnnulled)) && (
                            <TableRow>
                              <TableCell colSpan={8} className="h-24 text-center">
                                <div className="flex flex-col items-center justify-center">
                                  <Loader2 className="animate-spin h-6 w-6 text-primary mb-2" />
                                  <span className="text-sm text-muted-foreground">
                                    {statusFilter === 'annulled' ? 'Cargando ventas anuladas...' : 'Cargando ventas...'}
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                          {!pageLoading && !(statusFilter === 'annulled' && loadingAnnulled) && filteredSales.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={8} className="h-24 text-center">
                                <div className="flex flex-col items-center justify-center">
                                  <FileText className="h-8 w-8 text-muted-foreground mb-2 opacity-40" />
                                  <span className="text-muted-foreground">No se encontraron ventas para el período seleccionado.</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                          {!pageLoading && !(statusFilter === 'annulled' && loadingAnnulled) &&
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
                                  <div className="flex items-center gap-1">
                                    <span>{sale.receipt_number || sale.id}</span>
                                    <ConversionStatusBadge
                                      convertedFromBudgetId={sale.converted_from_budget_id}
                                      convertedFromBudgetReceipt={sale.converted_from_budget_receipt}
                                    />
                                    <ConversionStatusBadge
                                      convertedToSaleId={sale.converted_to_sale_id}
                                      convertedToSaleReceipt={sale.converted_to_sale_receipt}
                                    />
                                  </div>
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
                                  <div className="flex items-center gap-2">
                                    {getReceiptTypeBadge(getReceiptType(sale))}
                                    {getBudgetStatusBadge(sale)}
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
                                </ResizableTableCell>
                                <ResizableTableCell
                                  columnId="branch"
                                  getColumnCellProps={getColumnCellProps}
                                  className={selectedBranchIds.length > 1 ? "" : "hidden"}
                                >
                                  <BranchBadge
                                    name={getBranchName(sale)}
                                    color={resolveBranchColor(sale)}
                                    dimmed={sale.status === 'annulled'}
                                  />
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
                                    className={`font-bold ${sale.status === 'annulled' ? 'line-through text-red-500' : ''}`}
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
                                      title="Ver Detalle"
                                      type="button"
                                      onClick={() => handleViewDetail(sale)}
                                    >
                                      <Eye className="h-4 w-4" />
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
                                    {!getReceiptType(sale).displayName.includes('NOTA DE CRÉDITO') && !getReceiptType(sale).displayName.includes('DEVOLUCIÓN') && (
                                      <Button
                                        variant="ghost"
                                        className={`text-green-700 hover:bg-green-100 hover:text-green-800 border-green-200 ${hasPermission('reimprimir_comprobantes') ? 'cursor-pointer' : 'invisible cursor-default'}`}
                                        size="icon"
                                        onClick={
                                          hasPermission('reimprimir_comprobantes')
                                            ? () => handlePrintReceipt(sale)
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
                                    )}
                                    {(sale.status === 'active' || sale.status === 'completed') && (
                                      <>
                                        {hasPermission('emitir_notas_credito') && canIssueCreditNote(sale) && (
                                          <Button
                                            variant="ghost"
                                            className="text-orange-700 hover:bg-orange-100 hover:text-orange-800 border-orange-200 cursor-pointer"
                                            size="icon"
                                            onClick={() => {
                                              setSaleToDevolve(sale);
                                              setIsDevolutionDialogOpen(true);
                                            }}
                                            title="Emitir Nota de Crédito / Devolución"
                                            type="button"
                                          >
                                            <Undo2 className="h-4 w-4" />
                                          </Button>
                                        )}
                                        {hasPermission('anular_ventas') && canAnnulSale(sale) && (
                                          <Button
                                            variant="ghost"
                                            className="text-red-700 hover:bg-red-100 hover:text-red-800 border-red-200 cursor-pointer"
                                            size="icon"
                                            onClick={() => handleAnnulSale(sale)}
                                            title={sale.status === 'completed' ? 'Anular Venta (Opción recomendada para ventas de días anteriores)' : 'Anular Venta (Para corregir o cancelar una venta actual)'}
                                            type="button"
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </ResizableTableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Paginación para ventas - Solo mostrar si no estamos en el filtro de anuladas */}
                    {/* Pagination */}
                    <div className="mt-4">
                      <Pagination
                        currentPage={currentPage}
                        lastPage={totalPages}
                        onPageChange={handlePageChange}
                        total={totalItems}
                        itemName="ventas"
                      />
                    </div>
                  </div>
                </>
              )}
            </Tabs>

            {
              statusFilter === 'annulled' && !loadingAnnulled && (
                <div className="mt-4 mb-6 text-center text-sm text-muted-foreground">
                  Mostrando {filteredSales.length} {filteredSales.length === 1 ? 'venta anulada' : 'ventas anuladas'} en el período seleccionado
                </div>
              )
            }

            {/* Dialogs */}
            {
              selectedSale && (
                <ViewSaleDialog
                  open={isDetailOpen}
                  onOpenChange={setIsDetailOpen}
                  sale={selectedSale}
                  getCustomerName={getCustomerName}
                  formatDate={formatDate}
                  getReceiptType={getReceiptType}
                  onPrintPdf={async (sale) => {
                    handlePrintReceipt(sale);
                  }}
                  onDownloadPdf={async (sale) => {
                    if (!sale || !sale.id) {
                      sileo.error({ title: "No se puede descargar el PDF: ID de venta faltante." });
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
                      sileo.success({ title: "PDF descargado exitosamente" });
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    } catch (error) {
                      sileo.error({ title: "Error al descargar PDF" });
                    }
                  }}
                  onSaleUpdated={handleSaleUpdated}
                />
              )
            }

            {/* Annul Sale Dialog */}
            {
              saleToAnnul && (
                <AnnulSaleDialog
                  isOpen={isAnnulDialogOpen}
                  onClose={() => setIsAnnulDialogOpen(false)}
                  sale={saleToAnnul}
                  onSuccess={handleAnnulSuccess}
                />
              )
            }

            {/* Emit Credit Note Dialog */}
            {
              saleToDevolve && (
                <EmitCreditNoteDialog
                  isOpen={isDevolutionDialogOpen}
                  onClose={() => setIsDevolutionDialogOpen(false)}
                  sale={saleToDevolve}
                  onSuccess={() => {
                    // Refetch sales after devolution to reflect the newly created credit note
                    fetchSales(dateRange?.from, dateRange?.to, currentPage, searchTerm);
                    fetchStats(dateRange?.from, dateRange?.to);
                  }}
                />
              )
            }

            {
              selectedSale && isReceiptOpen && (
                <SaleReceiptPreviewDialog
                  open={isReceiptOpen}
                  onOpenChange={setIsReceiptOpen}
                  sale={selectedSale}
                  customerName={getCustomerName(selectedSale)}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  customerCuit={(selectedSale as any)?.customer?.person?.cuit || (selectedSale as any)?.customer?.cuit}
                  formatDate={formatDate}
                  formatCurrency={formatCurrency}
                  onPrint={() => window.print()}
                />
              )
            }

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
        </BranchRequiredWrapper >
        {/* Diálogo de impresión */}
        <SaleReceiptPreviewDialog
          open={showReceiptPreview}
          onOpenChange={setShowReceiptPreview}
          sale={selectedReceiptSale}
          customerName={selectedReceiptSale ? getCustomerName(selectedReceiptSale) : ''}
          customerCuit={selectedReceiptSale?.customer?.person?.cuit}
          formatDate={formatDate}
          formatCurrency={formatCurrency}
        />
      </>
    </ProtectedRoute >
  );
}
