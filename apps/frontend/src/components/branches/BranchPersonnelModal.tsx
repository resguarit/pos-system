import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Loader2, User as UserIcon } from "lucide-react"
import useApi from "@/hooks/useApi"
import { sileo } from "sileo"
import { RoleBadge } from "@/components/roles/RoleBadge"

interface Employee {
  id: string;
  person: {
    first_name: string;
    last_name: string;
  } | null;
  job_title: string | null;
  user?: {
    role: {
      name: string;
    };
  };
}

interface BranchPersonnelModalProps {
  branchId: string | null;
  branchName: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function BranchPersonnelModal({
  branchId,
  branchName,
  isOpen,
  onClose,
}: BranchPersonnelModalProps) {
  const { request } = useApi();
  const [personnel, setPersonnel] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && branchId) {
      const fetchPersonnel = async () => {
        setIsLoading(true);
        try {
          // Endpoint para obtener los usuarios de una sucursal específica
          const response = await request({
            method: "GET",
            url: `/branches/${branchId}/personnel`,
          });
          setPersonnel(response.data || []);
        } catch (error) {
          console.error("Error fetching personnel:", error);
          sileo.error({ title: "Error",
            description: "No se pudo cargar el personal de la sucursal.",
          });
          setPersonnel([]); // Limpia en caso de error
        } finally {
          setIsLoading(false);
        }
      };
      fetchPersonnel();
    }
  }, [isOpen, branchId, request]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Personal de la Sucursal</DialogTitle>
          <DialogDescription>
            Empleados asignados a la sucursal "{branchName}".
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : personnel.length > 0 ? (
            <ul className="space-y-3">
              {personnel.map((employee) => {
                const firstName = employee.person?.first_name || '';
                const lastName = employee.person?.last_name || '';
                const initials = `${firstName[0] || ''}${lastName[0] || ''}` || 'E';
                const fullName = employee.person
                  ? `${firstName} ${lastName}`.trim()
                  : 'Empleado sin información de persona';

                return (
                  <li key={employee.id} className="flex items-center justify-between p-2 rounded-md border">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {fullName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {employee.job_title || 'Sin puesto'}
                        </span>
                      </div>
                    </div>
                    {employee.user?.role && (
                      <RoleBadge
                        roleName={employee.user.role.name}
                        iconSize="h-3.5 w-3.5"
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-center text-sm text-muted-foreground py-10">
              <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2">No hay personal asignado a esta sucursal.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
