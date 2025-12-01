import { useParams } from 'react-router-dom';
import RoleForm from "@/components/roles/role-form"

export default function VerRolPage() {
  const { id } = useParams<{ id: string }>();
  return <RoleForm roleId={id} viewOnly={true} />;
}
