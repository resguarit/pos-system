import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ChevronDown, Download, Loader2, Search } from "lucide-react";
import { sileo } from "sileo";
import { getCategories } from "@/lib/api/categoryService";
import { getBranches } from "@/lib/api/branchService";
import { getSuppliers } from "@/lib/api/supplierService";
import { priceListService, type StockCountExportOptions } from "@/lib/api/priceListService";

interface ExportStockCountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CategoryOption {
  id: number;
  name: string;
}

interface BranchOption {
  id: number;
  name: string;
}

interface BranchApiItem {
  id: number;
  name?: string;
  description?: string;
  status?: boolean | number | string;
}

interface SupplierOption {
  id: number;
  name: string;
  status?: string;
}

const isInactiveSupplier = (status?: string) => {
  if (!status) {
    return false;
  }

  return ['inactive', 'inactivo', '0', 'false'].includes(status.toLowerCase());
};

export const ExportStockCountDialog: React.FC<ExportStockCountDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [includeInactiveProducts, setIncludeInactiveProducts] = useState(false);
  const [includeOutOfStockProducts, setIncludeOutOfStockProducts] = useState(false);

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [supplierPopoverOpen, setSupplierPopoverOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const loadFilters = async () => {
      try {
        const [categoriesData, branchesData, suppliersData] = await Promise.all([
          getCategories(),
          getBranches(),
          getSuppliers(),
        ]);

        setCategories(Array.isArray(categoriesData) ? categoriesData.map((category) => ({
          id: category.id,
          name: category.name,
        })) : []);

        setBranches(Array.isArray(branchesData) ? (branchesData as BranchApiItem[])
          .filter((branch) => {
            if (typeof branch.status === 'boolean') return branch.status;
            if (typeof branch.status === 'number') return branch.status === 1;
            if (typeof branch.status === 'string') return ['1', 'active', 'activo', 'true'].includes(branch.status.toLowerCase());
            return true;
          })
          .map((branch) => ({
            id: branch.id,
            name: branch.description || branch.name || `Sucursal ${branch.id}`,
          })) : []);

        setSuppliers(Array.isArray(suppliersData) ? suppliersData
          .map((supplier: SupplierOption) => ({
            id: supplier.id,
            name: supplier.name,
            status: supplier.status,
          })) : []);
      } catch (error) {
        console.error('Error cargando filtros para exportacion de conteo:', error);
        sileo.error({
          title: 'Error al cargar filtros',
          description: 'No se pudieron cargar categorias, sucursales o proveedores.',
        });
      }
    };

    loadFilters();
  }, [open]);

  const filteredCategories = useMemo(() => {
    const term = categorySearch.trim().toLowerCase();
    if (!term) return categories;
    return categories.filter((category) => category.name.toLowerCase().includes(term));
  }, [categories, categorySearch]);

  const filteredSuppliers = useMemo(() => {
    const term = supplierSearch.trim().toLowerCase();
    if (!term) return suppliers;
    return suppliers.filter((supplier) => supplier.name.toLowerCase().includes(term));
  }, [suppliers, supplierSearch]);

  const toggleSelection = (
    value: string,
    selectedValues: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    if (selectedValues.includes(value)) {
      setter(selectedValues.filter((selected) => selected !== value));
      return;
    }

    setter([...selectedValues, value]);
  };

  const buildSummary = (selectedValues: string[], allLabel: string, singularLabel: string, pluralLabel: string) => {
    if (selectedValues.length === 0) {
      return allLabel;
    }

    if (selectedValues.length === 1) {
      return `1 ${singularLabel}`;
    }

    return `${selectedValues.length} ${pluralLabel}`;
  };

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const options: StockCountExportOptions = {
        includeInactiveProducts,
        includeOutOfStockProducts,
      };

      if (selectedCategoryIds.length > 0) {
        options.categoryIds = selectedCategoryIds.map(Number);
      }

      if (selectedBranchId !== 'all') {
        options.branchIds = [Number(selectedBranchId)];
      }

      if (selectedSupplierIds.length > 0) {
        options.supplierIds = selectedSupplierIds.map(Number);
      }

      await priceListService.exportStockCountList(options);

      sileo.success({
        title: 'Planilla de conteo exportada',
        description: 'El PDF se descargo correctamente.',
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error al exportar planilla de conteo:', error);
      sileo.error({
        title: 'Error al exportar',
        description: 'No se pudo generar la planilla de conteo. Intenta nuevamente.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Exportar Planilla de Conteo</DialogTitle>
          <DialogDescription>
            Genera un PDF para conteo fisico con filtros opcionales por categoria, sucursal y proveedor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label>Categorias (Opcional)</Label>
            <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between font-normal">
                  <span className="truncate">
                    {buildSummary(selectedCategoryIds, 'Todas las categorias', 'categoria seleccionada', 'categorias seleccionadas')}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <div className="border-b p-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={categorySearch}
                      onChange={(event) => setCategorySearch(event.target.value)}
                      placeholder="Buscar categorias..."
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-muted"
                    onClick={() => setSelectedCategoryIds([])}
                  >
                    <Checkbox checked={selectedCategoryIds.length === 0} className="border-2 border-slate-600" />
                    <span className="text-sm">Todas las categorias</span>
                  </button>
                  {filteredCategories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-muted"
                      onClick={() => toggleSelection(String(category.id), selectedCategoryIds, setSelectedCategoryIds)}
                    >
                      <Checkbox checked={selectedCategoryIds.includes(String(category.id))} className="border-2 border-slate-600" />
                      <span className="text-sm truncate">{category.name}</span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Sucursal (Opcional)</Label>
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
              <SelectTrigger>
                <SelectValue placeholder="Todas las sucursales" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las sucursales</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={String(branch.id)}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Proveedor (Opcional)</Label>
            <Popover open={supplierPopoverOpen} onOpenChange={setSupplierPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between font-normal">
                  <span className="truncate">
                    {buildSummary(selectedSupplierIds, 'Todos los proveedores', 'proveedor seleccionado', 'proveedores seleccionados')}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <div className="border-b p-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={supplierSearch}
                      onChange={(event) => setSupplierSearch(event.target.value)}
                      placeholder="Buscar proveedores..."
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-muted"
                    onClick={() => setSelectedSupplierIds([])}
                  >
                    <Checkbox checked={selectedSupplierIds.length === 0} className="border-2 border-slate-600" />
                    <span className="text-sm">Todos los proveedores</span>
                  </button>
                  {filteredSuppliers.map((supplier) => (
                    <button
                      key={supplier.id}
                      type="button"
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-muted"
                      onClick={() => toggleSelection(String(supplier.id), selectedSupplierIds, setSelectedSupplierIds)}
                    >
                      <Checkbox checked={selectedSupplierIds.includes(String(supplier.id))} className="border-2 border-slate-600" />
                      <span className="text-sm truncate">
                        {supplier.name}
                        {isInactiveSupplier(supplier.status) && (
                          <span className="ml-2 text-xs text-muted-foreground">(inactivo)</span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="stock-count-include-inactive"
                checked={includeInactiveProducts}
                onCheckedChange={(checked) => setIncludeInactiveProducts(Boolean(checked))}
              />
              <Label htmlFor="stock-count-include-inactive">Incluir productos inactivos</Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="stock-count-include-out-of-stock"
                checked={includeOutOfStockProducts}
                onCheckedChange={(checked) => setIncludeOutOfStockProducts(Boolean(checked))}
              />
              <Label htmlFor="stock-count-include-out-of-stock">Incluir productos sin stock</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generando PDF...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Exportar PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportStockCountDialog;
