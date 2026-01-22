import React, { useState, useEffect, useCallback, useMemo } from "react"
import { useAuth } from "@/hooks/useAuth"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { ResizableTableHeader, ResizableTableCell } from '@/components/ui/resizable-table-header';
import { Search, Pencil, Trash2, RotateCw, Plus, ChevronRight, ChevronDown, FolderPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import useApi from "@/hooks/useApi"
import Pagination from "@/components/ui/pagination"
import { toast } from "sonner"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { NewCategoryDialog, EditCategoryDialog } from "@/components/expenses"

interface ExpenseCategory {
    id: number;
    name: string;
    description: string | null;
    active: boolean;
    parent_id: number | null;
    parent?: ExpenseCategory | null;
    children?: ExpenseCategory[];
}

export default function ExpenseCategoriesPage() {
    const { request, loading } = useApi();
    const { hasPermission } = useAuth();
    const [categories, setCategories] = useState<ExpenseCategory[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")

    // Dialog states
    const [newDialogOpen, setNewDialogOpen] = useState(false)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null)
    const [parentForNewSubcategory, setParentForNewSubcategory] = useState<{ id: number; name: string } | null>(null)

    // Expanded categories state (for showing subcategories)
    const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set())

    const [currentPage, setCurrentPage] = useState(1)
    const [totalItems, setTotalItems] = useState(0)
    const [totalPages, setTotalPages] = useState(1)
    const PAGE_SIZE = 50 // Increase to show all categories for tree view

    const columnConfig = [
        { id: 'name', minWidth: 200, maxWidth: 400, defaultWidth: 250 },
        { id: 'description', minWidth: 200, maxWidth: 400, defaultWidth: 300 },
        { id: 'status', minWidth: 100, maxWidth: 150, defaultWidth: 120 },
        { id: 'actions', minWidth: 120, maxWidth: 180, defaultWidth: 150 }
    ];

    const {
        getResizeHandleProps,
        getColumnHeaderProps,
        getColumnCellProps,
        tableRef
    } = useResizableColumns({
        columns: columnConfig,
        storageKey: 'expense-categories-column-widths',
        defaultWidth: 150
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setCurrentPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchCategories = useCallback(async (page = 1) => {
        try {
            const params: { page: number; limit: number; with_children: boolean; search?: string } = { page, limit: PAGE_SIZE, with_children: true };
            if (debouncedSearchTerm.trim()) {
                params.search = debouncedSearchTerm.trim();
            }

            const response = await request({
                method: "GET",
                url: "/expense-categories/tree",
                params
            });

            if (response && response.success) {
                setCategories(response.data || []);
                setTotalItems(response.total || response.data?.length || 0);
                setCurrentPage(response.current_page || 1);
                setTotalPages(response.last_page || 1);
            }
        } catch (error) {
            console.error("Error fetching categories:", error);
            toast.error("Error al cargar categorías");
        }
    }, [request, debouncedSearchTerm]);

    useEffect(() => {
        fetchCategories(currentPage);
    }, [fetchCategories, currentPage]);

    // Filter categories based on search term (client-side filtering for subcategories)
    const filterCategories = useCallback((cats: ExpenseCategory[], search: string): ExpenseCategory[] => {
        if (!search.trim()) return cats;
        
        const searchLower = search.toLowerCase().trim();
        
        return cats.reduce((acc: ExpenseCategory[], category) => {
            const nameMatches = category.name.toLowerCase().includes(searchLower);
            const descMatches = category.description?.toLowerCase().includes(searchLower);
            
            // Filter children that match
            const matchingChildren = category.children?.filter(child => 
                child.name.toLowerCase().includes(searchLower) ||
                child.description?.toLowerCase().includes(searchLower)
            ) || [];
            
            // Include category if it matches OR if any children match
            if (nameMatches || descMatches || matchingChildren.length > 0) {
                acc.push({
                    ...category,
                    // If parent matches, show all children; otherwise show only matching children
                    children: (nameMatches || descMatches) ? category.children : matchingChildren
                });
            }
            
            return acc;
        }, []);
    }, []);

    // Get filtered categories
    const filteredCategories = useMemo(() => {
        return filterCategories(categories, debouncedSearchTerm);
    }, [categories, debouncedSearchTerm, filterCategories]);

    // Auto-expand categories when searching
    useEffect(() => {
        if (debouncedSearchTerm.trim()) {
            // Expand all categories that have matching children
            const toExpand = new Set<number>();
            filteredCategories.forEach(cat => {
                if (cat.children && cat.children.length > 0) {
                    toExpand.add(cat.id);
                }
            });
            setExpandedCategories(toExpand);
        }
    }, [debouncedSearchTerm, filteredCategories]);

    const toggleExpanded = (categoryId: number) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(categoryId)) {
                next.delete(categoryId);
            } else {
                next.add(categoryId);
            }
            return next;
        });
    };

    const handleAddSubcategory = (category: ExpenseCategory) => {
        setParentForNewSubcategory({ id: category.id, name: category.name });
        setNewDialogOpen(true);
    };

    const handleEditClick = (category: ExpenseCategory) => {
        setSelectedCategory(category)
        setEditDialogOpen(true)
    }

    const handleDeleteClick = (id: number) => {
        setCategoryToDelete(id)
        setDeleteDialogOpen(true)
    }

    const confirmDelete = async () => {
        if (!categoryToDelete) return

        try {
            await request({ method: "DELETE", url: `/expense-categories/${categoryToDelete}` })
            toast.success('Categoría eliminada correctamente')
            fetchCategories(currentPage);
            setDeleteDialogOpen(false)
            setCategoryToDelete(null)
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : 'Error al eliminar la categoría';
            toast.error(errMsg)
        }
    }

    const handleDialogSuccess = () => {
        fetchCategories(currentPage);
        setParentForNewSubcategory(null);
    }

    const handleNewDialogClose = (open: boolean) => {
        setNewDialogOpen(open);
        if (!open) {
            setParentForNewSubcategory(null);
        }
    };

    // Render a category row with optional indentation for subcategories
    const renderCategoryRow = (category: ExpenseCategory, level: number = 0) => {
        const hasChildren = category.children && category.children.length > 0;
        const isExpanded = expandedCategories.has(category.id);
        
        return (
            <React.Fragment key={category.id}>
                <TableRow className={level > 0 ? "bg-muted/30" : ""}>
                    <ResizableTableCell columnId="name" getColumnCellProps={getColumnCellProps}>
                        <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 24}px` }}>
                            {hasChildren ? (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 p-0"
                                    onClick={() => toggleExpanded(category.id)}
                                >
                                    {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </Button>
                            ) : (
                                <span className="w-6" />
                            )}
                            <div className="font-medium">
                                {category.name}
                                {hasChildren && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                        ({category.children?.length} subcategorías)
                                    </span>
                                )}
                            </div>
                        </div>
                    </ResizableTableCell>
                    <ResizableTableCell columnId="description" getColumnCellProps={getColumnCellProps}>
                        {category.description || '-'}
                    </ResizableTableCell>
                    <ResizableTableCell columnId="status" getColumnCellProps={getColumnCellProps}>
                        {category.active ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700">Activo</Badge>
                        ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-700">Inactivo</Badge>
                        )}
                    </ResizableTableCell>
                    <ResizableTableCell columnId="actions" getColumnCellProps={getColumnCellProps} className="text-right">
                        <div className="flex justify-end gap-1">
                            {/* Only show "Add Subcategory" for top-level categories */}
                            {level === 0 && hasPermission('crear_categorias_gastos') && (
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    title="Agregar subcategoría" 
                                    onClick={() => handleAddSubcategory(category)}
                                >
                                    <FolderPlus className="h-4 w-4 text-blue-500" />
                                </Button>
                            )}
                            {hasPermission('editar_categorias_gastos') && (
                                <Button variant="ghost" size="icon" title="Editar" onClick={() => handleEditClick(category)}>
                                    <Pencil className="h-4 w-4 text-orange-500" />
                                </Button>
                            )}
                            {hasPermission('eliminar_categorias_gastos') && (
                                <Button variant="ghost" size="icon" title="Eliminar" onClick={() => handleDeleteClick(category.id)}>
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                            )}
                        </div>
                    </ResizableTableCell>
                </TableRow>
                {/* Render children if expanded */}
                {hasChildren && isExpanded && category.children?.map(child => renderCategoryRow(child, level + 1))}
            </React.Fragment>
        );
    };

    return (
        <div className="h-full w-full flex flex-col space-y-4 p-4 md:p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Categorías de Gastos</h2>
                    <p className="text-muted-foreground">Configuración de tipos de gastos</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => fetchCategories(currentPage)} disabled={loading} title="Refrescar">
                        <RotateCw className={loading ? "animate-spin h-4 w-4" : "h-4 w-4"} />
                    </Button>
                    {hasPermission('crear_categorias_gastos') && (
                        <Button onClick={() => setNewDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Nueva Categoría
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                <div className="flex flex-1 items-center space-x-2">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Buscar categorías..."
                            className="w-full pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {loading && categories.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <RotateCw className="animate-spin mr-2 h-5 w-5" /> Cargando categorías...
                </div>
            ) : (
                <div className="rounded-md border bg-card">
                    {filteredCategories.length > 0 ? (
                        <div className="relative">
                            <Table ref={tableRef} className="w-full">
                                <TableHeader>
                                    <TableRow>
                                        <ResizableTableHeader columnId="name" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps}>Nombre</ResizableTableHeader>
                                        <ResizableTableHeader columnId="description" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps}>Descripción</ResizableTableHeader>
                                        <ResizableTableHeader columnId="status" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps}>Estado</ResizableTableHeader>
                                        <ResizableTableHeader columnId="actions" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps} className="text-right">Acciones</ResizableTableHeader>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredCategories.map((category) => renderCategoryRow(category, 0))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-muted-foreground">
                            {debouncedSearchTerm ? 'No se encontraron categorías que coincidan con la búsqueda' : 'No hay categorías registradas'}
                        </div>
                    )}
                </div>
            )}

            <Pagination
                currentPage={currentPage}
                lastPage={totalPages}
                total={totalItems}
                itemName="categorías"
                onPageChange={setCurrentPage}
                disabled={loading}
                className="mt-4 mb-6"
            />

            {/* New Category Dialog */}
            <NewCategoryDialog
                open={newDialogOpen}
                onOpenChange={handleNewDialogClose}
                onSuccess={handleDialogSuccess}
                parentCategory={parentForNewSubcategory}
            />

            {/* Edit Category Dialog */}
            <EditCategoryDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                category={selectedCategory}
                onSuccess={handleDialogSuccess}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. La categoría será eliminada permanentemente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

