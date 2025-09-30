import RoleForm from "@/components/roles/role-form"
import { ProtectedRoute } from "@/components/ProtectedRoute"

export default function NuevoRolPage() {
  return (
    <ProtectedRoute permissions={['crear_roles']} requireAny={true}>
      <RoleForm />
    </ProtectedRoute>
  )
}
