import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import CustomerForm from "@/components/customers/customer-form"
import useEntityWithCache from "@/hooks/useEntityWithCache"

export default function EditarClientePage() {
  const { id } = useParams<{ id: string }>();
  const { cachedEntities } = useEntityWithCache();
  const [customerData, setCustomerData] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    
    // If ya existe en caché, usarlo
    if (cachedEntities.customers && cachedEntities.customers[id]) {
      setCustomerData(cachedEntities.customers[id]);
      return;
    }
    
    // Si no está en caché, no intentamos cargarlo aquí
    // El componente CustomerForm lo manejará directamente
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, cachedEntities.customers]);
  
  return <CustomerForm 
    customerId={id}
    viewOnly={false} 
    customerData={customerData} 
  />
}