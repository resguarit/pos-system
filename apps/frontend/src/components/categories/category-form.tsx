import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useNavigate, Link, useParams } from "react-router-dom"
import axios from "axios"

// Componentes de UI
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

// Hooks
import useApi from "@/hooks/useApi"

// Iconos
import { ArrowLeft, Save, Loader2 } from "lucide-react"

export default function CategoryForm() {
  const navigate = useNavigate()
  const { request } = useApi()
  const { id: categoryId } = useParams()

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    parent_id: null as number | null,
  })

  const [parentCategories, setParentCategories] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDataLoading, setIsDataLoading] = useState(false)

  // Estados para validación de duplicados
  const [nameError, setNameError] = useState<string>("")
  const [isCheckingName, setIsCheckingName] = useState<boolean>(false)
  const [nameTimeoutId, setNameTimeoutId] = useState<number | null>(null)

  // --- Efecto Principal para Cargar Datos ---
  useEffect(() => {
    if (!categoryId) return

    const controller = new AbortController()
    const signal = controller.signal

    const loadData = async () => {
      setIsDataLoading(true)
      try {
        const response = await request({ 
          method: "GET", 
          url: `/categories/${categoryId}`, 
          signal 
        })

        if (signal.aborted) return

        const categoryData = response.data?.data || response.data || response
        setFormData({
          name: categoryData.name || "",
          description: categoryData.description || "",
          parent_id: categoryData.parent_id || null,
        })
      } catch (error: any) {
        if (!axios.isCancel(error)) {
          console.error("Error fetching category data:", error)
          toast.error("Error al cargar datos", { 
            description: "No se pudieron obtener los datos de la categoría." 
          })
          navigate("/dashboard/categorias")
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsDataLoading(false)
        }
      }
    }

    loadData()
    return () => controller.abort()
  }, [categoryId, request, navigate])

  // --- Efecto para Cargar Categorías Padre ---
  useEffect(() => {
    const controller = new AbortController()
    const signal = controller.signal

    const loadParentCategories = async () => {
      try {
        // Obtener categorías padre disponibles
        const response = await request({
          method: "GET",
          url: "/categories/parents",
          signal
        })
                
        
        if (signal.aborted) return
        
        // Extraer el array de datos de la respuesta estructurada del backend
        const categoriesData = response.data?.data || response.data || []
        
        // Asegurarse de que sea un array
        if (Array.isArray(categoriesData)) {
          setParentCategories(categoriesData)
        } else {
          setParentCategories([])
        }
      } catch (error: any) {
        if (!axios.isCancel(error)) {
          console.error("Error fetching parent categories:", error)
          setParentCategories([]) // Asegurar que sea un array vacío en caso de error
        }
      }
    }

    loadParentCategories()
    return () => controller.abort()
  }, [])

  // Limpiar timeout al desmontar el componente
  useEffect(() => {
    return () => {
      if (nameTimeoutId) {
        clearTimeout(nameTimeoutId)
      }
    }
  }, [nameTimeoutId])

  // --- Función para verificar duplicados ---
  const checkNameExists = async (name: string) => {
    if (!name.trim()) {
      setNameError("");
      return;
    }

    setIsCheckingName(true);
    try {
      const response = await request({
        method: 'GET',
        url: `/categories/check-name/${encodeURIComponent(name)}`
      });
      
      if (response.exists && name !== (categoryId ? formData.name : '')) {
        setNameError("Este nombre ya está en uso");
        toast.error("Este nombre ya está en uso", {
          description: "Por favor, elige un nombre diferente para la categoría."
        });
      } else {
        setNameError("");
      }
    } catch (error) {
      console.error("Error checking name:", error);
      setNameError("");
    } finally {
      setIsCheckingName(false);
    }
  };

  // --- Manejadores del Formulario ---
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    
    // Validación de duplicados con debounce para el nombre
    if (e.target.name === 'name') {
      // Limpiar timeout anterior si existe
      if (nameTimeoutId) {
        clearTimeout(nameTimeoutId)
      }
      
      // Crear nuevo timeout
      const newTimeoutId = setTimeout(() => {
        checkNameExists(e.target.value);
      }, 500);
      
      setNameTimeoutId(newTimeoutId);
    }
  }, [nameTimeoutId])

  const handleParentChange = useCallback((value: string) => {
    setFormData((prev) => ({ 
      ...prev, 
      parent_id: value === "none" ? null : Number(value) 
    }))
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validación de campos obligatorios
    const errors: string[] = []
    
    if (!formData.name?.trim()) {
      errors.push("El nombre de la categoría es obligatorio")
    }

    if (errors.length > 0) {
      toast.error("Campos obligatorios faltantes", {
        description: errors.join(", ")
      })
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        parent_id: formData.parent_id,
      }

      if (categoryId) {
        await request({ 
          method: 'PUT', 
          url: `/categories/${categoryId}`, 
          data: payload 
        })
        toast.success("Categoría actualizada con éxito.")
      } else {
        await request({ 
          method: 'POST', 
          url: '/categories', 
          data: payload 
        })
        toast.success("Categoría creada con éxito.")
      }
      
      navigate('/dashboard/categorias')
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.details?.name?.[0] || "Ocurrió un error inesperado."
      toast.error("Error al guardar", { description: errorMsg })
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, categoryId, request, navigate])

  // --- Renderizado ---
  if (isDataLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link to="/dashboard/categorias">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">
            {categoryId ? "Editar Categoría" : "Nueva Categoría"}
          </h2>
        </div>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {categoryId ? "Guardar Cambios" : "Crear Categoría"}
          </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto min-h-0 py-4">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Información de la Categoría</CardTitle>
              <p className="text-sm text-muted-foreground">
                Completa los datos de la categoría. Los campos marcados con * son obligatorios.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nombre de la Categoría <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input 
                    id="name" 
                    name="name" 
                    value={formData.name} 
                    onChange={handleInputChange} 
                    disabled={isSubmitting} 
                    required 
                    className={nameError ? 'border-red-500 focus:border-red-500 focus:ring-red-500 focus:ring-2' : ''}
                    style={{ borderColor: nameError ? '#ef4444' : undefined }}
                  />
                  {isCheckingName && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  value={formData.description} 
                  onChange={handleInputChange} 
                  disabled={isSubmitting} 
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="parent_id">Categoría Padre (Opcional)</Label>
                <Select
                  value={formData.parent_id ? String(formData.parent_id) : "none"}
                  onValueChange={handleParentChange}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría padre (opcional)" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    <SelectItem value="none">Sin categoría padre</SelectItem>
                    {Array.isArray(parentCategories) && parentCategories.map((parent) => (
                      <SelectItem 
                        key={parent.id} 
                        value={String(parent.id)}
                        disabled={categoryId === String(parent.id)}
                      >
                        {parent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Deja vacío para crear una categoría principal, o selecciona una para crear una subcategoría
                </p>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  )
}
