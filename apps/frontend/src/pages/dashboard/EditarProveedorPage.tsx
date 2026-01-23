import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import SupplierForm from "@/components/suppliers/supplier-form"
import useEntityWithCache from "@/hooks/useEntityWithCache"
import type { Supplier } from "@/types/product"

export default function EditarProveedorPage() {
  const { id } = useParams<{ id: string }>()
  const { cachedEntities } = useEntityWithCache()
  const [supplierData, setSupplierData] = useState<Supplier | null>(null)

  useEffect(() => {
    if (!id) return
    
    // If ya existe en caché, usarlo
    const suppliers = cachedEntities.suppliers as Record<string, Supplier> | undefined
    if (suppliers && suppliers[id]) {
      setSupplierData(suppliers[id])
      return
    }
  }, [id, cachedEntities.suppliers])
  
  return <SupplierForm 
    supplierId={id}
    viewOnly={false} 
    supplierData={supplierData || undefined} 
  />
}
