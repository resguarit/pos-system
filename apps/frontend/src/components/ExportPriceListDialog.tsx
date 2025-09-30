import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Loader2, FolderOpen, Folder, ChevronDown, Search } from "lucide-react";
import { toast } from "sonner";
import { priceListService, type PriceListExportOptions } from "@/lib/api/priceListService";
import { getCategories } from "@/lib/api/categoryService";

interface ExportPriceListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Category {
  id: number;
  parent_id: number | null;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  parent: {
    id: number;
    name: string;
  } | null;
  children: any[];
}

export const ExportPriceListDialog: React.FC<ExportPriceListDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [includeInactiveProducts, setIncludeInactiveProducts] = useState(false);
  const [includeOutOfStockProducts, setIncludeOutOfStockProducts] = useState(false);
  const [selectedBranches, setSelectedBranches] = useState<number[]>([]);
  const [branchPopoverOpen, setBranchPopoverOpen] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [branchSearch, setBranchSearch] = useState('');

  // Cargar datos cuando se abre el diálogo
  React.useEffect(() => {
    if (open) {
      loadCategories();
      loadBranches();
    }
  }, [open]);

  const loadCategories = async () => {
    try {
      const categoriesData = await getCategories();
      
      // Validar que sea un array
      if (Array.isArray(categoriesData)) {
        setCategories(categoriesData);
      } else {
        console.error('Las categorías no son un array:', categoriesData);
        setCategories([]);
        toast.error('Error: formato de categorías inválido');
      }
    } catch (error) {
      console.error('Error cargando categorías:', error);
      setCategories([]);
      toast.error('Error al cargar las categorías');
    }
  };

  const loadBranches = async () => {
    try {
      // Importar dinámicamente el servicio de sucursales
      const { getBranches } = await import('@/lib/api/branchService');
      const branchesData = await getBranches();
      
      if (Array.isArray(branchesData)) {
        // Filtrar solo las sucursales activas en el frontend
        const activeBranches = branchesData.filter((branch: any) => {
          // Verificar diferentes posibles campos de estado
          if (typeof branch.status === 'boolean') return branch.status;
          if (typeof branch.status === 'number') return branch.status === 1;
          if (typeof branch.status === 'string') {
            const status = branch.status.toLowerCase();
            return ['1', 'active', 'activo', 'true'].includes(status);
          }
          // Si no hay campo status, asumir que está activa
          return true;
        });
        
        setBranches(activeBranches);
      } else {
        console.error('Las sucursales no son un array:', branchesData);
        setBranches([]);
        toast.error('Error: formato de sucursales inválido');
      }
    } catch (error) {
      console.error('Error cargando sucursales activas:', error);
      setBranches([]);
      toast.error('Error al cargar las sucursales activas');
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const options: PriceListExportOptions = {
        includeInactiveProducts,
        includeOutOfStockProducts,
      };

      if (selectedCategories.length > 0) {
        options.categoryIds = selectedCategories;
      }

      if (selectedBranches.length > 0) {
        options.branchIds = selectedBranches;
      }

      await priceListService.exportPriceList(options);
      
      toast.success('Lista de precios exportada correctamente', {
        description: 'El archivo PDF se ha descargado en tu dispositivo.',
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error al exportar lista de precios:', error);
      toast.error('Error al exportar la lista de precios', {
        description: 'Por favor, intenta nuevamente.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    if (!isExporting) {
      onOpenChange(false);
    }
  };

  const toggleCategory = (categoryId: number) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const getSelectedCategoriesText = () => {
    if (selectedCategories.length === 0) {
      return "Todas las categorías";
    }
    if (selectedCategories.length === 1) {
      const category = categories.find(c => c.id === selectedCategories[0]);
      return category ? category.name : "Categoría seleccionada";
    }
    return `${selectedCategories.length} categorías seleccionadas`;
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const toggleBranch = (branchId: number | string) => {
    const numericId = typeof branchId === 'string' ? parseInt(branchId) : branchId;
    setSelectedBranches(prev =>   
      prev.includes(numericId) 
        ? prev.filter(id => id !== numericId)
        : [...prev, numericId]
    );
  };

  const getSelectedBranchesText = () => {
    if (selectedBranches.length === 0) {
      return "Todas las sucursales activas";
    }
    if (selectedBranches.length === 1) {
      const branch = branches.find(b => {
        const branchId = typeof b.id === 'string' ? parseInt(b.id) : b.id;
        return branchId === selectedBranches[0];
      });
      return branch ? (branch.description || branch.name || 'Sucursal') : "Sucursal seleccionada";
    }
    return `${selectedBranches.length} sucursales activas seleccionadas`;
  };

  const filteredBranches = branches.filter(branch => {
    const branchName = branch.description || branch.name || '';
    return branchName.toLowerCase().includes(branchSearch.toLowerCase());
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Exportar Lista de Precios</DialogTitle>
          <DialogDescription>
            Configura los parámetros para generar la lista de precios en PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto scrollbar-hide space-y-6">
          {/* Filtros de productos */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Filtros de Productos</h3>
            
            <div className="space-y-2">
              <Label>Categorías (Opcional)</Label>
            <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={categoryPopoverOpen}
                  className="w-full justify-between"
                >
                  {getSelectedCategoriesText()}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <div className="p-3 border-b">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar categorías..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  <div className="p-2 space-y-1">
                    <div
                      className="flex items-center p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedCategories([]);
                        setCategoryPopoverOpen(false);
                      }}
                    >
                      <Checkbox
                        checked={selectedCategories.length === 0}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium">Todas las categorías</span>
                    </div>
                    {filteredCategories.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No se encontraron categorías.
                      </div>
                    ) : (
                      filteredCategories.map((category) => (
                        <div
                          key={category.id}
                          className="flex items-center p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                          onClick={() => toggleCategory(category.id)}
                        >
                          <Checkbox
                            checked={selectedCategories.includes(category.id)}
                            className="mr-2"
                          />
                          <div className="flex items-center gap-2 flex-1">
                            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                              {category.parent_id ? (
                                <FolderOpen className="h-3 w-3" />
                              ) : (
                                <Folder className="h-3 w-3" />
                              )}
                            </div>
                            <div className="flex flex-col flex-1">
                              <span className="font-medium text-sm">{category.name}</span>
                              {category.parent && (
                                <span className="text-xs text-muted-foreground">
                                  Subcategoría de: {category.parent.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            </div>

            <div className="space-y-2">
              <Label>Sucursales Activas (Opcional)</Label>
              <Popover open={branchPopoverOpen} onOpenChange={setBranchPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={branchPopoverOpen}
                    className="w-full justify-between"
                  >
                    {getSelectedBranchesText()}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <div className="p-3 border-b">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Buscar sucursales..."
                        value={branchSearch}
                        onChange={(e) => setBranchSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    <div className="p-2 space-y-1">
                      <div
                        className="flex items-center p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          setSelectedBranches([]);
                          setBranchPopoverOpen(false);
                        }}
                      >
                        <Checkbox
                          checked={selectedBranches.length === 0}
                          className="mr-2"
                        />
                        <span className="text-sm font-medium">Todas las sucursales activas</span>
                      </div>
                      {!branches || branches.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          Cargando sucursales activas...
                        </div>
                      ) : filteredBranches.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No se encontraron sucursales activas.
                        </div>
                      ) : (
                        filteredBranches.map((branch) => (
                          <div
                            key={branch.id}
                            className="flex items-center p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                            onClick={() => toggleBranch(branch.id)}
                          >
                            <Checkbox
                              checked={selectedBranches.includes(typeof branch.id === 'string' ? parseInt(branch.id) : branch.id)}
                              className="mr-2"
                            />
                            <div className="flex items-center gap-2 flex-1">
                              <div className="flex flex-col flex-1">
                                <span className="font-medium text-sm">{branch.description || branch.name || 'Sucursal'}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Opciones adicionales */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Opciones Adicionales</h3>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-inactive"
                checked={includeInactiveProducts}
                onCheckedChange={(checked) => setIncludeInactiveProducts(!!checked)}
              />
              <Label htmlFor="include-inactive" className="text-sm">
                Incluir productos inactivos
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-out-of-stock"
                checked={includeOutOfStockProducts}
                onCheckedChange={(checked) => setIncludeOutOfStockProducts(!!checked)}
              />
              <Label htmlFor="include-out-of-stock" className="text-sm">
                Incluir productos con stock agotado
              </Label>
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Información:</strong> La lista se generará con los productos 
              {includeInactiveProducts ? ' activos e inactivos' : ' activos'} 
              {includeOutOfStockProducts ? ' (incluyendo stock agotado)' : ' (excluyendo stock agotado)'}
              en pesos argentinos, agrupados por categoría.
              {selectedBranches.length > 0 && ' Solo se incluirán productos de las sucursales seleccionadas.'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isExporting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
          >
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

export default ExportPriceListDialog;
