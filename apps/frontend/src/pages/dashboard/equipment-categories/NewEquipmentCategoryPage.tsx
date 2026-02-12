import CategoryForm from "@/components/categories/category-form"

export default function NewEquipmentCategoryPage() {
  return (
    <CategoryForm
      apiBasePath="/equipment-categories"
      listPath="/dashboard/equipos/categorias"
      entityLabel="Categoría de Equipo"
    />
  )
}
