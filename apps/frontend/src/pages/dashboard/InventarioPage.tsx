import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, RefreshCw, Pencil, Trash2, Eye, ChevronDown, Download, Calculator } from "lucide-react"
import { NewProductButton } from "@/components/new-product-button"
import { AddStockButton } from "@/components/add-stock-button"
import { EditProductDialog } from "@/components/edit-product-dialog"
import { ViewProductDialog } from "@/components/view-product-dialog"
import useApi from "@/hooks/useApi"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { Product, Branch, Stock, Category as ProductCategoryType } from "@/types/product"
import { DeleteProductDialog } from "@/components/delete-product-dialog"
import { useEntityContext } from "@/context/EntityContext"
import { useSearchParams } from "react-router-dom"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { useExchangeRateUpdates } from "@/hooks/useExchangeRateUpdates"
import Pagination from "@/components/ui/pagination"
import BranchRequiredWrapper from "@/components/layout/branch-required-wrapper"
import ExportPriceListDialog from "@/components/ExportPriceListDialog"
import { BulkPriceUpdateDialog } from "@/components/BulkPriceUpdateDialog"
import { NumberFormatter } from '@/lib/formatters/numberFormatter';
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { ResizableTableHeader, ResizableTableCell } from '@/components/ui/resizable-table-header';

export default function InventarioPage() {
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [categories, setCategories] = useState<ProductCategoryType[]>([])
  const [parentCategories, setParentCategories] = useState<ProductCategoryType[]>([])
  const [selectedBranches, setSelectedBranches] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedStockStatuses, setSelectedStockStatuses] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState<string>("")
  const { request, loading, error } = useApi()
  const { dispatch } = useEntityContext()
  const [initialDataLoaded, setInitialDataLoaded] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const [perBranchView, setPerBranchView] = useState(false)
  const [page, setPage] = useState<number>(1)
  const [perPage, setPerPage] = useState<number>(10)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [bulkUpdateDialogOpen, setBulkUpdateDialogOpen] = useState(false)

  // Configuración de columnas redimensionables
  const columnConfig = [
    { id: 'description', minWidth: 200, maxWidth: 600, defaultWidth: 300 },
    { id: 'code', minWidth: 80, maxWidth: 150, defaultWidth: 100 },
    { id: 'category', minWidth: 120, maxWidth: 200, defaultWidth: 150 },
    { id: 'unit_price', minWidth: 100, maxWidth: 200, defaultWidth: 120 },
    { id: 'sale_price', minWidth: 120, maxWidth: 200, defaultWidth: 150 },
    { id: 'stock', minWidth: 80, maxWidth: 120, defaultWidth: 100 },
    { id: 'stock-min-max', minWidth: 100, maxWidth: 180, defaultWidth: 120 },
    { id: 'stock-status', minWidth: 100, maxWidth: 180, defaultWidth: 120 },
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

  const fetchStocksForProducts = useCallback(async (productsList: Product[], signal?: AbortSignal) => {
    try {
      const allStocksResponse = await request({
        method: "GET",
        url: "/stocks",
        signal,
      });

      let allStocks: Stock[] = [];
      const payload = (allStocksResponse as any)?.data ?? allStocksResponse;
      const array = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray((allStocksResponse as any)?.data?.data)
            ? (allStocksResponse as any).data.data
            : [];

      if (Array.isArray(array)) {
        allStocks = array.map((s: any) => ({
          ...s,
          id: Number(s.id),
          product_id: Number(s.product_id),
          branch_id: Number(s.branch_id),
          current_stock: Number(s.current_stock || 0),
          min_stock: Number(s.min_stock || 0),
          max_stock: Number(s.max_stock || 0),
        }));
      } else {
        console.error("Formato de respuesta de stocks inesperado:", allStocksResponse);
      }

      const updatedProducts = productsList.map((product) => {
        const productStocks = allStocks.filter((stock) => stock.product_id === product.id);
        const stocksWithBranch: Stock[] = productStocks.map((stock) => {
          const branchInfo = branches.find((b) => String(b.id) === String(stock.branch_id));
          return {
            ...stock,
            branch: branchInfo,
          };
        });
        return {
          ...product,
          stocks: stocksWithBranch,
        };
      });

      setProducts(updatedProducts);
      dispatch({ type: "SET_ENTITIES", entityType: "products", entities: updatedProducts });
    } catch (err: any) {
      // Aun si falla el stock, mostramos los productos
      setProducts(productsList);
      dispatch({ type: "SET_ENTITIES", entityType: "products", entities: productsList });
    }
  }, [request, dispatch, branches]);

  const fetchProducts = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await request({
        method: "GET",
        url: "/products?include=category,supplier,measure,iva&for_admin=true",
        signal,
      });

      const productList = Array.isArray(data?.data?.data) ? data.data.data :
                         Array.isArray(data?.data) ? data.data :
                         Array.isArray(data) ? data : [];

      if (productList.length > 0) {
        await fetchStocksForProducts(productList, signal);
      } else {
        setProducts([]);
        dispatch({ type: "SET_ENTITIES", entityType: "products", entities: [] });
      }
    } catch (err: any) {
      setProducts([]);
      dispatch({ type: "SET_ENTITIES", entityType: "products", entities: [] });
    }
  }, [request, dispatch, fetchStocksForProducts]);

  const refreshData = useCallback(() => {
    const controller = new AbortController();
    fetchProducts(controller.signal);
    return () => controller.abort();
  }, [fetchProducts]);

  useExchangeRateUpdates(refreshData);

  const paginate = <T,>(items: T[]) => {
    const total = items.length
    const totalPages = Math.max(1, Math.ceil(total / perPage))
    const currentPage = Math.min(page, totalPages)
    const startIndex = (currentPage - 1) * perPage
    const endIndex = startIndex + perPage
    const view = items.slice(startIndex, endIndex)
    return {
      total,
      totalPages,
      currentPage,
      items: view,
      start: total === 0 ? 0 : startIndex + 1,
      end: Math.min(endIndex, total),
    }
  }

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
      if (branchesData.length > 0) {
        setSelectedBranches([String(branchesData[0].id)])
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message === 'canceled') {
        return;
      }
      console.error("Error al cargar sucursales:", err)
      setBranches([])
      dispatch({ type: "SET_ENTITIES", entityType: "branches", entities: [] })
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
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message === 'canceled') {
        return;
      }
      console.error("Error al cargar categorías:", err)
      setCategories([])
      setParentCategories([])
      dispatch({ type: "SET_ENTITIES", entityType: "categories", entities: [] })
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    const signal = controller.signal

    const loadInitialData = async () => {
      await Promise.all([fetchBranches(signal), fetchCategories(signal)])
      const branchParams = searchParams.getAll('branch')
      const stockParam = searchParams.get('stock')
      const catParam = searchParams.getAll('category')
      const viewParam = searchParams.get('view')
      const pageParam = parseInt(searchParams.get('page') || '1', 10)
      const perPageParam = parseInt(searchParams.get('per_page') || '10', 10)

      if (branchParams && branchParams.length > 0) {
        setSelectedBranches(branchParams)
      } else if (branches.length > 0) {
        setSelectedBranches([String(branches[0].id)])
      }

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
    applyFilters(products)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, selectedBranches, selectedCategories, selectedStockStatuses, searchQuery])

  useEffect(() => {
    if (!initialDataLoaded) return
    setPage(1)
    const sp = new URLSearchParams(searchParams)
    sp.set('page', '1')
    sp.set('per_page', String(perPage))
    setSearchParams(sp, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranches, selectedCategories, selectedStockStatuses, searchQuery, perBranchView])

  const applyFilters = (productList: Product[]) => {
    let filtered = [...productList]

    if (selectedBranches.length > 0) {
      filtered = filtered.filter((product) => {
        if (!product.stocks || !Array.isArray(product.stocks)) return false
        return product.stocks.some((stock) => selectedBranches.includes(String(stock.branch_id)))
      })
    }

    if (selectedCategories.length > 0) {
      const getAllCategoryIds = (selectedCategoryIds: string[]): string[] => {
        const allIds = new Set<string>(selectedCategoryIds)
        selectedCategoryIds.forEach(categoryId => {
          categories.forEach(category => {
            if (String(category.parent_id) === categoryId) {
              allIds.add(String(category.id))
            }
          })
        })
        return Array.from(allIds)
      }
      const allCategoryIds = getAllCategoryIds(selectedCategories)
      filtered = filtered.filter((product) => allCategoryIds.includes(String(product.category_id)))
    }

    if (selectedStockStatuses.length > 0) {
      filtered = filtered.filter((product) => {
        const stockStatus = getStockStatus(product)
        const label = stockStatus.label
        return (
          (selectedStockStatuses.includes('in-stock') && label === 'Disponible') ||
          (selectedStockStatuses.includes('low-stock') && label === 'Stock bajo') ||
          (selectedStockStatuses.includes('out-of-stock') && label === 'Agotado')
        )
      })
    }

    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((product) => {
        return (
          product.description?.toLowerCase().includes(query) ||
          String(product.code).toLowerCase().includes(query) ||
          product.category?.name?.toLowerCase().includes(query)
        )
      })
    }

    setFilteredProducts(filtered)
  }

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

    if (!selectedBranches.length || selectedBranches[0] === "all") {
      return product.stocks.reduce(
        (acc, stock) => ({
          current: acc.current + (Number(stock.current_stock) || 0),
          min: acc.min + (Number(stock.min_stock) || 0),
          max: acc.max + (Number(stock.max_stock) || 0),
        }),
        { current: 0, min: 0, max: 0 },
      )
    } else {
      const selectedSet = new Set(selectedBranches.map(String))
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

    if (!selectedBranches.length || selectedBranches[0] === "all") {
      if (product.stocks.length === 1) {
        const st = product.stocks[0]
        return resolveBranchName(Number(st.branch_id), (st as any).branch ?? null)
      } else if (product.stocks.length > 1) {
        const st = product.stocks[0]
        const firstBranchName = resolveBranchName(Number(st.branch_id), (st as any).branch ?? null)
        return `${firstBranchName} y ${product.stocks.length - 1} más`
      }
      return "Sin sucursal asignada"
    } else {
      const selectedSet = new Set(selectedBranches.map(String))
      const matching = product.stocks.filter((s) => selectedSet.has(String(s.branch_id)))

      if (matching.length > 0) {
        if (matching.length === 1) {
          const st = matching[0]
          return resolveBranchName(Number(st.branch_id), (st as any).branch ?? null)
        }
        const st = matching[0]
        const firstBranchName = resolveBranchName(Number(st.branch_id), (st as any).branch ?? null)
        return `${firstBranchName} y ${matching.length - 1} más`
      }
      if (product.stocks.length === 1) {
        const only = product.stocks[0]
        return resolveBranchName(Number(only.branch_id), (only as any).branch ?? null)
      }
      const st0 = product.stocks[0]
      const name0 = resolveBranchName(Number(st0.branch_id), (st0 as any).branch ?? null)
      return `${name0} y ${product.stocks.length - 1} más`
    }
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
        onChange(selected.filter((v) => v !== value))
      } else {
        onChange([...selected, value])
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

  const branchOptions = branches.map((b) => ({ value: String(b.id), label: b.description || `Sucursal ${b.id}` }))
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
  const branchSummary = summarizeSelection(branchOptions, selectedBranches, 'Todas')
  const statusSummary = summarizeSelection(statusOptions, selectedStockStatuses, 'Todos')

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
        if (selectedBranches.length > 0 && !selectedBranches.includes(String(st.branch_id))) {
          continue
        }
        rows.push({
          key: `${p.id}-${(st as any).id ?? st.branch_id}`,
          product: p,
          stock: st,
          branchName: resolveBranchName(Number(st.branch_id), (st as any).branch ?? null),
        })
      }
    }
    return rows
  }

  const getFilteredRows = (): Row[] => {
    let rows = buildFlattenRows()

    if (selectedCategories.length > 0) {
      rows = rows.filter((r) => selectedCategories.includes(String(r.product.category_id)))
    }

    if (selectedStockStatuses.length > 0) {
      rows = rows.filter((r) => {
        const s = getRowStockStatus(r.stock)
        const label = s.label
        return (
          (selectedStockStatuses.includes('in-stock') && label === 'Disponible') ||
          (selectedStockStatuses.includes('low-stock') && label === 'Stock bajo') ||
          (selectedStockStatuses.includes('out-of-stock') && label === 'Agotado')
        )
      })
    }

    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase()
      rows = rows.filter((r) => (
        r.product.description?.toLowerCase().includes(query) ||
        String(r.product.code).toLowerCase().includes(query) ||
        r.product.category?.name?.toLowerCase().includes(query) ||
        r.branchName?.toLowerCase().includes(query)
      ))
    }
    return rows
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
              <Button
                variant="outline"
                onClick={() => setExportDialogOpen(true)}
                className="flex gap-2 h-10 px-4 py-2 min-w-[140px]"
              >
                <Download className="h-4 w-4" />
                Exportar Lista
              </Button>
              <Button
                variant="outline"
                onClick={() => setBulkUpdateDialogOpen(true)}
                className="flex gap-2 h-10 px-4 py-2 min-w-[140px]"
              >
                <Calculator className="h-4 w-4" />
                Actualizar Precios
              </Button>
              <AddStockButton branches={branches} onStockAdded={refreshData} />
              <NewProductButton onProductCreated={refreshData} />
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col space-y-4 md:flex-row md:flex-wrap md:items-start md:justify-between md:gap-2 md:space-y-0">
          <div className="flex flex-1 min-w-0 items-center gap-2">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar productos..."
                className="w-full pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[180px] sm:w-[220px] max-w-full justify-between overflow-hidden" title="Seleccionar categorías">
                  <span className="truncate">Categorías</span>
                  <span className=" flex items-center gap-1 text-muted-foreground">
                    <span className="truncate max-w-[80px] sm:max-w-[120px] md:max-w-[140px]">{catSummary}</span>
                    <ChevronDown className="h-4 w-4 opacity-70" />
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" style={{ maxHeight: 300, overflowY: 'auto' }}>
                <div className="mb-2 text-xs text-muted-foreground">Selecciona categorías</div>
                <MultiSelectCheckbox options={categoryOptions} selected={selectedCategories} onChange={setSelectedCategories} />
              </PopoverContent>
            </Popover>
            {branches.length > 1 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[180px] sm:w-[220px] max-w-full justify-between overflow-hidden" title="Seleccionar sucursales">
                    <span className="truncate">Sucursales</span>
                    <span className="ml-2 flex items-center gap-1 text-muted-foreground">
                      <span className="truncate max-w-[80px] sm:max-w-[120px] md:max-w-[140px]">{branchSummary}</span>
                      <ChevronDown className="h-4 w-4 opacity-70" />
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" style={{ maxHeight: 300, overflowY: 'auto' }}>
                  <div className="mb-2 text-xs text-muted-foreground">Selecciona sucursales</div>
                  <MultiSelectCheckbox options={branchOptions} selected={selectedBranches} onChange={setSelectedBranches} />
                </PopoverContent>
              </Popover>
            )}

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[180px] sm:w-[220px] max-w-full justify-between overflow-hidden" title="Seleccionar estados de stock">
                  <span className="truncate">Estado stock</span>
                  <span className="ml-2 flex items-center gap-1 text-muted-foreground">
                    <span className="truncate max-w-[80px] sm:max-w-[120px] md:max-w-[140px]">{statusSummary}</span>
                    <ChevronDown className="h-4 w-4 opacity-70" />
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" style={{ maxHeight: 300, overflowY: 'auto' }}>
                <div className="mb-2 text-xs text-muted-foreground">Selecciona estados</div>
                <MultiSelectCheckbox options={statusOptions} selected={selectedStockStatuses} onChange={setSelectedStockStatuses} />
              </PopoverContent>
            </Popover>

            {branches.length > 1 && (
              <Button variant={perBranchView ? "default" : "outline"} onClick={togglePerBranchView} title={perBranchView ? "Cambiar a vista por producto" : "Cambiar a vista por sucursal"} className="whitespace-nowrap text-xs sm:text-sm">
                {perBranchView ? "Modo: Por sucursal" : "Modo: Por producto"}
              </Button>
            )}
          </div>
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
                const paged = paginate(rows)
                return paged.total > 0 ? (
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
                          <ResizableTableHeader
                            columnId="unit_price"
                            getResizeHandleProps={getResizeHandleProps}
                            getColumnHeaderProps={getColumnHeaderProps}
                            className="hidden lg:table-cell"
                          >
                            Precio Unitario
                          </ResizableTableHeader>
                          <ResizableTableHeader
                            columnId="sale_price"
                            getResizeHandleProps={getResizeHandleProps}
                            getColumnHeaderProps={getColumnHeaderProps}
                            className="hidden lg:table-cell"
                          >
                            Precio Venta
                          </ResizableTableHeader>
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
                          <ResizableTableHeader
                            columnId="status"
                            getResizeHandleProps={getResizeHandleProps}
                            getColumnHeaderProps={getColumnHeaderProps}
                            className="hidden sm:table-cell"
                          >
                            Estado
                          </ResizableTableHeader>
                          {branches.length > 1 && (
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
                        {paged.items.map((row) => {
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
                              <ResizableTableCell
                                columnId="unit_price"
                                getColumnCellProps={getColumnCellProps}
                                className={`hidden lg:table-cell ${!p.status ? "text-gray-500" : ""}`}
                              >
                                <span className="truncate block">{formatUnitPrice(p.unit_price, p.currency)}</span>
                              </ResizableTableCell>
                              <ResizableTableCell
                                columnId="sale_price"
                                getColumnCellProps={getColumnCellProps}
                                className={`hidden lg:table-cell ${!p.status ? "text-gray-500" : ""}`}
                              >
                                <span className="truncate block">{formatSalePrice(p.sale_price)}</span>
                              </ResizableTableCell>
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
                              <ResizableTableCell
                                columnId="status"
                                getColumnCellProps={getColumnCellProps}
                                className={`hidden sm:table-cell ${!p.status ? "opacity-60" : ""}`}
                              >
                                <Badge variant="outline" className={`${p.status ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"} truncate`}>
                                  {p.status ? "Activo" : "Inactivo"}
                                </Badge>
                              </ResizableTableCell>
                              {branches.length > 1 && (
                                <ResizableTableCell
                                  columnId="branch"
                                  getColumnCellProps={getColumnCellProps}
                                  className={`hidden lg:table-cell ${!p.status ? "text-gray-500" : ""}`}
                                >
                                  <div className="flex items-center">
                                    <span className={`mr-2 h-2 w-2 rounded-full ${!p.status ? "bg-gray-400" : "bg-[#0ea5e9]"}`}></span>
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
                                  <Button variant="ghost" size="sm" onClick={() => handleEditClick(p)} className="h-8 w-8 p-0 text-orange-500 hover:text-orange-700 hover:bg-orange-50">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(p)} className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </ResizableTableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                    <div className="flex items-center justify-between p-3 border-t bg-muted/30">
                      <Pagination
                        currentPage={paged.currentPage}
                        lastPage={paged.totalPages}
                        total={paged.total}
                        itemName="productos"
                        onPageChange={(page) => handleGoToPage(page, paged.totalPages)}
                        disabled={false}
                      />
                    </div>
                  </div>
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
                      <ResizableTableHeader
                        columnId="unit_price"
                        getResizeHandleProps={getResizeHandleProps}
                        getColumnHeaderProps={getColumnHeaderProps}
                        className="hidden lg:table-cell"
                      >
                        Precio Unitario
                      </ResizableTableHeader>
                      <ResizableTableHeader
                        columnId="sale_price"
                        getResizeHandleProps={getResizeHandleProps}
                        getColumnHeaderProps={getColumnHeaderProps}
                        className="hidden lg:table-cell"
                      >
                        Precio Venta
                      </ResizableTableHeader>
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
                      <ResizableTableHeader
                        columnId="status"
                        getResizeHandleProps={getResizeHandleProps}
                        getColumnHeaderProps={getColumnHeaderProps}
                        className="hidden sm:table-cell"
                      >
                        Estado
                      </ResizableTableHeader>
                      {branches.length > 1 && (
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
                      const paged = paginate(filteredProducts)
                      return paged.items.map((product) => {
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
                            <ResizableTableCell
                              columnId="unit_price"
                              getColumnCellProps={getColumnCellProps}
                              className={`hidden lg:table-cell ${!product.status ? "text-gray-500" : ""}`}
                            >
                              <span className="truncate block">{formatUnitPrice(product.unit_price, product.currency)}</span>
                            </ResizableTableCell>
                            <ResizableTableCell
                              columnId="sale_price"
                              getColumnCellProps={getColumnCellProps}
                              className={`hidden lg:table-cell ${!product.status ? "text-gray-500" : ""}`}
                            >
                              <span className="truncate block">{formatSalePrice(product.sale_price)}</span>
                            </ResizableTableCell>
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
                            <ResizableTableCell
                              columnId="status"
                              getColumnCellProps={getColumnCellProps}
                              className={`hidden sm:table-cell ${!product.status ? "opacity-60" : ""}`}
                            >
                              <Badge variant="outline" className={`${product.status ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"} truncate`}>
                                {product.status ? "Activo" : "Inactivo"}
                              </Badge>
                            </ResizableTableCell>
                            {branches.length > 1 && (
                              <ResizableTableCell
                                columnId="branch"
                                getColumnCellProps={getColumnCellProps}
                                className={`hidden lg:table-cell ${!product.status ? "text-gray-500" : ""}`}
                              >
                                <div className="flex items-center">
                                  <span className={`mr-2 h-2 w-2 rounded-full ${!product.status ? "bg-gray-400" : "bg-[#0ea5e9]"}`}></span>
                                  <span className="truncate">{getBranchNameForProduct(product)}</span>
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
                                <Button variant="ghost" size="sm" onClick={() => handleEditClick(product)} className="h-8 w-8 p-0 text-orange-500 hover:text-orange-700 hover:bg-orange-50">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(product)} className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </ResizableTableCell>
                          </TableRow>
                        )
                      })
                    })()}
                  </TableBody>
                </Table>
                {(() => {
                  const paged = paginate(filteredProducts)
                  return (
                    <div className="flex items-center justify-between p-3 border-t bg-muted/30">
                      <div className="flex items-center gap-3">
                        <select className="h-8 rounded-md border px-2 text-sm bg-background" value={perPage} onChange={(e) => handlePerPageChange(parseInt(e.target.value, 10))}>
                          {[10, 25, 50, 100, 200].map((n) => (<option key={n} value={n}>{n} por página</option>))}
                        </select>
                      </div>
                      <div>
                        <Pagination
                          currentPage={paged.currentPage}
                          lastPage={paged.totalPages}
                          total={paged.total}
                          itemName="productos"
                          onPageChange={(page) => handleGoToPage(page, paged.totalPages)}
                          disabled={false}
                        />
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        )}

        {selectedProduct && (
          <EditProductDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            product={selectedProduct}
            onProductUpdated={refreshData}
          />
        )}
        {viewDialogOpen && selectedProduct && (
          <ViewProductDialog
            open={viewDialogOpen}
            onOpenChange={setViewDialogOpen}
            product={selectedProduct}
          />
        )}
        {deleteDialogOpen && selectedProduct && (
          <DeleteProductDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            product={selectedProduct}
            onProductDeleted={refreshData}
          />
        )}
        <ExportPriceListDialog
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
        />
        <BulkPriceUpdateDialog
          open={bulkUpdateDialogOpen}
          onOpenChange={setBulkUpdateDialogOpen}
          onPricesUpdated={refreshData}
        />
        </div>
      </BranchRequiredWrapper>
    </ProtectedRoute>
  )
}