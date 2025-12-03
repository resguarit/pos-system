import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import useApi from "@/hooks/useApi";
import type { BranchLike } from "@/types/branch.types";

export type { BranchLike };

interface BranchContextType {
  branches: BranchLike[];
  // Compat: primera seleccionada
  selectedBranch: BranchLike | null;
  // Multi selección
  selectedBranchIds: string[];
  setSelectedBranchIds: (ids: string[]) => void;
  // Compat: setear una sola
  setSelectedBranch: (branch: BranchLike) => void;
  isLoading: boolean;
  // Nuevo: token que cambia cuando cambia la selección, útil para triggers de refetch sin recargar
  selectionChangeToken: number;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

interface BranchProviderProps {
  children: ReactNode;
}

export function BranchProvider({ children }: BranchProviderProps) {
  const { isLoading: isAuthLoading, user } = useAuth();
  const { request } = useApi();

  const [branches, setBranches] = useState<BranchLike[]>([]);
  const [isBranchesLoading, setIsBranchesLoading] = useState<boolean>(false);
  const [selectedBranchIds, setSelectedBranchIdsState] = useState<string[]>([]);
  const [selectionChangeToken, setSelectionChangeToken] = useState<number>(0);

  // Detección de sucursal activa (posibles banderas)
  const isActiveBranch = (b: any) => {
    if (!b) return false;
    if (typeof b.status === "boolean") return b.status;
    if (typeof b.status === "number") return b.status === 1;
    if (typeof b.status === "string") {
      const v = b.status.toLowerCase();
      if (["1", "active", "activo", "true"].includes(v)) return true;
    }
    if (typeof b.active === "boolean") return b.active;
    if (typeof (b as any).is_active === "boolean") return (b as any).is_active;
    if (typeof (b as any).enabled === "boolean") return (b as any).enabled;
    // Si no hay flag conocida, asumir activa (compatibilidad)
    return true;
  };

  // Cargar sucursales del usuario autenticado
  useEffect(() => {
    if (isAuthLoading || !user) return;

    const loadUserBranches = async () => {
      setIsBranchesLoading(true);
      try {
        // Obtener IDs de sucursales del usuario (normalizar a string)
        const userBranchIds = (user?.branches || []).map((b: any) => String(b.id));
        
        if (userBranchIds.length === 0) {
          setBranches([]);
          return;
        }
        
        // Obtener datos completos de sucursales desde la API
        const response = await request({ method: 'GET', url: '/branches' });
        const allBranches = response?.data || response || [];
        
        // Filtrar solo las sucursales del usuario y que estén activas
        const list = allBranches
          .filter((b: any) => {
            const match = userBranchIds.includes(String(b.id));  // Normalizar a string
            const active = isActiveBranch(b);
            return match && active;
          })
          .map((b: any) => ({
            id: b.id,
            description: b.description || b.name || `Sucursal ${b.id}`,
            cuit: b.cuit,
            enabled_receipt_types: b.enabled_receipt_types,
            ...b,
          }));
        
        setBranches(list);
      } catch (error) {
        console.error('Error loading branches:', error);
        // Fallback: usar las sucursales del usuario sin datos completos
        const userBranches = user?.branches || [];
        const list = userBranches
          .filter((b: any) => isActiveBranch(b))
          .map((b: any) => ({
            id: b.id,
            description: b.description || b.name || `Sucursal ${b.id}`,
            ...b,
          }));
        setBranches(list);
      } finally {
        setIsBranchesLoading(false);
      }
    };

    loadUserBranches();
  }, [isAuthLoading, user, request]);

  // Derivar selectedBranch para compatibilidad
  const selectedBranch = useMemo(
    () => branches.find((b) => String(b.id) === (selectedBranchIds[0] ?? "")) || null,
    [branches, selectedBranchIds]
  );

  // Inicializar selección desde URL o localStorage cuando haya sucursales
  useEffect(() => {
    if (isAuthLoading) return;
    if (!branches || branches.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const urlIdsRaw: string[] = [
      ...params.getAll("branch"),
      ...params.getAll("branch_id"),
      ...params.getAll("branch_id[]"),
    ];
    const urlIds = Array.from(new Set(urlIdsRaw.map(String).filter(Boolean)));

    const stored = localStorage.getItem("selectedBranchIds");
    const lsIds = stored ? (JSON.parse(stored) as string[]) : [];

    const isValid = (id: string) => branches.some((b) => String(b.id) === String(id));
    const validUrlIds = urlIds.filter(isValid);
    const validLsIds = lsIds.filter(isValid);

    const initialIds =
      validUrlIds.length > 0
        ? validUrlIds
        : validLsIds.length > 0
        ? validLsIds
        : branches[0]
        ? [String(branches[0].id)]
        : [];

    setSelectedBranchIdsState(initialIds);

    if (validUrlIds.length > 0) {
      localStorage.setItem("selectedBranchIds", JSON.stringify(validUrlIds));
    }
  }, [isAuthLoading, branches]);

  // Helper: compara conjuntos (sin importar orden)
  const sameIds = (a: string[], b: string[]) => {
    if (a.length !== b.length) return false;
    const setA = new Set(a.map(String));
    for (const id of b) {
      if (!setA.has(String(id))) return false;
    }
    return true;
  };

  const persistIds = (ids: string[]) => {
    const normalized = ids.map(String).filter(Boolean);
    if (sameIds(selectedBranchIds, normalized)) return;

    setSelectedBranchIdsState(normalized);
    localStorage.setItem("selectedBranchIds", JSON.stringify(normalized));

    // Actualizar URL con los filtros de sucursales seleccionadas
    const url = new URL(window.location.href);
    const sp = url.searchParams;

    // Limpiar claves previas relacionadas
    sp.delete("branch");
    sp.delete("branch_id");
    sp.delete("branch_id[]");
    sp.delete("stock"); // evitar que persista stock=alerts al cambiar sucursales
    sp.delete("category"); // limpiar categorías preseleccionadas
    sp.delete("categories");
    sp.delete("q"); // limpiar posibles búsquedas en distintas vistas
    sp.delete("search");
    sp.delete("term");

    // Escribir múltiples params branch=ID para compatibilidad con páginas que leen del URL
    normalized.forEach((id) => sp.append("branch", id));
    // Opcional: también exponer branch_id[] en URL
    normalized.forEach((id) => sp.append("branch_id[]", id));

    const newUrl = `${url.pathname}${sp.toString() ? `?${sp.toString()}` : ""}${url.hash}`;
    window.history.replaceState(null, "", newUrl);

    // Notificar cambio sin recargar la página
    setSelectionChangeToken((t) => t + 1);
    try {
      window.dispatchEvent(new CustomEvent("branch:changed", { detail: normalized }));
    } catch {
      // no-op
    }
  };

  const setSelectedBranchIds = (ids: string[]) => {
    persistIds(ids);
  };

  const setSelectedBranch = (branch: BranchLike) => {
    // Compat: selecciona solo una y persiste
    persistIds([String(branch.id)]);
  };

  return (
    <BranchContext.Provider
      value={{
        branches,
        selectedBranch,
        selectedBranchIds,
        setSelectedBranchIds,
        setSelectedBranch,
        isLoading: isAuthLoading || isBranchesLoading,
        selectionChangeToken,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error("useBranch must be used within a BranchProvider");
  }
  return context;
}