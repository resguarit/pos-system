import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, PackagePlus, Search } from "lucide-react"
import useApi from "@/hooks/useApi"
import type { Product, Branch } from "@/types/product"
import { toast } from "sonner" // Importar toast

interface AddStockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  branches: Branch[]
}

export function AddStockDialog({ open, onOpenChange, onSuccess, branches }: AddStockDialogProps) {
  const { request, loading } = useApi()

  // Fallback si no llegan sucursales por props
  const [fallbackBranches, setFallbackBranches] = useState<Branch[]>([])
  const allBranches: Branch[] = (branches && branches.length > 0) ? branches : fallbackBranches

  const resolveBranchLabel = (b: Branch) => (b as any)?.name || (b as any)?.description || `Sucursal ${String((b as any)?.id ?? '')}`

   // Estados para el formulario
   const [products, setProducts] = useState<Product[]>([])
   const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
   const [selectedBranch, setSelectedBranch] = useState<string>("")
   const [stockToAdd, setStockToAdd] = useState<string>("1")
   const [minStock, setMinStock] = useState<string>("0")
   const [maxStock, setMaxStock] = useState<string>("0")
   const [currentStock, setCurrentStock] = useState<string>("0")
   const [searchQuery, setSearchQuery] = useState<string>("")
   const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
   const [showProductsList, setShowProductsList] = useState(false)
   const [productStocks, setProductStocks] = useState<any[]>([])
   const [loadingStock, setLoadingStock] = useState(false)
   const [errors, setErrors] = useState<{ [key: string]: string }>({}); // Estado para errores

  // Cargar productos al abrir el diálogo
  useEffect(() => {
    if (open) {
      fetchProducts()
      resetForm()
      // Cargar sucursales si no hay
      if (!branches || branches.length === 0) {
        ;(async () => {
          try {
            // Usar solo sucursales activas
            const resp = await request({ method: 'GET', url: '/branches/active' })
            const data = Array.isArray(resp) ? resp : (resp as any)?.data && Array.isArray((resp as any).data) ? (resp as any).data : []
            setFallbackBranches(data as Branch[])
          } catch (e) {
            console.error('Error cargando sucursales:', e)
            setFallbackBranches([])
          }
        })()
      }
    }
  }, [open])

  // Filtrar productos cuando cambia la búsqueda
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredProducts([])
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = products.filter(
        (product) =>
          product.description?.toLowerCase().includes(query) || String(product.code).toLowerCase().includes(query),
      )
      setFilteredProducts(filtered)

      // Si hay resultados, mostrar la lista
      if (filtered.length > 0) {
        setShowProductsList(true)
      }
    }
  }, [searchQuery, products])

  // Cargar información de stock cuando se selecciona un producto
  useEffect(() => {
    // Clear stocks and fetch new ones when product changes
    if (selectedProduct) {
      fetchAllProductStocks();
    } else {
      // Clear stocks if product is deselected
      setProductStocks([]);
      setLoadingStock(false);
      // Explicitly reset displayed values
      setCurrentStock("0");
      setMinStock("0");
      setMaxStock("0");
    }
  }, [selectedProduct]); // Only depends on selectedProduct

  // Actualizar stock cuando cambia la sucursal, los stocks cargados, o el estado de carga
  useEffect(() => {
    // Update display based on current state
    updateStockForSelectedBranch();
    // Dependencies: product selection, branch selection, loaded stocks, and loading status
  }, [selectedProduct, selectedBranch, productStocks, loadingStock]);

  const resetForm = () => {
    setSelectedProduct(null)
    setSelectedBranch("")
    setStockToAdd("1")
    setMinStock("0")
    setMaxStock("0")
    setCurrentStock("0")
    setSearchQuery("")
    setShowProductsList(false)
    setProductStocks([])
    // limpiar errores residuales al reabrir
    setErrors({})
  }

  const fetchProducts = async () => {
    try {
      const data = await request({
        method: "GET",
        url: "/products?include=category,supplier&for_admin=true",
      })
      const productList = Array.isArray(data)
        ? data
        : Array.isArray((data as any)?.data)
          ? (data as any).data
          : Array.isArray((data as any)?.data?.data)
            ? (data as any).data.data
            : []
      setProducts(productList)
    } catch (err) {
      console.error("Error al cargar productos:", err)
    }
  }

  // Cargar todos los stocks del producto seleccionado
  const fetchAllProductStocks = async () => {
    if (!selectedProduct) return;
    setLoadingStock(true);
    setProductStocks([]);
    setCurrentStock("0");
    setMinStock("0");
    setMaxStock("0");

    try {
      const stockResponse = await request({
        method: "GET",
        url: `/stocks?product_id=${selectedProduct.id}`,
      });

      // robust unwrapping
      const payload = (stockResponse as any)?.data ?? stockResponse
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray((stockResponse as any)?.data?.data)
            ? (stockResponse as any).data.data
            : []

      const validStockData = list.filter((s: any) => s && s.branch_id != null && s.current_stock != null)
      setProductStocks(validStockData)
    } catch (err) {
      console.error("Error al cargar stocks del producto:", err)
      setProductStocks([])
    } finally {
      setLoadingStock(false)
    }
  }

  // Actualizar el stock mostrado según la sucursal seleccionada
  const updateStockForSelectedBranch = () => {
    // If no product OR stocks are loading
    if (!selectedProduct || loadingStock) {
      setCurrentStock(loadingStock ? "Cargando..." : "0"); // Show loading indicator or 0
      setMinStock("0");
      setMaxStock("0");
      return;
    }

    // Ensure productStocks is an array before proceeding
    const stocksArray = Array.isArray(productStocks) ? productStocks : [];

    // Calculate total stock across all branches for the selected product
    const totalStock = stocksArray.reduce((sum, stock) => sum + (Number(stock.current_stock) || 0), 0);

    // If a branch IS selected
    if (selectedBranch) {
      // Ensure comparison is robust (both as numbers or both as strings)
      const branchStock = stocksArray.find((stock) => String(stock.branch_id) === String(selectedBranch));

      if (branchStock) {
        // Found stock for the specific branch
        setCurrentStock(String(branchStock.current_stock ?? 0));
        setMinStock(String(branchStock.min_stock ?? 0));
        setMaxStock(String(branchStock.max_stock ?? 0));
      } else {
        // No stock record found for this specific branch (might not exist yet), default to 0
        setCurrentStock("0");
        setMinStock("0"); // Reset min/max as they apply to the specific branch
        setMaxStock("0");
      }
    } else {
      // No branch selected yet - Show the calculated total stock
      setCurrentStock(String(totalStock));
      // Min/Max don't make sense as a total, keep them at 0 or hide them
      setMinStock("0");
      setMaxStock("0");
    }
  };

  // Función para validar el formulario
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!selectedProduct) {
      newErrors.product = "Debes seleccionar un producto.";
    }
    if (!selectedBranch) {
      newErrors.branch = "Debes seleccionar una sucursal.";
    }
    if (!stockToAdd || Number(stockToAdd) === 0) {
      newErrors.stockToAdd = "La cantidad no puede ser 0.";
    }
    const min = Number(minStock);
    const max = Number(maxStock);

    // Validar Stock Mínimo
    if (minStock === "" || min < 0) { // Asegurar que no esté vacío y sea >= 0
        newErrors.minStock = "El stock mínimo debe ser 0 o mayor.";
    }

    // Validar Stock Máximo
    if (maxStock === "" || max <= 0) { // Asegurar que no esté vacío y sea > 0
        newErrors.maxStock = "El stock máximo debe ser mayor que 0.";
    } else if (minStock !== "" && min >= 0 && max <= min) { // Solo comparar si minStock es válido
       newErrors.maxStock = "El stock máximo debe ser mayor que el stock mínimo.";
    }


    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    if (!isValid) {
        // Mostrar toast de error si la validación falla
        const errorMessages = Object.values(newErrors).join("\n"); // Unir mensajes para el toast
        toast.error("Error de validación", {
            description: errorMessages,
        });
    }
    return isValid; // Retorna true si no hay errores
  };


  const handleAddStock = async () => {
    // Validar antes de enviar
    if (!validateForm()) {
      return; // Detener si hay errores
    }

    // Limpiar errores si la validación pasa (opcional, validateForm ya lo hace)
    // setErrors({});

    if (!selectedProduct || !selectedBranch || !stockToAdd) {
      // Esta comprobación es redundante debido a validateForm, pero se mantiene por seguridad
      return
    }

    try {
      // check if stock exists for product+branch
      const stockResponse = await request({
        method: "GET",
        url: `/stocks?product_id=${selectedProduct!.id}&branch_id=${selectedBranch}`,
      })
      const payload = (stockResponse as any)?.data ?? stockResponse
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray((stockResponse as any)?.data?.data)
            ? (stockResponse as any).data.data
            : []

      const newCurrentStock = Number(currentStock) + Number(stockToAdd)
      // Quitar supplier_id: no es necesario y no es fillable en backend

      if (Array.isArray(list) && list.length > 0) {
        const stockId = list[0].id
        await request({
          method: "PUT",
          url: `/stocks/${stockId}`,
          data: {
            product_id: Number(selectedProduct!.id),
            branch_id: Number(selectedBranch),
            current_stock: newCurrentStock,
            min_stock: Number(minStock),
            max_stock: Number(maxStock),
          },
        })
      } else {
        await request({
          method: "POST",
          url: "/stocks",
          data: {
            product_id: Number(selectedProduct!.id),
            branch_id: Number(selectedBranch),
            current_stock: newCurrentStock,
            min_stock: Number(minStock),
            max_stock: Number(maxStock),
          },
        })
      }

      onSuccess()
      onOpenChange(false)
      // Mostrar toast de éxito
      toast.success("Stock ajustado exitosamente", {
        description: `Se ${Number(stockToAdd) >= 0 ? 'agregaron' : 'restaron'} ${Math.abs(Number(stockToAdd))} unidades de ${selectedProduct?.description} a la sucursal ${resolveBranchLabel(allBranches.find(b => String((b as any).id) === String(selectedBranch)) as Branch)}.`,
      });
    } catch (err: any) { // Capturar error específico
      console.error("Error al actualizar stock:", err)
      // Mostrar toast de error de API
      toast.error("Error al agregar stock", {
        description: err?.response?.data?.message || err.message || "Ocurrió un problema al intentar guardar el stock.",
      });
    }
  }

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product)
    setSearchQuery(`${product.code} - ${product.description}`)
    setShowProductsList(false)
    // limpiar error de producto si existía
    setErrors((prev) => {
      const { product: _prodErr, ...rest } = prev
      return rest
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[900px] max-w-[90vw] h-[600px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajustar Stock</DialogTitle>
          <DialogDescription>
            <div className="mb-2 p-3 rounded-md bg-blue-50 text-blue-900 border border-blue-200 text-sm">
              <strong>¿Cuándo usar "Ajustar Stock"?</strong><br />
              El stock de productos normalmente se actualiza automáticamente con las <strong>ordenes de compra a proveedores</strong> y las <strong>ventas</strong>. Utiliza esta función solo en casos excepcionales, como ajustes manuales, correcciones o carga inicial de inventario. No es necesario usarla para la gestión diaria habitual.<br /><br />
              <strong>Puedes usar números positivos para sumar stock o números negativos para restar stock.</strong>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2 max-h-[60vh] overflow-y-auto">
          {/* Columna 1: Producto y Sucursal */}
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-4 items-center gap-4 mt-2">
              <Label htmlFor="searchProduct" className="text-right">
                Buscar Producto <span className="text-red-500">*</span>
              </Label>
              <div className="col-span-3 relative">
                <div className="relative w-full">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="searchProduct"
                    placeholder="Código o descripción"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      if (e.target.value.trim() === "") {
                        setShowProductsList(false)
                        if (errors.product) {
                          const { product, ...rest } = errors;
                          setErrors(rest);
                        }
                      }
                    }}
                    onFocus={() => {
                      if (searchQuery.trim() !== "" && filteredProducts.length > 0) {
                        setShowProductsList(true)
                      }
                    }}
                    className={`w-full pl-8 ${errors.product ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  />
                </div>
                {errors.product && <p className="text-red-500 text-xs mt-1 col-span-full text-right">{errors.product}</p>}

                {/* Lista de productos filtrados */}
                {showProductsList && filteredProducts.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white rounded-md border border-gray-200 shadow-lg max-h-60 overflow-auto">
                    <ul className="py-1">
                      {filteredProducts.slice(0, 10).map((product) => (
                        <li
                          key={product.id}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => handleSelectProduct(product)}
                        >
                          <span className="font-medium">{product.code}</span> - {product.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="branch" className="text-right">
                Sucursal <span className="text-red-500">*</span>
              </Label>
              <Select
                value={selectedBranch}
                onValueChange={(value) => {
                  setSelectedBranch(value);
                  if (errors.branch) {
                    const { branch, ...rest } = errors;
                    setErrors(rest);
                  }
                }}
              >
                <SelectTrigger className={`col-span-3 ${errors.branch ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}>
                  <SelectValue placeholder="Seleccionar sucursal" />
                </SelectTrigger>
                <SelectContent style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {allBranches.length > 0 ? (
                    <>
                      {allBranches.map((branch) => (
                        <SelectItem key={branch.id} value={String(branch.id)}>
                          {resolveBranchLabel(branch)}
                        </SelectItem>
                      ))}
                    </>
                  ) : (
                    <div className="px-2 py-1 text-sm text-muted-foreground">No hay sucursales disponibles</div>
                  )}
                </SelectContent>
              </Select>
              {errors.branch && <p className="text-red-500 text-xs mt-1 col-span-full text-right">{errors.branch}</p>}
            </div>
            <div className="bg-muted p-4 rounded-md mt-1">
              <h4 className="font-medium mb-2">Resumen:</h4>
              {selectedProduct && (
                <>
                  <p>
                    <span className="font-medium">Producto:</span> {selectedProduct.code} - {selectedProduct.description}
                  </p>
                  {selectedProduct.supplier && (
                    <p>
                      <span className="font-medium">Proveedor:</span> {selectedProduct.supplier.name}
                    </p>
                  )}
                  <p>
                    <span className="font-medium">Stock {selectedBranch ? `en Sucursal (${allBranches.find(b => String((b as any).id) === String(selectedBranch)) ? resolveBranchLabel(allBranches.find(b => String((b as any).id) === String(selectedBranch)) as Branch) : 'Seleccionada'})` : 'Total (Todas las Sucursales)'}:</span> {loadingStock ? "Cargando..." : currentStock}
                  </p>
                  {!loadingStock && selectedBranch && (
                    <p>
                      <span className="font-medium">Stock después del ajuste:</span>{" "}
                      {Number(currentStock) + Number(stockToAdd)}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
          {/* Columna 2: Stock y cantidad */}
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-4 items-center gap-4 mt-2">
              <Label htmlFor="currentStock" className="text-right">
                Stock Actual
              </Label>
              <div className="col-span-3 relative">
                <Input
                  id="currentStock"
                  value={loadingStock ? "Cargando..." : currentStock}
                  disabled
                  className="col-span-3 bg-muted"
                />
                {loadingStock && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="minStock" className="text-right">
                Stock Mínimo
              </Label>
              <Input
                id="minStock"
                type="number"
                min="0"
                value={minStock}
                onChange={(e) => {
                  setMinStock(e.target.value);
                  if (errors.minStock || errors.maxStock) {
                    const { minStock, maxStock, ...rest } = errors;
                    setErrors(rest);
                  }
                }}
                className={`col-span-3 ${errors.minStock ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              />
              {errors.minStock && <p className="text-red-500 text-xs mt-1 col-span-full text-right">{errors.minStock}</p>}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="maxStock" className="text-right">
                Stock Máximo
              </Label>
              <Input
                id="maxStock"
                type="number"
                min="0"
                value={maxStock}
                onChange={(e) => {
                  setMaxStock(e.target.value);
                  if (errors.maxStock) {
                    const { maxStock, ...rest } = errors;
                    setErrors(rest);
                  }
                }}
                className={`col-span-3 ${errors.maxStock ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              />
              {errors.maxStock && <p className="text-red-500 text-xs mt-1 col-span-full text-right">{errors.maxStock}</p>}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stockToAdd" className="text-right">
                Cantidad a Ajustar <span className="text-red-500">*</span>
              </Label>
              <Input
                id="stockToAdd"
                type="number"
                placeholder="Ej: 10 para sumar, -5 para restar"
                value={stockToAdd}
                onChange={(e) => {
                  setStockToAdd(e.target.value);
                  if (errors.stockToAdd) {
                    const { stockToAdd, ...rest } = errors;
                    setErrors(rest);
                  }
                }}
                className={`col-span-3 ${errors.stockToAdd ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              />
              {errors.stockToAdd && <p className="text-red-500 text-xs mt-1 col-span-full text-right">{errors.stockToAdd}</p>}
              <p className="text-xs text-muted-foreground col-span-full text-right mt-1">
                Usa números positivos para sumar o negativos para restar
              </p>
            </div>
            {/* Advertencias y mensajes */}
            {(Number(currentStock) < 0 || (!loadingStock && selectedBranch && Number(currentStock) + Number(stockToAdd) < 0)) && (
              <div className="mb-2 p-2 rounded-md bg-yellow-50 text-yellow-900 border border-yellow-200 text-sm">
                <strong>Advertencia:</strong> El sistema permite manejar stock negativo. Es responsabilidad del usuario controlar estos casos. El stock negativo puede indicar faltantes, devoluciones o ajustes especiales.
              </div>
            )}

            {/* Advertencia especial para el error del backend sobre stock mínimo */}
            {errors.current_stock && errors.current_stock.includes('must be at least 0') && (
              <div className="mb-2 p-2 rounded-md bg-yellow-50 text-yellow-900 border border-yellow-200 text-sm">
                <strong>Advertencia:</strong> El backend está configurado para requerir stock mayor o igual a 0, pero el sistema permite stock negativo. Si necesitas operar con stock negativo, contacta al administrador para ajustar la configuración o ignora este mensaje si tu flujo lo requiere.
              </div>
            )}
        </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {/* Deshabilitar si hay errores */}
          <Button onClick={handleAddStock} disabled={loading || loadingStock || Object.keys(errors).length > 0}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <PackagePlus className="mr-2 h-4 w-4" />
                Agregar Stock
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
