
import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { BranchesForm } from "@/components/branches/branches-form"
import useApi from "@/hooks/useApi"
import { useEntityContext } from "@/context/EntityContext"
import { sileo } from "sileo"

// Define the Branch interface to be compatible with BranchesForm
interface User { // Copied from branches-form.tsx for compatibility context
  id: number;
  email: string;
  username: string;
  active: boolean;
  person: {
    id: number;
    first_name: string;
    last_name: string;
  };
  full_name?: string;
}

interface Branch {
  id: number;
  name: string; // Assuming name is available or handled in BranchesForm
  description: string;
  address: string;
  phone: string;
  email?: string;
  manager_id?: number | null;
  status: number; // status is number in BranchesForm
  point_of_sale?: string;
  color?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: number | null; // From original page, might be same as manager_id
  user?: User | null;      // From original page
}

export default function ViewBranchPage() {
  const { id } = useParams<{ id: string }>();
  const { request } = useApi();
  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const { state, dispatch } = useEntityContext();

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    async function fetchBranch() {
      setLoading(true)
      const cachedBranch = state.branches && state.branches[id!]
      if (cachedBranch) {
        setBranch(cachedBranch as Branch) // Type assertion
        setLoading(false)
        return
      }
      try {
        // The request hook returns response.data directly (typed as any by default in useApi)
        const responseData = await request({ method: "GET", url: `/branches/${id}`, signal });
        // Perform type assertion here if confident about the shape of responseData.data
        const fetchedBranch = responseData?.data as Branch || null; 
        
        // Ensure name is present if BranchesForm strictly requires it and API might not provide it.
        // For now, assuming API provides `name` or BranchesForm handles its potential absence.
        // if (fetchedBranch && typeof fetchedBranch.name === 'undefined') {
        //   fetchedBranch.name = fetchedBranch.description; // Example fallback
        // }

        setBranch(fetchedBranch)
        if (fetchedBranch) {
          dispatch({ type: "SET_ENTITY", entityType: "branches", id: id!, entity: fetchedBranch })
        }
      } catch (e: any) {
        if (e.name === 'AbortError') {
        } else {
          setBranch(null)
          sileo.error({ title: "Error al cargar los detalles de la sucursal." })
        }
      } finally {
        setLoading(false)
      }
    }
    fetchBranch()
    
    return () => {
      controller.abort();
    };
    // eslint-disable-next-line
  }, [id, state.branches, dispatch, request])

  if (loading) return <div className="p-8 text-center">Cargando...</div>
  if (!branch) return <div className="p-8 text-center text-red-500">No se encontró la sucursal o hubo un error al cargarla.</div>

  return (
    <div className="container mx-auto p-4">
      <BranchesForm branch={branch} isReadOnly={true} /> 
    </div>
  );
}
