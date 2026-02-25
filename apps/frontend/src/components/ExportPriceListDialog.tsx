import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Loader2, FolderOpen, Folder, ChevronDown, ChevronRight, Search } from "lucide-react";
import { sileo } from "sileo"
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
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
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
      // Resetear categorías expandidas cuando se abre el diálogo
      setExpandedCategories(new Set());
    }
  }, [open]);

  const loadCategories = async () => {
    try {
      const categoriesData = await getCategories();
      
      // Validar que sea un array
      if (Array.isArray(categoriesData)) {
        // Eliminar duplicados por ID antes de establecer el estado
        const uniqueCategories = categoriesData.filter((cat, index, self) => 
          index === self.findIndex(c => c.id === cat.id)
        );
        setCategories(uniqueCategories);
      } else {
        console.error('Las categorías no son un array:', categoriesData);
        setCategories([]);
        sileo.error({ title: 'Error: formato de categorías inválido' });
      }
    } catch (error) {
      console.error('Error cargando categorías:', error);
      setCategories([]);
      sileo.error({ title: 'Error al cargar las categorías' });
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
        sileo.error({ title: 'Error: formato de sucursales inválido' });
      }
    } catch (error) {
      console.error('Error cargando sucursales activas:', error);
      setBranches([]);
      sileo.error({ title: 'Error al cargar las sucursales activas' });
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
      
      sileo.success({ title: 'Lista de precios exportada correctamente',
        description: 'El archivo PDF se ha descargado en tu dispositivo.',
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error al exportar lista de precios:', error);
      sileo.error({ title: 'Error al exportar la lista de precios',
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

  // Separar categorías padre y subcategorías
  const parentCategories = categories.filter(cat => !cat.parent_id || cat.parent_id === null);
  const subcategoriesMap = new Map<number, Category[]>();
  
  // Construir mapa de subcategorías
  categories.forEach(cat => {
    if (cat.parent_id !== null && cat.parent_id !== undefined) {
      const parentId = Number(cat.parent_id);
      if (!subcategoriesMap.has(parentId)) {
        subcategoriesMap.set(parentId, []);
      }
      subcategoriesMap.get(parentId)!.push(cat);
    }
  });
  
  // También agregar subcategorías desde el campo children si existe
  parentCategories.forEach(parent => {
    if (parent.children && Array.isArray(parent.children) && parent.children.length > 0) {
      const existingSubs = subcategoriesMap.get(parent.id) || [];
      const childrenIds = new Set(existingSubs.map(s => s.id));
      parent.children.forEach((child: any) => {
        if (child && child.id && !childrenIds.has(child.id)) {
          existingSubs.push(child);
          childrenIds.add(child.id);
        }
      });
      if (existingSubs.length > 0) {
        subcategoriesMap.set(parent.id, existingSubs);
      }
    }
  });
  

  // Filtrar según búsqueda
  // Si hay búsqueda, mostrar también categorías padre que tienen subcategorías que coinciden
  const filteredParentCategories = React.useMemo(() => {
    if (!categorySearch) {
      // Eliminar duplicados por ID
      const unique = parentCategories.filter((cat, index, self) => 
        index === self.findIndex(c => c.id === cat.id)
      );
      return unique;
    }
    const searchLower = categorySearch.toLowerCase();
    const filtered = parentCategories.filter(category => {
      // Incluir si el nombre de la categoría padre coincide
      if (category.name.toLowerCase().includes(searchLower)) {
        return true;
      }
      // O si alguna de sus subcategorías coincide
      const subs = subcategoriesMap.get(category.id) || [];
      return subs.some(sub => sub.name.toLowerCase().includes(searchLower));
    });
    // Eliminar duplicados por ID
    const unique = filtered.filter((cat, index, self) => 
      index === self.findIndex(c => c.id === cat.id)
    );
    return unique;
  }, [parentCategories, categorySearch, subcategoriesMap]);

  // Función para obtener subcategorías filtradas de una categoría padre
  const getFilteredSubcategories = (parentId: number) => {
    const subs = subcategoriesMap.get(parentId) || [];
    
    // Eliminar duplicados por ID
    const uniqueSubs = subs.filter((sub, index, self) => 
      index === self.findIndex(s => s.id === sub.id)
    );
    
    if (!categorySearch) {
      return uniqueSubs;
    }
    return uniqueSubs.filter(category =>
      category.name.toLowerCase().includes(categorySearch.toLowerCase())
    );
  };

  // Toggle para expandir/colapsar categoría padre
  const toggleExpandCategory = (categoryId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Verificar si una categoría padre tiene subcategorías
  const hasSubcategories = (categoryId: number) => {
    // Verificar tanto en el mapa como en el campo children de la categoría
    const category = categories.find(c => c.id === categoryId);
    const subsInMap = subcategoriesMap.get(categoryId) || [];
    const hasInMap = subsInMap.length > 0;
    const hasInChildren = category?.children && Array.isArray(category.children) && category.children.length > 0;
    
    // También verificar directamente si hay categorías con este parent_id
    const directSubs = categories.filter(c => c.parent_id === categoryId && c.parent_id !== null && c.parent_id !== undefined);
    const hasDirect = directSubs.length > 0;
    
    const result = hasInMap || hasInChildren || hasDirect;
    
    return result;
  };

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

        <div className="flex-1 overflow-y-auto scrollbar-hide space-y-6 overflow-x-hidden">
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
              <PopoverContent 
                className="w-full p-0" 
                style={{ 
                  width: 'var(--radix-popover-trigger-width)',
                  maxWidth: 'calc(100vw - 40px)',
                  maxHeight: 'min(400px, calc(100vh - 100px))',
                  height: 'auto',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                align="start" 
                side="bottom" 
                sideOffset={5}
                alignOffset={0}
                avoidCollisions={true}
                onWheel={(e) => e.stopPropagation()}
              >
                <div className="p-3 border-b" style={{ flexShrink: 0, flexGrow: 0 }}>
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
                <div 
                  className="scrollbar-visible"
                  data-scrollable="true"
                  style={{
                    overflowY: 'scroll',
                    overflowX: 'hidden',
                    maxHeight: 'min(340px, calc(100vh - 140px))',
                    height: 'min(340px, calc(100vh - 140px))',
                    position: 'relative',
                    WebkitOverflowScrolling: 'touch' as any,
                    scrollbarWidth: 'thin' as any,
                    scrollbarColor: '#64748b #f1f5f9' as any
                  }}
                >
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
                    {filteredParentCategories.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No se encontraron categorías.
                      </div>
                    ) : (
                      <>
                        {filteredParentCategories.map((category) => {
                          const isExpanded = expandedCategories.has(category.id);
                          const hasSubs = hasSubcategories(category.id);
                          const filteredSubs = getFilteredSubcategories(category.id);
                          
                          return (
                            <div key={`parent-cat-${category.id}`} className="space-y-0">
                              {/* Categoría padre */}
                              <div
                                className="flex items-center p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                              >
                                <Checkbox
                                  checked={selectedCategories.includes(category.id)}
                                  onCheckedChange={() => toggleCategory(category.id)}
                                />
                                <div className="flex items-center gap-1.5 flex-1">
                                  {/* Botón para expandir/colapsar - SIEMPRE mostrar flecha si tiene subcategorías */}
                                  {hasSubs ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        toggleExpandCategory(category.id, e);
                                      }}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                      }}
                                      className="mr-0.5 p-0.5 hover:bg-gray-200 active:bg-gray-300 rounded flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer border-0 outline-none"
                                      style={{ width: '20px', height: '20px', minWidth: '20px', minHeight: '20px' }}
                                      title={isExpanded ? "Colapsar subcategorías" : "Expandir subcategorías"}
                                      aria-label={isExpanded ? "Colapsar" : "Expandir"}
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-gray-800 flex-shrink-0" strokeWidth={2.5} />
                                      ) : (
                                        <ChevronRight className="h-4 w-4 text-gray-800 flex-shrink-0" strokeWidth={2.5} />
                                      )}
                                    </button>
                                  ) : (
                                    <div className="w-5 h-5 flex-shrink-0 mr-0.5">
                                      {/* Espacio reservado para mantener alineación */}
                                    </div>
                                  )}
                                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                                    <Folder className="h-3 w-3" />
                                  </div>
                                  <div className="flex flex-col flex-1 min-w-0">
                                    <span className="font-medium text-sm truncate">{category.name}</span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Subcategorías (mostrar si está expandido O si hay búsqueda que las incluye) */}
                              {((isExpanded && filteredSubs.length > 0) || (categorySearch && filteredSubs.length > 0 && !isExpanded)) && (
                                <div className="ml-8 space-y-0">
                                  {filteredSubs.map((subcategory) => (
                                    <div
                                      key={`sub-${category.id}-${subcategory.id}`}
                                      className="flex items-center p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                                    >
                                      <Checkbox
                                        checked={selectedCategories.includes(subcategory.id)}
                                        onCheckedChange={() => toggleCategory(subcategory.id)}
                                      />
                                      <div className="flex items-center gap-2 flex-1">
                                        <div className="w-5" /> {/* Espacio para alinear */}
                                        <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-primary opacity-60">
                                          <FolderOpen className="h-3 w-3" />
                                        </div>
                                        <div className="flex flex-col flex-1">
                                          <span className="font-medium text-sm text-gray-700">{subcategory.name}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    )}
                        {filteredParentCategories.length > 0 && (
                          <div className="p-2 text-xs text-muted-foreground text-center border-t mt-2 pt-2 bg-gray-50">
                            {filteredParentCategories.length} categoría{filteredParentCategories.length !== 1 ? 's' : ''} padre{filteredParentCategories.length !== 1 ? 's' : ''} ({categories.length} total)
                          </div>
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
                <PopoverContent 
                  className="w-full p-0 flex flex-col overflow-hidden" 
                  style={{ 
                    height: '400px',
                    maxHeight: '400px',
                    maxWidth: 'calc(100vw - 40px)'
                  }}
                  align="start"
                >
                  <div className="p-3 border-b flex-shrink-0">
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
                  <div 
                    className="flex-1 min-h-0 scrollbar-visible"
                    style={{
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      maxHeight: 'calc(400px - 73px)'
                    }}
                  >
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
                                <div className="flex items-center gap-2">
                                  {branch.color && (
                                    <div 
                                      className="w-3 h-3 rounded-full border"
                                      style={{ backgroundColor: branch.color }}
                                    />
                                  )}
                                  <span className="font-medium text-sm">{branch.description || branch.name || 'Sucursal'}</span>
                                </div>
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
