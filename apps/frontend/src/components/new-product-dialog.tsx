import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"
import useApi from "@/hooks/useApi"
import { Textarea } from "@/components/ui/textarea"
import { usePricing } from '@/hooks/usePricing'
import FormattedNumberInput from '@/components/ui/formatted-number-input'
import { useBranch } from '@/context/BranchContext'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'

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
interface Supplier { id: number; name: string; }
interface Iva { id: number; rate: number; }

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
    web: "1"     
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

  const { request, loading } = useApi();

  // Hook de precios con valores por defecto para nuevo producto
  const {
    pricing,
    updateUnitPrice,
    updateMarkup,
    updateSalePrice,
    updateCurrency,
    updateIvaRate,
    validatePricing,
    formatPrice
  } = usePricing({
    unitPrice: 0,
    currency: 'ARS',
    markup: 0,
    ivaRate: 0.21, // IVA por defecto 21%
    initialSalePrice: 0
  });

  useEffect(() => {
    if (open) {
      fetchCatalogs();
      // Reset form
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
        web: "1"
      });
      
      // Inicializar sucursales seleccionadas
      if (branches.length === 1) {
        // Si hay una sola sucursal, seleccionarla automáticamente
        setSelectedBranches([String(branches[0].id)]);
      } else {
        // Si hay múltiples sucursales, no seleccionar ninguna por defecto
        // El usuario debe elegir explícitamente
        setSelectedBranches([]);
      }
      
      // Resetear stock min/max
      setMinStock("0");
      setMaxStock("0");
      
      // Resetear validación de código y descripción
      setCodeError("");
      setIsCheckingCode(false);
      setDescriptionError("");
      setIsCheckingDescription(false);
    }
  }, [open, branches, selectedBranch]);

  // Sincronizar valores del formulario con el hook de precios
  useEffect(() => {
    if (formData.unit_price && !isNaN(parseFloat(formData.unit_price))) {
      updateUnitPrice(parseFloat(formData.unit_price));
    }
  }, [formData.unit_price, updateUnitPrice]);

  useEffect(() => {
    updateCurrency(formData.currency);
  }, [formData.currency, updateCurrency]);

  useEffect(() => {
    if (formData.markup && !isNaN(parseFloat(formData.markup))) {
      updateMarkup(parseFloat(formData.markup) / 100);
    }
  }, [formData.markup, updateMarkup]);

  // Sincronizar IVA seleccionado con el hook de precios
  useEffect(() => {
    if (formData.iva_id && ivas.length > 0) {
      const selectedIva = ivas.find(iva => iva.id.toString() === formData.iva_id);
      if (selectedIva) {
        updateIvaRate(selectedIva.rate / 100);
      }
    }
  }, [formData.iva_id, ivas, updateIvaRate]);

  // Solo sincronizar el sale_price calculado cuando no hay valor manual
  useEffect(() => {
    if (pricing.salePrice && pricing.salePrice > 0 && !formData.sale_price) {
      setFormData(prev => ({
        ...prev,
        sale_price: pricing.salePrice.toString()
      }));
    }
  }, [pricing.salePrice, formData.sale_price]);

  const fetchCatalogs = async () => {
    try {
      const [categoriesRes, measuresRes, suppliersRes, ivasRes] = await Promise.all([
        request({ method: 'GET', url: '/categories/for-selector' }),
        request({ method: 'GET', url: '/measures' }),
        request({ method: 'GET', url: '/suppliers?per_page=10000' }), // Obtener todos los proveedores
        request({ method: 'GET', url: '/ivas' })
      ]);
      
      const getArray = (res: any) => Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];

      setCategories(getArray(categoriesRes));
      setMeasures(getArray(measuresRes));
      setSuppliers(getArray(suppliersRes));
      setIvas(getArray(ivasRes));
    } catch (err) {
      console.error("Error loading catalogs:", err);
      toast.error("Error al cargar datos necesarios.");
    }
  };

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
        toast.error("Este código ya está en uso", {
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
        toast.error("Esta descripción ya está en uso", {
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

    // Manejar cambios específicos para precios
    if (field === 'unit_price') {
      const numValue = parseFloat(value) || 0;
      updateUnitPrice(numValue);
    } else if (field === 'markup') {
      const numValue = parseFloat(value) || 0;
      updateMarkup(numValue / 100); // Convertir porcentaje a decimal
    } else if (field === 'sale_price') {
      const numValue = parseFloat(value) || 0;
      updateSalePrice(numValue);
      // El hook usePricing se encarga de recalcular el markup automáticamente
    } else if (field === 'currency') {
      updateCurrency(value as 'USD' | 'ARS');
    } else if (field === 'iva_id') {
      const selectedIva = ivas.find(iva => iva.id.toString() === value);
      if (selectedIva) {
        updateIvaRate(selectedIva.rate / 100);
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

    // Validar que se seleccionó al menos una sucursal
    if (selectedBranches.length === 0) {
      toast.error('Debes seleccionar al menos una sucursal para crear el stock inicial');
      return;
    }
    
    // Validar código duplicado
    if (codeError) {
      toast.error('El código del producto ya está en uso');
      return;
    }
    
    // Validar descripción duplicada
    if (descriptionError) {
      toast.error('La descripción del producto ya está en uso');
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
          toast.error('El código del producto ya está en uso');
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
          toast.error('La descripción del producto ya está en uso');
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
      toast.error('El stock mínimo debe ser 0 o mayor');
      return;
    }
    
    if (max <= 0) {
      toast.error('El stock máximo debe ser mayor que 0');
      return;
    }
    
    if (max <= min) {
      toast.error('El stock máximo debe ser mayor que el stock mínimo');
      return;
    }

    const missingFields = Object.entries(requiredFields)
      .filter(([key]) => !formData[key as keyof ProductFormData])
      .map(([, label]) => label);

    if (missingFields.length > 0) {
      toast.error(`Faltan campos obligatorios: ${missingFields.join(', ')}`);
      return;
    }

    // Validar precios con el hook
    if (!validatePricing()) {
      toast.error("Error en los parámetros de precios. Verifique que los valores sean válidos.");
      return;
    }

    try {
      await request({
        method: 'POST',
        url: '/products',
        data: {
          description: formData.description,
          code: formData.code,
          unit_price: parseFloat(formData.unit_price),
          currency: formData.currency,
          markup: pricing.markup, // Usar el markup del hook (en decimal)
          sale_price: pricing.salePrice, // Usar el precio calculado
          category_id: parseInt(formData.category_id),
          measure_id: formData.measure_id && formData.measure_id !== 'none' ? parseInt(formData.measure_id) : null, // Permitir null
          supplier_id: parseInt(formData.supplier_id),
          iva_id: parseInt(formData.iva_id),
          observaciones: formData.observaciones || null,
          status: parseInt(formData.status),
          web: parseInt(formData.web),
          branch_ids: selectedBranches.map(id => parseInt(id)), // Enviar sucursales seleccionadas
          min_stock: Number(minStock),
          max_stock: Number(maxStock),
        }
      });

      toast.success("Producto creado correctamente", {
        description: selectedBranches.length > 0 
          ? `Stock inicial creado en ${selectedBranches.length} sucursal${selectedBranches.length > 1 ? 'es' : ''}`
          : "Producto creado sin stock inicial"
      });
      onSuccess();
      onOpenChange(false);

    } catch (error: any) {
      console.error("Error al guardar el producto:", error);
      
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        Object.values(errors).flat().forEach((errorMsg: any) => {
          toast.error(errorMsg);
        });
      } else {
        toast.error("Error al crear producto", {
          description: error?.response?.data?.message || "Ocurrió un error.",
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Producto</DialogTitle>
          <DialogDescription>
            Complete los datos del nuevo producto. Los precios se calcularán automáticamente.
          </DialogDescription>
        </DialogHeader>

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
              <Label htmlFor="markup">Markup</Label>
              <Input
                id="markup"
                type="number"
                step="0.01"
                value={formData.markup}
                onChange={(e) => handleInputChange('markup', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Precio de venta calculado */}
          <div className="grid gap-2">
            <Label htmlFor="sale_price">Precio de Venta</Label>
            <div className="flex gap-2">
              <FormattedNumberInput
                id="sale_price"
                formatType="salePrice"
                currency={formData.currency}
                value={formData.sale_price}
                onChange={(value) => handleInputChange('sale_price', value.toString())}
                placeholder="0,00"
                className="font-mono"
              />
              <div className="text-sm text-muted-foreground flex items-center">
                Calculado: {formatPrice(pricing.salePrice)}
              </div>
            </div>
          </div>

          {/* Información adicional */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="category_id">Categoría <span className="text-red-500">*</span></Label>
              <Select value={formData.category_id} onValueChange={(value) => handleInputChange('category_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] overflow-y-auto">
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.display_name || category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="supplier_id">Proveedor <span className="text-red-500">*</span></Label>
              <Select value={formData.supplier_id} onValueChange={(value) => handleInputChange('supplier_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] overflow-y-auto">
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          {branches.length > 1 && (
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Sucursales para crear stock inicial <span className="text-red-500">*</span></Label>
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
              <p className="text-xs text-muted-foreground">
                Se creará stock inicial (0 unidades) en las sucursales seleccionadas. 
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
          <div className="grid grid-cols-2 gap-4">
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
          </div>
        </div>

        <DialogFooter>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}