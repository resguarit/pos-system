

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { Link } from "react-router-dom"

export function NewBranchButton() {
  return (
    <Button asChild>
      <Link to="/dashboard/sucursales/nuevo">
        <Plus className="mr-2 h-4 w-4" />
        Nueva Sucursal
      </Link>
    </Button>
  )
}
