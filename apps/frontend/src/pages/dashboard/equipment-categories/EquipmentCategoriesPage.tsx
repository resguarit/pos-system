import CategoriesPage from "@/pages/dashboard/CategoriesPage"
import { useAuth } from "@/hooks/useAuth"

export default function EquipmentCategoriesPage() {
  const { hasPermission } = useAuth()

  return (
    <CategoriesPage
      apiBasePath="/equipment-categories"
      basePath="/dashboard/equipos/categorias"
      title="Categorías de Equipos"
      newLabel="Nueva Categoría de Equipo"
      itemName="categoría de equipo"
      searchPlaceholder="Buscar categorías de equipos..."
      permissions={{
        view: "ver_categorias_equipos",
        create: "crear_categorias_equipos",
        edit: "editar_categorias_equipos",
        delete: "eliminar_categorias_equipos",
      }}
    />
  )
}
