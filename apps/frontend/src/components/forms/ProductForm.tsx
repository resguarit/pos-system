import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import { apiUrl } from "@/lib/api/config";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { SubmitButton } from "@/components/ui/submit-button";
import { toast } from "sonner";

interface ProductFormProps {
  product?: Product;
  onSuccess?: () => void;
}

interface Product {
  id?: string;
  description: string;
  code: string;
  measure_id: string;
  unit_price: number;
  currency: 'ARS' | 'USD';
  markup: number;
  category_id: string;
  iva_id: string;
  supplier_id: string;
  status: boolean;
  web: boolean;
  observaciones?: string;
  image_id?: string;
}

interface Category {
  id: string;
  name: string;
  parent_id?: string | null;
  parent?: {
    id: string;
    name: string;
  };
  children?: Category[];
}

interface Measure {
  id: string;
  name: string;
}

interface Iva {
  id: string;
  rate: number;
}

interface Supplier {
  id: string;
  business_name: string;
}

export function ProductForm({ product, onSuccess }: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [parentCategories, setParentCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [selectedParentCategory, setSelectedParentCategory] = useState<string>("");
  const [measures, setMeasures] = useState<Measure[]>([]);
  const [ivas, setIvas] = useState<Iva[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [salePrice, setSalePrice] = useState<number | null>(null);
  const [salePriceARS, setSalePriceARS] = useState<number | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(1000); // Default USD to ARS rate

  // Helper functions to convert between UI format and backend format
  const statusToString = (status: boolean): string => status ? "active" : "inactive";
  const stringToStatus = (status: string): boolean => status === "active";

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<Product>({
    defaultValues: product || {
      description: "",
      code: "",
      measure_id: "",
      unit_price: 0,
      currency: "ARS",
      markup: 0,
      category_id: "",
      iva_id: "",
      supplier_id: "",
      status: true, // Default to active (true)
      web: false,
      observaciones: "",
    },
  });

  const unitPrice = watch("unit_price");
  const markup = watch("markup");
  const currency = watch("currency");

  // Función para cargar subcategorías por categoría padre
  const fetchSubcategories = async (parentId: string) => {
    try {
      const response = await axios.get(`${apiUrl}/categories/subcategories/${parentId}`);
      setSubcategories(response.data?.data || []);
    } catch (error) {
      console.error("Error fetching subcategories:", error);
      setSubcategories([]);
    }
  };

  // Función para cargar la tasa de cambio USD a ARS
  const fetchExchangeRate = async () => {
    try {
      const response = await axios.get(`${apiUrl}/exchange-rates/current?from_currency=USD&to_currency=ARS`);
      if (response.data?.success && response.data?.data?.rate) {
        setExchangeRate(response.data.data.rate);
      }
    } catch (error) {
      console.error("Error fetching exchange rate:", error);
      // Mantener tasa por defecto
    }
  };

  useEffect(() => {
    if (unitPrice && markup) {
      // Usar la misma lógica que el backend: costo * (1 + iva) * (1 + markup)
      let costInArs = unitPrice;

      // 1. Convertir USD a ARS si es necesario
      if (currency === 'USD' && exchangeRate) {
        costInArs = unitPrice * exchangeRate;
      }

      // 2. Aplicar IVA primero (si hay IVA seleccionado)
      let costWithIva = costInArs;
      if (selectedIva && selectedIva.rate > 0) {
        costWithIva = costInArs * (1 + selectedIva.rate / 100);
      }

      // 3. Aplicar markup después
      const markupDecimal = markup / 100; // Convertir porcentaje a decimal
      const priceWithMarkup = costWithIva * (1 + markupDecimal);

      // 4. Redondear a múltiplos de 100 para precios grandes
      const finalPrice = priceWithMarkup < 1000
        ? Math.round(priceWithMarkup / 10) * 10  // Para precios pequeños, múltiplos de 10
        : Math.round(priceWithMarkup / 100) * 100; // Para precios grandes, múltiplos de 100

      setSalePrice(finalPrice);

      // El precio ya está en ARS después de la conversión
      setSalePriceARS(finalPrice);
    } else {
      setSalePrice(null);
      setSalePriceARS(null);
    }
  }, [unitPrice, markup, currency, exchangeRate, selectedIva]);

  // Función para calcular markup cuando se ingresa precio de venta manualmente
  const calculateMarkupFromSalePrice = (salePrice: number) => {
    if (!unitPrice || !salePrice || unitPrice <= 0 || salePrice <= 0) return 0;

    let costInArs = unitPrice;

    // 1. Convertir USD a ARS si es necesario
    if (currency === 'USD' && exchangeRate) {
      costInArs = unitPrice * exchangeRate;
    }

    // Validar que el costo sea válido
    if (!costInArs || costInArs <= 0 || !isFinite(costInArs)) {
      return 0;
    }

    // 2. Remover IVA del precio de venta si existe
    let priceWithoutIva = salePrice;
    if (selectedIva && selectedIva.rate > 0) {
      priceWithoutIva = salePrice / (1 + selectedIva.rate / 100);
    }

    // Validar que el precio sin IVA sea válido
    if (!priceWithoutIva || priceWithoutIva <= 0 || !isFinite(priceWithoutIva)) {
      return 0;
    }

    // 3. Calcular markup: (precio_sin_iva / costo) - 1
    const markupDecimal = (priceWithoutIva / costInArs) - 1;

    // 4. Asegurar que el markup nunca sea negativo (mínimo 0%)
    const safeMarkup = markupDecimal < 0 ? 0 : markupDecimal;

    // 5. Convertir a porcentaje y redondear a 2 decimales
    return Math.round(safeMarkup * 10000) / 100; // Redondear a 2 decimales
  };

  // Fetch all related data when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [parentCategoriesRes, measuresRes, ivasRes, suppliersRes] = await Promise.all([
          axios.get(`${apiUrl}/categories/parents`),
          axios.get(`${apiUrl}/measures`),
          axios.get(`${apiUrl}/ivas`),
          axios.get(`${apiUrl}/suppliers`)
        ]);

        setParentCategories(parentCategoriesRes.data?.data || []);
        setMeasures(measuresRes.data?.data || []);
        setIvas(ivasRes.data?.data || []);
        setSuppliers(suppliersRes.data?.data || []);

        // Cargar tasa de cambio
        await fetchExchangeRate();

        // Si estamos editando un producto, configurar la categoría padre seleccionada
        if (product?.category_id) {
          // Buscar la categoría del producto para determinar su categoría padre
          try {
            const categoryRes = await axios.get(`${apiUrl}/categories/${product.category_id}`);
            const selectedCategory = categoryRes.data?.data;
            if (selectedCategory?.parent_id) {
              setSelectedParentCategory(selectedCategory.parent_id);
              // Cargar subcategorías de la categoría padre
              fetchSubcategories(selectedCategory.parent_id);
            }
          } catch (error) {
            console.error("Error loading product category:", error);
          }
        }
      } catch (error) {
        console.error("Failed to fetch reference data:", error); toast.error("Failed to load reference data.");
      }
    };

    fetchData();
  }, []);

  // Reset form when product changes (for edit mode)
  useEffect(() => {
    if (product) {
      reset({
        ...product,
        status: product.status // Boolean value from backend
      });
    }
  }, [product, reset]);

  const onSubmit = async (data: Product) => {
    setLoading(true);
    try {
      if (product?.id) {
        await axios.put(`${apiUrl}/products/${product.id}`, data); toast.success("Product updated successfully!");
      } else {
        await axios.post(`${apiUrl}/products`, data); toast.success("Product created successfully!");
        reset();
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Failed to save product:", error); toast("Error", {
        description: "Failed to save product. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="description">Description*</Label>
        <Input
          id="description"
          {...register("description", { required: "Product description is required" })}
          placeholder="Enter product description"
        />
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="code">Code*</Label>
          <Input
            id="code"
            {...register("code", { required: "Product code is required" })}
            placeholder="Enter product code"
          />
          {errors.code && (
            <p className="text-sm text-red-500">{errors.code.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="measure_id">Unit of Measure*</Label>
          <Select
            onValueChange={(value) => setValue("measure_id", value)}
            defaultValue={product?.measure_id}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a unit of measure" />
            </SelectTrigger>
            <SelectContent>
              {measures.map((measure) => (
                <SelectItem key={measure.id} value={measure.id}>
                  {measure.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.measure_id && (
            <p className="text-sm text-red-500">{errors.measure_id.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="parent_category">Categoría Principal</Label>
          <Select
            value={selectedParentCategory}
            onValueChange={async (value) => {
              setSelectedParentCategory(value);
              setValue("category_id", ""); // Reset category selection
              if (value && value !== "none") {
                await fetchSubcategories(value);
              } else {
                setSubcategories([]);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una categoría principal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin categoría principal</SelectItem>
              {parentCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category_id">Categoría/Subcategoría*</Label>
          <Select
            onValueChange={(value) => setValue("category_id", value)}
            defaultValue={product?.category_id}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una categoría" />
            </SelectTrigger>
            <SelectContent>
              {/* Mostrar categorías principales */}
              {parentCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}

              {/* Mostrar subcategorías del padre seleccionado */}
              {selectedParentCategory && subcategories.length > 0 && (
                <>
                  {subcategories.map((subcategory) => (
                    <SelectItem key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
          {errors.category_id && (
            <p className="text-sm text-red-500">{errors.category_id.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Selecciona primero una categoría principal para ver las subcategorías disponibles
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="supplier_id">Proveedor*</Label>
          <Select
            onValueChange={(value) => setValue("supplier_id", value)}
            defaultValue={product?.supplier_id}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a supplier" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.business_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.supplier_id && (
            <p className="text-sm text-red-500">{errors.supplier_id.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="currency">Moneda del Precio Unitario*</Label>
        <Select
          onValueChange={(value) => setValue("currency", value as 'ARS' | 'USD')}
          defaultValue={product?.currency || "ARS"}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona la moneda" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ARS">Pesos Argentinos (ARS)</SelectItem>
            <SelectItem value="USD">Dólares Americanos (USD)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Los precios en USD se convertirán automáticamente a ARS para la venta
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="unit_price">
            Unit Price* {currency === 'USD' ? '(USD)' : '(ARS)'}
          </Label>
          <Input
            id="unit_price"
            type="number"
            step="0.01"
            {...register("unit_price", {
              required: "Unit price is required",
              valueAsNumber: true,
              min: { value: 0, message: "Price must be positive" }
            })}
            placeholder="0.00"
          />
          {errors.unit_price && (
            <p className="text-sm text-red-500">{errors.unit_price.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="markup">Markup (%) *</Label>
          <div className="relative">
            <Input
              id="markup"
              type="number"
              step="0.01"
              {...register("markup", {
                required: "Markup is required",
                valueAsNumber: true,
                min: { value: 0, message: "Markup must be positive" }
              })}
              placeholder="0.00"
              className="pr-8"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <span className="text-gray-500 text-sm">%</span>
            </div>
          </div>
          {errors.markup && (
            <p className="text-sm text-red-500">{errors.markup.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="sale_price">
            Sale Price {currency === 'USD' ? '(USD)' : '(ARS)'}
          </Label>
          <Input
            id="sale_price"
            type="number"
            step="0.01"
            value={salePrice !== null ? salePrice.toFixed(2) : ''}
            onChange={(e) => {
              const newSalePrice = parseFloat(e.target.value) || 0;
              setSalePrice(newSalePrice);
              setSalePriceARS(newSalePrice);

              // Calcular markup automáticamente
              if (newSalePrice > 0 && unitPrice > 0) {
                const calculatedMarkup = calculateMarkupFromSalePrice(newSalePrice);
                setValue("markup", calculatedMarkup);
              }
            }}
            placeholder="0.00"
          />
          <p className="text-xs text-muted-foreground">
            Ingresa el precio de venta deseado para calcular automáticamente el markup
          </p>
        </div>

        {currency === 'USD' && (
          <div className="space-y-2">
            <Label htmlFor="sale_price_ars">Precio Final (ARS)</Label>
            <Input
              id="sale_price_ars"
              type="number"
              step="0.01"
              value={salePriceARS !== null ? salePriceARS.toFixed(2) : ''}
              readOnly
              className="bg-green-50 border-green-200"
            />
            <p className="text-xs text-muted-foreground">
              Conversión con tasa: ${exchangeRate.toFixed(2)} ARS/USD
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="iva_id">IVA Tax*</Label>
        <Select
          onValueChange={(value) => setValue("iva_id", value)}
          defaultValue={product?.iva_id}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select IVA rate" />
          </SelectTrigger>
          <SelectContent>
            {ivas.map((iva) => (
              <SelectItem key={iva.id} value={iva.id}>
                {iva.rate}%
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.iva_id && (
          <p className="text-sm text-red-500">{errors.iva_id.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status*</Label>
        <Select
          onValueChange={(value) => setValue("status", stringToStatus(value))}
          defaultValue={product?.status ? statusToString(product.status) : "active"}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="web"
          checked={watch("web")}
          onCheckedChange={(checked) => setValue("web", checked)}
        />
        <Label htmlFor="web">Show on website</Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="observaciones">Notes/Observations</Label>
        <Textarea
          id="observaciones"
          {...register("observaciones")}
          placeholder="Additional notes about the product"
          rows={3}
        />
      </div>

      <SubmitButton
        isLoading={loading}
        loadingText="Saving..."
        className="w-full"
      >
        {product?.id ? "Update Product" : "Create Product"}
      </SubmitButton>
    </form>
  );
}