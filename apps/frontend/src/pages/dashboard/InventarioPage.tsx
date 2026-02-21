import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, RefreshCw, Pencil, Trash2, Eye, ChevronDown, Download, Calculator, Filter, ChevronUp, History } from "lucide-react"
import { NewProductButton } from "@/components/new-product-button"
import { AddStockButton } from "@/components/add-stock-button"
import { EditProductDialog } from "@/components/edit-product-dialog"
import { ViewProductDialog } from "@/components/view-product-dialog"
import useApi from "@/hooks/useApi"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { Product, Stock, Category as ProductCategoryType, Branch } from "@/types/product"
import { DeleteProductDialog } from "@/components/delete-product-dialog"
import { useEntityContext } from "@/context/EntityContext"
import { useSearchParams, useNavigate } from "react-router-dom"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { useExchangeRateUpdates } from "@/hooks/useExchangeRateUpdates"
import Pagination from "@/components/ui/pagination"
import BranchRequiredWrapper from "@/components/layout/branch-required-wrapper"
import ExportPriceListDialog from "@/components/ExportPriceListDialog"
import { BulkPriceUpdateModal } from "@/components/BulkPriceUpdate"
import { NumberFormatter } from '@/lib/formatters/numberFormatter';
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { ResizableTableHeader, ResizableTableCell } from '@/components/ui/resizable-table-header';
import { useAuth } from '@/hooks/useAuth';
import { useBranch } from '@/context/BranchContext';
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { matchesWildcard } from "@/utils/searchUtils";

export default function InventarioPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const { selectedBranchIds, setSelectedBranchIds, allBranches: contextAllBranches } = useBranch();
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  // filteredProducts removed, server side filtering used
  const [paginationMeta, setPaginationMeta] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: 0,
    to: 0
  })
  const [branches, setBranches] = useState<Branch[]>([])
  const [categories, setCategories] = useState<ProductCategoryType[]>([])
  const [parentCategories, setParentCategories] = useState<ProductCategoryType[]>([])

  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedStockStatuses, setSelectedStockStatuses] = useState<string[]>([])
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])
  const [selectedProductStatus, setSelectedProductStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>("")
  const { request, loading, error } = useApi()
  const { dispatch } = useEntityContext()
  const [initialDataLoaded, setInitialDataLoaded] = useState(false)
  const [suppliers, setSuppliers] = useState<{ id: number; name: string }[]>([])
  const [searchParams, setSearchParams] = useSearchParams()
  const [perBranchView, setPerBranchView] = useState(false)
  const [page, setPage] = useState<number>(1)
  const [perPage, setPerPage] = useState<number>(10)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [advancedBulkUpdateDialogOpen, setAdvancedBulkUpdateDialogOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Configuración de columnas redimensionables
  const showStockColumn = hasPermission('ver_stock_columna');
  const columnConfig = [
    { id: 'description', minWidth: 200, maxWidth: 600, defaultWidth: 300 },
    { id: 'code', minWidth: 80, maxWidth: 150, defaultWidth: 100 },
    { id: 'category', minWidth: 120, maxWidth: 200, defaultWidth: 150 },
    ...(hasPermission('ver_precio_unitario') ? [{ id: 'unit_price', minWidth: 100, maxWidth: 200, defaultWidth: 120 }] : []),
    { id: 'sale_price', minWidth: 120, maxWidth: 200, defaultWidth: 150 },
    ...(showStockColumn ? [
      { id: 'stock', minWidth: 80, maxWidth: 120, defaultWidth: 100 },
      { id: 'stock-min-max', minWidth: 100, maxWidth: 180, defaultWidth: 120 },
      { id: 'stock-status', minWidth: 100, maxWidth: 180, defaultWidth: 120 },
    ] : []),
    { id: 'status', minWidth: 80, maxWidth: 120, defaultWidth: 100 },
    { id: 'branch', minWidth: 120, maxWidth: 200, defaultWidth: 150 },
    { id: 'actions', minWidth: 120, maxWidth: 150, defaultWidth: 130 }
  ];

  const {
    getResizeHandleProps,
    getColumnHeaderProps,
    getColumnCellProps,
    tableRef
  } = useResizableColumns({
    columns: columnConfig,
    storageKey: 'inventario-column-widths',
    defaultWidth: 150
  });

  // Removed fetchStocksForProducts as backend now includes stocks

  const fetchProducts = useCallback(async (signal?: AbortSignal) => {
    try {
      // Build query params
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('per_page', String(perPage))

      if (searchQuery) params.set('search', searchQuery)

      // Usar selectedBranchIds del contexto global para filtrar en el backend
      if (selectedBranchIds.length > 0) {
        selectedBranchIds.forEach(id => params.append('branch_ids[]', id))
      }

      if (selectedCategories.length > 0) {
        selectedCategories.forEach(id => params.append('category_ids[]', id))
      }

      if (selectedStockStatuses.length > 0) {
        selectedStockStatuses.forEach(status => params.append('stock_status[]', status))
      }

      // Supplier filter
      if (selectedSuppliers.length > 0) {
        selectedSuppliers.forEach(id => params.append('supplier_ids[]', id))
      }

      // Product status filter (active/inactive)
      if (selectedProductStatus !== 'all') {
        params.set('status', selectedProductStatus)
      }

      // for_admin is no longer strictly needed for pagination but kept if backend uses it for other logic, 
      // primarily we rely on the new pagination structure.
      // params.set('for_admin', 'true') 

      const response = await request({
        method: "GET",
        url: `/products?${params.toString()}`,
        signal,
      });

      // Handle paginated response or flat array
      if (response && (response.data || Array.isArray(response))) {
        // Laravel paginate returns: { current_page, data, ... } which corresponds to response (since useApi returns body)
        // If response is a flat array, pData should be response itself.

        // Determine if response is the paginated object or the data array itself
        const pData = (response.current_page || response.data) ? response : response;

        if (pData.data && Array.isArray(pData.data)) {
          setProducts(pData.data)
          setPaginationMeta({
            current_page: pData.current_page,
            last_page: pData.last_page,
            per_page: pData.per_page,
            total: pData.total,
            from: pData.from,
            to: pData.to
          })
        } else if (Array.isArray(pData)) {
          // Fallback for flat array response (Client-side filtering & pagination)
          let filteredData = pData;

          // 1. Client-side Search
          if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            filteredData = filteredData.filter((p: Product) => {
              const q = p as Product & { barcode?: string };
              // Use matchesWildcard for all searchable fields
              return matchesWildcard(p.description || '', searchQuery) ||
                matchesWildcard(p.code || '', searchQuery) ||
                (q.barcode && matchesWildcard(q.barcode, searchQuery));
            });
          }

          // 2. Client-side Category Filter
          if (selectedCategories.length > 0) {
            filteredData = filteredData.filter((p: Product) => selectedCategories.includes(String(p.category_id)));
          }

          // 3. Client-side Supplier Filter
          if (selectedSuppliers.length > 0) {
            filteredData = filteredData.filter((p: Product) => selectedSuppliers.includes(String(p.supplier_id)));
          }

          // 4. Pagination calculation
          const total = filteredData.length;
          const lastPage = Math.max(1, Math.ceil(total / perPage));
          // Ensure current page is valid for the filtered results
          const currentPage = Math.min(Math.max(1, page), lastPage);

          // Calculate slice indices
          const fromIndex = (currentPage - 1) * perPage;
          const toIndex = Math.min(fromIndex + perPage, total);

          const paginatedData = filteredData.slice(fromIndex, toIndex);

          setProducts(paginatedData);
          setPaginationMeta({
            current_page: currentPage,
            last_page: lastPage,
            per_page: perPage,
            total: total,
            from: fromIndex + 1,
            to: toIndex
          });
        }
      }
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      if (e.name === 'AbortError' || e.message === 'canceled') return;
      console.error("Error al cargar productos:", err)
      setProducts([])
    }
  }, [request, page, perPage, searchQuery, selectedBranchIds, selectedCategories, selectedStockStatuses, selectedSuppliers, selectedProductStatus]);

  const refreshData = useCallback(() => {
    // If we are on page > 1 and refresh, we might want to stay on page or go to 1. 
    // Usually stay.
    const controller = new AbortController();
    fetchProducts(controller.signal);
    return () => controller.abort();
  }, [fetchProducts]);

  useExchangeRateUpdates(refreshData);

  // Client-side paginate function removed


  const handleGoToPage = (next: number, maxPages: number) => {
    const valid = Math.max(1, Math.min(next, maxPages))
    setPage(valid)
    const sp = new URLSearchParams(searchParams)
    sp.set('page', String(valid))
    sp.set('per_page', String(perPage))
    setSearchParams(sp, { replace: true })
  }

  const handlePerPageChange = (value: number) => {
    setPerPage(value)
    setPage(1)
    const sp = new URLSearchParams(searchParams)
    sp.set('per_page', String(value))
    sp.set('page', '1')
    setSearchParams(sp, { replace: true })
  }


  const resolveBranchName = (branchId: number, embedded?: { description?: string; name?: string } | null) => {
    if (embedded && embedded.description) {
      return embedded.description
    }
    const b = branches.find((bb) => String(bb.id) === String(branchId))
    return b?.description || `Sucursal ${branchId}`
  }

  const fetchBranches = async (signal?: AbortSignal) => {
    try {
      const response = await request({
        method: "GET",
        url: "/branches",
        signal,
      })
      const branchesData = Array.isArray(response?.data?.data) ? response.data.data :
        Array.isArray(response?.data) ? response.data :
          Array.isArray(response) ? response : []

      setBranches(branchesData)
      dispatch({ type: "SET_ENTITIES", entityType: "branches", entities: branchesData })
      // Return data for immediate usage
      return branchesData;
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      if (e.name === 'AbortError' || e.message === 'canceled') {
        return [];
      }
      console.error("Error al cargar sucursales:", err)
      setBranches([])
      dispatch({ type: "SET_ENTITIES", entityType: "branches", entities: [] })
      return [];
    }
  }

  const fetchCategories = async (signal?: AbortSignal) => {
    try {
      const [categoriesResponse, parentCategoriesResponse] = await Promise.all([
        request({
          method: "GET",
          url: "/categories",
          signal,
        }),
        request({
          method: "GET",
          url: "/categories/parents",
          signal,
        })
      ])

      const categoriesData = Array.isArray(categoriesResponse?.data?.data) ? categoriesResponse.data.data :
        Array.isArray(categoriesResponse?.data) ? categoriesResponse.data :
          Array.isArray(categoriesResponse) ? categoriesResponse : []

      const parentCategoriesData = Array.isArray(parentCategoriesResponse?.data?.data) ? parentCategoriesResponse.data.data :
        Array.isArray(parentCategoriesResponse?.data) ? parentCategoriesResponse.data :
          Array.isArray(parentCategoriesResponse) ? parentCategoriesResponse : []

      setCategories(categoriesData)
      setParentCategories(parentCategoriesData)
      dispatch({ type: "SET_ENTITIES", entityType: "categories", entities: categoriesData })
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      if (e.name === 'AbortError' || e.message === 'canceled') {
        return;
      }
      console.error("Error al cargar categorías:", err)
      setCategories([])
      setParentCategories([])
      dispatch({ type: "SET_ENTITIES", entityType: "categories", entities: [] })
    }
  }

  const fetchSuppliers = async (signal?: AbortSignal) => {
    try {
      const response = await request({
        method: "GET",
        url: "/suppliers",
        signal,
      })
      const suppliersData = Array.isArray(response?.data?.data) ? response.data.data :
        Array.isArray(response?.data) ? response.data :
          Array.isArray(response) ? response : []

      setSuppliers(suppliersData)
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      if (e.name === 'AbortError' || e.message === 'canceled') {
        return;
      }
      console.error("Error al cargar proveedores:", err)
      setSuppliers([])
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    const signal = controller.signal

    const loadInitialData = async () => {
      // Fetch branches and capture the returned data
      const [branchesData] = await Promise.all([fetchBranches(signal), fetchCategories(signal), fetchSuppliers(signal)])

      const branchParams = searchParams.getAll('branch')
      const stockParam = searchParams.get('stock')
      const catParam = searchParams.getAll('category')
      const viewParam = searchParams.get('view')
      const pageParam = parseInt(searchParams.get('page') || '1', 10)
      const perPageParam = parseInt(searchParams.get('per_page') || '10', 10)

      // Las sucursales ahora se manejan desde el contexto global, no desde URL params locales

      if (stockParam === 'alerts') {
        setSelectedStockStatuses(['low-stock', 'out-of-stock'])
      }

      if (catParam && catParam.length) {
        setSelectedCategories(catParam)
      }
      setPerBranchView(viewParam === 'per-branch')
      setPage(Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1)
      setPerPage(Number.isFinite(perPageParam) && perPageParam > 0 ? perPageParam : 10)
      setInitialDataLoaded(true)
    }

    loadInitialData()

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch])

  useEffect(() => {
    const controller = new AbortController()
    const signal = controller.signal

    if (initialDataLoaded) {
      fetchProducts(signal)
    }

    return () => {
      controller.abort()
    }
  }, [initialDataLoaded, fetchProducts])

  useEffect(() => {
    // Debounce search and filter changes could be good, but for now simple effect
    const controller = new AbortController()
    const signal = controller.signal

    if (initialDataLoaded) {
      fetchProducts(signal)
    }

    return () => {
      controller.abort()
    }
  }, [initialDataLoaded, fetchProducts])

  // Reset page when filters change (except page itself)
  useEffect(() => {
    if (!initialDataLoaded) return
    setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only run when filters change, not on initialDataLoaded
  }, [selectedBranchIds, selectedCategories, selectedStockStatuses, selectedSuppliers, selectedProductStatus, searchQuery, perBranchView])

  // Remove client-side applyFilters logic


  // applyFilters logic removed


  const handleEditClick = (product: Product) => {
    if (product) {
      setSelectedProduct(product)
      setEditDialogOpen(true)
    }
  }

  const handleViewClick = (product: Product) => {
    if (product) {
      setSelectedProduct(product)
      setViewDialogOpen(true)
    }
  }

  const handleDeleteClick = (product: Product) => {
    if (product) {
      setSelectedProduct(product)
      setDeleteDialogOpen(true)
    }
  }

  const getProductStock = (product: Product) => {
    if (!product.stocks || !Array.isArray(product.stocks) || product.stocks.length === 0) {
      return { current: 0, min: 0, max: 0 }
    }

    // Usar selectedBranchIds del contexto global en lugar de selectedBranches local
    if (!selectedBranchIds.length) {
      return product.stocks.reduce(
        (acc, stock) => ({
          current: acc.current + (Number(stock.current_stock) || 0),
          min: acc.min + (Number(stock.min_stock) || 0),
          max: acc.max + (Number(stock.max_stock) || 0),
        }),
        { current: 0, min: 0, max: 0 },
      )
    } else {
      const selectedSet = new Set(selectedBranchIds.map(String))
      const filtered = product.stocks.filter((s) => selectedSet.has(String(s.branch_id)))

      if (filtered.length === 0) {
        return { current: 0, min: 0, max: 0 }
      }

      return filtered.reduce(
        (acc, stock) => ({
          current: acc.current + (Number(stock.current_stock) || 0),
          min: acc.min + (Number(stock.min_stock) || 0),
          max: acc.max + (Number(stock.max_stock) || 0),
        }),
        { current: 0, min: 0, max: 0 },
      )
    }
  }

  const getBranchNameForProduct = (product: Product) => {
    if (!product.stocks || !Array.isArray(product.stocks) || product.stocks.length === 0) {
      return "Sin sucursal asignada"
    }

    type StockWithBranch = Stock & { branch?: { description?: string; name?: string } };
    // Usar selectedBranchIds del contexto global
    if (!selectedBranchIds.length) {
      if (product.stocks.length === 1) {
        const st = product.stocks[0] as StockWithBranch
        return resolveBranchName(Number(st.branch_id), st.branch ?? null)
      } else if (product.stocks.length > 1) {
        const st = product.stocks[0] as StockWithBranch
        const firstBranchName = resolveBranchName(Number(st.branch_id), st.branch ?? null)
        return `${firstBranchName} y ${product.stocks.length - 1} más`
      }
      return "Sin sucursal asignada"
    } else {
      const selectedSet = new Set(selectedBranchIds.map(String))
      const matching = product.stocks.filter((s) => selectedSet.has(String(s.branch_id)))

      if (matching.length > 0) {
        if (matching.length === 1) {
          const st = matching[0] as StockWithBranch
          return resolveBranchName(Number(st.branch_id), st.branch ?? null)
        }
        const st = matching[0] as StockWithBranch
        const firstBranchName = resolveBranchName(Number(st.branch_id), st.branch ?? null)
        return `${firstBranchName} y ${matching.length - 1} más`
      }
      if (product.stocks.length === 1) {
        const only = product.stocks[0] as StockWithBranch
        return resolveBranchName(Number(only.branch_id), only.branch ?? null)
      }
      const st0 = product.stocks[0] as StockWithBranch
      const name0 = resolveBranchName(Number(st0.branch_id), st0.branch ?? null)
      return `${name0} y ${product.stocks.length - 1} más`
    }
  }

  const getBranchDisplayForProduct = (product: Product) => {
    if (!product.stocks || !Array.isArray(product.stocks) || product.stocks.length === 0) {
      return { branches: [], text: "Sin sucursal asignada" }
    }

    let stocksToShow = product.stocks

    // Usar selectedBranchIds del contexto global para filtrar sucursales mostradas
    if (selectedBranchIds.length > 0) {
      const selectedSet = new Set(selectedBranchIds.map(String))
      stocksToShow = product.stocks.filter((s) => selectedSet.has(String(s.branch_id)))
    }

    if (stocksToShow.length === 0) {
      return { branches: [], text: "Sin sucursal asignada" }
    }

    type StockWithBranch = Stock & { branch?: { description?: string; name?: string } };
    const branchDisplays = stocksToShow.map((stock: Stock) => {
      const branchInfo = branches.find(b => String(b.id) === String(stock.branch_id))
      const s = stock as StockWithBranch
      return {
        id: stock.branch_id,
        name: resolveBranchName(Number(stock.branch_id), s.branch ?? null),
        color: branchInfo?.color || '#0ea5e9'
      }
    })

    let text = ""
    if (branchDisplays.length === 1) {
      text = branchDisplays[0].name
    } else if (branchDisplays.length === 2) {
      text = `${branchDisplays[0].name} y ${branchDisplays[1].name}`
    } else {
      text = `${branchDisplays[0].name} y ${branchDisplays.length - 1} más`
    }

    return { branches: branchDisplays, text }
  }

  const getStockStatus = (product: Product) => {
    const stock = getProductStock(product)
    if (stock.current > stock.min) {
      return {
        label: "Disponible",
        variant: "bg-green-50 text-green-700 hover:bg-green-50 hover:text-green-700",
      }
    } else if (stock.current > 0) {
      return {
        label: "Stock bajo",
        variant: "bg-yellow-50 text-yellow-700 hover:bg-yellow-50 hover:text-yellow-700",
      }
    } else {
      return {
        label: "Agotado",
        variant: "bg-red-50 text-red-700 hover:bg-red-50 hover:text-red-700",
      }
    }
  }

  const MultiSelectCheckbox = ({
    options,
    selected,
    onChange,
  }: {
    options: { value: string; label: string }[]
    selected: string[]
    onChange: (values: string[]) => void
  }) => {
    const toggle = (value: string) => {
      if (selected.includes(value)) {
        const newSelected = selected.filter((v) => v !== value)
        onChange(newSelected)
      } else {
        const newSelected = [...selected, value]
        onChange(newSelected)
      }
    }

    return (
      <div className="grid gap-2">
        {options.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={selected.includes(opt.value)}
              onCheckedChange={() => toggle(opt.value)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    )
  }

  // allBranches ya incluye todas las sucursales si el usuario tiene ver_stock_otras_sucursales,
  // o solo las asignadas si no (lógica centralizada en BranchContext)
  const stockBranches = contextAllBranches.length > 0 ? contextAllBranches : branches;
  const branchOptions = stockBranches.map((b) => ({ value: String(b.id), label: b.description || `Sucursal ${b.id}` }))
  const categoryOptions = [
    ...parentCategories.map((parent) => ({
      value: String(parent.id),
      label: `${parent.name}`
    })),
    ...categories
      .filter((cat) => cat.parent_id)
      .map((sub) => {
        const parent = parentCategories.find(p => p.id === sub.parent_id)
        return {
          value: String(sub.id),
          label: `  └ ${sub.name}${parent ? ` (${parent.name})` : ''}`
        }
      })
  ]
  const statusOptions = [
    { value: 'in-stock', label: 'Disponible' },
    { value: 'low-stock', label: 'Stock bajo' },
    { value: 'out-of-stock', label: 'Agotado' },
  ]

  // Supplier options
  const supplierOptions = suppliers.map((s) => ({ value: String(s.id), label: s.name || `Proveedor ${s.id}` }))

  // Product status options (active/inactive)
  const productStatusOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'active', label: 'Activos' },
    { value: 'inactive', label: 'Inactivos' },
  ]

  const summarizeSelection = (
    all: { value: string; label: string }[],
    selected: string[],
    emptyLabel: string,
  ) => {
    if (!selected || selected.length === 0) return emptyLabel
    const map = new Map(all.map((o) => [String(o.value), o.label]))
    const first = map.get(String(selected[0])) || emptyLabel
    if (selected.length === 1) return first
    return `${first} +${selected.length - 1}`
  }

  const catSummary = summarizeSelection(categoryOptions, selectedCategories, 'Todas')
  const branchSummary = summarizeSelection(branchOptions, selectedBranchIds, 'Todas')
  const statusSummary = summarizeSelection(statusOptions, selectedStockStatuses, 'Todos')
  const supplierSummary = summarizeSelection(supplierOptions, selectedSuppliers, 'Todos')
  const productStatusLabel = productStatusOptions.find(o => o.value === selectedProductStatus)?.label || 'Todos'

  type Row = { key: string; product: Product; stock: Stock; branchName: string }

  const getRowStockStatus = (st: Stock) => {
    const current = Number(st.current_stock) || 0
    const min = Number(st.min_stock) || 0
    if (current > min) {
      return {
        label: "Disponible",
        variant: "bg-green-50 text-green-700 hover:bg-green-50 hover:text-green-700",
      }
    } else if (current > 0) {
      return {
        label: "Stock bajo",
        variant: "bg-yellow-50 text-yellow-700 hover:bg-yellow-50 hover:text-yellow-700",
      }
    } else {
      return {
        label: "Agotado",
        variant: "bg-red-50 text-red-700 hover:bg-red-50 hover:text-red-700",
      }
    }
  }

  const buildFlattenRows = (): Row[] => {
    const rows: Row[] = []
    for (const p of products) {
      if (!p.stocks || !Array.isArray(p.stocks)) continue
      for (const st of p.stocks) {
        // Usar selectedBranchIds del contexto global para filtrar filas por sucursal
        if (selectedBranchIds.length > 0 && !selectedBranchIds.includes(String(st.branch_id))) {
          continue
        }
        const stWithBranch = st as Stock & { branch?: { description?: string; name?: string } };
        rows.push({
          key: `${p.id}-${st.id ?? st.branch_id}`,
          product: p,
          stock: st,
          branchName: resolveBranchName(Number(st.branch_id), stWithBranch.branch ?? null),
        })
      }
    }
    return rows
  }

  const getFilteredRows = (): Row[] => {
    // Server side filtered rows are just 'products' now
    // But we still need to flatten them for the view if needed.
    // However, the original logic flattened based on `filteredProducts`.
    // Now `products` IS the filtered list (page).
    return buildFlattenRows()
  }

  const togglePerBranchView = () => {
    const next = !perBranchView
    setPerBranchView(next)
    const sp = new URLSearchParams(searchParams)
    if (next) sp.set('view', 'per-branch')
    else sp.delete('view')
    setSearchParams(sp, { replace: true })
  }

  // --- INICIO DE LA CORRECCIÓN 2: Funciones de formato de precios ---
  // Nueva función para formatear el PRECIO DE COSTO (UNITARIO)
  const formatUnitPrice = (price: number | string, currency: string) => {
    const numericPrice = Number(price) || 0;
    const formattedNumber = NumberFormatter.formatNumber(numericPrice, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true
    });

    if (currency === 'USD') {
      return `$ ${formattedNumber} USD`;
    }
    return `$ ${formattedNumber} ARS`;
  };

  // Función para formatear el precio de venta (siempre en ARS)
  const formatSalePrice = (salePrice: number | string) => {
    const numericPrice = Number(salePrice) || 0;
    const formattedNumber = NumberFormatter.formatNumber(numericPrice, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true
    });
    return `$ ${formattedNumber} ARS`;
  };
  // --- FIN DE LA CORRECCIÓN 2 ---

  return (
    <ProtectedRoute permissions={['ver_productos', 'ver_stock']} requireAny={true}>
      <BranchRequiredWrapper
        title="Selecciona una sucursal"
        description="El inventario necesita una sucursal seleccionada para mostrar los productos y stock disponibles."
        allowMultipleBranches={true}
      >
        <div className="h-full w-full flex flex-col gap-4 p-2 sm:p-4 md:p-6">
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Inventario</h2>
            <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide">
              <div className="flex items-center space-x-2 min-w-max">
                <Button variant="outline" size="icon" onClick={refreshData} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
                {hasPermission('exportar_lista_precios') && (
                  <Button
                    variant="outline"
                    onClick={() => setExportDialogOpen(true)}
                    className="flex gap-2 h-10 px-4 py-2 min-w-[140px]"
                  >
                    <Download className="h-4 w-4" />
                    Exportar Lista
                  </Button>
                )}
                {hasPermission('actualizar_precios_masivo') && (
                  <Button
                    variant="outline"
                    onClick={() => setAdvancedBulkUpdateDialogOpen(true)}
                    className="flex gap-2 h-10 px-4 py-2 min-w-[180px]"
                  >
                    <Calculator className="h-4 w-4" />
                    Actualización Avanzada de Precios
                  </Button>
                )}
                {hasPermission('actualizar_stock') && (
                  <AddStockButton branches={branches} onStockAdded={refreshData} />
                )}
                {hasPermission('crear_productos') && (
                  <NewProductButton onProductCreated={refreshData} />
                )}
              </div>
            </div>
          </div>

          {/* Search bar and filter toggle */}
          <div className="flex w-full flex-col gap-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar productos..."
                  className="w-full pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filter toggle button + View mode - Right aligned */}
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

                {branches.length > 1 && (
                  <Button variant={perBranchView ? "default" : "outline"} size="sm" onClick={togglePerBranchView} title={perBranchView ? "Cambiar a vista por producto" : "Cambiar a vista por sucursal"} className="whitespace-nowrap text-xs sm:text-sm">
                    {perBranchView ? "Por sucursal" : "Por producto"}
                  </Button>
                )}
              </div>
            </div>

            {/* Collapsible filters panel */}
            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
              <CollapsibleContent className="pt-2">
                <div className="flex flex-wrap gap-2 p-3 rounded-lg border bg-muted/30">
                  {/* Categories */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="justify-between min-w-[140px]" title="Seleccionar categorías">
                        <span className="truncate">Categorías</span>
                        <span className="ml-2 flex items-center gap-1 text-muted-foreground text-xs">
                          <span className="truncate max-w-[60px]">{catSummary}</span>
                          <ChevronDown className="h-3 w-3 opacity-70" />
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64" style={{ maxHeight: 300, overflowY: 'auto' }}>
                      <div className="mb-2 text-xs text-muted-foreground">Selecciona categorías</div>
                      <MultiSelectCheckbox options={categoryOptions} selected={selectedCategories} onChange={setSelectedCategories} />
                    </PopoverContent>
                  </Popover>

                  {/* Branches */}
                  {branches.length > 1 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="justify-between min-w-[140px]" title="Seleccionar sucursales">
                          <span className="truncate">Sucursales</span>
                          <span className="ml-2 flex items-center gap-1 text-muted-foreground text-xs">
                            <span className="truncate max-w-[60px]">{branchSummary}</span>
                            <ChevronDown className="h-3 w-3 opacity-70" />
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64" style={{ maxHeight: 300, overflowY: 'auto' }}>
                        <div className="mb-2 text-xs text-muted-foreground">Selecciona sucursales</div>
                        <MultiSelectCheckbox options={branchOptions} selected={selectedBranchIds} onChange={setSelectedBranchIds} />
                      </PopoverContent>
                    </Popover>
                  )}

                  {/* Stock Status */}
                  {hasPermission('ver_stock') && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="justify-between min-w-[140px]" title="Seleccionar estados de stock">
                          <span className="truncate">Estado stock</span>
                          <span className="ml-2 flex items-center gap-1 text-muted-foreground text-xs">
                            <span className="truncate max-w-[60px]">{statusSummary}</span>
                            <ChevronDown className="h-3 w-3 opacity-70" />
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64" style={{ maxHeight: 300, overflowY: 'auto' }}>
                        <div className="mb-2 text-xs text-muted-foreground">Selecciona estados</div>
                        <MultiSelectCheckbox options={statusOptions} selected={selectedStockStatuses} onChange={setSelectedStockStatuses} />
                      </PopoverContent>
                    </Popover>
                  )}

                  {/* Supplier */}
                  {suppliers.length > 0 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="justify-between min-w-[140px]" title="Filtrar por proveedor">
                          <span className="truncate">Proveedor</span>
                          <span className="ml-2 flex items-center gap-1 text-muted-foreground text-xs">
                            <span className="truncate max-w-[60px]">{supplierSummary}</span>
                            <ChevronDown className="h-3 w-3 opacity-70" />
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64" style={{ maxHeight: 300, overflowY: 'auto' }}>
                        <div className="mb-2 text-xs text-muted-foreground">Selecciona proveedores</div>
                        <MultiSelectCheckbox options={supplierOptions} selected={selectedSuppliers} onChange={setSelectedSuppliers} />
                      </PopoverContent>
                    </Popover>
                  )}

                  {/* Product Status (Active/Inactive) */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="justify-between min-w-[120px]" title="Filtrar por estado del producto">
                        <span className="truncate">Estado</span>
                        <span className="ml-2 flex items-center gap-1 text-muted-foreground text-xs">
                          <span className="truncate max-w-[50px]">{productStatusLabel}</span>
                          <ChevronDown className="h-3 w-3 opacity-70" />
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48">
                      <div className="mb-2 text-xs text-muted-foreground">Estado del producto</div>
                      <div className="grid gap-2">
                        {productStatusOptions.map((opt) => (
                          <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={selectedProductStatus === opt.value}
                              onCheckedChange={() => setSelectedProductStatus(opt.value)}
                            />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                {error} -{" "}
                <Button variant="link" className="p-0 h-auto" onClick={refreshData}>Reintentar</Button>
              </AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex flex-1 justify-center items-center py-8">
              <div className="flex flex-col items-center">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Cargando productos...</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 rounded-md border bg-card">
              {perBranchView ? (
                (() => {
                  const rows = getFilteredRows()
                  // Server-side pagination means 'rows' is already the current page View
                  const hasData = rows.length > 0
                  return hasData ? (
                    <div className="relative h-full overflow-y-auto">
                      <Table ref={tableRef} className="w-full">
                        <TableHeader className="bg-muted/50 sticky top-0 z-10">
                          <TableRow>
                            <ResizableTableHeader
                              columnId="description"
                              getResizeHandleProps={getResizeHandleProps}
                              getColumnHeaderProps={getColumnHeaderProps}
                            >
                              Producto
                            </ResizableTableHeader>
                            <ResizableTableHeader
                              columnId="category"
                              getResizeHandleProps={getResizeHandleProps}
                              getColumnHeaderProps={getColumnHeaderProps}
                              className="hidden sm:table-cell"
                            >
                              Categoría
                            </ResizableTableHeader>
                            {hasPermission('ver_precio_unitario') && (
                              <ResizableTableHeader
                                columnId="unit_price"
                                getResizeHandleProps={getResizeHandleProps}
                                getColumnHeaderProps={getColumnHeaderProps}
                                className="hidden lg:table-cell"
                              >
                                Precio Unitario
                              </ResizableTableHeader>
                            )}
                            <ResizableTableHeader
                              columnId="sale_price"
                              getResizeHandleProps={getResizeHandleProps}
                              getColumnHeaderProps={getColumnHeaderProps}
                              className="hidden lg:table-cell"
                            >
                              Precio Venta
                            </ResizableTableHeader>
                            {showStockColumn && (
                              <>
                                <ResizableTableHeader
                                  columnId="stock"
                                  getResizeHandleProps={getResizeHandleProps}
                                  getColumnHeaderProps={getColumnHeaderProps}
                                  className="hidden sm:table-cell"
                                >
                                  Stock Actual
                                </ResizableTableHeader>
                                <ResizableTableHeader
                                  columnId="stock-min-max"
                                  getResizeHandleProps={getResizeHandleProps}
                                  getColumnHeaderProps={getColumnHeaderProps}
                                  className="hidden lg:table-cell"
                                >
                                  Stock Min/Max
                                </ResizableTableHeader>
                                <ResizableTableHeader
                                  columnId="stock-status"
                                  getResizeHandleProps={getResizeHandleProps}
                                  getColumnHeaderProps={getColumnHeaderProps}
                                >
                                  Estado Stock
                                </ResizableTableHeader>
                              </>
                            )}
                            <ResizableTableHeader
                              columnId="status"
                              getResizeHandleProps={getResizeHandleProps}
                              getColumnHeaderProps={getColumnHeaderProps}
                              className="hidden sm:table-cell"
                            >
                              Estado
                            </ResizableTableHeader>
                            {selectedBranchIds.length > 1 && (
                              <ResizableTableHeader
                                columnId="branch"
                                getResizeHandleProps={getResizeHandleProps}
                                getColumnHeaderProps={getColumnHeaderProps}
                                className="hidden lg:table-cell"
                              >
                                Sucursal
                              </ResizableTableHeader>
                            )}
                            <ResizableTableHeader
                              columnId="actions"
                              getResizeHandleProps={getResizeHandleProps}
                              getColumnHeaderProps={getColumnHeaderProps}
                            >
                              Acciones
                            </ResizableTableHeader>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="bg-background">
                          {rows.map((row) => {
                            const stock = row.stock
                            const stockStatus = getRowStockStatus(stock)
                            const p = row.product
                            return (
                              <TableRow key={row.key} className={`${!p.status ? "bg-gray-100/90 text-gray-500" : "bg-background hover:bg-muted/50"}`}>
                                <ResizableTableCell
                                  columnId="description"
                                  getColumnCellProps={getColumnCellProps}
                                  className={!p.status ? "text-gray-500" : ""}
                                >
                                  <div className="flex items-center">
                                    <div className="flex-1 min-w-0">
                                      <p className="truncate text-sm font-medium">{p.description}</p>
                                      <p className="truncate text-xs text-muted-foreground">{p.code}</p>
                                    </div>
                                  </div>
                                </ResizableTableCell>
                                <ResizableTableCell
                                  columnId="category"
                                  getColumnCellProps={getColumnCellProps}
                                  className={`hidden sm:table-cell ${!p.status ? "text-gray-500" : ""}`}
                                >
                                  <span className="truncate block">{p.category?.name || "Sin categoría"}</span>
                                </ResizableTableCell>
                                {hasPermission('ver_precio_unitario') && (
                                  <ResizableTableCell
                                    columnId="unit_price"
                                    getColumnCellProps={getColumnCellProps}
                                    className={`hidden lg:table-cell ${!p.status ? "text-gray-500" : ""}`}
                                  >
                                    <span className="truncate block">{formatUnitPrice(p.unit_price, p.currency)}</span>
                                  </ResizableTableCell>
                                )}
                                <ResizableTableCell
                                  columnId="sale_price"
                                  getColumnCellProps={getColumnCellProps}
                                  className={`hidden lg:table-cell ${!p.status ? "text-gray-500" : ""}`}
                                >
                                  <span className="truncate block">{formatSalePrice(p.sale_price)}</span>
                                </ResizableTableCell>
                                {showStockColumn && (
                                  <>
                                    <ResizableTableCell
                                      columnId="stock"
                                      getColumnCellProps={getColumnCellProps}
                                      className={`hidden sm:table-cell font-medium ${!p.status ? "text-gray-500" : ""}`}
                                    >
                                      <span className="truncate block">{Number.parseInt(String(stock.current_stock)) || 0}</span>
                                    </ResizableTableCell>
                                    <ResizableTableCell
                                      columnId="stock-min-max"
                                      getColumnCellProps={getColumnCellProps}
                                      className={`hidden lg:table-cell ${!p.status ? "text-gray-500" : ""}`}
                                    >
                                      <span className="truncate block">{Number.parseInt(String(stock.min_stock)) || 0} / {Number.parseInt(String(stock.max_stock)) || 0}</span>
                                    </ResizableTableCell>
                                    <ResizableTableCell
                                      columnId="stock-status"
                                      getColumnCellProps={getColumnCellProps}
                                      className={!p.status ? "opacity-60" : ""}
                                    >
                                      <Badge variant="outline" className={`${stockStatus.variant} truncate`}>{stockStatus.label}</Badge>
                                    </ResizableTableCell>
                                  </>
                                )}
                                <ResizableTableCell
                                  columnId="status"
                                  getColumnCellProps={getColumnCellProps}
                                  className={`hidden sm:table-cell ${!p.status ? "opacity-60" : ""}`}
                                >
                                  <Badge variant="outline" className={`${p.status ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"} truncate`}>
                                    {p.status ? "Activo" : "Inactivo"}
                                  </Badge>
                                </ResizableTableCell>
                                {selectedBranchIds.length > 1 && (
                                  <ResizableTableCell
                                    columnId="branch"
                                    getColumnCellProps={getColumnCellProps}
                                    className={`hidden lg:table-cell ${!p.status ? "text-gray-500" : ""}`}
                                  >
                                    <div className="flex items-center">
                                      {(() => {
                                        const branchInfo = branches.find(b => String(b.id) === String(stock.branch_id));
                                        const branchColor = branchInfo?.color || '#0ea5e9';


                                        return (
                                          <span
                                            className={`mr-2 h-2 w-2 rounded-full ${!p.status ? "bg-gray-400" : ""}`}
                                            style={!p.status ? {} : { backgroundColor: branchColor }}
                                          ></span>
                                        );
                                      })()}
                                      <span className="truncate">{row.branchName}</span>
                                    </div>
                                  </ResizableTableCell>
                                )}
                                <ResizableTableCell
                                  columnId="actions"
                                  getColumnCellProps={getColumnCellProps}
                                  className={!p.status ? "opacity-60" : ""}
                                >
                                  <div className="flex justify-end items-center gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => handleViewClick(p)} className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    {hasPermission('ver_trazabilidad_producto') && (
                                      <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/inventario/${p.id}/trazabilidad`)} className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-50" title="Ver Trazabilidad">
                                        <History className="h-4 w-4" />
                                      </Button>
                                    )}
                                    {hasPermission('editar_productos') && (
                                      <Button variant="ghost" size="sm" onClick={() => handleEditClick(p)} className="h-8 w-8 p-0 text-orange-500 hover:text-orange-700 hover:bg-orange-50">
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    )}
                                    {hasPermission('eliminar_productos') && (
                                      <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(p)} className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </ResizableTableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                      <div className="flex items-center justify-between p-3 border-t bg-muted/30">
                        <Pagination
                          currentPage={page}
                          lastPage={paginationMeta.last_page}
                          total={paginationMeta.total}
                          itemName="productos"
                          onPageChange={(page) => handleGoToPage(page, paginationMeta.last_page)}
                          disabled={false}
                        />
                      </div>
                    </div >
                  ) : (
                    <div className="flex h-full items-center justify-center"><p className="text-center text-muted-foreground">No hay productos disponibles con los filtros seleccionados</p></div>
                  )
                })()
              ) : (
                <div className="relative h-full overflow-y-auto">
                  <Table ref={tableRef} className="w-full">
                    <TableHeader className="bg-muted/50 sticky top-0 z-10">
                      <TableRow>
                        <ResizableTableHeader
                          columnId="description"
                          getResizeHandleProps={getResizeHandleProps}
                          getColumnHeaderProps={getColumnHeaderProps}
                        >
                          Producto
                        </ResizableTableHeader>
                        <ResizableTableHeader
                          columnId="category"
                          getResizeHandleProps={getResizeHandleProps}
                          getColumnHeaderProps={getColumnHeaderProps}
                          className="hidden sm:table-cell"
                        >
                          Categoría
                        </ResizableTableHeader>
                        {hasPermission('ver_precio_unitario') && (
                          <ResizableTableHeader
                            columnId="unit_price"
                            getResizeHandleProps={getResizeHandleProps}
                            getColumnHeaderProps={getColumnHeaderProps}
                            className="hidden lg:table-cell"
                          >
                            Precio Unitario
                          </ResizableTableHeader>
                        )}
                        <ResizableTableHeader
                          columnId="sale_price"
                          getResizeHandleProps={getResizeHandleProps}
                          getColumnHeaderProps={getColumnHeaderProps}
                          className="hidden lg:table-cell"
                        >
                          Precio Venta
                        </ResizableTableHeader>
                        {showStockColumn && (
                          <>
                            <ResizableTableHeader
                              columnId="stock"
                              getResizeHandleProps={getResizeHandleProps}
                              getColumnHeaderProps={getColumnHeaderProps}
                              className="hidden sm:table-cell"
                            >
                              Stock Actual
                            </ResizableTableHeader>
                            <ResizableTableHeader
                              columnId="stock-min-max"
                              getResizeHandleProps={getResizeHandleProps}
                              getColumnHeaderProps={getColumnHeaderProps}
                              className="hidden lg:table-cell"
                            >
                              Stock Min/Max
                            </ResizableTableHeader>
                            <ResizableTableHeader
                              columnId="stock-status"
                              getResizeHandleProps={getResizeHandleProps}
                              getColumnHeaderProps={getColumnHeaderProps}
                            >
                              Estado Stock
                            </ResizableTableHeader>
                          </>
                        )}
                        <ResizableTableHeader
                          columnId="status"
                          getResizeHandleProps={getResizeHandleProps}
                          getColumnHeaderProps={getColumnHeaderProps}
                          className="hidden sm:table-cell"
                        >
                          Estado
                        </ResizableTableHeader>
                        {selectedBranchIds.length > 1 && (
                          <ResizableTableHeader
                            columnId="branch"
                            getResizeHandleProps={getResizeHandleProps}
                            getColumnHeaderProps={getColumnHeaderProps}
                            className="hidden lg:table-cell"
                          >
                            Sucursal
                          </ResizableTableHeader>
                        )}
                        <ResizableTableHeader
                          columnId="actions"
                          getResizeHandleProps={getResizeHandleProps}
                          getColumnHeaderProps={getColumnHeaderProps}
                        >
                          Acciones
                        </ResizableTableHeader>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="bg-background">
                      {(() => {
                        // products is already the current page
                        return products.map((product) => {
                          const stockStatus = getStockStatus(product)
                          const stock = getProductStock(product)
                          return (
                            <TableRow key={product.id} className={`${!product.status ? "bg-gray-100/90 text-gray-500" : "bg-background hover:bg-muted/50"}`}>
                              <ResizableTableCell
                                columnId="description"
                                getColumnCellProps={getColumnCellProps}
                                className={!product.status ? "text-gray-500" : ""}
                              >
                                <div className="flex items-center">
                                  <div className="flex-1 min-w-0">
                                    <p className="truncate text-sm font-medium">{product.description}</p>
                                    <p className="truncate text-xs text-muted-foreground">{product.code}</p>
                                  </div>
                                </div>
                              </ResizableTableCell>
                              <ResizableTableCell
                                columnId="category"
                                getColumnCellProps={getColumnCellProps}
                                className={`hidden sm:table-cell ${!product.status ? "text-gray-500" : ""}`}
                              >
                                <span className="truncate block">{product.category?.name || "Sin categoría"}</span>
                              </ResizableTableCell>
                              {hasPermission('ver_precio_unitario') && (
                                <ResizableTableCell
                                  columnId="unit_price"
                                  getColumnCellProps={getColumnCellProps}
                                  className={`hidden lg:table-cell ${!product.status ? "text-gray-500" : ""}`}
                                >
                                  <span className="truncate block">{formatUnitPrice(product.unit_price, product.currency)}</span>
                                </ResizableTableCell>
                              )}
                              <ResizableTableCell
                                columnId="sale_price"
                                getColumnCellProps={getColumnCellProps}
                                className={`hidden lg:table-cell ${!product.status ? "text-gray-500" : ""}`}
                              >
                                <span className="truncate block">{formatSalePrice(product.sale_price)}</span>
                              </ResizableTableCell>
                              {showStockColumn && (
                                <>
                                  <ResizableTableCell
                                    columnId="stock"
                                    getColumnCellProps={getColumnCellProps}
                                    className={`hidden sm:table-cell font-medium ${!product.status ? "text-gray-500" : ""}`}
                                  >
                                    <span className="truncate block">{Number.parseInt(String(stock.current)) || 0}</span>
                                  </ResizableTableCell>
                                  <ResizableTableCell
                                    columnId="stock-min-max"
                                    getColumnCellProps={getColumnCellProps}
                                    className={`hidden lg:table-cell ${!product.status ? "text-gray-500" : ""}`}
                                  >
                                    <span className="truncate block">{Number.parseInt(String(stock.min)) || 0} / {Number.parseInt(String(stock.max)) || 0}</span>
                                  </ResizableTableCell>
                                  <ResizableTableCell
                                    columnId="stock-status"
                                    getColumnCellProps={getColumnCellProps}
                                    className={!product.status ? "opacity-60" : ""}
                                  >
                                    <Badge variant="outline" className={`${stockStatus.variant} truncate`}>{stockStatus.label}</Badge>
                                  </ResizableTableCell>
                                </>
                              )}
                              <ResizableTableCell
                                columnId="status"
                                getColumnCellProps={getColumnCellProps}
                                className={`hidden sm:table-cell ${!product.status ? "opacity-60" : ""}`}
                              >
                                <Badge variant="outline" className={`${product.status ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"} truncate`}>
                                  {product.status ? "Activo" : "Inactivo"}
                                </Badge>
                              </ResizableTableCell>
                              {selectedBranchIds.length > 1 && (
                                <ResizableTableCell
                                  columnId="branch"
                                  getColumnCellProps={getColumnCellProps}
                                  className={`hidden lg:table-cell ${!product.status ? "text-gray-500" : ""}`}
                                >
                                  <div className="flex items-center">
                                    {(() => {
                                      const branchDisplay = getBranchDisplayForProduct(product);


                                      if (branchDisplay.branches.length === 0) {
                                        return (
                                          <span className={`mr-2 h-2 w-2 rounded-full ${!product.status ? "bg-gray-400" : "bg-gray-300"}`}></span>
                                        );
                                      }

                                      // Show multiple branch colors
                                      return (
                                        <div className="flex items-center gap-1">
                                          {branchDisplay.branches.map((branch) => (
                                            <span
                                              key={branch.id}
                                              className={`h-2 w-2 rounded-full ${!product.status ? "bg-gray-400" : ""}`}
                                              style={!product.status ? {} : { backgroundColor: branch.color }}
                                              title={branch.name}
                                            ></span>
                                          ))}
                                        </div>
                                      );
                                    })()}
                                    <span className="truncate ml-2">{getBranchNameForProduct(product)}</span>
                                  </div>
                                </ResizableTableCell>
                              )}
                              <ResizableTableCell
                                columnId="actions"
                                getColumnCellProps={getColumnCellProps}
                                className={!product.status ? "opacity-60" : ""}
                              >
                                <div className="flex justify-end items-center gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => handleViewClick(product)} className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {hasPermission('ver_trazabilidad_producto') && (
                                    <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/inventario/${product.id}/trazabilidad`)} className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-50" title="Ver Trazabilidad">
                                      <History className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {hasPermission('editar_productos') && (
                                    <Button variant="ghost" size="sm" onClick={() => handleEditClick(product)} className="h-8 w-8 p-0 text-orange-500 hover:text-orange-700 hover:bg-orange-50">
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {hasPermission('eliminar_productos') && (
                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(product)} className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </ResizableTableCell>
                            </TableRow>
                          )
                        })
                      })()}
                    </TableBody>
                  </Table>
                  {(() => {
                    return (
                      <div className="flex items-center justify-between p-3 border-t bg-muted/30">
                        <div className="flex items-center gap-3">
                          <select className="h-8 rounded-md border px-2 text-sm bg-background" value={perPage} onChange={(e) => handlePerPageChange(parseInt(e.target.value, 10))}>
                            {[10, 25, 50, 100, 200].map((n) => (<option key={n} value={n}>{n} por página</option>))}
                          </select>
                        </div>
                        <div>
                          <Pagination
                            currentPage={page}
                            lastPage={paginationMeta.last_page}
                            total={paginationMeta.total}
                            itemName="productos"
                            onPageChange={(page) => handleGoToPage(page, paginationMeta.last_page)}
                            disabled={false}
                          />
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div >
          )}

          {
            selectedProduct && (
              <EditProductDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                product={selectedProduct}
                onProductUpdated={refreshData}
              />
            )
          }
          {
            viewDialogOpen && selectedProduct && (
              <ViewProductDialog
                open={viewDialogOpen}
                onOpenChange={setViewDialogOpen}
                product={selectedProduct}
              />
            )
          }
          {
            deleteDialogOpen && selectedProduct && (
              <DeleteProductDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                product={selectedProduct}
                onProductDeleted={refreshData}
              />
            )
          }
          <ExportPriceListDialog
            open={exportDialogOpen}
            onOpenChange={setExportDialogOpen}
          />
          <BulkPriceUpdateModal
            open={advancedBulkUpdateDialogOpen}
            onOpenChange={setAdvancedBulkUpdateDialogOpen}
            onSuccess={refreshData}
          />
        </div >
      </BranchRequiredWrapper >
    </ProtectedRoute >
  )
}