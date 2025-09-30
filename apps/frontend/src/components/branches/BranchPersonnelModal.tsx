import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Loader2, User as UserIcon } from "lucide-react"
import useApi from "@/hooks/useApi"
import { toast } from "sonner"
import { getRoleStyle } from "@/types/roles-styles"

interface User {
  id: string;
  person: {
    first_name: string;
    last_name: string;
  };
  role: {
    name: string;
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
  const [personnel, setPersonnel] = useState<User[]>([]);
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
          toast.error("Error", {
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
              {personnel.map((user) => {
                const roleStyle = getRoleStyle(user.role.name);
                const RoleIcon = roleStyle.icon;
                const roleColor = roleStyle.color;
                const userInitials = `${user.person.first_name[0] || ''}${user.person.last_name[0] || ''}`;

                return (
                  <li key={user.id} className="flex items-center justify-between p-2 rounded-md border">
                    <div className="flex items-center gap-3">
                      <Avatar>
                         <AvatarFallback>{userInitials}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {user.person.first_name} {user.person.last_name}
                      </span>
                    </div>
                    <Badge variant="outline" className={`flex items-center gap-1.5 ${roleColor}`}>
                      <RoleIcon className="h-3.5 w-3.5" />
                      {user.role.name}
                    </Badge>
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
