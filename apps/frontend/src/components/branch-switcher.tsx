import { useBranch } from '@/context/BranchContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSkeleton } from '@/components/ui/loading-states';
import { Building } from 'lucide-react';

export function BranchSwitcher() {
  // Consumimos los datos del contexto
  const { branches, selectedBranch, selectedBranchIds, setSelectedBranchIds, isLoading } = useBranch();

  const handleSelectChange = (branchId: string) => {
    if (!branchId) return;
    setSelectedBranchIds([branchId]);
  };

  // Mostramos un esqueleto mientras cargan los datos
  if (isLoading) {
    return <LoadingSkeleton height="h-10" className="w-[200px]" items={1} />;
  }

  // No mostramos nada si no hay sucursales
  if (!branches || branches.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Building className="h-5 w-5 text-muted-foreground" />
      <Select
        value={selectedBranch?.id?.toString() ?? selectedBranchIds?.[0] ?? ''}
        onValueChange={handleSelectChange}
        // Lógica clave: Se deshabilita si hay 1 o menos sucursales
        disabled={branches.length <= 1}
      >
        <SelectTrigger className="w-auto md:w-[180px]">
          <SelectValue placeholder="Seleccionar sucursal" />
        </SelectTrigger>
        <SelectContent>
          {branches.map((branch) => (
            <SelectItem key={branch.id} value={branch.id.toString()}>
              <div className="flex items-center gap-2">
                {branch.color && (
                  <div 
                    className="w-3 h-3 rounded-full border"
                    style={{ backgroundColor: branch.color }}
                  />
                )}
                <span>{branch.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}