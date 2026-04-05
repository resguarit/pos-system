import { useCallback, useEffect, useRef, useState } from "react"
import useApi from "@/hooks/useApi"
import { AsyncMultiSelect, type Option } from "@/components/ui/async-multi-select"

export type ProductAsyncMultiSelectFilterProps = {
  /** Sucursales para filtrar el catálogo en `/products` (misma API que Ventas). */
  branchIds: number[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

/**
 * Mismo comportamiento que el filtro de productos en Ventas (`AsyncMultiSelect` + búsqueda remota, mín. 2 caracteres).
 */
export function ProductAsyncMultiSelectFilter({
  branchIds,
  selected,
  onChange,
  placeholder = "Productos",
  className = "h-9 min-h-9 py-2 bg-background",
  disabled = false,
}: ProductAsyncMultiSelectFilterProps) {
  const { request } = useApi()
  const [productOptions, setProductOptions] = useState<Option[]>([])
  const [productLabelMap, setProductLabelMap] = useState<Record<string, string>>({})
  const [debouncedProductQuery, setDebouncedProductQuery] = useState("")
  const [productPage, setProductPage] = useState(1)
  const [productHasMore, setProductHasMore] = useState(false)
  const [productLoading, setProductLoading] = useState(false)
  const productSearchRequestIdRef = useRef(0)

  const handleProductSearch = useCallback((query: string) => {
    const trimmedQuery = query.trim()
    setProductPage(1)
    setDebouncedProductQuery(trimmedQuery)
    if (trimmedQuery.length < 2) {
      setProductOptions([])
      setProductHasMore(false)
    }
  }, [])

  const branchKey = [...branchIds].sort((a, b) => a - b).join(",")

  useEffect(() => {
    setProductPage(1)
    setProductOptions([])
    setProductHasMore(false)
  }, [branchKey])

  useEffect(() => {
    const fetchProducts = async () => {
      const query = debouncedProductQuery.trim()

      if (query.length < 2) {
        setProductHasMore(false)
        setProductLoading(false)
        return
      }

      const requestId = ++productSearchRequestIdRef.current

      setProductLoading(true)
      try {
        const params: Record<string, unknown> = {
          search: query,
          page: productPage,
          per_page: 50,
        }
        if (branchIds.length > 0) {
          params.branch_ids = branchIds
        }

        const response = await request({
          method: "GET",
          url: "/products",
          params,
        })

        const responseData = response?.data ?? response
        const rawProducts =
          (response?.success ? response?.data?.data ?? response?.data : undefined) ??
          responseData?.data ??
          responseData ??
          []

        const items = (Array.isArray(rawProducts) ? rawProducts : []) as Array<Record<string, unknown>>
        const options: Option[] = items.map((p) => {
          const code = p.code ?? p.sku ?? p.barcode ?? p.id
          const name = p.name ?? p.description ?? "Sin nombre"
          const id = p.id ?? code
          return {
            label: `${code} - ${name}`,
            value: String(id),
          }
        })

        if (requestId !== productSearchRequestIdRef.current) {
          return
        }

        setProductOptions((prev) => {
          if (productPage === 1) return options
          const map = new Map(prev.map((opt) => [opt.value, opt]))
          options.forEach((opt) => map.set(opt.value, opt))
          return Array.from(map.values())
        })
        setProductHasMore(items.length === 50)
        setProductLabelMap((prev) => {
          const next = { ...prev }
          options.forEach((opt) => {
            next[opt.value] = opt.label
          })
          return next
        })
      } catch (error) {
        if (requestId !== productSearchRequestIdRef.current) {
          return
        }
        console.error("Error fetching products:", error)
        if (productPage === 1) setProductOptions([])
        setProductHasMore(false)
      } finally {
        if (requestId === productSearchRequestIdRef.current) {
          setProductLoading(false)
        }
      }
    }

    fetchProducts()
  }, [request, debouncedProductQuery, productPage, branchKey, branchIds])

  return (
    <AsyncMultiSelect
      options={productOptions}
      selected={selected}
      onChange={onChange}
      onSearch={handleProductSearch}
      loading={productLoading}
      hasMore={productHasMore}
      onLoadMore={() => setProductPage((p) => p + 1)}
      placeholder={placeholder}
      searchPlaceholder="Buscar producto..."
      emptyMessage={
        debouncedProductQuery.trim().length < 2
          ? "Escribi al menos 2 caracteres para buscar."
          : "No se encontraron productos"
      }
      selectedLabelMap={productLabelMap}
      className={className}
      disabled={disabled}
    />
  )
}
