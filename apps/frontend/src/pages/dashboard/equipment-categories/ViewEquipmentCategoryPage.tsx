import CategoryDetails from "@/components/categories/category-details"

export default function ViewEquipmentCategoryPage() {
  return (
    <CategoryDetails
      apiBasePath="/equipment-categories"
      basePath="/dashboard/equipos/categorias"
      entityLabel="Categoría de Equipo"
      permissions={{
        view: "ver_categorias_equipos",
        edit: "editar_categorias_equipos",
      }}
    />
  )
}
