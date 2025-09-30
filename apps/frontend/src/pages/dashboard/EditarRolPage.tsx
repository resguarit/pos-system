import { useParams } from 'react-router-dom';
import RoleForm from "@/components/roles/role-form"
import { ProtectedRoute } from "@/components/ProtectedRoute"

export default function EditarRolPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <ProtectedRoute permissions={['editar_roles']} requireAny={true}>
      <RoleForm roleId={id}/> 
    </ProtectedRoute>
  )
}

