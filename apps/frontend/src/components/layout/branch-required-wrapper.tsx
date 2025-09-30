import { useBranch } from "@/context/BranchContext"
import SelectBranchPlaceholder from "@/components/ui/select-branch-placeholder"
import type { ReactNode } from "react"

interface BranchRequiredWrapperProps {
  children: ReactNode
  title?: string
  description?: string
  requireSingleBranch?: boolean // Si true, requiere una sola sucursal específica
  allowMultipleBranches?: boolean // Si true, permite múltiples sucursales
}

export default function BranchRequiredWrapper({
  children,
  title = "Selecciona una sucursal",
  description = "Debes seleccionar una sucursal para poder usar esta funcionalidad.",
  requireSingleBranch = false,
  allowMultipleBranches = true
}: BranchRequiredWrapperProps) {
  const { selectedBranchIds, selectedBranch } = useBranch()

  // Verificar si hay sucursales seleccionadas
  const hasNoBranches = selectedBranchIds.length === 0
  
  // Verificar si requiere una sola sucursal específica
  const needsSingleBranch = requireSingleBranch && !selectedBranch
  
  // Verificar si no permite múltiples sucursales
  const hasMultipleBranchesWhenNotAllowed = !allowMultipleBranches && selectedBranchIds.length > 1

  if (hasNoBranches || needsSingleBranch || hasMultipleBranchesWhenNotAllowed) {
    let customDescription = description
    
    if (hasMultipleBranchesWhenNotAllowed) {
      customDescription = "Esta funcionalidad requiere que selecciones una sola sucursal específica."
    } else if (needsSingleBranch) {
      customDescription = "Esta funcionalidad requiere que selecciones una sucursal específica."
    }
    
    return <SelectBranchPlaceholder title={title} description={customDescription} />
  }

  return <>{children}</>
}


