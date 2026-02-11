import { useState, useEffect, useRef } from 'react';
import { ChevronDown, MapPin, Check } from 'lucide-react';
import { useBranch } from '../context/BranchContext';
import { cn } from '@/lib/utils';

export function BranchSelector() {
  const { selectedBranch, branches, selectedBranchIds, setSelectedBranchIds, isLoading } = useBranch();
  const [isOpen, setIsOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const isDisabled = !branches || branches.length <= 1;

  const computeAlignment = () => {
    // Solo importa en >= sm (desktop/tablet). En mobile usamos panel fijo full width.
    if (!popoverRef.current || window.innerWidth < 640) return;
    const rect = popoverRef.current.getBoundingClientRect();
    const dropdownWidth = 288; // ~ w-72 en px
    const spaceRight = window.innerWidth - rect.left;
    // Si no entra hacia la derecha, anclar a la derecha del trigger
    setAlignRight(spaceRight < dropdownWidth + 16);
  };

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setIsOpen(false); }
    function onClick(e: MouseEvent) {
      if (!popoverRef.current) return;
      if (!popoverRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    if (isOpen) {
      computeAlignment();
      document.addEventListener('keydown', onKey);
      document.addEventListener('mousedown', onClick);
      window.addEventListener('resize', computeAlignment);
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('resize', computeAlignment);
    };
  }, [isOpen]);

  if (isLoading || !branches || branches.length === 0) {
    return (
      <div className="flex items-center space-x-2 text-gray-500">
        <MapPin className="h-4 w-4" />
        <span className="text-sm">Cargando sucursales...</span>
      </div>
    );
  }

  const toggleBranch = (id: string | number) => {
    const idStr = String(id);
    if (selectedBranchIds.includes(idStr)) setSelectedBranchIds(selectedBranchIds.filter((x) => x !== idStr));
    else setSelectedBranchIds([...selectedBranchIds, idStr]);
  };

  const toggleAll = () => {
    if (selectedBranchIds.length === branches.length) setSelectedBranchIds([String(branches[0].id)]);
    else setSelectedBranchIds(branches.map((b) => String(b.id)));
  };

  const label = selectedBranchIds.length > 1 ? `${selectedBranchIds.length} sucursales seleccionadas` : (selectedBranch?.description || 'Seleccionar sucursal');

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => { if (!isDisabled) setIsOpen(!isOpen); }}
        className={cn(
          "flex items-center space-x-2 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          "hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
          isDisabled && "text-gray-400 cursor-not-allowed opacity-60",
          !isDisabled && "text-gray-700",
          // Responsive sizing
          "min-w-0 flex-1 sm:flex-none sm:min-w-[200px]"
        )}
        disabled={isDisabled}
        aria-disabled={isDisabled}
      >
        <MapPin className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">{label}</span>
        {!isDisabled && (
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform flex-shrink-0",
            isOpen && "rotate-180"
          )} />
        )}
      </button>

      {!isDisabled && isOpen && (
        <div
          className={cn(
            "z-50 p-2 bg-white border border-gray-300 rounded-lg shadow-lg",
            "fixed left-2 right-2 top-16 max-h-[70vh] overflow-auto",
            "sm:absolute sm:top-auto sm:mt-2 sm:w-72 sm:max-h-72 sm:overflow-auto",
            alignRight ? "sm:right-0 sm:left-auto" : "sm:left-0 sm:right-auto"
          )}
        >
          <div className="flex items-center justify-between px-2 py-1 mb-1">
            <span className="text-xs text-gray-500">Mis sucursales ({branches.length})</span>
            {branches.length > 1 && (
              <button
                className="text-xs text-blue-600 hover:underline"
                onClick={toggleAll}
              >
                {selectedBranchIds.length === branches.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
              </button>
            )}
          </div>
          <div>
            {branches.map((branch) => {
              const checked = selectedBranchIds.includes(String(branch.id));
              return (
                <button
                  key={branch.id}
                  onClick={() => toggleBranch(branch.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors",
                    "hover:bg-gray-100",
                    checked && "bg-blue-50"
                  )}
                >
                  <span className={cn(
                    "h-4 w-4 inline-flex items-center justify-center rounded border",
                    checked ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300"
                  )}>
                    {checked && <Check className="h-3 w-3" />}
                  </span>
                  <div className="flex-1 text-left">
                    <div className={cn(
                      "font-medium flex items-center gap-2",
                      checked ? "text-blue-700" : "text-gray-700"
                    )}>
                      {branch.color && (
                        <div
                          className="w-3 h-3 rounded-full border"
                          style={{ backgroundColor: branch.color }}
                        />
                      )}
                      <span>{branch.description}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}