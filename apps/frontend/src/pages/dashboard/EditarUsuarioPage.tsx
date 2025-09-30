import { useParams } from 'react-router-dom'
import UserForm from "@/components/users/user-form"

export default function EditarUsuarioPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <UserForm 
      userId={id}
    />
  )
}
