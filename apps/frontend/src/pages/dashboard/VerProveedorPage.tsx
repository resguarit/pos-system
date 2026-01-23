import { useParams } from 'react-router-dom'
import SupplierForm from "@/components/suppliers/supplier-form"

export default function VerProveedorPage() {
  const { id } = useParams<{ id: string }>()

  return <SupplierForm 
    supplierId={id} 
    viewOnly={true} 
  />
}
