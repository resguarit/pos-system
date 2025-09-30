
import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { BranchesForm } from "@/components/branches/branches-form"
import { getBranchById } from "@/lib/api/branchService"
import { useEntityContext } from "@/context/EntityContext"

export default function EditarSucursalPage() {
  const { id } = useParams<{ id: string }>();
  const [branch, setBranch] = useState<any>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { state, dispatch } = useEntityContext()

  useEffect(() => {
    if (!id) return;
    
    const fetchBranch = async () => {
      setLoading(true)
      setError(null)
      // Attempt to get branch from context first
      const cachedBranch = state.branches && state.branches[id]
      if (cachedBranch) {
        setBranch(cachedBranch)
        setLoading(false)
        return
      }
      // If not in context, fetch from API
      try {
        const apiResponse: any = await getBranchById(id)
        const branchData = (apiResponse && typeof apiResponse === 'object' && 'data' in apiResponse) ? apiResponse.data : apiResponse
        let normalized = { ...branchData }
        if ('status' in branchData) {
          normalized.status =
            branchData.status === 1 ||
            branchData.status === "active" ||
            branchData.status === true
              ? 1
              : 0
        }
        setBranch(normalized)
        if (normalized) {
          dispatch({ type: "SET_ENTITY", entityType: "branches", id: id, entity: normalized })
        }
      } catch (err) {
        setError("No se pudo cargar la sucursal")
      } finally {
        setLoading(false)
      }
    }
    
    fetchBranch()
  }, [id, state.branches, dispatch])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-4">Cargando información de la sucursal...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        <div className="rounded-md bg-red-50 p-4 text-red-700">
          {error}
        </div>
      </div>
    )
  }

  return branch ? <BranchesForm branch={branch} isReadOnly={false} /> : null
}
