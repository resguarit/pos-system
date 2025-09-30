import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Building, ChevronDown, Check, MapPin } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export function UserBranchSwitcher() {
  const { 
    user, 
    branches, 
    currentBranch, 
    changeBranch, 
    isAdmin, 
    getUserDisplayName 
  } = useAuth();
  
  const [isOpen, setIsOpen] = useState(false);

  if (!user || !branches || branches.length === 0) {
    return null;
  }

  // Si solo hay una sucursal, mostrar información sin selector
  if (branches.length === 1 && !isAdmin()) {
    const singleBranch = branches[0];
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Building className="h-4 w-4" />
        <span>{singleBranch.description}</span>
      </div>
    );
  }

  const handleBranchChange = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    if (branch && branch.id !== currentBranch?.id) {
      changeBranch(branch);
      setIsOpen(false);
      toast.success('Sucursal cambiada', {
        description: `Ahora trabajas en ${branch.description}`
      });
    }
  };

  const getCurrentBranchDisplay = () => {
    if (!currentBranch) {
      return 'Seleccionar sucursal';
    }
    return currentBranch.description;
  };

  const getBranchStatusBadge = (status?: number) => {
    if (status === 1) {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">Activa</Badge>;
    }
    return <Badge variant="destructive" className="text-xs">Inactiva</Badge>;
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 justify-between min-w-[200px]"
          >
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              <span className="truncate">{getCurrentBranchDisplay()}</span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex flex-col">
            <span>Sucursales disponibles</span>
            <span className="text-xs text-muted-foreground font-normal">
              {getUserDisplayName()} {isAdmin() && '(Administrador)'}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {branches.map((branch) => (
            <DropdownMenuItem
              key={branch.id}
              onClick={() => handleBranchChange(branch.id)}
              className="cursor-pointer flex items-center justify-between p-3"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    {branch.color && (
                      <div 
                        className="w-3 h-3 rounded-full border"
                        style={{ backgroundColor: branch.color }}
                      />
                    )}
                    <span className="font-medium">{branch.description}</span>
                  </div>
                  {currentBranch?.id === branch.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
                
                {branch.address && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{branch.address}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between mt-2">
                  {getBranchStatusBadge(branch.status)}
                  {branch.phone && (
                    <span className="text-xs text-muted-foreground">
                      {branch.phone}
                    </span>
                  )}
                </div>
              </div>
            </DropdownMenuItem>
          ))}
          
          {isAdmin() && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Como administrador, tienes acceso a todas las sucursales del sistema
              </DropdownMenuLabel>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
