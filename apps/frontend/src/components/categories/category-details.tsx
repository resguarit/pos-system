import { useState, useEffect } from "react"
import { useNavigate, Link, useParams } from "react-router-dom"
import axios from "axios"

// Componentes de UI
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"

// Hooks
import useApi from "@/hooks/useApi"
import { useAuth } from "@/hooks/useAuth"

// Iconos
import { ArrowLeft, Loader2, FolderOpen, Folder, Eye, Pencil } from "lucide-react"

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

export default function CategoryDetails() {
  const navigate = useNavigate()
  const { request } = useApi()
  const { hasPermission } = useAuth()
  const { id: categoryId } = useParams()

  const [category, setCategory] = useState<Category | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!categoryId) return

    const controller = new AbortController()
    const signal = controller.signal

    const loadCategoryDetails = async () => {
      setIsLoading(true)
      try {
        const response = await request({ 
          method: "GET", 
          url: `/categories/${categoryId}`, 
          signal 
        })

        if (signal.aborted) return

        const categoryData = response.data?.data || response.data || response
        setCategory(categoryData)
      } catch (error: any) {
        if (!axios.isCancel(error)) {
          console.error("Error fetching category details:", error)
          toast.error("Error al cargar datos", { 
            description: "No se pudieron obtener los datos de la categoría." 
          })
          navigate("/dashboard/categorias")
        }
      } finally {
        if (!signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadCategoryDetails()
    return () => controller.abort()
  }, [categoryId, request, navigate])

  const handleViewSubcategory = (subcategoryId: string) => {
    navigate(`/dashboard/categorias/${subcategoryId}/ver`)
  }

  const handleEditSubcategory = (subcategoryId: string) => {
    navigate(`/dashboard/categorias/${subcategoryId}`)
  }

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!category) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <p className="text-muted-foreground">No se encontró la categoría.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link to="/dashboard/categorias">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">Detalles de Categoría</h2>
        </div>
        {hasPermission('editar_categorias') && (
          <Button asChild>
            <Link to={`/dashboard/categorias/${category.id}`}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar Categoría
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {/* Información General de la Categoría */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {category.parent_id ? (
                <FolderOpen className="h-5 w-5" />
              ) : (
                <Folder className="h-5 w-5" />
              )}
              Información General
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nombre</p>
                <p className="text-lg font-semibold">{category.name}</p>
              </div>
              
              {category.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Descripción</p>
                  <p className="text-lg">{category.description}</p>
                </div>
              )}
              
              {category.parent && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Categoría Padre</p>
                  <Badge variant="secondary" className="text-base mt-1">
                    {category.parent.name}
                  </Badge>
                </div>
              )}
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                <p className="text-lg">
                  {category.parent_id ? "Subcategoría" : "Categoría Principal"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fecha de Creación</p>
                <p className="text-base">
                  {new Date(category.created_at).toLocaleDateString('es-AR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Última Actualización</p>
                <p className="text-base">
                  {new Date(category.updated_at).toLocaleDateString('es-AR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subcategorías */}
        {category.children && category.children.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Subcategorías ({category.children.length})</span>
                <Badge variant="outline" className="text-base">
                  {category.children.length} subcategoría{category.children.length > 1 ? 's' : ''}
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Lista de subcategorías asociadas a esta categoría
              </p>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableCell className="font-medium">Nombre</TableCell>
                      <TableCell className="font-medium">Descripción</TableCell>
                      <TableCell className="font-medium text-right">Acciones</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {category.children.map((child) => (
                      <TableRow key={child.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                              <FolderOpen className="h-4 w-4" />
                            </div>
                            <span className="font-medium">{child.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">
                            {child.description || "Sin descripción"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {hasPermission('ver_categorias') && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Ver subcategoría" 
                                className="hover:bg-blue-100 group"
                                onClick={() => handleViewSubcategory(child.id)}
                              >
                                <Eye className="h-4 w-4 text-blue-600 group-hover:text-blue-700" />
                              </Button>
                            )}
                            {hasPermission('editar_categorias') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Editar subcategoría"
                                className="text-orange-500 hover:text-orange-700 hover:bg-orange-50"
                                onClick={() => handleEditSubcategory(child.id)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mensaje cuando no hay subcategorías */}
        {(!category.children || category.children.length === 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Subcategorías</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Esta categoría no tiene subcategorías asociadas.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
