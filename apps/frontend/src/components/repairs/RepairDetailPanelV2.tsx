import { useState, useEffect, useCallback, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Loader2,
    FileText,
    ClipboardCheck,
    AlertCircle,
    User,
    Phone,
    MapPin,
    Monitor,
    Hash,
    Wrench,
    Calendar as CalendarLucide,
    Clock,
    AlertTriangle,
    Package,
    Stethoscope,
    Shield,
    Banknote,
    CheckCircle2,
    ArrowLeft,
    Handshake,
    Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Repair, RepairNote, RepairPriority, RepairStatus, Insurer } from "@/types/repairs";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import useApi from "@/hooks/useApi";
import { sileo } from "sileo";
import { useBranches } from "@/hooks/useBranches";
import { useRepairs } from "@/hooks/useRepairs";
import { getSuppliers } from "@/lib/api/supplierService";
import { SupplierSearchCombobox } from "@/components/suppliers/SupplierSearchCombobox";
import type { Supplier } from "@/types/product";
import { useCustomerSearch, type CustomerOption as SearchCustomerOption } from "@/hooks/useCustomerSearch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import {
    type ChargeWithIvaMode,
    resolvePaymentAmountByMode,
    resolveRepairPricing,
} from "@/utils/repairPricing";

type UserOption = { id: number; name: string };
type CategoryOption = { id: number; name: string };
type PaymentMethodOption = {
    id: number;
    name: string;
    affects_cash?: boolean;
    is_customer_credit?: boolean;
};
type RepairPaymentRow = { payment_method_id: string; amount: string };

const STATUS_COLORS: Record<RepairStatus, string> = {
    "Pendiente de recepción": "bg-slate-100 text-slate-800 border-slate-200",
    Recibido: "bg-blue-100 text-blue-800 border-blue-200",
    "En diagnóstico": "bg-yellow-100 text-yellow-800 border-yellow-200",
    "Reparación Interna": "bg-orange-100 text-orange-800 border-orange-200",
    "Reparación Externa": "bg-cyan-100 text-cyan-800 border-cyan-200",
    "Esperando repuestos": "bg-purple-100 text-purple-800 border-purple-200",
    Terminado: "bg-green-100 text-green-800 border-green-200",
    Entregado: "bg-gray-100 text-gray-800 border-gray-200",
    Cancelado: "bg-red-100 text-red-800 border-red-200",
};

const PRIORITY_COLORS: Record<RepairPriority, string> = {
    Alta: "bg-red-100 text-red-800 border-red-200",
    Media: "bg-yellow-100 text-yellow-800 border-yellow-200",
    Baja: "bg-green-100 text-green-800 border-green-200",
};

export type RepairDetailPanelV2Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    repair: Repair | null;
    loading?: boolean;
    editMode?: boolean;
    onSave?: (data: Partial<Repair>, notes?: string[]) => Promise<void>;
    onCancelEdit?: () => void;
    onDownloadPdf?: () => void;
    onDownloadReceptionCertificate?: () => void;
    onQuickAddNote?: (note: string) => Promise<boolean>;
    defaultTab?: "details" | "financials" | "notes";
    onDownloadNoRepairCertificate?: () => void;
    onPaymentSuccess?: () => void;
    options?: { statuses: RepairStatus[]; priorities: RepairPriority[]; insurers?: Insurer[] };
};

function formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
    }).format(value);
}

function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return "-";
    try {
        return format(new Date(dateString), "dd/MM/yy", { locale: es });
    } catch {
        return dateString;
    }
}

function formatDateTime(dateString: string | null | undefined): string {
    if (!dateString) return "-";
    try {
        return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: es });
    } catch {
        return dateString;
    }
}

function resolveDefaultChargeMode(repair: Repair | null): ChargeWithIvaMode {
    if (repair?.charge_with_iva === false) {
        return "without_iva";
    }

    return "with_iva";
}

function isFreeRepairPrice(repair: Repair): boolean {
    const pricing = resolveRepairPricing({
        sale_price_without_iva: repair.sale_price_without_iva,
        iva_percentage: repair.iva_percentage,
        sale_price_with_iva: repair.sale_price_with_iva,
        sale_price: repair.sale_price,
    });

    return pricing.sale_price_without_iva <= 0.01 && pricing.sale_price_with_iva <= 0.01;
}

function isoToDate(iso: string | null | undefined): Date | undefined {
    if (!iso) return undefined;
    const datePart = String(iso).split("T")[0];
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
    if (!m) return undefined;
    const [, y, mm, dd] = m;
    const dt = new Date(Number(y), Number(mm) - 1, Number(dd));
    if (Number.isNaN(dt.getTime())) return undefined;
    return dt;
}

export default function RepairDetailPanelV2({
    open,
    onOpenChange,
    repair,
    loading = false,
    editMode = false,
    onSave,
    onCancelEdit,
    onDownloadPdf,
    onDownloadReceptionCertificate,
    onQuickAddNote,
    defaultTab = "details",
    onDownloadNoRepairCertificate,
    onPaymentSuccess,
    options = {
        statuses: [
            "Pendiente de recepción",
            "Recibido",
            "En diagnóstico",
            "Reparación Interna",
            "Reparación Externa",
            "Esperando repuestos",
            "Terminado",
            "Entregado",
            "Cancelado",
        ],
        priorities: ["Alta", "Media", "Baja"],
    },
}: RepairDetailPanelV2Props) {
    const { request } = useApi();
    const [currentRepair, setCurrentRepair] = useState<Repair | null>(null);
    const effectiveRepair = currentRepair ?? repair;
    const [editData, setEditData] = useState<
        Omit<Partial<Repair>, "device_age"> & {
            customer_id?: number;
            technician_id?: number;
            category_id?: number;
            intake_date?: string | null;
            policy_number?: string;
            device_age?: string | number | null;
        }
    >({});
    const [saving, setSaving] = useState(false);
    const [addingNote, setAddingNote] = useState(false);
    const [newNote, setNewNote] = useState("");
    const [stagedNotes, setStagedNotes] = useState<string[]>([]);
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [activeTab, setActiveTab] = useState<"details" | "financials" | "notes">(defaultTab);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>([]);
    const { branches } = useBranches();
    const { markAsPaid, markAsUnpaid, deriveToExternal, payExternalService } = useRepairs();

    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [selectedBranchId, setSelectedBranchId] = useState<string>("");
    const [paymentRows, setPaymentRows] = useState<RepairPaymentRow[]>([{ payment_method_id: "", amount: "" }]);
    const [chargeMode, setChargeMode] = useState<ChargeWithIvaMode>("with_iva");
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [isRevertingPayment, setIsRevertingPayment] = useState(false);
    const [showRevertDialog, setShowRevertDialog] = useState(false);
    const [paymentToRevertId, setPaymentToRevertId] = useState<number | null>(null);
    const [paymentError, setPaymentError] = useState<string | null>(null);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [showExternalDeriveForm, setShowExternalDeriveForm] = useState(false);
    const [externalSupplierId, setExternalSupplierId] = useState<string>("");
    const [externalAgreedCost, setExternalAgreedCost] = useState<string>("");
    const [externalDescription, setExternalDescription] = useState<string>("");
    const [externalNotes, setExternalNotes] = useState<string>("");
    const [externalPaymentMethodId, setExternalPaymentMethodId] = useState<string>("");
    const [externalPaymentAmount, setExternalPaymentAmount] = useState<string>("");
    const [externalPaymentNotes, setExternalPaymentNotes] = useState<string>("");
    const [processingExternalAction, setProcessingExternalAction] = useState(false);
    const [externalActionError, setExternalActionError] = useState<string | null>(null);

    const pricing = resolveRepairPricing({
        sale_price_without_iva:
            "sale_price_without_iva" in editData
                ? (editData.sale_price_without_iva as number | null | undefined)
                : effectiveRepair?.sale_price_without_iva,
        iva_percentage:
            "iva_percentage" in editData
                ? (editData.iva_percentage as number | null | undefined)
                : effectiveRepair?.iva_percentage,
        sale_price_with_iva:
            "sale_price_with_iva" in editData
                ? (editData.sale_price_with_iva as number | null | undefined)
                : effectiveRepair?.sale_price_with_iva,
        sale_price:
            "sale_price" in editData
                ? (editData.sale_price as number | null | undefined)
                : effectiveRepair?.sale_price,
    });

    const sortedRepairNotes = useMemo(() => {
        return (effectiveRepair?.notes ?? [])
            .slice()
            .sort((a, b) => {
                const aTime = a?.created_at ? new Date(a.created_at).getTime() : 0;
                const bTime = b?.created_at ? new Date(b.created_at).getTime() : 0;
                return bTime - aTime;
            });
    }, [effectiveRepair?.notes]);

    const sortedRepairPayments = useMemo(() => {
        return (effectiveRepair?.payments ?? [])
            .slice()
            .sort((a, b) => {
                const aTime = a?.paid_at ? new Date(a.paid_at).getTime() : 0;
                const bTime = b?.paid_at ? new Date(b.paid_at).getTime() : 0;
                return bTime - aTime;
            });
    }, [effectiveRepair?.payments]);

    const hasPaymentsData = Array.isArray(effectiveRepair?.payments);

    const activePaymentsCount = useMemo(() => {
        return sortedRepairPayments.filter((payment) => !payment.is_reversed).length;
    }, [sortedRepairPayments]);

    const canRevertGeneralPayment = hasPaymentsData
        ? activePaymentsCount > 0
        : Boolean(effectiveRepair?.is_paid);

    const paymentStatusForDisplay =
        hasPaymentsData && activePaymentsCount === 0
            ? "pending"
            : (effectiveRepair?.payment_status ?? (effectiveRepair?.is_paid ? "paid" : "pending"));

    const totalPaidForBalance = useMemo(() => {
        return Number(effectiveRepair?.total_paid ?? effectiveRepair?.amount_paid ?? 0);
    }, [effectiveRepair?.total_paid, effectiveRepair?.amount_paid]);

    const resolvePendingAmountByMode = (mode: ChargeWithIvaMode): number => {
        const targetTotal = resolvePaymentAmountByMode(pricing, mode);
        return Math.max(0, Number((targetTotal - totalPaidForBalance).toFixed(2)));
    };

    useEffect(() => {
        setCurrentRepair(repair ?? null);
    }, [repair]);

    useEffect(() => {
        if (!open) return;
        setActiveTab(defaultTab);
        setShowPaymentForm(false);
        setSelectedBranchId("");
        setPaymentRows([{ payment_method_id: "", amount: "" }]);
        setChargeMode(resolveDefaultChargeMode(repair));
        setShowRevertDialog(false);
        setPaymentToRevertId(null);
        setPaymentError(null);
        setExternalActionError(null);
        setShowExternalDeriveForm(false);
        setExternalSupplierId("");
        setExternalAgreedCost("");
        setExternalDescription("");
        setExternalNotes("");
        setExternalPaymentMethodId("");
        setExternalPaymentAmount("");
        setExternalPaymentNotes("");

        const fetchPaymentMethods = async () => {
            try {
                const resp = await request({
                    method: "GET",
                    url: "/payment-methods",
                    params: { limit: 100 },
                });
                const data: unknown[] = Array.isArray(resp?.data) ? resp.data : [];
                const mapped: PaymentMethodOption[] = data
                    .filter((item: unknown): item is { id: unknown; name: unknown; affects_cash?: unknown; is_customer_credit?: unknown } => {
                        return typeof item === "object" && item !== null && "id" in item && "name" in item;
                    })
                    .map((item) => {
                        const it = item as { id: unknown; name: unknown; affects_cash?: unknown; is_customer_credit?: unknown };
                        return {
                            id: Number(it.id),
                            name: String(it.name),
                            affects_cash: Boolean(it.affects_cash),
                            is_customer_credit: Boolean(it.is_customer_credit),
                        };
                    })
                    .filter((method) => !method.is_customer_credit);
                setPaymentMethods(mapped);
            } catch (error) {
                console.error("Error fetching payment methods:", error);
            }
        };

        const fetchSuppliers = async () => {
            try {
                const supplierData = await getSuppliers();
                setSuppliers(supplierData ?? []);
            } catch (error) {
                console.error("Error fetching suppliers:", error);
            }
        };

        fetchPaymentMethods();
        fetchSuppliers();
    }, [open, defaultTab, repair, request]);

    const {
        customerSearch,
        customerOptions,
        showCustomerOptions,
        setCustomerSearch,
        setSelectedCustomer,
        setShowCustomerOptions,
    } = useCustomerSearch();

    const [technicianSearch, setTechnicianSearch] = useState("");
    const [technicianOptions, setTechnicianOptions] = useState<UserOption[]>([]);
    const [showTechnicianOptions, setShowTechnicianOptions] = useState(false);

    const [categories, setCategories] = useState<CategoryOption[]>([]);

    const fetchTechnicians = useCallback(async () => {
        try {
            const resp = await request({
                method: "GET",
                url: "/users",
                params: { limit: 100 },
            });
            const data = Array.isArray(resp?.data) ? resp.data : Array.isArray(resp) ? resp : [];
            const mapped: UserOption[] = data.map(
                (u: { id: number; person?: { first_name?: string; last_name?: string }; username?: string }) => ({
                    id: u.id,
                    name: u.person
                        ? `${u.person.first_name || ""} ${u.person.last_name || ""}`.trim()
                        : u.username || `Usuario #${u.id}`,
                })
            );
            setTechnicianOptions(mapped);
        } catch (error) {
            console.error("Error fetching technicians:", error);
        }
    }, [request]);

    const fetchCategories = useCallback(async () => {
        try {
            const resp = await request({
                method: "GET",
                url: "/equipment-categories/for-selector",
            });
            if (resp && resp.success && Array.isArray(resp.data)) {
                setCategories(resp.data);
            }
        } catch (error) {
            console.error("Error fetching categories:", error);
        }
    }, [request]);

    useEffect(() => {
        if (editMode && open) {
            fetchTechnicians();
            fetchCategories();
        }
    }, [editMode, open, fetchTechnicians, fetchCategories]);

    useEffect(() => {
        if (editMode && repair && open) {
            setEditData({
                status: repair.status,
                priority: repair.priority,
                device: repair.device,
                serial_number: repair.serial_number,
                issue_description: repair.issue_description,
                initial_notes: repair.initial_notes,
                diagnosis: repair.diagnosis,
                cost: repair.cost,
                sale_price: repair.sale_price,
                sale_price_without_iva: repair.sale_price_without_iva,
                iva_percentage: repair.iva_percentage,
                sale_price_with_iva: repair.sale_price_with_iva,
                charge_with_iva: repair.charge_with_iva,
                customer_id: repair.customer?.id,
                technician_id: repair.technician?.id,
                category_id: repair.category?.id ?? repair.category_id ?? undefined,
                estimated_date: repair.estimated_date,
                intake_date: repair.intake_date,
                is_siniestro: repair.is_siniestro,
                insurer_id: repair.insurer?.id ?? repair.insurer_id ?? undefined,
                siniestro_number: repair.siniestro_number,
                insured_customer_id: repair.insured_customer?.id ?? repair.insured_customer_id ?? undefined,
                policy_number: repair.policy_number ?? "",
                device_age: repair.device_age ?? "",
                is_no_repair: repair.is_no_repair ?? false,
                no_repair_reason: repair.no_repair_reason ?? "",
            });
            const initialCustomerName = repair.customer?.name || "";
            setCustomerSearch(initialCustomerName);
            if (repair.customer?.id) {
                const selected: SearchCustomerOption = {
                    id: repair.customer.id,
                    name: initialCustomerName || `Cliente ${repair.customer.id}`,
                    dni: null,
                    cuit: null,
                    fiscal_condition_id: null,
                    fiscal_condition_name: null,
                };
                setSelectedCustomer(selected);
            } else {
                setSelectedCustomer(null);
            }
            setTechnicianSearch(repair.technician?.name || "");
            setStagedNotes([]);
            setErrors({});
        }
    }, [editMode, repair, open, setCustomerSearch, setSelectedCustomer]);

    const handleSave = async () => {
        if (!onSave) return;
        setSaving(true);
        setErrors({});
        try {
            const payload = { ...editData };
            if (typeof payload.device_age === "string") {
                payload.device_age = payload.device_age ? parseInt(payload.device_age) : null;
            }
            if (payload.is_no_repair && !payload.no_repair_reason) {
                payload.no_repair_reason = editData.diagnosis || repair?.diagnosis || null;
            }
            await onSave(payload as Partial<Repair>, stagedNotes);
            setStagedNotes([]);
            setNewNote("");
            onCancelEdit?.();
            sileo.success({ title: "Los cambios se guardaron correctamente" });
        } catch (error: unknown) {
            console.error("Error saving repair:", error);
            // @ts-expect-error request hook throws object with response
            if (error?.response && error?.response.data && error?.response.data.errors) {
                // @ts-expect-error request hook throws object with response
                const validationErrors = error.response.data.errors;
                setErrors(validationErrors);
                const firstField = Object.keys(validationErrors)[0];
                const firstErrorMsg = validationErrors[firstField]?.[0];
                sileo.error({ title: firstErrorMsg || "Hay errores de validación." });
            } else {
                // @ts-expect-error request hook throws object with response
                const msg = error?.response?.data?.message || "Ocurrió un error al guardar los cambios.";
                setErrors({ general: [msg] });
                sileo.error({ title: msg });
            }
        } finally {
            setSaving(false);
        }
    };

    const handleAddNote = () => {
        if (!newNote.trim()) return;
        const nextNote = newNote.trim();

        if (editMode) {
            setStagedNotes((prev) => [...prev, nextNote]);
            setNewNote("");
            return;
        }

        if (!onQuickAddNote) return;
        setAddingNote(true);
        Promise.resolve(onQuickAddNote(nextNote))
            .then((ok) => {
                if (ok) setNewNote("");
            })
            .finally(() => setAddingNote(false));
    };

    const handleConfirmRevertPayment = async () => {
        if (!currentRepair) return;
        if (!canRevertGeneralPayment && !paymentToRevertId) {
            setPaymentError("No hay cobros activos para revertir.");
            return;
        }

        setIsRevertingPayment(true);
        setPaymentError(null);
        try {
            const result = await markAsUnpaid(currentRepair.id, paymentToRevertId ?? undefined);
            if (result) {
                setCurrentRepair(result);
                setShowRevertDialog(false);
                setPaymentToRevertId(null);
                onPaymentSuccess?.();
            } else {
                setPaymentError("No se pudo revertir el cobro. Intentá nuevamente.");
            }
        } catch {
            setPaymentError("Ocurrió un error al revertir el cobro.");
        } finally {
            setIsRevertingPayment(false);
        }
    };

    const openGeneralRevertDialog = () => {
        if (!canRevertGeneralPayment) {
            setPaymentError("No hay cobros activos para revertir.");
            return;
        }

        setPaymentError(null);
        setPaymentToRevertId(null);
        setShowRevertDialog(true);
    };

    const openItemRevertDialog = (paymentId: number) => {
        setPaymentError(null);
        setPaymentToRevertId(paymentId);
        setShowRevertDialog(true);
    };

    if (!open) return null;

    return (
        <Card className="border bg-card">
            <CardContent className="p-4 md:p-6">
                <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xl">{currentRepair?.code || "..."}</span>
                            {currentRepair && (
                                <>
                                    <Badge variant="outline" className={cn("text-xs", STATUS_COLORS[currentRepair.status])}>
                                        {currentRepair.status}
                                    </Badge>
                                    <Badge variant="outline" className={cn("text-xs", PRIORITY_COLORS[currentRepair.priority])}>
                                        {currentRepair.priority}
                                    </Badge>
                                    {currentRepair.is_no_repair && (
                                        <Badge className="text-xs bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-100">
                                            <AlertCircle className="h-3 w-3 mr-1" />
                                            Sin Reparación
                                        </Badge>
                                    )}
                                    {currentRepair.category && (
                                        <Badge variant="secondary" className="text-xs">
                                            {currentRepair.category.name}
                                        </Badge>
                                    )}
                                </>
                            )}
                        </div>

                        {(onDownloadPdf ||
                            (onDownloadNoRepairCertificate && currentRepair?.is_no_repair) ||
                            (onDownloadReceptionCertificate && currentRepair?.is_siniestro)) && (
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                    {onDownloadPdf && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={onDownloadPdf}
                                            className="text-amber-700 border-amber-200 px-2 sm:px-3"
                                        >
                                            <FileText className="h-4 w-4 sm:mr-2" />
                                            <span className="hidden sm:inline">Comprobante</span>
                                        </Button>
                                    )}
                                    {onDownloadNoRepairCertificate && repair?.is_no_repair && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={onDownloadNoRepairCertificate}
                                            className="text-rose-700 border-rose-200 px-2 sm:px-3"
                                        >
                                            <FileText className="h-4 w-4 sm:mr-2" />
                                            <span className="hidden sm:inline">Acta sin reparación</span>
                                        </Button>
                                    )}
                                    {onDownloadReceptionCertificate && repair?.is_siniestro && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={onDownloadReceptionCertificate}
                                            className="text-blue-700 border-blue-200 px-2 sm:px-3"
                                        >
                                            <ClipboardCheck className="h-4 w-4 sm:mr-2" />
                                            <span className="hidden sm:inline">Acta Recepción</span>
                                        </Button>
                                    )}
                                </div>
                            )}
                    </div>
                </div>

                <Separator className="my-4" />

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : repair ? (
                    <Tabs
                        value={activeTab}
                        onValueChange={(value) =>
                            setActiveTab(value as "details" | "financials" | "notes")
                        }
                        className="space-y-4"
                    >
                        <TabsList>
                            <TabsTrigger value="details">Detalles</TabsTrigger>
                            <TabsTrigger value="financials">Costos</TabsTrigger>
                            <TabsTrigger value="notes">Notas ({repair.notes?.length || 0})</TabsTrigger>
                        </TabsList>

                        <div>
                            <TabsContent value="details" className="m-0">
                                <div className="space-y-4">
                                    {editMode ? (
                                        <div className="grid gap-4 py-2">
                                            {errors.general && (
                                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm flex items-center gap-2">
                                                    <AlertCircle className="h-4 w-4" />
                                                    <span>{errors.general[0]}</span>
                                                </div>
                                            )}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Cliente *</Label>
                                                    <div className="relative">
                                                        <Input
                                                            value={customerSearch}
                                                            onChange={(e) => {
                                                                const v = e.target.value;
                                                                setCustomerSearch(v);
                                                                setShowCustomerOptions(true);
                                                                if (!v) setEditData((d) => ({ ...d, customer_id: undefined }));
                                                            }}
                                                            onFocus={() => setShowCustomerOptions(true)}
                                                            onBlur={() => setTimeout(() => setShowCustomerOptions(false), 200)}
                                                            placeholder="Buscar cliente..."
                                                        />
                                                        {showCustomerOptions && customerOptions.length > 0 && (
                                                            <div className="absolute left-0 right-0 border rounded bg-white mt-1 max-h-40 overflow-auto z-50 shadow">
                                                                {customerOptions.map((customer) => (
                                                                    <div
                                                                        key={customer.id}
                                                                        className="p-2 cursor-pointer hover:bg-gray-100"
                                                                        onMouseDown={() => {
                                                                            setEditData((d) => ({ ...d, customer_id: customer.id }));
                                                                            setCustomerSearch(customer.name);
                                                                            setSelectedCustomer(customer);
                                                                            setShowCustomerOptions(false);
                                                                        }}
                                                                    >
                                                                        <div className="flex items-baseline justify-between gap-3">
                                                                            <span className="text-sm font-medium">{customer.name}</span>
                                                                            <span className="text-xs text-muted-foreground">
                                                                                {customer.dni || customer.cuit || ""}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {errors.customer_id && (
                                                        <p className="text-xs text-red-500 mt-1">{errors.customer_id[0]}</p>
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Técnico Asignado</Label>
                                                    <div className="relative">
                                                        <Input
                                                            value={technicianSearch}
                                                            onChange={(e) => {
                                                                const v = e.target.value;
                                                                setTechnicianSearch(v);
                                                                setShowTechnicianOptions(true);
                                                                if (!v) setEditData((d) => ({ ...d, technician_id: undefined }));
                                                            }}
                                                            onFocus={() => setShowTechnicianOptions(true)}
                                                            onBlur={() => setTimeout(() => setShowTechnicianOptions(false), 200)}
                                                            placeholder="Buscar técnico..."
                                                        />
                                                        {showTechnicianOptions && (
                                                            <div className="absolute left-0 right-0 border rounded bg-white mt-1 max-h-40 overflow-auto z-50 shadow">
                                                                <div
                                                                    className="p-2 cursor-pointer hover:bg-gray-100 text-gray-500 italic"
                                                                    onMouseDown={() => {
                                                                        setEditData((d) => ({ ...d, technician_id: undefined }));
                                                                        setTechnicianSearch("");
                                                                        setShowTechnicianOptions(false);
                                                                    }}
                                                                >
                                                                    Sin asignar
                                                                </div>
                                                                {technicianOptions
                                                                    .filter((t) =>
                                                                        t.name.toLowerCase().includes(technicianSearch.toLowerCase())
                                                                    )
                                                                    .map((tech) => (
                                                                        <div
                                                                            key={tech.id}
                                                                            className="p-2 cursor-pointer hover:bg-gray-100"
                                                                            onMouseDown={() => {
                                                                                setEditData((d) => ({ ...d, technician_id: tech.id }));
                                                                                setTechnicianSearch(tech.name);
                                                                                setShowTechnicianOptions(false);
                                                                            }}
                                                                        >
                                                                            {tech.name}
                                                                        </div>
                                                                    ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Equipo *</Label>
                                                    <Input
                                                        value={editData.device ?? repair.device}
                                                        onChange={(e) => setEditData((d) => ({ ...d, device: e.target.value }))}
                                                    />
                                                    {errors.device && (
                                                        <p className="text-xs text-red-500 mt-1">{errors.device[0]}</p>
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Número de Serie</Label>
                                                    <Input
                                                        value={editData.serial_number ?? repair.serial_number ?? ""}
                                                        onChange={(e) =>
                                                            setEditData((d) => ({ ...d, serial_number: e.target.value }))
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Categoría</Label>
                                                <Select
                                                    value={editData.category_id ? editData.category_id.toString() : "empty"}
                                                    onValueChange={(v) =>
                                                        setEditData((d) => ({
                                                            ...d,
                                                            category_id: v === "empty" ? undefined : parseInt(v),
                                                        }))
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Seleccionar" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="empty">Sin categoría</SelectItem>
                                                        {categories.map((c) => (
                                                            <SelectItem key={c.id} value={c.id.toString()}>
                                                                {c.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Descripción del Problema *</Label>
                                                <Textarea
                                                    value={editData.issue_description ?? repair.issue_description}
                                                    onChange={(e) =>
                                                        setEditData((d) => ({ ...d, issue_description: e.target.value }))
                                                    }
                                                    rows={3}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Accesorios (comprobante)</Label>
                                                <Textarea
                                                    value={editData.initial_notes ?? repair.initial_notes ?? ""}
                                                    onChange={(e) =>
                                                        setEditData((d) => ({ ...d, initial_notes: e.target.value }))
                                                    }
                                                    rows={2}
                                                    placeholder='Ej: Cargador, funda, chip, memoria, "sin accesorios"...'
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Diagnóstico Técnico</Label>
                                                <Textarea
                                                    value={editData.diagnosis ?? repair.diagnosis ?? ""}
                                                    onChange={(e) =>
                                                        setEditData((d) => ({ ...d, diagnosis: e.target.value }))
                                                    }
                                                    rows={3}
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Estado</Label>
                                                    <Select
                                                        value={editData.status ?? repair.status}
                                                        onValueChange={(v) =>
                                                            setEditData((d) => ({ ...d, status: v as RepairStatus }))
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {options.statuses.map((s) => (
                                                                <SelectItem key={s} value={s}>
                                                                    {s}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Prioridad</Label>
                                                    <Select
                                                        value={editData.priority ?? repair.priority}
                                                        onValueChange={(v) =>
                                                            setEditData((d) => ({ ...d, priority: v as RepairPriority }))
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {options.priorities.map((p) => (
                                                                <SelectItem key={p} value={p}>
                                                                    {p}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Fecha de Recibido</Label>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                className={cn(
                                                                    "w-full justify-start text-left font-normal",
                                                                    !(editData.intake_date ?? repair.intake_date) &&
                                                                    "text-muted-foreground"
                                                                )}
                                                            >
                                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                                {(() => {
                                                                    const iso = (editData.intake_date ?? repair.intake_date) as
                                                                        | string
                                                                        | undefined;
                                                                    const dt = isoToDate(iso);
                                                                    return dt ? format(dt, "dd/MM/yy", { locale: es }) : <span>Seleccione fecha</span>;
                                                                })()}
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0">
                                                            <Calendar
                                                                mode="single"
                                                                selected={isoToDate((editData.intake_date ?? repair.intake_date) as string | undefined)}
                                                                onSelect={(date) => {
                                                                    if (!date) return;
                                                                    const iso = format(date, "yyyy-MM-dd");
                                                                    setEditData((d) => ({ ...d, intake_date: iso }));
                                                                }}
                                                                initialFocus
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Fecha Estimada</Label>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                className={cn(
                                                                    "w-full justify-start text-left font-normal",
                                                                    !(editData.estimated_date ?? repair.estimated_date) &&
                                                                    "text-muted-foreground"
                                                                )}
                                                            >
                                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                                {(() => {
                                                                    const iso = (editData.estimated_date ?? repair.estimated_date) as
                                                                        | string
                                                                        | undefined;
                                                                    const dt = isoToDate(iso);
                                                                    return dt ? format(dt, "dd/MM/yy", { locale: es }) : <span>Seleccione fecha</span>;
                                                                })()}
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0">
                                                            <Calendar
                                                                mode="single"
                                                                selected={isoToDate((editData.estimated_date ?? repair.estimated_date) as string | undefined)}
                                                                onSelect={(date) => {
                                                                    if (!date) return;
                                                                    const iso = format(date, "yyyy-MM-dd");
                                                                    setEditData((d) => ({ ...d, estimated_date: iso }));
                                                                }}
                                                                initialFocus
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>
                                            </div>

                                            <div className="space-y-4 pt-4 border-t">
                                                <div className="space-y-3 p-4 bg-rose-50/50 rounded-lg border border-rose-100">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            id="is_no_repair_edit"
                                                            checked={!!editData.is_no_repair}
                                                            onChange={(e) =>
                                                                setEditData((d) => ({ ...d, is_no_repair: e.target.checked }))
                                                            }
                                                        />
                                                        <Label htmlFor="is_no_repair_edit" className="font-semibold">
                                                            Sin reparación (Acta de no reparación)
                                                        </Label>
                                                    </div>
                                                    {editData.is_no_repair && (
                                                        <div className="ml-6 p-3 bg-white rounded border border-rose-200">
                                                            <p className="text-sm text-rose-800">
                                                                ✓ Se generará un acta de no reparación con el{" "}
                                                                <strong>Diagnóstico Técnico</strong> que completes arriba.
                                                            </p>
                                                            {!editData.diagnosis && !repair.diagnosis && (
                                                                <p className="text-xs text-amber-700 mt-2 bg-amber-50 p-2 rounded">
                                                                    Completa el campo "Diagnóstico Técnico" para generar el acta
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        id="is_siniestro_edit"
                                                        checked={!!editData.is_siniestro}
                                                        onChange={(e) =>
                                                            setEditData((d) => ({ ...d, is_siniestro: e.target.checked }))
                                                        }
                                                    />
                                                    <Label htmlFor="is_siniestro_edit">¿Es un siniestro?</Label>
                                                </div>

                                                {editData.is_siniestro && (
                                                    <div className="space-y-4 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label>Aseguradora</Label>
                                                                <Select
                                                                    value={editData.insurer_id ? editData.insurer_id.toString() : ""}
                                                                    onValueChange={(v) =>
                                                                        setEditData((d) => ({
                                                                            ...d,
                                                                            insurer_id: v ? parseInt(v) : undefined,
                                                                        }))
                                                                    }
                                                                >
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Seleccionar" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {options.insurers?.map((i) => (
                                                                            <SelectItem key={i.id} value={i.id.toString()}>
                                                                                {i.name}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>Nº Siniestro</Label>
                                                                <Input
                                                                    value={editData.siniestro_number ?? repair.siniestro_number ?? ""}
                                                                    onChange={(e) =>
                                                                        setEditData((d) => ({
                                                                            ...d,
                                                                            siniestro_number: e.target.value,
                                                                        }))
                                                                    }
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label>Nº de Póliza</Label>
                                                                <Input
                                                                    value={editData.policy_number ?? repair.policy_number ?? ""}
                                                                    onChange={(e) =>
                                                                        setEditData((d) => ({ ...d, policy_number: e.target.value }))
                                                                    }
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>Antigüedad del equipo (años)</Label>
                                                                <Input
                                                                    type="number"
                                                                    min="0"
                                                                    value={editData.device_age ?? repair.device_age ?? ""}
                                                                    onChange={(e) =>
                                                                        setEditData((d) => ({ ...d, device_age: e.target.value }))
                                                                    }
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <Card className="border-l-4 border-l-blue-500">
                                                <CardContent className="py-4">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <div className="p-2 bg-blue-100 rounded-full">
                                                            <User className="h-4 w-4 text-blue-600" />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-base">{repair.customer?.name}</p>
                                                            <p className="text-xs text-muted-foreground">Cliente</p>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-11">
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <Phone className="h-3.5 w-3.5" />
                                                            <span>{repair.customer?.phone || "-"}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <MapPin className="h-3.5 w-3.5" />
                                                            <span className="truncate">{repair.customer?.address || "-"}</span>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardContent className="py-4 space-y-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="flex items-start gap-3">
                                                            <div className="p-2 bg-purple-100 rounded-full mt-0.5">
                                                                <Monitor className="h-4 w-4 text-purple-600" />
                                                            </div>
                                                            <div>
                                                                <Label className="text-xs text-muted-foreground">Equipo</Label>
                                                                <p className="text-sm font-semibold">{repair.device}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-start gap-3">
                                                            <div className="p-2 bg-gray-100 rounded-full mt-0.5">
                                                                <Hash className="h-4 w-4 text-gray-600" />
                                                            </div>
                                                            <div>
                                                                <Label className="text-xs text-muted-foreground">Nº Serie</Label>
                                                                <p className="text-sm font-medium">{repair.serial_number || "-"}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <Separator />

                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 bg-orange-100 rounded-full mt-0.5">
                                                            <Wrench className="h-4 w-4 text-orange-600" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <Label className="text-xs text-muted-foreground">Problema reportado</Label>
                                                            <p className="text-sm mt-1">{repair.issue_description}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 bg-slate-100 rounded-full mt-0.5">
                                                            <Package className="h-4 w-4 text-slate-600" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <Label className="text-xs text-muted-foreground">Accesorios (comprobante)</Label>
                                                            <p className="text-sm mt-1 text-muted-foreground italic">
                                                                {repair.initial_notes || "NO"}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 bg-teal-100 rounded-full mt-0.5">
                                                            <Stethoscope className="h-4 w-4 text-teal-600" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <Label className="text-xs text-muted-foreground">Diagnóstico técnico</Label>
                                                            <p className="text-sm mt-1 text-muted-foreground italic">
                                                                {repair.diagnosis || "Sin diagnóstico aún"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card className="bg-gradient-to-r from-gray-50 to-white">
                                                <CardContent className="py-4">
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                                <Package className="h-3 w-3" /> Estado
                                                            </Label>
                                                            <Badge
                                                                variant="outline"
                                                                className={cn("text-xs font-medium", STATUS_COLORS[repair.status])}
                                                            >
                                                                {repair.status}
                                                            </Badge>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                                <AlertTriangle className="h-3 w-3" /> Prioridad
                                                            </Label>
                                                            <Badge
                                                                variant="outline"
                                                                className={cn(
                                                                    "text-xs font-medium",
                                                                    PRIORITY_COLORS[repair.priority]
                                                                )}
                                                            >
                                                                {repair.priority}
                                                            </Badge>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                                <CalendarLucide className="h-3 w-3" /> Ingreso
                                                            </Label>
                                                            <p className="text-sm font-medium">{formatDate(repair.intake_date)}</p>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                                <Clock className="h-3 w-3" /> Estimada
                                                            </Label>
                                                            <p className="text-sm font-medium">{formatDate(repair.estimated_date)}</p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            {repair.is_siniestro && (
                                                <Card className="border-l-4 border-l-amber-500 bg-amber-50/30">
                                                    <CardContent className="py-4">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <Shield className="h-4 w-4 text-amber-600" />
                                                            <span className="font-semibold text-sm text-amber-800">
                                                                Información del Siniestro
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pl-6">
                                                            <div>
                                                                <Label className="text-xs text-muted-foreground">Aseguradora</Label>
                                                                <p className="text-sm font-medium">{repair.insurer?.name || "-"}</p>
                                                            </div>
                                                            <div>
                                                                <Label className="text-xs text-muted-foreground">Nº Siniestro</Label>
                                                                <p className="text-sm font-medium">{repair.siniestro_number || "-"}</p>
                                                            </div>
                                                            <div>
                                                                <Label className="text-xs text-muted-foreground">Nº Póliza</Label>
                                                                <p className="text-sm font-medium">{repair.policy_number || "-"}</p>
                                                            </div>
                                                            <div>
                                                                <Label className="text-xs text-muted-foreground">Antigüedad</Label>
                                                                <p className="text-sm font-medium">
                                                                    {repair.device_age ? `${repair.device_age} años` : "-"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            )}

                                            {repair.is_no_repair && (
                                                <Card className="border-l-4 border-l-rose-500 bg-rose-50/30">
                                                    <CardContent className="py-4">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <AlertCircle className="h-4 w-4 text-rose-600" />
                                                            <span className="font-semibold text-sm text-rose-800">
                                                                Acta sin reparación
                                                            </span>
                                                        </div>
                                                        <div className="space-y-2 pl-6">
                                                            <div>
                                                                <Label className="text-xs text-muted-foreground">Fecha</Label>
                                                                <p className="text-sm font-medium">
                                                                    {formatDateTime(repair.no_repair_at)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="financials" className="m-0">
                                <div className="space-y-4">
                                    <Card>
                                        <CardContent className="py-4">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="text-center p-4 rounded-lg bg-muted/50">
                                                    <Label className="text-xs text-muted-foreground">Costo</Label>
                                                    {editMode ? (
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            className="mt-2 text-center"
                                                            value={
                                                                "cost" in editData ? (editData.cost ?? "") : repair.cost ?? ""
                                                            }
                                                            onChange={(e) =>
                                                                setEditData((d) => ({
                                                                    ...d,
                                                                    cost: e.target.value ? parseFloat(e.target.value) : null,
                                                                }))
                                                            }
                                                        />
                                                    ) : (
                                                        <p className="text-2xl font-bold mt-2">{formatCurrency(repair.cost)}</p>
                                                    )}
                                                </div>
                                                <div className="text-center p-4 rounded-lg bg-muted/50">
                                                    <Label className="text-xs text-muted-foreground">Precio base (sin IVA)</Label>
                                                    {editMode ? (
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            className="mt-2 text-center"
                                                            value={
                                                                "sale_price_without_iva" in editData
                                                                    ? (editData.sale_price_without_iva ?? "")
                                                                    : repair.sale_price_without_iva ?? ""
                                                            }
                                                            onChange={(e) =>
                                                                setEditData((d) => ({
                                                                    ...d,
                                                                    sale_price_without_iva: e.target.value ? parseFloat(e.target.value) : null,
                                                                }))
                                                            }
                                                        />
                                                    ) : (
                                                        <p className="text-2xl font-bold mt-2 text-green-600">
                                                            {formatCurrency(pricing.sale_price_without_iva)}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-center p-4 rounded-lg bg-muted/50">
                                                    <Label className="text-xs text-muted-foreground">IVA (%)</Label>
                                                    <p className="text-2xl font-bold mt-2 text-amber-600">21%</p>
                                                </div>
                                            </div>

                                            <div className="mt-6 text-center p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                                                <Label className="text-xs text-emerald-700">Precio con IVA (bruto)</Label>
                                                <p className="text-2xl font-bold mt-2 text-emerald-700">
                                                    {formatCurrency(pricing.sale_price_with_iva)}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <div className="space-y-3">
                                        <h3 className="text-sm font-semibold flex items-center gap-2">
                                            <Banknote className="h-4 w-4" />
                                            <span>Estado de Pago</span>
                                        </h3>

                                        <Card className="border-cyan-200 bg-cyan-50/60">
                                            <CardContent className="py-4 space-y-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h4 className="text-sm font-semibold flex items-center gap-2">
                                                        <Handshake className="h-4 w-4 text-cyan-700" />
                                                        Servicio externo
                                                    </h4>
                                                    {effectiveRepair?.external_service ? (
                                                        <Badge variant="outline" className="border-cyan-300 text-cyan-800">
                                                            {effectiveRepair.external_service.payment_status === "paid"
                                                                ? "Pagado"
                                                                : effectiveRepair.external_service.payment_status === "partial"
                                                                    ? "Pago parcial"
                                                                    : "Pendiente"}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline">Sin derivación</Badge>
                                                    )}
                                                </div>

                                                {externalActionError && (
                                                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                                                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                                        <span>{externalActionError}</span>
                                                    </div>
                                                )}

                                                {effectiveRepair?.external_service ? (
                                                    <div className="space-y-3">
                                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                                                            <div>
                                                                <Label className="text-muted-foreground">Proveedor</Label>
                                                                <p className="text-sm font-medium">
                                                                    {effectiveRepair.external_service.supplier_name || "-"}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <Label className="text-muted-foreground">Costo acordado</Label>
                                                                <p className="text-sm font-medium">
                                                                    {formatCurrency(effectiveRepair.external_service.agreed_cost)}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <Label className="text-muted-foreground">Pagado</Label>
                                                                <p className="text-sm font-medium text-green-700">
                                                                    {formatCurrency(effectiveRepair.external_service.paid_amount)}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <Label className="text-muted-foreground">Pendiente</Label>
                                                                <p className="text-sm font-medium text-amber-700">
                                                                    {formatCurrency(effectiveRepair.external_service.pending_amount)}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {effectiveRepair.external_service.pending_amount > 0.01 && (
                                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                                                                <div className="md:col-span-4">
                                                                    <Label className="text-xs font-medium">Método de pago *</Label>
                                                                    <Select value={externalPaymentMethodId} onValueChange={setExternalPaymentMethodId}>
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="Seleccionar método" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {paymentMethods.map((method) => (
                                                                                <SelectItem key={method.id} value={String(method.id)}>
                                                                                    {method.name}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                                <div className="md:col-span-3">
                                                                    <Label className="text-xs font-medium">Monto *</Label>
                                                                    <Input
                                                                        type="number"
                                                                        min="0"
                                                                        step="0.01"
                                                                        value={externalPaymentAmount || String(effectiveRepair.external_service.pending_amount ?? "")}
                                                                        onChange={(e) => setExternalPaymentAmount(e.target.value)}
                                                                    />
                                                                </div>
                                                                <div className="md:col-span-3">
                                                                    <Label className="text-xs font-medium">Notas</Label>
                                                                    <Input
                                                                        value={externalPaymentNotes}
                                                                        onChange={(e) => setExternalPaymentNotes(e.target.value)}
                                                                        placeholder="Opcional"
                                                                    />
                                                                </div>
                                                                <div className="md:col-span-2">
                                                                    <Button
                                                                        className="w-full"
                                                                        disabled={
                                                                            processingExternalAction ||
                                                                            !externalPaymentMethodId ||
                                                                            ((externalPaymentAmount ? parseFloat(externalPaymentAmount) : effectiveRepair.external_service.pending_amount) <= 0) ||
                                                                            ((externalPaymentAmount ? parseFloat(externalPaymentAmount) : effectiveRepair.external_service.pending_amount) > effectiveRepair.external_service.pending_amount)
                                                                        }
                                                                        onClick={async () => {
                                                                            if (!effectiveRepair?.id) return;

                                                                            setProcessingExternalAction(true);
                                                                            setExternalActionError(null);
                                                                            try {
                                                                                const resolvedAmount = externalPaymentAmount
                                                                                    ? parseFloat(externalPaymentAmount)
                                                                                    : effectiveRepair.external_service?.pending_amount ?? 0;

                                                                                const result = await payExternalService(effectiveRepair.id, {
                                                                                    amount: resolvedAmount,
                                                                                    payment_method_id: parseInt(externalPaymentMethodId, 10),
                                                                                    notes: externalPaymentNotes || undefined,
                                                                                });

                                                                                if (!result) {
                                                                                    setExternalActionError("No se pudo registrar el pago externo.");
                                                                                    return;
                                                                                }

                                                                                setCurrentRepair(result);
                                                                                setExternalPaymentNotes("");
                                                                                setExternalPaymentAmount(String(result.external_service?.pending_amount ?? ""));
                                                                                sileo.success({ title: "Pago externo registrado" });
                                                                                onPaymentSuccess?.();
                                                                            } catch (error) {
                                                                                const message = error instanceof Error ? error.message : "No se pudo registrar el pago externo";
                                                                                setExternalActionError(message);
                                                                            } finally {
                                                                                setProcessingExternalAction(false);
                                                                            }
                                                                        }}
                                                                    >
                                                                        {processingExternalAction ? (
                                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                                        ) : (
                                                                            <>
                                                                                <Wallet className="mr-2 h-4 w-4" />
                                                                                Pagar
                                                                            </>
                                                                        )}
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : showExternalDeriveForm ? (
                                                    <div className="space-y-3">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            <div>
                                                                <Label className="text-xs font-medium">Proveedor externo *</Label>
                                                                <SupplierSearchCombobox
                                                                    value={externalSupplierId}
                                                                    onValueChange={setExternalSupplierId}
                                                                    suppliers={suppliers}
                                                                    placeholder="Escribí para buscar proveedor..."
                                                                />
                                                            </div>
                                                            <div>
                                                                <Label className="text-xs font-medium">Costo acordado *</Label>
                                                                <Input
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.01"
                                                                    value={externalAgreedCost}
                                                                    onChange={(e) => setExternalAgreedCost(e.target.value)}
                                                                    placeholder="0.00"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <Label className="text-xs font-medium">Descripción</Label>
                                                            <Input
                                                                value={externalDescription}
                                                                onChange={(e) => setExternalDescription(e.target.value)}
                                                                placeholder="Ej: Derivación de placa principal"
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label className="text-xs font-medium">Notas</Label>
                                                            <Textarea
                                                                value={externalNotes}
                                                                onChange={(e) => setExternalNotes(e.target.value)}
                                                                rows={2}
                                                                placeholder="Opcional"
                                                            />
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                variant="outline"
                                                                className="flex-1"
                                                                onClick={() => setShowExternalDeriveForm(false)}
                                                                disabled={processingExternalAction}
                                                            >
                                                                Cancelar
                                                            </Button>
                                                            <Button
                                                                className="flex-1"
                                                                disabled={
                                                                    processingExternalAction ||
                                                                    !externalSupplierId ||
                                                                    !externalAgreedCost ||
                                                                    parseFloat(externalAgreedCost) <= 0
                                                                }
                                                                onClick={async () => {
                                                                    if (!effectiveRepair?.id) return;

                                                                    setProcessingExternalAction(true);
                                                                    setExternalActionError(null);
                                                                    try {
                                                                        const result = await deriveToExternal(effectiveRepair.id, {
                                                                            supplier_id: parseInt(externalSupplierId, 10),
                                                                            agreed_cost: parseFloat(externalAgreedCost),
                                                                            description: externalDescription || undefined,
                                                                            notes: externalNotes || undefined,
                                                                        });

                                                                        if (!result) {
                                                                            setExternalActionError("No se pudo derivar la reparación.");
                                                                            return;
                                                                        }

                                                                        setCurrentRepair(result);
                                                                        setShowExternalDeriveForm(false);
                                                                        setExternalPaymentAmount(String(result.external_service?.pending_amount ?? ""));
                                                                        sileo.success({ title: "Reparación derivada a externo" });
                                                                        onPaymentSuccess?.();
                                                                    } catch (error) {
                                                                        const message = error instanceof Error ? error.message : "No se pudo derivar la reparación";
                                                                        setExternalActionError(message);
                                                                    } finally {
                                                                        setProcessingExternalAction(false);
                                                                    }
                                                                }}
                                                            >
                                                                {processingExternalAction ? (
                                                                    <>
                                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                        Guardando...
                                                                    </>
                                                                ) : (
                                                                    "Confirmar derivación"
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between gap-3">
                                                        <p className="text-xs text-muted-foreground">
                                                            Esta reparación todavía no está derivada a un proveedor externo.
                                                        </p>
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => {
                                                                setShowExternalDeriveForm(true);
                                                                setExternalAgreedCost(String(Math.max(0, Number(effectiveRepair?.cost ?? 0))));
                                                            }}
                                                        >
                                                            <Handshake className="mr-2 h-4 w-4" />
                                                            Derivar a externo
                                                        </Button>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>

                                        <Card className="border-slate-200 bg-slate-50/50">
                                            <CardContent className="py-3">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground">Estado:</span>
                                                        <Badge variant="outline">
                                                            {paymentStatusForDisplay === "paid"
                                                                ? "Pagada"
                                                                : paymentStatusForDisplay === "partial"
                                                                    ? "Parcial"
                                                                    : "Pendiente"}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-3">
                                                        <span>Total cobrado: {formatCurrency(effectiveRepair?.total_paid ?? effectiveRepair?.amount_paid ?? 0)}</span>
                                                        <span>Pendiente: {formatCurrency(effectiveRepair?.pending_amount ?? 0)}</span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {effectiveRepair?.status === "Cancelado" ? (
                                            <Card className="border-gray-200 bg-gray-50/50">
                                                <CardContent className="py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gray-100">
                                                            <Banknote className="h-5 w-5 text-gray-400" />
                                                        </div>
                                                        <div className="space-y-1 flex-1">
                                                            <p className="font-semibold text-gray-600">Reparación cancelada</p>
                                                            {effectiveRepair?.is_paid ? (
                                                                <div className="text-xs space-y-0.5">
                                                                    <p className="text-gray-600 font-medium">Cobrada previamente</p>
                                                                    <p className="text-gray-500">
                                                                        <span className="font-medium">Monto:</span>{" "}
                                                                        {formatCurrency(effectiveRepair?.amount_paid ?? 0)}
                                                                    </p>
                                                                    <p className="text-gray-500">
                                                                        <span className="font-medium">Método:</span>{" "}
                                                                        {effectiveRepair?.payment_method?.name || "—"}
                                                                    </p>
                                                                    <p className="text-gray-500">
                                                                        <span className="font-medium">Modalidad:</span>{" "}
                                                                        {effectiveRepair?.charge_with_iva === false ? "Sin IVA" : "Con IVA"}
                                                                    </p>
                                                                    {effectiveRepair?.paid_at && (
                                                                        <p className="text-gray-500">
                                                                            <span className="font-medium">Fecha:</span>{" "}
                                                                            {formatDateTime(effectiveRepair.paid_at)}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <p className="text-sm text-gray-500">Sin cobro registrado</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {canRevertGeneralPayment && (
                                                        <div className="mt-4 pt-3 border-t border-gray-200/70">
                                                            <Button
                                                                variant="outline"
                                                                className="w-full border-rose-200 text-rose-700 hover:bg-rose-50"
                                                                disabled={isRevertingPayment || !canRevertGeneralPayment}
                                                                onClick={openGeneralRevertDialog}
                                                            >
                                                                {isRevertingPayment ? (
                                                                    <>
                                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                        Revirtiendo...
                                                                    </>
                                                                ) : (
                                                                    "Revertir cobro"
                                                                )}
                                                            </Button>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        ) : effectiveRepair?.is_paid ? (
                                            <Card className="border-green-200 bg-green-50/50 shadow-sm">
                                                <CardContent className="py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-100">
                                                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                        </div>
                                                        <div className="space-y-1 flex-1">
                                                            <p className="font-semibold text-green-800">Cobrado</p>
                                                            <div className="text-xs space-y-0.5">
                                                                <p className="text-green-700">
                                                                    <span className="font-medium">Monto:</span>{" "}
                                                                    {formatCurrency(effectiveRepair?.amount_paid ?? 0)}
                                                                </p>
                                                                <p className="text-green-700">
                                                                    <span className="font-medium">Método:</span>{" "}
                                                                    {effectiveRepair?.payment_method?.name || "—"}
                                                                </p>
                                                                <p className="text-green-700">
                                                                    <span className="font-medium">Modalidad:</span>{" "}
                                                                    {effectiveRepair?.charge_with_iva === false ? "Sin IVA" : "Con IVA"}
                                                                </p>
                                                                {effectiveRepair?.paid_at && (
                                                                    <p className="text-green-600">
                                                                        <span className="font-medium">Fecha:</span>{" "}
                                                                        {formatDateTime(effectiveRepair.paid_at)}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {canRevertGeneralPayment && (
                                                        <div className="mt-4 pt-3 border-t border-green-200/70">
                                                            <Button
                                                                variant="outline"
                                                                className="w-full border-rose-200 text-rose-700 hover:bg-rose-50"
                                                                disabled={isRevertingPayment || !canRevertGeneralPayment}
                                                                onClick={openGeneralRevertDialog}
                                                            >
                                                                {isRevertingPayment ? (
                                                                    <>
                                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                        Revirtiendo...
                                                                    </>
                                                                ) : (
                                                                    "Revertir cobro"
                                                                )}
                                                            </Button>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        ) : isFreeRepairPrice(effectiveRepair) ? (
                                            <Card className="border-slate-200 shadow-sm">
                                                <CardContent className="py-4 space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="font-semibold text-sm">Sin cargo</h4>
                                                        <Badge variant="outline" className="text-slate-700 border-slate-200">
                                                            No impacta en caja
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        El precio de venta es $0. Podés marcar la reparación como cobrada sin registrar
                                                        movimiento en caja.
                                                    </p>
                                                    {paymentError && (
                                                        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                                                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                                            <span>{paymentError}</span>
                                                        </div>
                                                    )}
                                                    <Button
                                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                                        disabled={isProcessingPayment}
                                                        onClick={async () => {
                                                            setIsProcessingPayment(true);
                                                            setPaymentError(null);
                                                            try {
                                                                const result = await markAsPaid(repair.id, {});
                                                                if (result) {
                                                                    sileo.success({
                                                                        title: "Reparación marcada como cobrada (sin cargo).",
                                                                    });
                                                                    onPaymentSuccess?.();
                                                                    onOpenChange(false);
                                                                } else {
                                                                    setPaymentError(
                                                                        "No se pudo confirmar el estado de cobro."
                                                                    );
                                                                }
                                                            } catch (error: unknown) {
                                                                const message =
                                                                    error instanceof Error
                                                                        ? error.message
                                                                        : "Error al registrar";
                                                                setPaymentError(message);
                                                            } finally {
                                                                setIsProcessingPayment(false);
                                                            }
                                                        }}
                                                    >
                                                        {isProcessingPayment ? (
                                                            <>
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                Procesando...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                                                Marcar como cobrada (sin cargo)
                                                            </>
                                                        )}
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        ) : showPaymentForm ? (
                                            <Card className="border-emerald-200 shadow-sm">
                                                <CardContent className="py-4 space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setShowPaymentForm(false);
                                                                    setPaymentError(null);
                                                                }}
                                                                className="h-8 w-8 p-0"
                                                            >
                                                                <ArrowLeft className="h-4 w-4" />
                                                            </Button>
                                                            <h4 className="font-semibold text-sm">Registrar Cobro</h4>
                                                        </div>
                                                        <Badge variant="outline" className="text-emerald-700 border-emerald-200">
                                                            Impacta en caja
                                                        </Badge>
                                                    </div>

                                                    {paymentError && (
                                                        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                                                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                                            <span>{paymentError}</span>
                                                        </div>
                                                    )}

                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-medium">Sucursal *</Label>
                                                        <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Seleccionar sucursal" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {branches.map((branch) => (
                                                                    <SelectItem key={branch.id} value={String(branch.id)}>
                                                                        {branch.description}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <Label className="text-xs font-medium">Métodos de Pago *</Label>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setPaymentRows((prev) => [...prev, { payment_method_id: "", amount: "" }]);
                                                                }}
                                                            >
                                                                Agregar método
                                                            </Button>
                                                        </div>

                                                        <div className="space-y-2">
                                                            {paymentRows.map((row, index) => (
                                                                <div key={`${index}-${row.payment_method_id}`} className="grid grid-cols-12 gap-2 items-center">
                                                                    <div className="col-span-7">
                                                                        <Select
                                                                            value={row.payment_method_id}
                                                                            onValueChange={(value) => {
                                                                                setPaymentRows((prev) =>
                                                                                    prev.map((entry, entryIndex) =>
                                                                                        entryIndex === index
                                                                                            ? { ...entry, payment_method_id: value }
                                                                                            : entry
                                                                                    )
                                                                                );
                                                                            }}
                                                                        >
                                                                            <SelectTrigger aria-label={`Método de pago ${index + 1}`}>
                                                                                <SelectValue placeholder="Seleccionar método" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {paymentMethods.map((method) => (
                                                                                    <SelectItem key={method.id} value={String(method.id)}>
                                                                                        {method.name}
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                    <div className="col-span-4">
                                                                        <Input
                                                                            type="number"
                                                                            step="0.01"
                                                                            min="0"
                                                                            placeholder="0.00"
                                                                            value={row.amount}
                                                                            onChange={(e) => {
                                                                                const value = e.target.value;
                                                                                setPaymentRows((prev) =>
                                                                                    prev.map((entry, entryIndex) =>
                                                                                        entryIndex === index ? { ...entry, amount: value } : entry
                                                                                    )
                                                                                );
                                                                            }}
                                                                            aria-label={`Monto método de pago ${index + 1}`}
                                                                        />
                                                                    </div>
                                                                    <div className="col-span-1 flex justify-end">
                                                                        {paymentRows.length > 1 && (
                                                                            <Button
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                onClick={() => {
                                                                                    setPaymentRows((prev) => prev.filter((_, i) => i !== index));
                                                                                }}
                                                                                aria-label={`Eliminar método de pago ${index + 1}`}
                                                                            >
                                                                                ×
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-medium">Modalidad de Cobro *</Label>
                                                        <Select
                                                            value={chargeMode}
                                                            onValueChange={(value) => {
                                                                const mode = value as ChargeWithIvaMode;
                                                                setChargeMode(mode);
                                                            }}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Seleccionar modalidad" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="with_iva">
                                                                    Cobrar con IVA ({formatCurrency(pricing.sale_price_with_iva)})
                                                                </SelectItem>
                                                                <SelectItem value="without_iva">
                                                                    Cobrar sin IVA ({formatCurrency(pricing.sale_price_without_iva)})
                                                                </SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <p className="text-xs text-muted-foreground">
                                                            Neto: {formatCurrency(pricing.sale_price_without_iva)} | IVA ({pricing.iva_percentage.toFixed(2)}%): {formatCurrency(pricing.sale_price_with_iva - pricing.sale_price_without_iva)} | Bruto: {formatCurrency(pricing.sale_price_with_iva)}
                                                        </p>
                                                    </div>

                                                    <div className="space-y-2 rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
                                                        <Label className="text-xs font-medium">Resumen</Label>
                                                        {(() => {
                                                            const expectedAmount = resolvePendingAmountByMode(chargeMode);
                                                            const enteredAmount = paymentRows.reduce((acc, row) => {
                                                                const parsed = parseFloat(row.amount);
                                                                if (Number.isNaN(parsed) || parsed <= 0) return acc;
                                                                return acc + parsed;
                                                            }, 0);
                                                            const diff = enteredAmount - expectedAmount;

                                                            return (
                                                                <div className="space-y-1 text-xs">
                                                                    <p className="text-emerald-800">
                                                                        <span className="font-semibold">Pendiente actual:</span> {formatCurrency(expectedAmount)}
                                                                    </p>
                                                                    <p className="text-emerald-800">
                                                                        <span className="font-semibold">Ingresado:</span> {formatCurrency(enteredAmount)}
                                                                    </p>
                                                                    {Math.abs(diff) > 0.01 ? (
                                                                        <p className={diff > 0 ? "text-red-700" : "text-orange-700"}>
                                                                            {diff > 0
                                                                                ? `Sobrepago: ${formatCurrency(diff)} (no permitido)`
                                                                                : `Faltará luego del cobro: ${formatCurrency(Math.abs(diff))}`}
                                                                        </p>
                                                                    ) : (
                                                                        <p className="text-green-700">Con este cobro queda en $0 para esta modalidad.</p>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>

                                                    <Button
                                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                                        disabled={
                                                            !selectedBranchId ||
                                                            paymentRows.some((row) => !row.payment_method_id || !row.amount || parseFloat(row.amount) <= 0) ||
                                                            (() => {
                                                                const expectedAmount = resolvePendingAmountByMode(chargeMode);
                                                                const enteredAmount = paymentRows.reduce((acc, row) => {
                                                                    const parsed = parseFloat(row.amount);
                                                                    if (Number.isNaN(parsed) || parsed <= 0) return acc;
                                                                    return acc + parsed;
                                                                }, 0);
                                                                return enteredAmount - expectedAmount > 0.01;
                                                            })() ||
                                                            isProcessingPayment
                                                        }
                                                        onClick={async () => {
                                                            setIsProcessingPayment(true);
                                                            setPaymentError(null);
                                                            try {
                                                                const normalizedPayments = paymentRows
                                                                    .map((row) => ({
                                                                        payment_method_id: parseInt(row.payment_method_id, 10),
                                                                        amount: parseFloat(row.amount),
                                                                    }))
                                                                    .filter(
                                                                        (row) =>
                                                                            Number.isFinite(row.payment_method_id)
                                                                            && row.payment_method_id > 0
                                                                            && Number.isFinite(row.amount)
                                                                            && row.amount > 0
                                                                    );

                                                                const result = await markAsPaid(repair.id, {
                                                                    branch_id: parseInt(selectedBranchId),
                                                                    payments: normalizedPayments,
                                                                    charge_with_iva: chargeMode === "with_iva",
                                                                });
                                                                if (result) {
                                                                    sileo.success({
                                                                        title: `Pago registrado. Pendiente por cobrar: ${formatCurrency(result.pending_amount ?? 0)}.`,
                                                                    });
                                                                    setShowPaymentForm(false);
                                                                    onPaymentSuccess?.();
                                                                    onOpenChange(false);
                                                                } else {
                                                                    setPaymentError(
                                                                        "No se pudo registrar el pago. Verifique que la caja esté abierta."
                                                                    );
                                                                }
                                                            } catch (error: unknown) {
                                                                const message =
                                                                    error instanceof Error
                                                                        ? error.message
                                                                        : "Error al registrar el pago";
                                                                setPaymentError(message);
                                                            } finally {
                                                                setIsProcessingPayment(false);
                                                            }
                                                        }}
                                                    >
                                                        {isProcessingPayment ? (
                                                            <>
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                Procesando...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                                                Confirmar Cobro
                                                            </>
                                                        )}
                                                    </Button>

                                                    <p className="text-xs text-muted-foreground text-center">
                                                        Este cobro se registrará como movimiento en la caja de la sucursal seleccionada
                                                    </p>
                                                </CardContent>
                                            </Card>
                                        ) : (
                                            <Button
                                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm h-12"
                                                onClick={() => {
                                                    setShowPaymentForm(true);
                                                    const defaultMode = resolveDefaultChargeMode(repair);
                                                    setChargeMode(defaultMode);
                                                    setPaymentRows([
                                                        {
                                                            payment_method_id: "",
                                                            amount: String(resolvePendingAmountByMode(defaultMode)),
                                                        },
                                                    ]);
                                                    if (repair.branch?.id) setSelectedBranchId(String(repair.branch.id));
                                                }}
                                            >
                                                <Banknote className="mr-2 h-5 w-5" />
                                                Registrar Cobro
                                            </Button>
                                        )}
                                    </div>

                                    <Card>
                                        <CardContent className="py-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-semibold">Historial de cobros</h4>
                                                <Badge variant="outline">
                                                    {sortedRepairPayments.length} registrados / {activePaymentsCount} activos
                                                </Badge>
                                            </div>

                                            {sortedRepairPayments.length === 0 ? (
                                                <p className="text-xs text-muted-foreground">Todavía no hay cobros registrados para esta reparación.</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {sortedRepairPayments.map((payment) => (
                                                        <div
                                                            key={payment.id}
                                                            className="rounded-lg border p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
                                                        >
                                                            <div className="space-y-0.5">
                                                                <p className="text-sm font-medium">
                                                                    {payment.payment_method?.name || "Método no disponible"} - {formatCurrency(payment.amount)}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {payment.paid_at ? formatDateTime(payment.paid_at) : "Sin fecha"} | {payment.charge_with_iva ? "Con IVA" : "Sin IVA"}
                                                                </p>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                <Badge variant={payment.is_reversed ? "secondary" : "default"}>
                                                                    {payment.is_reversed ? "Revertido" : "Activo"}
                                                                </Badge>
                                                                {!payment.is_reversed && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="border-rose-200 text-rose-700 hover:bg-rose-50"
                                                                        disabled={isRevertingPayment}
                                                                        onClick={() => openItemRevertDialog(payment.id)}
                                                                    >
                                                                        Revertir este pago
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>

                            <TabsContent value="notes" className="m-0">
                                <div className="space-y-4">
                                    {(editMode || !!onQuickAddNote) && (
                                        <div className="flex gap-2">
                                            <Textarea
                                                placeholder="Nota..."
                                                value={newNote}
                                                onChange={(e) => setNewNote(e.target.value)}
                                                rows={2}
                                                className="flex-1"
                                            />
                                            <Button onClick={handleAddNote} disabled={!newNote.trim() || addingNote}>
                                                {addingNote ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                Agregar
                                            </Button>
                                        </div>
                                    )}
                                    <div className="space-y-3">
                                        {stagedNotes.map((note, idx) => (
                                            <Card key={`staged-${idx}`} className="border-amber-200 bg-amber-50/50">
                                                <CardContent className="py-2">
                                                    <p className="text-sm font-medium">Nueva nota (pendiente)</p>
                                                    <p className="text-sm">{note}</p>
                                                </CardContent>
                                            </Card>
                                        ))}
                                        {sortedRepairNotes.map((note: RepairNote) => (
                                            <Card key={note.id}>
                                                <CardContent className="py-2">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="text-xs font-medium">{note.user?.name}</span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {formatDateTime(note.created_at)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm">{note.note}</p>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                ) : null}

                {editMode && (
                    <div className="flex justify-end gap-2 mt-6">
                        <Button variant="outline" onClick={onCancelEdit} disabled={saving}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Guardar"}
                        </Button>
                    </div>
                )}

                <AlertDialog
                    open={showRevertDialog}
                    onOpenChange={(openDialog) => {
                        setShowRevertDialog(openDialog);
                        if (!openDialog) {
                            setPaymentToRevertId(null);
                            setPaymentError(null);
                        }
                    }}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Seguro que querés revertir este cobro?</AlertDialogTitle>
                            <AlertDialogDescription>
                                {paymentToRevertId
                                    ? "Se anulará el pago seleccionado, su impacto en caja y en cuenta corriente."
                                    : "Se anulará el último pago activo, su impacto en caja y en cuenta corriente."}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        {paymentError && (
                            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                                {paymentError}
                            </div>
                        )}
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isRevertingPayment}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleConfirmRevertPayment}
                                disabled={isRevertingPayment || (!canRevertGeneralPayment && !paymentToRevertId)}
                                className="bg-rose-600 hover:bg-rose-700 text-white"
                            >
                                {isRevertingPayment ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Revirtiendo...
                                    </>
                                ) : (
                                    "Revertir cobro"
                                )}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
}

