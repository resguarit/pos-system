
import CustomerForm from "@/components/customers/customer-form"
import { useParams } from 'react-router-dom';

export default function VerClientePage() {
  const { id } = useParams<{ id: string }>();

  return <CustomerForm 
    customerId={id} 
    viewOnly={true} 
  />
}
