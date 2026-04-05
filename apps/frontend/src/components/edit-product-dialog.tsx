import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Product } from "@/types/product"
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import useApi from "@/hooks/useApi"
import { Textarea } from "@/components/ui/textarea"
import { sileo } from "sileo"
import { usePricing } from '@/hooks/usePricing';
import FormattedNumberInput from '@/components/ui/formatted-number-input';
import { useEntityContext } from "@/context/EntityContext";
import { SupplierSearchCombobox } from '@/components/suppliers/SupplierSearchCombobox';

function unwrapProductDetail(res: unknown): Product | null {
  if (res == null || typeof res !== 'object') return null;
  const o = res as Record<string, unknown>;
  if (typeof o.id === 'number') return o as Product;
  const inner = o.data;
  if (inner && typeof inner === 'object' && typeof (inner as Record<string, unknown>).id === 'number') {
    return inner as Product;
  }
  return null;
}

interface EditProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onProductUpdated: () => void;
}

export function EditProductDialog({ open, onOpenChange, product, onProductUpdated }: EditProductDialogProps) {
  type ProductFormData = Omit<Partial<Product>, 'id' | 'measure_id' | 'category_id' | 'supplier_id' | 'iva_id' | 'unit_price' | 'markup' | 'sale_price' | 'status' | 'web' | 'created_at' | 'updated_at' | 'deleted_at' | 'measure' | 'category' | 'iva' | 'supplier' | 'stocks' | 'image_id' | 'currency' | 'allow_discount'> & {
    unit_price: string;
    markup: string;
    sale_price: string;
    currency: string;
    category_id: string;
    measure_id: string;
    supplier_id: string;
    iva_id: string;
    status: string;
    web: string;
    allow_discount: string;
    code: string;
    scale_plu: string;
    description: string;
    observaciones: string;
  };

  const [formData, setFormData] = useState<ProductFormData | null>(null);

  // Rastrear qué campo se está editando actualmente usando useRef (no causa re-renders)
  const editingFieldRef = useRef<string | null>(null);

  // Rastrear valores previos para evitar actualizaciones innecesarias
  const prevPricingRef = useRef({ markup: 0, salePrice: 0 });
  // Guardar el sale_price anterior al hacer focus para poder restaurarlo si queda vacío
  const prevSalePriceRef = useRef<string | null>(null);

  // Estados para stock
  const [stockData, setStockData] = useState({
    min_stock: "",
    max_stock: ""
  });
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [currentStock, setCurrentStock] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  // Estados para validación de duplicados
  const [codeError, setCodeError] = useState<string>("");
  const [isCheckingCode, setIsCheckingCode] = useState<boolean>(false);
  const [descriptionError, setDescriptionError] = useState<string>("");
  const [isCheckingDescription, setIsCheckingDescription] = useState<boolean>(false);

  const [categories, setCategories] = useState<Array<{ id: number, name: string, display_name?: string, type?: string, parent_id?: number }>>([]);
  const [measures, setMeasures] = useState<Array<{ id: number, name: string }>>([]);
  const [suppliers, setSuppliers] = useState<Array<{
    id: number;
    name: string;
    contact_name?: string | null;
    phone?: string | null;
    email?: string | null;
    cuit?: string | null;
  }>>([]);
  const [ivas, setIvas] = useState<Array<{ id: number, rate: number }>>([]);
  /** Product from GET /products/:id with category & supplier relations (prop may be a stock row without them). */
  const [resolvedProduct, setResolvedProduct] = useState<Product | null>(null);
  const { request, loading } = useApi();
  const { dispatch } = useEntityContext();

  // Hook de precios
  const {
    pricing,
    updateUnitPrice,
    updateMarkup,
    updateSalePrice,
    updateCurrency,
    updateIvaRate,
    validatePricing,
    formatPrice,
    formatMarkup,
    calculateSalePrice
  } = usePricing({
    unitPrice: typeof product?.unit_price === 'string' ? parseFloat(product.unit_price) :
      typeof product?.unit_price === 'number' ? product.unit_price : 0,
    currency: product?.currency || 'ARS',
    markup: typeof product?.markup === 'string' ? parseFloat(product.markup) :
      typeof product?.markup === 'number' ? product.markup : 0,
    ivaRate: product?.iva?.rate ? product.iva.rate / 100 : 0,
    initialSalePrice: typeof product?.sale_price === 'string' ? parseFloat(product.sale_price) :
      typeof product?.sale_price === 'number' ? product.sale_price : 0
  });

  const fetchStockForBranch = useCallback(async (branchId: number, signal?: AbortSignal) => {
    if (!product) return;
    try {
      const stockResponse = await request({
        method: 'GET',
        url: `/stocks?product_id=${product.id}&branch_id=${branchId}`,
        signal
      });

      const stockList = Array.isArray(stockResponse) ? stockResponse : (stockResponse?.data ?? []);
      const stock = stockList.find((s: any) => s.product_id === product.id && s.branch_id === branchId); // eslint-disable-line @typescript-eslint/no-explicit-any

      if (stock) {
        setCurrentStock(stock);
        setStockData({
          min_stock: stock.min_stock?.toString() || "",
          max_stock: stock.max_stock?.toString() || ""
        });
      } else {
        setCurrentStock(null);
        setStockData({ min_stock: "", max_stock: "" });
      }
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (error.name !== 'AbortError' && !error.message?.includes('canceled')) {
        console.error("Error al cargar stock:", error);
      }
    }
  }, [product, request]);

  const fetchCatalogs = useCallback(async (signal?: AbortSignal) => {
    if (!open) return;

    try {
      const [categoriesResponse, measuresResponse, suppliersResponse, ivasResponse, branchesResponse] = await Promise.all([
        request({ method: 'GET', url: '/categories/for-selector', signal }),
        request({ method: 'GET', url: '/measures', signal }),
        request({ method: 'GET', url: '/suppliers?per_page=10000', signal }),
        request({ method: 'GET', url: '/ivas', signal }),
        request({ method: 'GET', url: '/branches', signal })
      ]);

      if (!open) return;

      const getArray = (res: any) => Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []; // eslint-disable-line @typescript-eslint/no-explicit-any

      setCategories(getArray(categoriesResponse));
      setMeasures(getArray(measuresResponse));
      setSuppliers(getArray(suppliersResponse));
      setIvas(getArray(ivasResponse));

      const branchList = getArray(branchesResponse);

      let productDetailRaw: unknown = null;
      if (product?.id) {
        try {
          productDetailRaw = await request({ method: 'GET', url: `/products/${product.id}`, signal });
        } catch (e: unknown) {
          const err = e as { name?: string; message?: string };
          if (err?.name === 'AbortError' || err?.name === 'CanceledError' || err?.message?.includes('canceled')) {
            throw e;
          }
          productDetailRaw = null;
        }
      }

      if (!open) return;

      const detail = unwrapProductDetail(productDetailRaw);
      setResolvedProduct(detail && product && detail.id === product.id ? detail : null);

      if (branchList.length > 0) {
        const defaultBranchId = branchList[0].id;
        setSelectedBranchId(defaultBranchId);
        if (open) {
          await fetchStockForBranch(defaultBranchId, signal);
        }
      }
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (error.name !== 'AbortError' && !error.message?.includes('canceled')) {
        console.error("Error general al cargar catálogos:", error);
        sileo.error({ title: "Error al cargar datos necesarios para editar." });
      }
    }
  }, [open, request, fetchStockForBranch, product]);

  useEffect(() => {
    if (open && product) {
      setResolvedProduct(null);
      editingFieldRef.current = null;
      prevSalePriceRef.current = null;

      const controller = new AbortController();
      fetchCatalogs(controller.signal);

      const initialMarkupDecimal = typeof product.markup === 'string'
        ? parseFloat(product.markup)
        : typeof product.markup === 'number'
          ? product.markup
          : 0;
      const initialSalePrice = typeof product.sale_price === 'string'
        ? parseFloat(product.sale_price)
        : typeof product.sale_price === 'number'
          ? product.sale_price
          : 0;

      prevPricingRef.current = {
        markup: initialMarkupDecimal,
        salePrice: initialSalePrice,
      };

      const initialData: ProductFormData = {
        description: product.description || '',
        unit_price: product.unit_price?.toString() || '0',
        markup: typeof product.markup === 'string' ? (parseFloat(product.markup) * 100).toFixed(2) :
          typeof product.markup === 'number' ? (product.markup * 100).toFixed(2) : '0',
        sale_price: product.sale_price?.toString() || '0',
        category_id:
          product.category_id?.toString() ||
          product.category?.id?.toString() ||
          '',
        measure_id: product.measure_id?.toString() || '',
        supplier_id:
          product.supplier_id?.toString() ||
          product.supplier?.id?.toString() ||
          '',
        iva_id: product.iva_id?.toString() || '',
        observaciones: product.observaciones || "",
        status: product.status ? "1" : "0",
        web: product.web ? "1" : "0",
        allow_discount: product.allow_discount === false ? "0" : "1",
        currency: product.currency || 'ARS',
        code: product.code || '',
        scale_plu: product.scale_plu != null && String(product.scale_plu).trim() !== ''
          ? String(product.scale_plu)
          : ''
      };

      setFormData(initialData);

      return () => {
        controller.abort();
      }
    } else {
      editingFieldRef.current = null;
      prevSalePriceRef.current = null;
      setFormData(null);
      setResolvedProduct(null);
    }
  }, [open, product, formatMarkup, fetchCatalogs]);

  useEffect(() => {
    if (!open || !resolvedProduct) return;
    const sp = resolvedProduct.scale_plu != null ? String(resolvedProduct.scale_plu).trim() : '';
    if (!sp) return;
    setFormData((prev) => {
      if (!prev || prev.scale_plu !== '') return prev;
      return { ...prev, scale_plu: sp };
    });
  }, [open, resolvedProduct]);

  // Sincronizar formData.markup con pricing.markup cuando el hook lo recalcula
  // PERO NO cuando el usuario está editando el campo markup directamente
  useEffect(() => {
    if (!formData || editingFieldRef.current === 'markup') return;

    const markupAsPercentage = (pricing.markup * 100).toFixed(2);

    // Solo actualizar si realmente cambió y el valor es diferente
    if (prevPricingRef.current.markup !== pricing.markup && formData.markup !== markupAsPercentage) {
      setFormData(prev => prev ? { ...prev, markup: markupAsPercentage } : null);
      prevPricingRef.current.markup = pricing.markup;
    }
  }, [pricing.markup, formData]);


  // Funciones para verificar duplicados
  const checkCodeExists = useCallback(async (code: string) => {
    if (!code.trim() || !product?.id) {
      setCodeError("");
      return;
    }

    setIsCheckingCode(true);
    try {
      const response = await request({
        method: 'GET',
        url: `/products/check-code/${encodeURIComponent(code)}`
      });

      if (response.exists && code !== product.code) {
        setCodeError("Este código ya está en uso");
        sileo.error({
          title: "Este código ya está en uso",
          description: "Por favor, elige un código diferente para el producto."
        });
      } else {
        setCodeError("");
      }
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error("Error checking code:", error);
      setCodeError("");
    } finally {
      setIsCheckingCode(false);
    }
  }, [product, request]);

  const productForRelations = resolvedProduct ?? product;

  const supplierSearchItems = useMemo(() => {
    const base = suppliers.map((s) => ({
      id: s.id,
      name:
        s.name ||
        (s as { business_name?: string }).business_name ||
        `Proveedor ${s.id}`,
      contact_name: s.contact_name,
      phone: s.phone,
      email: s.email,
      cuit: s.cuit,
    }));

    const sidStr = formData?.supplier_id;
    if (!sidStr) return base;
    if (base.some((x) => String(x.id) === String(sidStr))) return base;

    const sidNum = parseInt(sidStr, 10);
    const ps = productForRelations?.supplier;
    if (ps && String(ps.id) === String(sidStr)) {
      return [
        ...base,
        {
          id: ps.id,
          name: ps.name || `Proveedor ${ps.id}`,
          contact_name: ps.contact_name ?? null,
          phone: ps.phone ?? null,
          email: ps.email ?? null,
          cuit: ps.cuit ?? null,
        },
      ];
    }

    if (!Number.isNaN(sidNum)) {
      return [
        ...base,
        {
          id: sidNum,
          name: `Proveedor #${sidNum} (no en listado)`,
          contact_name: null as string | null,
          phone: null as string | null,
          email: null as string | null,
          cuit: null as string | null,
        },
      ];
    }

    return base;
  }, [suppliers, formData?.supplier_id, productForRelations?.supplier]);

  const categoriesForSelect = useMemo(() => {
    const cidStr = formData?.category_id;
    if (!cidStr) return categories;

    const cidNum = parseInt(cidStr, 10);
    if (Number.isNaN(cidNum)) return categories;
    if (categories.some((c) => Number(c.id) === cidNum)) return categories;

    const cat = productForRelations?.category;
    if (cat && Number(cat.id) === cidNum) {
      return [
        ...categories,
        {
          id: cidNum,
          name: cat.name,
          display_name: (cat as { display_name?: string }).display_name ?? cat.name,
          type: 'subcategory' as const,
          parent_id: cat.parent_id ?? undefined,
        },
      ];
    }

    return [
      ...categories,
      {
        id: cidNum,
        name: `Categoría #${cidNum}`,
        display_name: `Categoría #${cidNum} (no en listado)`,
        type: 'parent' as const,
      },
    ];
  }, [categories, formData?.category_id, productForRelations?.category]);

  const supplierLabelFallback = useMemo(() => {
    const sid = formData?.supplier_id;
    if (!sid) return undefined;
    const rel = productForRelations?.supplier;
    if (rel && String(rel.id) === String(sid)) return rel.name || undefined;
    const item = supplierSearchItems.find((s) => String(s.id) === String(sid));
    return item?.name;
  }, [productForRelations?.supplier, formData?.supplier_id, supplierSearchItems]);

  const checkDescriptionExists = useCallback(async (description: string) => {
    if (!description.trim() || !product?.id) {
      setDescriptionError("");
      return;
    }

    setIsCheckingDescription(true);
    try {
      const response = await request({
        method: 'GET',
        url: `/products/check-description/${encodeURIComponent(description)}`
      });

      if (response.exists && description !== product.description) {
        setDescriptionError("Esta descripción ya está en uso");
        sileo.error({
          title: "Esta descripción ya está en uso",
          description: "Por favor, elige una descripción diferente para el producto."
        });
      } else {
        setDescriptionError("");
      }
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error("Error checking description:", error);
      setDescriptionError("");
    } finally {
      setIsCheckingDescription(false);
    }
  }, [product, request]);




  const handleInputChange = useCallback((field: keyof ProductFormData, value: string) => {
    if (!formData) return;

    // Marcar qué campo se está editando (no causa re-render)
    editingFieldRef.current = field;
    setFormData(prev => prev ? { ...prev, [field]: value } : null);

    // Validación de duplicados con debounce
    if (field === 'code') {
      const timeoutId = setTimeout(() => {
        checkCodeExists(value);
      }, 500);
      return () => clearTimeout(timeoutId);
    }

    if (field === 'description') {
      const timeoutId = setTimeout(() => {
        checkDescriptionExists(value);
      }, 500);
      return () => clearTimeout(timeoutId);
    }

    // Actualizar cálculos de precios según el campo editado
    const numericValue = parseFloat(value) || 0;

    switch (field) {
      case 'unit_price':
        updateUnitPrice(numericValue);
        break;
      case 'markup': {
        // Convertir porcentaje a decimal
        const markupDecimal = numericValue / 100;
        updateMarkup(markupDecimal);
        break;
      }
      case 'sale_price': {
        // Permitir vacío o 0 mientras escribe sin recalcular inmediatamente
        if (value.trim() === '' || value === '0' || value === '0,00' || value === '0.00') {
          // No recalcular markup aún
          break;
        }
        updateSalePrice(numericValue);
        break;
      }
      case 'currency':
        updateCurrency(value);
        break;
      case 'iva_id': {
        const selectedIva = ivas.find(iva => iva.id.toString() === value);
        if (selectedIva) {
          updateIvaRate(selectedIva.rate / 100);
        }
        break;
      }
    }
  }, [formData, updateUnitPrice, updateMarkup, updateSalePrice, updateCurrency, updateIvaRate, ivas, checkCodeExists, checkDescriptionExists]);

  const handleSubmit = async () => {
    if (!formData || !product) return;

    // Validar precios
    if (!validatePricing()) {
      sileo.error({ title: "Los parámetros de precio no son válidos" });
      return;
    }

    // Validar stock si se proporcionó
    if (stockData.min_stock && stockData.max_stock) {
      const minStock = parseFloat(stockData.min_stock);
      const maxStock = parseFloat(stockData.max_stock);

      if (minStock < 0) {
        sileo.error({ title: "El stock mínimo no puede ser negativo" });
        return;
      }

      if (maxStock <= minStock) {
        sileo.error({ title: "El stock máximo debe ser mayor que el stock mínimo" });
        return;
      }
    }

    try {
      // Preparar datos para envío
      const userEditedSalePrice = editingFieldRef.current === 'sale_price';
      const userEditedMarkup = editingFieldRef.current === 'markup';
      const userEditedUnitPrice = editingFieldRef.current === 'unit_price';

      // Si el usuario NO tocó el campo sale_price, usamos el calculado
      const salePriceValue = userEditedSalePrice
        ? (parseFloat(formData.sale_price) || 0)
        : Math.round(pricing.salePrice);

      const unitPrice = parseFloat(formData.unit_price);

      // Usar el markup del hook SOLO si el usuario lo editó o si cambió el costo/precio
      // de lo contrario, preferir el markup original del producto para evitar derivas por redondeo
      const originalMarkup = typeof product.markup === 'string' ? parseFloat(product.markup) : product.markup;
      const markupDecimal = (userEditedMarkup || userEditedUnitPrice || userEditedSalePrice)
        ? pricing.markup
        : originalMarkup;

      const submitData = {
        ...formData,
        unit_price: unitPrice,
        markup: markupDecimal,
        sale_price: salePriceValue,
        target_manual_price: salePriceValue,
        is_manual_price: true,
        force_manual_price: true,
        status: formData.status === "1",
        web: formData.web === "1",
        allow_discount: formData.allow_discount === "1",
      };

      // Solo enviar la descripción si ha cambiado
      if (formData.description === product.description) {
        delete (submitData as any).description; // eslint-disable-line @typescript-eslint/no-explicit-any
      }

      // Solo enviar el código si ha cambiado
      if (formData.code === product.code) {
        delete (submitData as any).code; // eslint-disable-line @typescript-eslint/no-explicit-any
      }

      // Eliminar campos vacíos
      Object.keys(submitData).forEach(key => {
        if (submitData[key as keyof typeof submitData] === '') {
          delete submitData[key as keyof typeof submitData];
        }
      });

      // Nota: removidos logs de depuración para UX limpia

      await request({
        method: 'PUT',
        url: `/products/${product.id}`,
        data: submitData
      });

      // Actualizar stock si se proporcionó
      if (selectedBranchId && (stockData.min_stock || stockData.max_stock)) {
        const stockDataToSend = {
          product_id: product.id,
          branch_id: selectedBranchId,
          min_stock: stockData.min_stock ? parseFloat(stockData.min_stock) : null,
          max_stock: stockData.max_stock ? parseFloat(stockData.max_stock) : null,
        };

        if (currentStock) {
          await request({
            method: 'PUT',
            url: `/stocks/${currentStock.id}`,
            data: stockDataToSend
          });
        } else {
          await request({
            method: 'POST',
            url: '/stocks',
            data: stockDataToSend
          });
        }
      }

      sileo.success({ title: "Producto actualizado correctamente" });
      onProductUpdated();
      onOpenChange(false);

      // Refrescar la entidad
      dispatch({ type: 'SET_ENTITIES', entityType: 'products', entities: [] });

    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error("Error al actualizar producto:", error);

      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        Object.values(errors).flat().forEach((errorMsg: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          sileo.error({ title: errorMsg });
        });
      } else {
        sileo.error({ title: "Error al actualizar el producto" });
      }
    }
  };

  if (!formData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-visible flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar Producto</DialogTitle>
          <DialogDescription>
            Modifica los datos del producto. Los precios se calculan automáticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden pr-1 min-h-0">
        <div className="grid gap-4 py-4">
          {/* Información básica */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="description">Descripción</Label>
              <div className="relative">
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Descripción del producto"
                  className={descriptionError ? 'border-red-500 focus:border-red-500 focus:ring-red-500 focus:ring-2' : ''}
                  style={{ borderColor: descriptionError ? '#ef4444' : undefined }}
                />
                {isCheckingDescription && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                  </div>
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="code">Código</Label>
              <div className="relative">
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value)}
                  placeholder="Código del producto"
                  className={codeError ? 'border-red-500 focus:border-red-500 focus:ring-red-500 focus:ring-2' : ''}
                />
                {isCheckingCode && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <details className="rounded-md border border-dashed border-muted-foreground/25 bg-muted/30 text-muted-foreground">
            <summary className="cursor-pointer list-none px-3 py-2 text-xs outline-none transition-colors hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
              <span className="text-muted-foreground/90">Opcional · venta con balanza y etiqueta</span>
            </summary>
            <div className="border-t border-border/40 px-3 pb-3 pt-2">
              <div className="flex flex-wrap items-end gap-3">
                <div className="grid w-full max-w-[140px] gap-1">
                  <Label htmlFor="scale_plu_edit" className="text-xs font-normal text-muted-foreground">
                    Nº PLU
                  </Label>
                  <Input
                    id="scale_plu_edit"
                    value={formData.scale_plu}
                    onChange={(e) => handleInputChange('scale_plu', e.target.value)}
                    placeholder="Ej. 36"
                    inputMode="numeric"
                    className="h-8 text-sm"
                  />
                </div>
                <p className="min-w-0 flex-1 pb-1 text-[11px] leading-snug text-muted-foreground/85">
                  Coincide con la etiqueta. Precio de venta en $/kg.
                </p>
              </div>
            </div>
          </details>

          {/* Precios */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="unit_price">Precio Unitario</Label>
              <div className="flex gap-2">
                <FormattedNumberInput
                  id="unit_price"
                  formatType="unitPrice"
                  currency={formData.currency}
                  value={formData.unit_price}
                  onChange={(value) => handleInputChange('unit_price', value.toString())}
                  placeholder="0,00"
                />
                <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARS">ARS</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="markup">Markup (%)</Label>
              <div className="relative">
                <Input
                  id="markup"
                  type="number"
                  step="0.01"
                  value={formData.markup}
                  onChange={(e) => handleInputChange('markup', e.target.value)}
                  onBlur={() => editingFieldRef.current = null}
                  onFocus={() => editingFieldRef.current = 'markup'}
                  placeholder="0.00"
                  className="pr-8"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-gray-500 text-sm">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Precio de venta */}
          <div className="grid gap-2">
            <Label htmlFor="sale_price">Precio de Venta</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  id="sale_price"
                  type="text"
                  value={(() => {
                    // Formatear con separador de miles mientras se muestra
                    const numStr = formData.sale_price.toString().replace(/\D/g, '');
                    if (!numStr) return '';
                    return parseInt(numStr, 10).toLocaleString('es-AR');
                  })()}
                  onChange={(e) => {
                    // Remover formato y guardar solo números
                    const rawValue = e.target.value.replace(/\D/g, '');
                    handleInputChange('sale_price', rawValue);
                  }}
                  onFocus={() => {
                    editingFieldRef.current = 'sale_price';
                    prevSalePriceRef.current = formData.sale_price;
                  }}
                  onBlur={() => {
                    editingFieldRef.current = null;
                    // Si el usuario dejó vacío o 0, restaurar el anterior
                    const cleaned = (formData.sale_price || '').trim();
                    if (cleaned === '' || cleaned === '0' || cleaned === '0,00' || cleaned === '0.00') {
                      setFormData(prev => prev && prevSalePriceRef.current !== null
                        ? { ...prev, sale_price: prevSalePriceRef.current! }
                        : prev);
                    }
                    prevSalePriceRef.current = null;
                  }}
                  placeholder="0"
                  className="font-mono pl-7"
                />
              </div>
              {(() => {
                // Mostrar referencia "Calculado" mientras haya cambios y NO se esté editando el campo sale_price
                if (pricing.hasChanged && editingFieldRef.current !== 'sale_price') {
                  const autoCalculated = calculateSalePrice(
                    pricing.unitPrice,
                    pricing.currency,
                    pricing.markup,
                    pricing.ivaRate
                  );
                  return (
                    <div className="text-sm text-muted-foreground flex items-center">
                      Calculado: {formatPrice(autoCalculated)}
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          {/* Información adicional */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="category_id">Categoría</Label>
              <Select value={formData.category_id} onValueChange={(value) => handleInputChange('category_id', value)}>
                <SelectTrigger className="w-full pr-8 overflow-hidden">
                  <div className="min-w-0 truncate">
                    <SelectValue placeholder="Seleccionar categoría" />
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-[200px] overflow-y-auto w-[--radix-select-trigger-width] max-w-full">
                  {categoriesForSelect.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()} className="max-w-full">
                      <div className="truncate overflow-hidden text-ellipsis">
                        {category.display_name || category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <SupplierSearchCombobox
              id="supplier_id"
              label="Proveedor"
              value={formData.supplier_id}
              onValueChange={(value) => handleInputChange('supplier_id', value)}
              suppliers={supplierSearchItems}
              valueLabel={supplierLabelFallback}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="measure_id">Unidad de Medida</Label>
              <Select value={formData.measure_id} onValueChange={(value) => handleInputChange('measure_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar medida" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] overflow-y-auto">
                  {measures.map((measure) => (
                    <SelectItem key={measure.id} value={measure.id.toString()}>
                      {measure.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="iva_id">IVA</Label>
              <Select value={formData.iva_id} onValueChange={(value) => handleInputChange('iva_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar IVA" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] overflow-y-auto">
                  {ivas.map((iva) => (
                    <SelectItem key={iva.id} value={iva.id.toString()}>
                      {iva.rate}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stock */}
          {selectedBranchId && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="min_stock">Stock Mínimo</Label>
                <Input
                  id="min_stock"
                  type="number"
                  value={stockData.min_stock}
                  onChange={(e) => setStockData(prev => ({ ...prev, min_stock: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="max_stock">Stock Máximo</Label>
                <Input
                  id="max_stock"
                  type="number"
                  value={stockData.max_stock}
                  onChange={(e) => setStockData(prev => ({ ...prev, max_stock: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
          )}

          {/* Observaciones */}
          <div className="grid gap-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              value={formData.observaciones}
              onChange={(e) => handleInputChange('observaciones', e.target.value)}
              placeholder="Observaciones adicionales"
              rows={3}
            />
          </div>

          {/* Estados */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="status"
                checked={formData.status === "1"}
                onChange={(e) => handleInputChange('status', e.target.checked ? "1" : "0")}
              />
              <Label htmlFor="status">Activo</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="web"
                checked={formData.web === "1"}
                onChange={(e) => handleInputChange('web', e.target.checked ? "1" : "0")}
              />
              <Label htmlFor="web">Visible en Web</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="allow_discount"
                checked={formData.allow_discount === "1"}
                onChange={(e) => handleInputChange('allow_discount', e.target.checked ? "1" : "0")}
              />
              <Label htmlFor="allow_discount">Permite descuento</Label>
            </div>
          </div>
        </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}