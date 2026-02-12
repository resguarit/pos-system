import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { ResizableTableHeader } from '@/components/ui/resizable-table-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, RotateCw, Search, Eye, Pencil, Trash2, FolderOpen, Folder } from "lucide-react"
import { useEffect, useState, useCallback } from "react"
import useApi from "@/hooks/useApi"
import { useAuth } from "@/hooks/useAuth"
import { Link } from "react-router-dom"
import Pagination from "@/components/ui/pagination"
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
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface Category {
  id: string
  name: string
  description?: string
  parent_id?: string | null
  parent?: {
    id: string
    name: string
  }
  children?: Category[]
  created_at: string
  updated_at: string
}

type CategoriesPageProps = {
  apiBasePath?: string
  basePath?: string
  title?: string
  newLabel?: string
  itemName?: string
  searchPlaceholder?: string
  permissions?: {
    view: string
    create: string
    edit: string
    delete: string
  }
}

export default function CategoriesPage({
  apiBasePath = "/categories",
  basePath = "/dashboard/categorias",
  title = "Categorías",
  newLabel = "Nueva Categoría",
  itemName = "categorías",
  searchPlaceholder = "Buscar categorías...",
  permissions = {
    view: "ver_categorias",
    create: "crear_categorias",
    edit: "editar_categorias",
    delete: "eliminar_categorias",
  },
}: CategoriesPageProps) {
  const { request, loading } = useApi()
  const { hasPermission } = useAuth()

  // Configuración de columnas redimensionables
  const columnConfig = [
    { id: 'name', minWidth: 200, maxWidth: 400, defaultWidth: 250 },
    { id: 'description', minWidth: 250, maxWidth: 500, defaultWidth: 350 },
    { id: 'parent', minWidth: 150, maxWidth: 250, defaultWidth: 180 },
    { id: 'children', minWidth: 100, maxWidth: 150, defaultWidth: 120 },
    { id: 'actions', minWidth: 120, maxWidth: 180, defaultWidth: 150 }
  ];

  const {
    getResizeHandleProps,
    getColumnHeaderProps,
    tableRef
  } = useResizableColumns({
    columns: columnConfig,
    storageKey: 'categorias-column-widths',
    defaultWidth: 150
  });
  const [categories, setCategories] = useState<Category[]>([])
  const [searchText, setSearchText] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null)
  
  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize, setPageSize] = useState(5) // Cambiar a 5 por defecto
  const [allCategories, setAllCategories] = useState<Category[]>([]) // Todas las categorías para paginación frontend

  const fetchCategories = useCallback(async (page = 1, signal?: AbortSignal) => {
    try {
      const params: any = {}

      if (searchText.trim()) {
        params.search = searchText.trim()
      }

      const response = await request({
        method: "GET",
        url: apiBasePath,
        params,
        signal
      })
      
      // Manejar respuesta - el backend devuelve todas las categorías
      let allCategoriesData = []
      
      if (response?.data?.data?.data) {
        // Respuesta con estructura anidada
        allCategoriesData = Array.isArray(response.data.data.data) ? response.data.data.data : []
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        // Respuesta simple: array en data.data
        allCategoriesData = response.data.data
      } else if (response?.data && Array.isArray(response.data)) {
        // Respuesta muy simple: array en data
        allCategoriesData = response.data
      }
      
      // Guardar todas las categorías
      setAllCategories(allCategoriesData)
      
      // Calcular paginación en frontend
      const totalCount = allCategoriesData.length
      const totalPagesCalculated = Math.ceil(totalCount / pageSize)
      const startIndex = (page - 1) * pageSize
      const endIndex = startIndex + pageSize
      const paginatedCategories = allCategoriesData.slice(startIndex, endIndex)
      
      // Actualizar estados
      setCategories(paginatedCategories)
      setTotalItems(totalCount)
      setTotalPages(totalPagesCalculated)
      setCurrentPage(page)
    } catch (error: any) {
      if (error.name === 'AbortError' || error.name === 'CanceledError') {
      } else if (!signal?.aborted) {
        console.error("Error fetching categories:", error)
        setCategories([])
        setAllCategories([])
        setTotalItems(0)
        setTotalPages(1)
      }
    }
  }, [request, searchText]) // Removemos pageSize de las dependencias

  useEffect(() => {
    const controller = new AbortController()
    fetchCategories(1, controller.signal)

    return () => {
      controller.abort()
    }
  }, [fetchCategories])

  const handleDeleteClick = (categoryId: string) => {
    setCategoryToDelete(categoryId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!categoryToDelete) return

    if (!hasPermission('eliminar_categorias')) {
      toast.error("Sin permisos", {
        description: "No tienes permisos para eliminar categorías",
      })
      return
    }

    try {
      await request({
        method: "DELETE",
        url: `${apiBasePath}/${categoryToDelete}`,
      })

      // Recargar todas las categorías desde el backend para mantener consistencia
      await fetchCategories(1)

      toast.success("Categoría eliminada", {
        description: "La categoría ha sido eliminada correctamente",
      })
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "No se pudo eliminar la categoría"
      toast.error("Error", {
        description: errorMsg,
      })
    } finally {
      setDeleteDialogOpen(false)
      setCategoryToDelete(null)
    }
  }

  // Funciones de paginación
  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages && pageNumber !== currentPage && !loading) {
      // Paginación frontend - no necesitamos fetchCategories, solo re-procesar
      const startIndex = (pageNumber - 1) * pageSize
      const endIndex = startIndex + pageSize
      const paginatedCategories = allCategories.slice(startIndex, endIndex)
      
      setCategories(paginatedCategories)
      setCurrentPage(pageNumber)
    }
  }

  const handlePageSizeChange = (newPageSize: string) => {
    const size = parseInt(newPageSize, 10)
    setPageSize(size)
    setCurrentPage(1)
    
    // Recalcular paginación con el nuevo tamaño
    const totalPagesCalculated = Math.ceil(allCategories.length / size)
    const paginatedCategories = allCategories.slice(0, size) // Primera página
    
    setTotalPages(totalPagesCalculated)
    setCategories(paginatedCategories)
  }


  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchCategories(currentPage)} disabled={loading} title="Refrescar">
            <RotateCw className={loading ? "animate-spin h-4 w-4" : "h-4 w-4"} />
          </Button>
          {hasPermission(permissions.create) && (
            <Button asChild>
              <Link to={`${basePath}/nuevo`}>
                <Plus className="mr-2 h-4 w-4" />
                {newLabel}
              </Link>
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
              placeholder={searchPlaceholder} 
              className="w-full pl-8" 
              value={searchText} 
              onChange={e => setSearchText(e.target.value)} 
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <RotateCw className="animate-spin mr-2 h-5 w-5" /> Cargando categorías...
        </div>
      ) : (
        <div className="rounded-md border min-h-[120px]">
          <Table ref={tableRef}>
            <TableHeader>
              <TableRow>
                <ResizableTableHeader columnId="name" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps}>Nombre</ResizableTableHeader>
                <ResizableTableHeader columnId="description" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps}>Descripción</ResizableTableHeader>
                <ResizableTableHeader columnId="parent" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps}>Categoría Padre</ResizableTableHeader>
                <ResizableTableHeader columnId="children" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps}>Subcategorías</ResizableTableHeader>
                <ResizableTableHeader columnId="actions" getResizeHandleProps={getResizeHandleProps} getColumnHeaderProps={getColumnHeaderProps} className="text-center">Acciones</ResizableTableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No hay categorías
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                          {category.parent_id ? (
                            <FolderOpen className="h-4 w-4" />
                          ) : (
                            <Folder className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">{category.name}</span>
                          {category.parent && (
                            <span className="text-xs text-muted-foreground">
                              Subcategoría de: {category.parent.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">
                        {category.description || "Sin descripción"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {category.parent ? (
                        <Badge variant="secondary">
                          {category.parent.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {category.children && category.children.length > 0 ? (
                        <Badge variant="outline">
                          {category.children.length} subcategoría{category.children.length > 1 ? 's' : ''}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {hasPermission(permissions.view) && (
                          <Button variant="ghost" size="icon" title="Ver" className="hover:bg-blue-100 group" asChild>
                            <Link to={`${basePath}/${category.id}/ver`}>
                              <Eye className="h-4 w-4 text-blue-600 group-hover:text-blue-700" />
                            </Link>
                          </Button>
                        )}
                        {hasPermission(permissions.edit) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Editar"
                            className="text-orange-500 hover:text-orange-700 hover:bg-orange-50"
                            asChild
                          >
                            <Link to={`${basePath}/${category.id}`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                        {hasPermission(permissions.delete) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Eliminar"
                            className="hover:bg-red-100 group"
                            onClick={() => handleDeleteClick(category.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600 group-hover:text-red-700" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Paginación */}
      {totalItems > 0 && (
        <div className="flex flex-col space-y-4 px-2">
          {/* Información de filas y selector de tamaño */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium">Filas por página</p>
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent side="top">
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="15">15</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Paginación para categorías */}
          <Pagination
            currentPage={currentPage}
            lastPage={totalPages}
            total={totalItems}
            itemName={itemName}
            onPageChange={(page) => goToPage(page)}
            disabled={loading}
          />
        </div>
      )}

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la categoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
