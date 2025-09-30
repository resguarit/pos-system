import { useParams } from 'react-router-dom'
import UserForm from "@/components/users/user-form"

export default function VerUsuarioPage() {
  const { id } = useParams<{ id: string }>();
  
  return (
    <UserForm 
      userId={id}
      viewOnly={true}
    />
  )
}
