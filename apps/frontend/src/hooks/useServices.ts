import { useState, useCallback, useRef, useEffect } from "react";
import useApi from "@/hooks/useApi";
import { toast } from "sonner";

// Types
export interface ClientService {
    id: number;
    customer_id: number;
    name: string;
    description: string | null;
    amount: string;
    billing_cycle: "monthly" | "annual" | "one_time";
    start_date: string;
    next_due_date: string | null;
    status: "active" | "suspended" | "cancelled";
    created_at: string;
    updated_at: string;
    customer?: {
        id: number;
        person: {
            id: number;
            first_name: string;
            last_name: string;
            email: string | null;
        };
    };
}

export interface ClientServicePayment {
    id: number;
    client_service_id: number;
    amount: string;
    payment_date: string;
    notes: string | null;
}

export interface ServiceStats {
    total: number;
    active: number;
    suspended: number;
    cancelled: number;
    expired: number;
    due_soon: number;
    monthly_revenue: number;
    annual_revenue: number;
}

export interface ServiceFilters {
    search?: string;
    status?: string;
    due_status?: string;
    customer_id?: number;
}

export type CreateServiceData = {
    customer_id: number;
    name: string;
    description?: string;
    amount: number;
    billing_cycle: "monthly" | "annual" | "one_time";
    start_date: string;
    status?: "active" | "suspended" | "cancelled";
};

export type UpdateServiceData = Partial<CreateServiceData>;

type UseServicesOptions = {
    autoFetch?: boolean;
    perPage?: number;
};

type UseServicesReturn = {
    // Data
    services: ClientService[];
    stats: ServiceStats;
    customers: { id: number; name: string }[];

    // Loading states
    loading: boolean;
    statsLoading: boolean;

    // Pagination
    currentPage: number;
    totalPages: number;
    totalItems: number;
    setCurrentPage: (page: number) => void;

    // Filters
    filters: ServiceFilters;
    setFilters: React.Dispatch<React.SetStateAction<ServiceFilters>>;

    // Actions
    fetchServices: (signal?: AbortSignal) => Promise<void>;
    fetchStats: (signal?: AbortSignal) => Promise<void>;
    createService: (data: CreateServiceData) => Promise<ClientService | null>;
    updateService: (id: number, data: UpdateServiceData) => Promise<ClientService | null>;
    deleteService: (id: number) => Promise<boolean>;
    renewService: (id: number, amount?: number) => Promise<ClientService | null>;
    getService: (id: number) => Promise<ClientService | null>;
    getPayments: (id: number) => Promise<ClientServicePayment[]>;
    refresh: () => void;
};

export function useServices(options: UseServicesOptions = {}): UseServicesReturn {
    const { autoFetch = true, perPage = 20 } = options;
    const { request } = useApi();

    // State
    const [services, setServices] = useState<ClientService[]>([]);
    const [stats, setStats] = useState<ServiceStats>({
        total: 0,
        active: 0,
        suspended: 0,
        cancelled: 0,
        expired: 0,
        due_soon: 0,
        monthly_revenue: 0,
        annual_revenue: 0,
    });
    const [customers, setCustomers] = useState<{ id: number; name: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [statsLoading, setStatsLoading] = useState(false);
    const [filters, setFilters] = useState<ServiceFilters>({});

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Refs for stable values
    const filtersRef = useRef(filters);
    useEffect(() => {
        filtersRef.current = filters;
    }, [filters]);

    // Build query params from filters
    const buildParams = useCallback(() => {
        const params: Record<string, string | number> = { per_page: perPage, page: currentPage };
        const f = filtersRef.current;

        if (f.search?.trim()) params.search = f.search.trim();
        if (f.status && f.status !== "todos") params.status = f.status;
        if (f.due_status) params.due_status = f.due_status;
        if (f.customer_id) params.customer_id = f.customer_id;

        return params;
    }, [perPage, currentPage]);

    // Fetch services list
    const fetchServices = useCallback(
        async (signal?: AbortSignal) => {
            try {
                setLoading(true);
                const params = buildParams();
                const resp = await request({ method: "GET", url: "/client-services", params, signal });

                if (resp?.data) {
                    const data = Array.isArray(resp.data.data) ? resp.data.data : resp.data;
                    setServices(data as ClientService[]);
                    setTotalItems(resp.data.total || data.length);
                    setTotalPages(resp.data.last_page || 1);
                    setCurrentPage(resp.data.current_page || 1);
                }
            } catch (err: unknown) {
                const error = err as { name?: string; message?: string };
                if (error?.name !== "AbortError" && error?.message !== "canceled") {
                    console.error("Error fetching services", err);
                    toast.error("Error al cargar servicios");
                    setServices([]);
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
                const resp = await request({ method: "GET", url: "/client-services/stats", signal });
                if (resp && typeof resp === "object") {
                    setStats({
                        total: Number(resp.total) || 0,
                        active: Number(resp.active) || 0,
                        suspended: Number(resp.suspended) || 0,
                        cancelled: Number(resp.cancelled) || 0,
                        expired: Number(resp.expired) || 0,
                        due_soon: Number(resp.due_soon) || 0,
                        monthly_revenue: Number(resp.monthly_revenue) || 0,
                        annual_revenue: Number(resp.annual_revenue) || 0,
                    });
                }
            } catch {
                // Keep current stats on error
            } finally {
                setStatsLoading(false);
            }
        },
        [request]
    );

    // Fetch customers for dropdown
    const fetchCustomers = useCallback(
        async (signal?: AbortSignal) => {
            try {
                const resp = await request({ method: "GET", url: "/customers", signal });
                const data = Array.isArray(resp?.data) ? resp.data : (resp?.data?.data || []);
                const mapped = data.map((c: { id: number; person?: { first_name?: string; last_name?: string } }) => ({
                    id: c.id,
                    name: c.person ? `${c.person.first_name || ""} ${c.person.last_name || ""}`.trim() : `Cliente ${c.id}`,
                }));
                setCustomers(mapped);
            } catch (err) {
                console.error("Error fetching customers", err);
            }
        },
        [request]
    );

    // Create service
    const createService = useCallback(
        async (data: CreateServiceData): Promise<ClientService | null> => {
            try {
                const resp = await request({ method: "POST", url: `/customers/${data.customer_id}/services`, data });
                const service = resp?.data || resp;
                toast.success("Servicio creado");
                return service as ClientService;
            } catch (err: unknown) {
                const error = err as { response?: { data?: { message?: string } } };
                const msg = error?.response?.data?.message || "No se pudo crear el servicio";
                toast.error(msg);
                return null;
            }
        },
        [request]
    );

    // Update service
    const updateService = useCallback(
        async (id: number, data: UpdateServiceData): Promise<ClientService | null> => {
            try {
                const resp = await request({ method: "PUT", url: `/client-services/${id}`, data });
                const service = resp?.data || resp;
                toast.success("Servicio actualizado");
                return service as ClientService;
            } catch (err: unknown) {
                const error = err as { response?: { data?: { message?: string } } };
                const msg = error?.response?.data?.message || "No se pudo actualizar el servicio";
                toast.error(msg);
                return null;
            }
        },
        [request]
    );

    // Delete service
    const deleteService = useCallback(
        async (id: number): Promise<boolean> => {
            try {
                await request({ method: "DELETE", url: `/client-services/${id}` });
                toast.success("Servicio eliminado");
                return true;
            } catch {
                toast.error("No se pudo eliminar el servicio");
                return false;
            }
        },
        [request]
    );

    // Renew service
    const renewService = useCallback(
        async (id: number, amount?: number): Promise<ClientService | null> => {
            try {
                const resp = await request({
                    method: "POST",
                    url: `/client-services/${id}/renew`,
                    data: amount ? { amount } : {},
                });
                const service = resp?.data || resp;
                toast.success("Servicio renovado");
                return service as ClientService;
            } catch (err: unknown) {
                const error = err as { response?: { data?: { message?: string } } };
                const msg = error?.response?.data?.message || "No se pudo renovar el servicio";
                toast.error(msg);
                return null;
            }
        },
        [request]
    );

    // Get single service
    const getService = useCallback(
        async (id: number): Promise<ClientService | null> => {
            try {
                const resp = await request({ method: "GET", url: `/client-services/${id}` });
                return (resp?.data || resp) as ClientService;
            } catch {
                toast.error("No se pudo cargar el servicio");
                return null;
            }
        },
        [request]
    );

    // Get payments for a service
    const getPayments = useCallback(
        async (id: number): Promise<ClientServicePayment[]> => {
            try {
                const resp = await request({ method: "GET", url: `/client-services/${id}/payments` });
                return (Array.isArray(resp) ? resp : resp?.data || []) as ClientServicePayment[];
            } catch {
                toast.error("No se pudo cargar el historial de pagos");
                return [];
            }
        },
        [request]
    );

    // Refresh all data
    const refresh = useCallback(() => {
        fetchServices();
        fetchStats();
    }, [fetchServices, fetchStats]);

    // Auto-fetch on mount
    useEffect(() => {
        if (!autoFetch) return;

        const controller = new AbortController();
        fetchServices(controller.signal);
        fetchStats(controller.signal);
        fetchCustomers(controller.signal);

        return () => controller.abort();
    }, [autoFetch, fetchServices, fetchStats, fetchCustomers]);

    // Debounced search
    useEffect(() => {
        if (!autoFetch) return;

        const controller = new AbortController();
        const timer = setTimeout(() => {
            fetchServices(controller.signal);
        }, 300);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [filters.search, autoFetch, fetchServices]);

    // Refetch when filters change (except search which is debounced)
    useEffect(() => {
        if (!autoFetch) return;
        fetchServices();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.status, filters.due_status, filters.customer_id, currentPage]);

    return {
        services,
        stats,
        customers,
        loading,
        statsLoading,
        currentPage,
        totalPages,
        totalItems,
        setCurrentPage,
        filters,
        setFilters,
        fetchServices,
        fetchStats,
        createService,
        updateService,
        deleteService,
        renewService,
        getService,
        getPayments,
        refresh,
    };
}

export default useServices;
