import { useState, useCallback, useRef, useEffect } from "react";
import useApi from "@/hooks/useApi";
import { useBranch } from "@/context/BranchContext";
import { toast } from "sonner";
import type {
    Repair,
    RepairFilters,
    RepairStats,
    RepairStatus,
    RepairPriority,
    KanbanColumn
} from "@/types/repairs";

const REPAIR_STATUSES: RepairStatus[] = [
    "Recibido",
    "En diagnóstico",
    "Reparación Interna",
    "Reparación Externa",
    "Esperando repuestos",
    "Terminado",
    "Entregado",
];

const REPAIR_PRIORITIES: RepairPriority[] = ["Alta", "Media", "Baja"];

type UseRepairsOptions = {
    autoFetch?: boolean;
    perPage?: number;
};

type UseRepairsReturn = {
    // Data
    repairs: Repair[];
    stats: RepairStats;
    kanbanData: KanbanColumn[];
    options: { statuses: RepairStatus[]; priorities: RepairPriority[]; insurers: { id: number; name: string }[] };

    // Loading states
    loading: boolean;
    statsLoading: boolean;

    // Filters
    filters: RepairFilters;
    setFilters: React.Dispatch<React.SetStateAction<RepairFilters>>;

    // Actions
    fetchRepairs: (signal?: AbortSignal) => Promise<void>;
    fetchStats: (signal?: AbortSignal) => Promise<void>;
    fetchKanban: (signal?: AbortSignal) => Promise<void>;
    createRepair: (data: CreateRepairData) => Promise<Repair | null>;
    updateRepair: (id: number, data: UpdateRepairData) => Promise<Repair | null>;
    deleteRepair: (id: number) => Promise<boolean>;
    updateStatus: (id: number, status: RepairStatus) => Promise<Repair | null>;
    addNote: (id: number, note: string) => Promise<boolean>;
    getRepair: (id: number) => Promise<Repair | null>;
    downloadPdf: (id: number) => Promise<void>;
    refresh: () => void;
};

type CreateRepairData = {
    customer_id: number;
    branch_id: number;
    device: string;
    serial_number?: string;
    issue_description: string;
    diagnosis?: string;
    priority: RepairPriority;
    status?: RepairStatus;
    estimated_date?: string;
    technician_id?: number;
    initial_notes?: string;
    cost?: number;
    sale_price?: number;
};

type UpdateRepairData = Partial<CreateRepairData> & {
    sale_id?: number;
};

export function useRepairs(options: UseRepairsOptions = {}): UseRepairsReturn {
    const { autoFetch = true, perPage = 50 } = options;
    const { request } = useApi();
    const { selectedBranchIds, selectionChangeToken } = useBranch();

    // State
    const [repairs, setRepairs] = useState<Repair[]>([]);
    const [stats, setStats] = useState<RepairStats>({
        total: 0,
        enProceso: 0,
        terminadas: 0,
        entregadas: 0,
    });
    const [kanbanData, setKanbanData] = useState<KanbanColumn[]>([]);
    const [loading, setLoading] = useState(false);
    const [statsLoading, setStatsLoading] = useState(false);
    const [filters, setFilters] = useState<RepairFilters>({});

    // Refs for stable values
    const filtersRef = useRef(filters);
    useEffect(() => {
        filtersRef.current = filters;
    }, [filters]);

    const [insurers, setInsurers] = useState<{ id: number; name: string }[]>([]);

    const repairsOptions = {
        statuses: REPAIR_STATUSES,
        priorities: REPAIR_PRIORITIES,
        insurers,
    };

    // Build query params from filters
    const buildParams = useCallback(() => {
        const params: Record<string, string | number> = { per_page: perPage };
        const f = filtersRef.current;

        if (f.search?.trim()) params.search = f.search.trim();
        if (f.status && f.status !== "all") params.status = f.status;
        if (f.priority && f.priority !== "all") params.priority = f.priority;
        if (f.technician_id) params.technician_id = f.technician_id;
        if (f.insurer_id) params.insurer_id = f.insurer_id;
        if (f.from_date) params.from_date = f.from_date;
        if (f.to_date) params.to_date = f.to_date;
        if (f.sort_by) {
            params.sort_by = f.sort_by;
            params.sort_dir = f.sort_dir || "desc";
        }

        // Branch from context
        if (selectedBranchIds?.[0] && selectedBranchIds[0] !== "all") {
            params.branch_id = selectedBranchIds[0];
        }

        return params;
    }, [perPage, selectedBranchIds]);

    // Fetch repairs list
    const fetchRepairs = useCallback(
        async (signal?: AbortSignal) => {
            try {
                setLoading(true);
                const params = buildParams();
                const resp = await request({ method: "GET", url: "/repairs", params, signal });
                const data = Array.isArray(resp?.data)
                    ? resp.data
                    : Array.isArray(resp)
                        ? resp
                        : Array.isArray(resp?.data?.data)
                            ? resp.data.data
                            : [];
                setRepairs(data as Repair[]);
            } catch (err: unknown) {
                const error = err as { name?: string; message?: string };
                if (error?.name !== "AbortError" && error?.message !== "canceled") {
                    console.error("Error fetching repairs", err);
                    toast.error("No se pudieron cargar las reparaciones");
                    setRepairs([]);
                }
            } finally {
                setLoading(false);
            }
        },
        [request, buildParams]
    );

    // Fetch stats
    const fetchStats = useCallback(
        async (signal?: AbortSignal) => {
            try {
                setStatsLoading(true);
                const params = buildParams();
                delete params.per_page;
                const resp = await request({ method: "GET", url: "/repairs/stats", params, signal });
                if (resp && typeof resp === "object") {
                    setStats({
                        total: Number((resp as Record<string, unknown>).total) || 0,
                        enProceso: Number((resp as Record<string, unknown>).enProceso) || 0,
                        terminadas: Number((resp as Record<string, unknown>).terminadas) || 0,
                        entregadas: Number((resp as Record<string, unknown>).entregadas) || 0,
                    });
                }
            } catch {
                // Keep current stats on error
            } finally {
                setStatsLoading(false);
            }
        },
        [request, buildParams]
    );

    // Fetch kanban data
    const fetchKanban = useCallback(
        async (signal?: AbortSignal) => {
            try {
                setLoading(true);
                const params = buildParams();
                delete params.per_page;
                const resp = await request({ method: "GET", url: "/repairs/kanban", params, signal });

                if (resp && typeof resp === "object") {
                    const columns: KanbanColumn[] = REPAIR_STATUSES.map((status) => ({
                        id: status,
                        title: status,
                        items: Array.isArray((resp as Record<string, unknown>)[status])
                            ? ((resp as Record<string, unknown>)[status] as Repair[])
                            : [],
                    }));
                    setKanbanData(columns);
                }
            } catch (err: unknown) {
                const error = err as { name?: string; message?: string };
                if (error?.name !== "AbortError" && error?.message !== "canceled") {
                    console.error("Error fetching kanban data", err);
                    toast.error("No se pudo cargar la vista Kanban");
                }
            } finally {
                setLoading(false);
            }
        },
        [request, buildParams]
    );

    // Fetch insurers
    const fetchInsurers = useCallback(
        async (signal?: AbortSignal) => {
            try {
                const resp = await request({ method: "GET", url: "/insurers", signal });
                const data = Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp) ? resp : []);
                setInsurers(data as { id: number; name: string }[]);
            } catch (err) {
                console.error("Error fetching insurers", err);
            }
        },
        [request]
    );

    // Create repair
    const createRepair = useCallback(
        async (data: CreateRepairData): Promise<Repair | null> => {
            try {
                const resp = await request({ method: "POST", url: "/repairs", data });
                const repair = (resp as { data?: Repair })?.data || (resp as Repair);
                toast.success("Reparación creada");
                return repair;
            } catch (err: unknown) {
                const error = err as { response?: { data?: { message?: string } } };
                const msg = error?.response?.data?.message || "No se pudo crear la reparación";
                toast.error(msg);
                return null;
            }
        },
        [request]
    );

    // Update repair
    const updateRepair = useCallback(
        async (id: number, data: UpdateRepairData): Promise<Repair | null> => {
            try {
                const resp = await request({ method: "PUT", url: `/repairs/${id}`, data });
                const repair = (resp as { data?: Repair })?.data || (resp as Repair);
                toast.success("Reparación actualizada");
                return repair;
            } catch (err: unknown) {
                const error = err as { response?: { data?: { message?: string } } };
                const msg = error?.response?.data?.message || "No se pudo actualizar la reparación";
                toast.error(msg);
                return null;
            }
        },
        [request]
    );

    // Delete repair
    const deleteRepair = useCallback(
        async (id: number): Promise<boolean> => {
            try {
                await request({ method: "DELETE", url: `/repairs/${id}` });
                toast.success("Reparación eliminada");
                return true;
            } catch {
                toast.error("No se pudo eliminar la reparación");
                return false;
            }
        },
        [request]
    );

    // Update status only
    const updateStatus = useCallback(
        async (id: number, status: RepairStatus): Promise<Repair | null> => {
            try {
                const resp = await request({
                    method: "PATCH",
                    url: `/repairs/${id}/status`,
                    data: { status },
                });
                const repair = (resp as { data?: Repair })?.data || (resp as Repair);
                toast.success(`Estado actualizado a "${status}"`);
                return repair;
            } catch {
                toast.error("No se pudo actualizar el estado");
                return null;
            }
        },
        [request]
    );

    // Add note
    const addNote = useCallback(
        async (id: number, note: string): Promise<boolean> => {
            try {
                await request({ method: "POST", url: `/repairs/${id}/notes`, data: { note } });
                toast.success("Nota agregada");
                return true;
            } catch {
                toast.error("No se pudo agregar la nota");
                return false;
            }
        },
        [request]
    );

    // Get single repair
    const getRepair = useCallback(
        async (id: number): Promise<Repair | null> => {
            try {
                const resp = await request({ method: "GET", url: `/repairs/${id}` });
                const repair =
                    (resp as { data?: { data?: Repair } })?.data?.data ||
                    (resp as { data?: Repair })?.data ||
                    (resp as Repair);
                return repair;
            } catch {
                toast.error("No se pudo cargar la reparación");
                return null;
            }
        },
        [request]
    );

    // Download PDF
    const downloadPdf = useCallback(
        async (id: number): Promise<void> => {
            try {
                const resp = await request({
                    method: "GET",
                    url: `/repairs/${id}/pdf`,
                    responseType: "blob",
                });

                if (!resp || !(resp instanceof Blob)) {
                    throw new Error("Respuesta inválida");
                }

                const blob = new Blob([resp], { type: "application/pdf" });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `comprobante_reparacion_${id}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            } catch {
                toast.error("No se pudo descargar el comprobante");
            }
        },
        [request]
    );

    // Refresh all data
    const refresh = useCallback(() => {
        fetchRepairs();
        fetchStats();
        fetchInsurers();
    }, [fetchRepairs, fetchStats, fetchInsurers]);

    // Auto-fetch on mount and when dependencies change
    useEffect(() => {
        if (!autoFetch) return;

        const controller = new AbortController();
        fetchRepairs(controller.signal);
        fetchStats(controller.signal);
        fetchInsurers(controller.signal);

        return () => controller.abort();
    }, [autoFetch, fetchRepairs, fetchStats, fetchInsurers, selectionChangeToken]);

    // Debounced search
    useEffect(() => {
        if (!autoFetch) return;

        const controller = new AbortController();
        const timer = setTimeout(() => {
            fetchRepairs(controller.signal);
        }, 300);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [filters.search, autoFetch, fetchRepairs]);

    return {
        repairs,
        stats,
        kanbanData,
        options: repairsOptions,
        loading,
        statsLoading,
        filters,
        setFilters,
        fetchRepairs,
        fetchStats,
        fetchKanban,
        createRepair,
        updateRepair,
        deleteRepair,
        updateStatus,
        addNote,
        getRepair,
        downloadPdf,
        refresh,
    };
}

export default useRepairs;
