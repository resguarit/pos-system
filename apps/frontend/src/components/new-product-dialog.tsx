import { sileo } from "sileo"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect, useCallback } from "react"
import useApi from "@/hooks/useApi"
import { Textarea } from "@/components/ui/textarea"
import { usePricing } from '@/hooks/usePricing'
import { useExchangeRate } from '@/hooks/useExchangeRate'
import { NumberFormatter } from '@/lib/formatters/numberFormatter'
import FormattedNumberInput from '@/components/ui/formatted-number-input'
import { useBranch } from '@/context/BranchContext'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Info, Trash2 } from 'lucide-react'
import { SupplierSearchCombobox } from '@/components/suppliers/SupplierSearchCombobox'

interface NewProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Category { 
  id: number; 
  name: string; 
  display_name?: string;
  type?: string;
  parent_id?: number;
}
interface Measure { id: number; name: string; }
interface Supplier {
  id: number;
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  cuit?: string | null;
}
interface Iva { id: number; rate: number; }

function catalogResponseToArray(res: unknown): unknown[] {
  if (Array.isArray(res)) return res;
  if (res !== null && typeof res === 'object') {
    const o = res as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data;
    const nested = o.data;
    if (nested !== null && typeof nested === 'object' && 'data' in nested) {
      const inner = (nested as Record<string, unknown>).data;
      if (Array.isArray(inner)) return inner;
    }
  }
  return [];
}

type ProductFormData = {
  code: string;
  description: string;
  unit_price: string;
  currency: 'USD' | 'ARS';
  markup: string;
  sale_price: string;
  category_id: string;
  measure_id: string;
  supplier_id: string;
  iva_id: string;
  observaciones: string;
  status: string;
  web: string;
  allow_discount: string;
};

export function NewProductDialog({ open, onOpenChange, onSuccess }: NewProductDialogProps) {
  const { selectedBranch, branches } = useBranch();
  
  const [formData, setFormData] = useState<ProductFormData>({
    code: "",
    description: "",
    unit_price: "",
    currency: "ARS",
    markup: "",
    sale_price: "",
    category_id: "",
        measure_id: "none",
    supplier_id: "",
    iva_id: "",
    observaciones: "",
    status: "1", 
    web: "1",
    allow_discount: "1"
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [measures, setMeasures] = useState<Measure[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [ivas, setIvas] = useState<Iva[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [minStock, setMinStock] = useState<string>("0");
  const [maxStock, setMaxStock] = useState<string>("0");
  const [codeError, setCodeError] = useState<string>("");
  const [isCheckingCode, setIsCheckingCode] = useState<boolean>(false);
  const [descriptionError, setDescriptionError] = useState<string>("");
  const [isCheckingDescription, setIsCheckingDescription] = useState<boolean>(false);
  const [codeTimeoutId, setCodeTimeoutId] = useState<number | null>(null);
  const [descriptionTimeoutId, setDescriptionTimeoutId] = useState<number | null>(null);
  const [isManualPrice, setIsManualPrice] = useState(false);

  const { request, loading } = useApi();

  const fetchCatalogs = useCallback(async () => {
    try {
      const [categoriesRes, measuresRes, suppliersRes, ivasRes] = await Promise.all([
        request({ method: 'GET', url: '/categories/for-selector' }),
        request({ method: 'GET', url: '/measures' }),
        request({ method: 'GET', url: '/suppliers?per_page=10000' }),
        request({ method: 'GET', url: '/ivas' }),
      ]);

      const categoriesArr = catalogResponseToArray(categoriesRes) as Category[];
      const measuresArr = catalogResponseToArray(measuresRes) as Measure[];
      const suppliersArr = catalogResponseToArray(suppliersRes) as Supplier[];
      const ivasArray = catalogResponseToArray(ivasRes) as Iva[];

      setCategories(categoriesArr);
      setMeasures(measuresArr);
      setSuppliers(suppliersArr);
      setIvas(ivasArray);

      setFormData((prev) => {
        if (!prev.iva_id && ivasArray.length > 0) {
          const zeroIva = ivasArray.find((iva) => iva.rate === 0);
          if (zeroIva) return { ...prev, iva_id: zeroIva.id.toString() };
        }
        return prev;
      });
    } catch (err) {
      console.error("Error loading catalogs:", err);
      sileo.error({ title: "Error al cargar datos necesarios." });
    }
  }, [request]);

  // Key para localStorage
  const STORAGE_KEY = 'newProductDialog_formData';
  const { rate: exchangeRate } = useExchangeRate({ fromCurrency: 'USD', toCurrency: 'ARS' });

  // Funciones para localStorage
  const saveToStorage = useCallback((data: ProductFormData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        formData: data,
        selectedBranches,
        minStock,
        maxStock,
        isManualPrice,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Error guardando en localStorage:', error);
    }
  }, [selectedBranches, minStock, maxStock, isManualPrice]);

  const loadFromStorage = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Solo restaurar si no ha pasado más de 24 horas
        if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          return parsed;
        }
      }
    } catch (error) {
      console.warn('Error cargando desde localStorage:', error);
    }
    return null;
  };

  const clearStorage = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Error limpiando localStorage:', error);
    }
  };

  // Hook de precios solo para formateo
  const {
    formatPrice
  } = usePricing();

  // Funciones de cálculo locales
  const convertToARS = (amount: number, currency: string): number => {
    if (currency === 'USD' && exchangeRate && exchangeRate > 0) {
      return amount * exchangeRate;
    }
    return amount;
  };

  const calculateSalePrice = (unitPrice: number, currency: string, markup: number, ivaRate: number): number => {
    if (!unitPrice || unitPrice <= 0) return 0;
    
    const costInArs = convertToARS(unitPrice, currency);
    const costWithIva = costInArs * (1 + ivaRate);
    const priceWithMarkup = costWithIva * (1 + markup);
    
    // Redondear de manera inteligente
    const finalPrice = priceWithMarkup < 1000 
      ? Math.round(priceWithMarkup / 10) * 10
      : Math.round(priceWithMarkup / 100) * 100;
    
    return finalPrice;
  };

  const calculateMarkup = (unitPrice: number, currency: string, salePrice: number, ivaRate: number): number => {
    if (!unitPrice || unitPrice <= 0 || !salePrice || salePrice <= 0) return 0;
    
    const costInArs = convertToARS(unitPrice, currency);
    
    // Validar que el costo sea válido
    if (!costInArs || costInArs <= 0 || !isFinite(costInArs)) {
      return 0;
    }
    
    const priceWithoutIva = salePrice / (1 + ivaRate);
    
    // Validar que el precio sin IVA sea válido
    if (!priceWithoutIva || priceWithoutIva <= 0 || !isFinite(priceWithoutIva)) {
      return 0;
    }
    
    const markup = (priceWithoutIva / costInArs) - 1;
    
    // Asegurar que el markup nunca sea negativo (mínimo 0%)
    const safeMarkup = markup < 0 ? 0 : markup;
    
    return Math.round(safeMarkup * 10000) / 10000;
  };

  const getCurrentIvaRate = (): number => {
    if (formData.iva_id && ivas.length > 0) {
      const selectedIva = ivas.find(iva => iva.id.toString() === formData.iva_id);
      return selectedIva ? selectedIva.rate / 100 : 0;
    }
    return 0;
  };

  const validatePricing = (): boolean => {
    const unitPrice = NumberFormatter.parseFormattedNumber(formData.unit_price || '0');
    const salePrice = NumberFormatter.parseFormattedNumber(formData.sale_price || '0');
    const markup = NumberFormatter.parseFormattedNumber(formData.markup || '0');
    
    // Validar que el precio unitario sea mayor a 0
    if (unitPrice <= 0) {
      return false;
    }
    
    // Validar que el precio de venta sea mayor a 0
    if (salePrice <= 0) {
      return false;
    }
    
    // Validar que el markup no sea menor a -100% (no puede ser negativo más de 100%)
    if (markup < -100) {
      return false;
    }
    
    return true;
  };

  useEffect(() => {
    if (!open) return;

    void fetchCatalogs();

    const savedData = loadFromStorage();

    if (savedData) {
      setFormData(savedData.formData);
      setSelectedBranches(savedData.selectedBranches || []);
      setMinStock(savedData.minStock || "0");
      setMaxStock(savedData.maxStock || "0");
      setIsManualPrice(savedData.isManualPrice || false);

      sileo.info({ title: "Datos restaurados automáticamente",
        description: "Se han cargado los datos que tenías anteriormente"
      });
    } else {
      setIsManualPrice(false);
      setFormData({
        code: "",
        description: "",
        unit_price: "",
        currency: "ARS",
        markup: "",
        sale_price: "",
        category_id: "",
        measure_id: "none",
        supplier_id: "",
        iva_id: "",
        observaciones: "",
        status: "1",
        web: "1",
        allow_discount: "1"
      });

      setSelectedBranches([]);
      setMinStock("0");
      setMaxStock("0");
    }

    setCodeError("");
    setIsCheckingCode(false);
    setDescriptionError("");
    setIsCheckingDescription(false);
  }, [open, branches, selectedBranch, fetchCatalogs]);

  useEffect(() => {
    if (!open) {
      if (!formData.description && !formData.code && !formData.unit_price) {
        clearStorage();
      }
    }
  }, [open, formData.description, formData.code, formData.unit_price]);

  // Guardar automáticamente los datos cuando cambien (solo si el diálogo está abierto)
  useEffect(() => {
    if (open && (formData.description || formData.code || formData.unit_price || formData.sale_price)) {
      const timeoutId = setTimeout(() => {
        saveToStorage(formData);
      }, 1000); // Debounce de 1 segundo

      return () => clearTimeout(timeoutId);
    }
  }, [open, formData, selectedBranches, minStock, maxStock, isManualPrice, saveToStorage]);

  // Limpiar timeouts al desmontar el componente
  useEffect(() => {
    return () => {
      if (codeTimeoutId) {
        clearTimeout(codeTimeoutId);
      }
      if (descriptionTimeoutId) {
        clearTimeout(descriptionTimeoutId);
      }
    };
  }, [codeTimeoutId, descriptionTimeoutId]);

  // Función para verificar si el código ya existe
  const checkCodeExists = async (code: string) => {
    if (!code.trim()) {
      setCodeError("");
      return;
    }

    setIsCheckingCode(true);
    try {
      const response = await request({
        method: 'GET',
        url: `/products/check-code/${encodeURIComponent(code)}`
      });
      
      if (response.exists) {
        setCodeError("Este código ya está en uso");
        sileo.error({ title: "Este código ya está en uso",
          description: "Por favor, elige un código diferente para el producto."
        });
      } else {
        setCodeError("");
      }
    } catch (error) {
      console.error("Error checking code:", error);
      setCodeError("");
    } finally {
      setIsCheckingCode(false);
    }
  };

  // Función para verificar si la descripción ya existe
  const checkDescriptionExists = async (description: string) => {
    if (!description.trim()) {
      setDescriptionError("");
      return;
    }

    setIsCheckingDescription(true);
    try {
      const response = await request({
        method: 'GET',
        url: `/products/check-description/${encodeURIComponent(description)}`
      });
      
      if (response.exists) {
        setDescriptionError("Esta descripción ya está en uso");
        sileo.error({ title: "Esta descripción ya está en uso",
          description: "Por favor, elige una descripción diferente para el producto."
        });
      } else {
        setDescriptionError("");
      }
    } catch (error) {
      console.error("Error checking description:", error);
      setDescriptionError("");
    } finally {
      setIsCheckingDescription(false);
    }
  };

  const handleInputChange = (field: keyof ProductFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Validar código en tiempo real
    if (field === 'code') {
      // Limpiar error anterior
      setCodeError("");
      // Limpiar timeout anterior si existe
      if (codeTimeoutId) {
        clearTimeout(codeTimeoutId);
      }
      // Verificar después de un pequeño delay para evitar muchas requests
      const newTimeoutId = setTimeout(() => {
        checkCodeExists(value);
      }, 500);
      setCodeTimeoutId(newTimeoutId);
    }

    // Validar descripción en tiempo real
    if (field === 'description') {
      // Limpiar error anterior
      setDescriptionError("");
      // Limpiar timeout anterior si existe
      if (descriptionTimeoutId) {
        clearTimeout(descriptionTimeoutId);
      }
      // Verificar después de un pequeño delay para evitar muchas requests
      const newTimeoutId = setTimeout(() => {
        checkDescriptionExists(value);
      }, 500);
      setDescriptionTimeoutId(newTimeoutId);
    }

    // Manejar cambios específicos para precios con lógica inteligente
    if (field === 'unit_price') {
      const numValue = NumberFormatter.parseFormattedNumber(value) || 0;
      
      // Si hay un precio de venta manual, recalcular el markup
      if (isManualPrice && formData.sale_price) {
        const salePrice = NumberFormatter.parseFormattedNumber(formData.sale_price) || 0;
        const currentIvaRate = getCurrentIvaRate();
        const newMarkup = calculateMarkup(numValue, formData.currency, salePrice, currentIvaRate);
        
        setFormData(prev => ({
          ...prev,
          [field]: value,
          markup: (newMarkup * 100).toFixed(2) // Convertir a porcentaje
        }));
      } else {
        // Caso normal: recalcular precio de venta
        const currentMarkup = NumberFormatter.parseFormattedNumber(formData.markup) / 100 || 0;
        const currentIvaRate = getCurrentIvaRate();
        const newSalePrice = calculateSalePrice(numValue, formData.currency, currentMarkup, currentIvaRate);
        
        setFormData(prev => ({
          ...prev,
          [field]: value,
          sale_price: newSalePrice > 0 ? newSalePrice.toString() : ''
        }));
        setIsManualPrice(false);
      }
    } else if (field === 'markup') {
      // Siempre recalcular precio de venta cuando se cambia markup
      const numValue = NumberFormatter.parseFormattedNumber(value) || 0;
      const unitPrice = NumberFormatter.parseFormattedNumber(formData.unit_price) || 0;
      const currentIvaRate = getCurrentIvaRate();
      const newSalePrice = calculateSalePrice(unitPrice, formData.currency, numValue / 100, currentIvaRate);
      
      setFormData(prev => ({
        ...prev,
        [field]: value,
        sale_price: newSalePrice > 0 ? newSalePrice.toString() : ''
      }));
      setIsManualPrice(false);
    } else if (field === 'sale_price') {
      // Precio manual: recalcular markup
      const numValue = NumberFormatter.parseFormattedNumber(value) || 0;
      const unitPrice = NumberFormatter.parseFormattedNumber(formData.unit_price) || 0;
      const currentIvaRate = getCurrentIvaRate();
      
      if (unitPrice > 0) {
        const newMarkup = calculateMarkup(unitPrice, formData.currency, numValue, currentIvaRate);
        setFormData(prev => ({
          ...prev,
          [field]: value,
          markup: (newMarkup * 100).toFixed(2)
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [field]: value
        }));
      }
      
      setIsManualPrice(true);
    } else if (field === 'currency') {
      // Recalcular precios cuando cambia la moneda
      const unitPrice = NumberFormatter.parseFormattedNumber(formData.unit_price) || 0;
      const currentIvaRate = getCurrentIvaRate();
      
      if (isManualPrice && formData.sale_price) {
        // Si hay precio manual, recalcular markup con nueva moneda
        const salePrice = NumberFormatter.parseFormattedNumber(formData.sale_price) || 0;
        const newMarkup = calculateMarkup(unitPrice, value, salePrice, currentIvaRate);
        setFormData(prev => ({
          ...prev,
          currency: value as 'USD' | 'ARS',
          markup: (newMarkup * 100).toFixed(2)
        }));
      } else {
        // Recalcular precio de venta con nueva moneda
        const currentMarkup = NumberFormatter.parseFormattedNumber(formData.markup) / 100 || 0;
        const newSalePrice = calculateSalePrice(unitPrice, value, currentMarkup, currentIvaRate);
        setFormData(prev => ({
          ...prev,
          currency: value as 'USD' | 'ARS',
          sale_price: newSalePrice > 0 ? newSalePrice.toString() : ''
        }));
      }
    } else if (field === 'iva_id') {
      const selectedIva = ivas.find(iva => iva.id.toString() === value);
      if (selectedIva) {
        const unitPrice = NumberFormatter.parseFormattedNumber(formData.unit_price) || 0;
        const newIvaRate = selectedIva.rate / 100;
        
        if (isManualPrice && formData.sale_price) {
          // Si hay precio manual, recalcular markup con nuevo IVA
          const salePrice = NumberFormatter.parseFormattedNumber(formData.sale_price) || 0;
          const newMarkup = calculateMarkup(unitPrice, formData.currency, salePrice, newIvaRate);
          setFormData(prev => ({
            ...prev,
            [field]: value,
            markup: (newMarkup * 100).toFixed(2)
          }));
        } else {
          // Recalcular precio de venta con nuevo IVA
          const currentMarkup = parseFloat(formData.markup) / 100 || 0;
          const newSalePrice = calculateSalePrice(unitPrice, formData.currency, currentMarkup, newIvaRate);
          setFormData(prev => ({
            ...prev,
            [field]: value,
            sale_price: newSalePrice > 0 ? newSalePrice.toString() : ''
          }));
        }
      }
    }
  };

  const handleSubmit = async () => {
    // Validación de campos obligatorios
    const requiredFields = {
      description: 'Descripción',
      code: 'Código',
      unit_price: 'Precio Unitario',
      category_id: 'Categoría',
      supplier_id: 'Proveedor',
      iva_id: 'IVA'
    };

    // Si no se selecciona ninguna sucursal, se creará stock en todas las sucursales automáticamente
    
    // Validar código duplicado
    if (codeError) {
      sileo.error({ title: 'El código del producto ya está en uso' });
      return;
    }
    
    // Validar descripción duplicada
    if (descriptionError) {
      sileo.error({ title: 'La descripción del producto ya está en uso' });
      return;
    }
    
    // Verificar código una vez más antes de enviar
    if (formData.code.trim()) {
      try {
        const response = await request({
          method: 'GET',
          url: `/products/check-code/${encodeURIComponent(formData.code)}`
        });
        
        if (response.exists) {
          sileo.error({ title: 'El código del producto ya está en uso' });
          return;
        }
      } catch (error) {
        console.error("Error checking code:", error);
      }
    }
    
    // Verificar descripción una vez más antes de enviar
    if (formData.description.trim()) {
      try {
        const response = await request({
          method: 'GET',
          url: `/products/check-description/${encodeURIComponent(formData.description)}`
        });
        
        if (response.exists) {
          sileo.error({ title: 'La descripción del producto ya está en uso' });
          return;
        }
      } catch (error) {
        console.error("Error checking description:", error);
      }
    }
    
    // Validar stock mínimo y máximo
    const min = Number(minStock);
    const max = Number(maxStock);
    
    if (min < 0) {
      sileo.error({ title: 'El stock mínimo debe ser 0 o mayor' });
      return;
    }
    
    if (max <= 0) {
      sileo.error({ title: 'El stock máximo debe ser mayor que 0' });
      return;
    }
    
    if (max <= min) {
      sileo.error({ title: 'El stock máximo debe ser mayor que el stock mínimo' });
      return;
    }

    const missingFields = Object.entries(requiredFields)
      .filter(([key]) => !formData[key as keyof ProductFormData])
      .map(([, label]) => label);

    if (missingFields.length > 0) {
      sileo.error({ title: `Faltan campos obligatorios: ${missingFields.join(', ')}` });
      return;
    }

    // Validar precios
    if (!validatePricing()) {
      sileo.error({ title: "Error en los parámetros de precios. Verifique que los valores sean válidos." });
      return;
    }

    try {
      const salePriceToSend = NumberFormatter.parseFormattedNumber(formData.sale_price || '0');
      const markupToSend = NumberFormatter.parseFormattedNumber(formData.markup || '0') / 100;

      await request({
        method: 'POST',
        url: '/products',
        data: {
          description: formData.description,
          code: formData.code,
          unit_price: NumberFormatter.parseFormattedNumber(formData.unit_price || '0'),
          currency: formData.currency,
          markup: markupToSend, // Usar el markup calculado localmente
          sale_price: salePriceToSend, // Usar el precio manual del usuario, o el calculado si no hay manual
          category_id: parseInt(formData.category_id),
          measure_id: formData.measure_id && formData.measure_id !== 'none' ? parseInt(formData.measure_id) : null, // Permitir null
          supplier_id: parseInt(formData.supplier_id),
          iva_id: parseInt(formData.iva_id),
          observaciones: formData.observaciones || null,
          status: parseInt(formData.status),
          web: parseInt(formData.web),
          allow_discount: parseInt(formData.allow_discount),
          // Si hay sucursales seleccionadas, enviarlas; si no, no enviar branch_ids
          // para que el backend cree stock en todas las sucursales activas
          ...(selectedBranches.length > 0 ? { branch_ids: selectedBranches.map(id => parseInt(id)) } : {}),
          min_stock: Number(minStock),
          max_stock: Number(maxStock),
        }
      });

      sileo.success({ title: "Producto creado correctamente",
        description: selectedBranches.length > 0 
          ? `Stock inicial creado en ${selectedBranches.length} sucursal${selectedBranches.length > 1 ? 'es' : ''}`
          : "Stock inicial creado en todas las sucursales activas"
      });
      
      // Limpiar localStorage después del envío exitoso
      clearStorage();
      
      onSuccess();
      onOpenChange(false);

    } catch (error: unknown) {
      console.error("Error al guardar el producto:", error);

      const ax = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } })
        : undefined;

      if (ax?.response?.data?.errors) {
        const errors = ax.response.data.errors;
        (Object.values(errors).flat() as string[]).forEach((errorMsg) => {
          sileo.error({ title: errorMsg });
        });
      } else {
        sileo.error({
          title: "Error al crear producto",
          description: ax?.response?.data?.message || "Ocurrió un error.",
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-visible flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Nuevo Producto</DialogTitle>
            {loadFromStorage() && (
              <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                📄 Datos guardados automáticamente
              </div>
            )}
          </div>
          <DialogDescription>
            Complete los datos del nuevo producto. Los precios se calcularán automáticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden pr-1 min-h-0">
        <div className="grid gap-4 py-4">
          {/* Información básica */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="description">Descripción <span className="text-red-500">*</span></Label>
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
              <Label htmlFor="code">Código <span className="text-red-500">*</span></Label>
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

          {/* Precios */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="unit_price">Precio Unitario <span className="text-red-500">*</span></Label>
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
                  placeholder="0.00"
                  className="pr-8"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-gray-500 text-sm">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Precio de venta calculado */}
          <div className="grid gap-2">
            <Label htmlFor="sale_price">Precio de Venta</Label>
            <div className="flex gap-2">
              <FormattedNumberInput
                id="sale_price"
                formatType="salePrice"
                currency="ARS"
                value={formData.sale_price}
                onChange={(value) => handleInputChange('sale_price', value.toString())}
                placeholder="Ingrese precio manual o se calculará automáticamente"
                className="font-mono"
              />
              {(() => {
                const unitPrice = NumberFormatter.parseFormattedNumber(formData.unit_price || '0');
                const markupParsed = parseFloat(formData.markup || '0');
                const markup = markupParsed / 100;
                const ivaRate = getCurrentIvaRate();
                
                const autoPrice = calculateSalePrice(unitPrice, formData.currency, markup, ivaRate);
                
                if (autoPrice > 0) {
                  return (
                    <div className="text-sm text-muted-foreground flex items-center">
                      Calculado: {formatPrice(autoPrice)}
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
              <Label htmlFor="category_id">Categoría <span className="text-red-500">*</span></Label>
              <Select value={formData.category_id} onValueChange={(value) => handleInputChange('category_id', value)}>
                <SelectTrigger className="w-full pr-8 overflow-hidden">
                  <div className="min-w-0 truncate">
                    <SelectValue placeholder="Seleccionar categoría" />
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-[200px] overflow-y-auto w-[--radix-select-trigger-width] max-w-full">
                  {categories.map((category) => (
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
              label={<>Proveedor <span className="text-red-500">*</span></>}
              value={formData.supplier_id}
              onValueChange={(value) => handleInputChange('supplier_id', value)}
              suppliers={suppliers.map((s) => ({
                id: s.id,
                name: s.name,
                contact_name: s.contact_name,
                phone: s.phone,
                email: s.email,
                cuit: s.cuit,
              }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="measure_id">Unidad de Medida</Label>
              <Select value={formData.measure_id} onValueChange={(value) => handleInputChange('measure_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin especificar" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] overflow-y-auto">
                  <SelectItem value="none">Sin especificar</SelectItem>
                  {measures.map((measure) => (
                    <SelectItem key={measure.id} value={measure.id.toString()}>
                      {measure.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="iva_id">IVA <span className="text-red-500">*</span></Label>
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

          {/* Sucursales */}
          {branches.length > 0 && (
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Sucursales para crear stock inicial</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedBranches.length === branches.length) {
                      // Si todas están seleccionadas, deseleccionar todas
                      setSelectedBranches([]);
                    } else {
                      // Si no todas están seleccionadas, seleccionar todas
                      setSelectedBranches(branches.map(b => String(b.id)));
                    }
                  }}
                >
                  {selectedBranches.length === branches.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
                {branches.map((branch) => (
                  <div key={branch.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`branch-${branch.id}`}
                      checked={selectedBranches.includes(String(branch.id))}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedBranches(prev => [...prev, String(branch.id)]);
                        } else {
                          setSelectedBranches(prev => prev.filter(id => id !== String(branch.id)));
                        }
                      }}
                    />
                    <Label htmlFor={`branch-${branch.id}`} className="text-sm">
                      {branch.description}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                <Info className="h-3 w-3" />
                Si no selecciona ninguna, se creará stock en todas las sucursales activas
              </p>
            </div>
          )}

          {/* Stock mínimo y máximo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="minStock">Stock Mínimo <span className="text-red-500">*</span></Label>
              <Input
                id="minStock"
                type="number"
                min="0"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="maxStock">Stock Máximo <span className="text-red-500">*</span></Label>
              <Input
                id="maxStock"
                type="number"
                min="1"
                value={maxStock}
                onChange={(e) => setMaxStock(e.target.value)}
                placeholder="100"
              />
            </div>
          </div>

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

        <DialogFooter className="gap-2">
          <div className="flex gap-2">
            {loadFromStorage() && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  clearStorage();
                  sileo.info({ title: "Datos guardados eliminados" });
                  // Recargar el diálogo
                  onOpenChange(false);
                  setTimeout(() => onOpenChange(true), 100);
                }}
                disabled={loading}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Limpiar guardado
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Producto'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}