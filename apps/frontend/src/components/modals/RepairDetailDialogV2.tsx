import { useState, useEffect, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
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
    Calendar,
    Clock,
    AlertTriangle,
    Package,
    Stethoscope,
    Shield,
    Banknote,
    CheckCircle2,
    ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Repair, RepairNote, RepairPriority, RepairStatus, Insurer } from "@/types/repairs";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import useApi from "@/hooks/useApi";
import { sileo } from "sileo"
import { useBranches } from "@/hooks/useBranches";
import { useRepairs } from "@/hooks/useRepairs";

type CustomerOption = { id: number; name: string };
type UserOption = { id: number; name: string };
type CategoryOption = { id: number; name: string };

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

type RepairDetailDialogV2Props = {
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
        return format(new Date(dateString), "dd/MM/yyyy", { locale: es });
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

export default function RepairDetailDialogV2({
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
}: RepairDetailDialogV2Props) {
    const { request } = useApi();
    const [editData, setEditData] = useState<Omit<Partial<Repair>, "device_age"> & { customer_id?: number; technician_id?: number; category_id?: number; intake_date?: string | null; policy_number?: string; device_age?: string | number | null }>({});
    const [saving, setSaving] = useState(false);
    const [addingNote, setAddingNote] = useState(false);
    const [newNote, setNewNote] = useState("");
    const [stagedNotes, setStagedNotes] = useState<string[]>([]);
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [activeTab, setActiveTab] = useState<"details" | "financials" | "notes">(defaultTab);
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
    const { branches } = useBranches();
    const { markAsPaid } = useRepairs();

    // Payment form states
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [selectedBranchId, setSelectedBranchId] = useState<string>("");
    const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>("");
    const [paymentAmount, setPaymentAmount] = useState<string>("");
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [paymentError, setPaymentError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setActiveTab(defaultTab);
            // Reset payment form when modal opens
            setShowPaymentForm(false);
            setSelectedBranchId("");
            setSelectedPaymentMethodId("");
            setPaymentAmount("");
            setPaymentError(null);
            // Fetch payment methods on modal open
            const fetchPaymentMethods = async () => {
                try {
                    const resp = await request({
                        method: "GET",
                        url: "/payment-methods",
                        params: { limit: 100 }
                    });
                    const data = Array.isArray(resp?.data) ? resp.data : [];
                    setPaymentMethods(data);
                } catch (error) {
                    console.error("Error fetching payment methods:", error);
                }
            };
            fetchPaymentMethods();
        }
    }, [open, defaultTab]);

    // Customer search
    const [customerSearch, setCustomerSearch] = useState("");
    const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
    const [showCustomerOptions, setShowCustomerOptions] = useState(false);

    // Technician search
    const [technicianSearch, setTechnicianSearch] = useState("");
    const [technicianOptions, setTechnicianOptions] = useState<UserOption[]>([]);
    const [showTechnicianOptions, setShowTechnicianOptions] = useState(false);

    // Categories
    const [categories, setCategories] = useState<CategoryOption[]>([]);

    const fetchCustomers = useCallback(async () => {
        try {
            const resp = await request({
                method: "GET",
                url: "/customers",
                params: { limit: 100 },
            });
            const data = Array.isArray(resp?.data) ? resp.data : Array.isArray(resp) ? resp : [];
            const mapped: CustomerOption[] = data.map((c: { id: number; person?: { first_name?: string; last_name?: string }; name?: string }) => ({
                id: c.id,
                name: c.person
                    ? `${c.person.first_name || ""} ${c.person.last_name || ""}`.trim()
                    : c.name || `Cliente #${c.id}`,
            }));
            setCustomerOptions(mapped);
        } catch (error) {
            console.error("Error fetching customers:", error);
        }
    }, [request]);

    const fetchTechnicians = useCallback(async () => {
        try {
            const resp = await request({
                method: "GET",
                url: "/users",
                params: { limit: 100 },
            });
            const data = Array.isArray(resp?.data) ? resp.data : Array.isArray(resp) ? resp : [];
            const mapped: UserOption[] = data.map((u: { id: number; person?: { first_name?: string; last_name?: string }; username?: string }) => ({
                id: u.id,
                name: u.person
                    ? `${u.person.first_name || ""} ${u.person.last_name || ""}`.trim()
                    : u.username || `Usuario #${u.id}`,
            }));
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
        if (editMode) {
            fetchCustomers();
            fetchTechnicians();
            fetchCategories();
        }
    }, [editMode, fetchCustomers, fetchTechnicians, fetchCategories]);

    useEffect(() => {
        if (editMode && repair) {
            setEditData({
                status: repair.status,
                priority: repair.priority,
                device: repair.device,
                serial_number: repair.serial_number,
                issue_description: repair.issue_description,
                diagnosis: repair.diagnosis,
                cost: repair.cost,
                sale_price: repair.sale_price,
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
            setCustomerSearch(repair.customer?.name || "");
            setTechnicianSearch(repair.technician?.name || "");
            setStagedNotes([]);
            setErrors({});
        }
    }, [editMode, repair]);

    const handleSave = async () => {
        if (!onSave) return;
        setSaving(true);
        setErrors({});
        try {
            const payload = { ...editData };
            if (typeof payload.device_age === 'string') {
                payload.device_age = payload.device_age ? parseInt(payload.device_age) : null;
            }
            // When marking as "Sin reparación", auto-fill reason with diagnosis if not already set
            if (payload.is_no_repair && !payload.no_repair_reason) {
                payload.no_repair_reason = editData.diagnosis || repair.diagnosis || null;
            }
            await onSave(payload as Partial<Repair>, stagedNotes);
            setStagedNotes([]);
            setNewNote("");
            onCancelEdit?.();
            // Auto-close modal after successful save
            setTimeout(() => {
                onOpenChange(false);
            }, 300);
            sileo.success({ title: "Los cambios se guardaron correctamente" });
        } catch (error: unknown) {
            console.error("Error saving repair:", error);
            // @ts-expect-error - request hook throws object with response
            if (error?.response && error?.response.data && error?.response.data.errors) {
                // @ts-expect-error - request hook throws object with response
                const validationErrors = error.response.data.errors;
                setErrors(validationErrors);
                const firstField = Object.keys(validationErrors)[0];
                const firstErrorMsg = validationErrors[firstField]?.[0];
                sileo.error({ title: firstErrorMsg || "Hay errores de validación." });
            } else {
                // @ts-expect-error - request hook throws object with response
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
                if (ok) {
                    setNewNote("");
                }
            })
            .finally(() => setAddingNote(false));
    };

    if (!repair && !loading) return null;

    return (
        <>
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* @ts-expect-error - Radix DialogContent props */}
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" hideCloseButton>
                <DialogHeader>
                    <div className="flex flex-col gap-3">
                        {/* @ts-expect-error - Radix DialogTitle children */}
                        <DialogTitle className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xl">{repair?.code || "..."}</span>
                            {repair && (
                                <>
                                    <Badge variant="outline" className={cn("text-xs", STATUS_COLORS[repair.status])}>
                                        {repair.status}
                                    </Badge>
                                    <Badge variant="outline" className={cn("text-xs", PRIORITY_COLORS[repair.priority])}>
                                        {repair.priority}
                                    </Badge>
                                    {repair.is_no_repair && (
                                        <Badge className="text-xs bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-100">
                                            <AlertCircle className="h-3 w-3 mr-1" />
                                            Sin Reparación
                                        </Badge>
                                    )}
                                    {repair.category && (
                                        <Badge variant="secondary" className="text-xs">
                                            {repair.category.name}
                                        </Badge>
                                    )}
                                </>
                            )}
                        </DialogTitle>
                        {(onDownloadPdf || (onDownloadNoRepairCertificate && repair?.is_no_repair) || (onDownloadReceptionCertificate && repair?.is_siniestro)) && (
                            <div className="flex flex-wrap items-center gap-2">
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
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12 border-none">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : repair ? (
                    /* @ts-expect-error - Radix Tabs children */
                    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "details" | "financials" | "notes")} className="flex-1 overflow-hidden flex flex-col">
                        {/* @ts-expect-error - Radix TabsList children */}
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="details">Detalles</TabsTrigger>
                            <TabsTrigger value="financials">Costos</TabsTrigger>
                            <TabsTrigger value="notes">Notas ({repair.notes?.length || 0})</TabsTrigger>
                        </TabsList>

                        <div className="flex-1 mt-4 overflow-y-auto pr-4">
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
                                            <div className="grid grid-cols-2 gap-4">
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
                                                        {showCustomerOptions && customerOptions.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).length > 0 && (
                                                            <div className="absolute left-0 right-0 border rounded bg-white mt-1 max-h-40 overflow-auto z-50 shadow">
                                                                {customerOptions.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).map((customer) => (
                                                                    <div
                                                                        key={customer.id}
                                                                        className="p-2 cursor-pointer hover:bg-gray-100"
                                                                        onMouseDown={() => {
                                                                            setEditData((d) => ({ ...d, customer_id: customer.id }));
                                                                            setCustomerSearch(customer.name);
                                                                            setShowCustomerOptions(false);
                                                                        }}
                                                                    >
                                                                        {customer.name}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {errors.customer_id && <p className="text-xs text-red-500 mt-1">{errors.customer_id[0]}</p>}
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
                                                                <div className="p-2 cursor-pointer hover:bg-gray-100 text-gray-500 italic" onMouseDown={() => {
                                                                    setEditData((d) => ({ ...d, technician_id: undefined }));
                                                                    setTechnicianSearch("");
                                                                    setShowTechnicianOptions(false);
                                                                }}>Sin asignar</div>
                                                                {technicianOptions.filter(t => t.name.toLowerCase().includes(technicianSearch.toLowerCase())).map((tech) => (
                                                                    <div key={tech.id} className="p-2 cursor-pointer hover:bg-gray-100" onMouseDown={() => {
                                                                        setEditData((d) => ({ ...d, technician_id: tech.id }));
                                                                        setTechnicianSearch(tech.name);
                                                                        setShowTechnicianOptions(false);
                                                                    }}>{tech.name}</div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Equipo *</Label>
                                                    <Input value={editData.device ?? repair.device} onChange={(e) => setEditData((d) => ({ ...d, device: e.target.value }))} />
                                                    {errors.device && <p className="text-xs text-red-500 mt-1">{errors.device[0]}</p>}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Número de Serie</Label>
                                                    <Input value={editData.serial_number ?? repair.serial_number ?? ""} onChange={(e) => setEditData((d) => ({ ...d, serial_number: e.target.value }))} />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Categoría</Label>
                                                <Select value={editData.category_id ? editData.category_id.toString() : "empty"} onValueChange={(v) => setEditData((d) => ({ ...d, category_id: v === "empty" ? undefined : parseInt(v) }))}>
                                                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="empty">Sin categoría</SelectItem>
                                                        {categories.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Descripción del Problema *</Label>
                                                <Textarea value={editData.issue_description ?? repair.issue_description} onChange={(e) => setEditData((d) => ({ ...d, issue_description: e.target.value }))} rows={3} />
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Diagnóstico Técnico</Label>
                                                <Textarea value={editData.diagnosis ?? repair.diagnosis ?? ""} onChange={(e) => setEditData((d) => ({ ...d, diagnosis: e.target.value }))} rows={3} />
                                            </div>

                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Estado</Label>
                                                    <Select value={editData.status ?? repair.status} onValueChange={(v) => setEditData((d) => ({ ...d, status: v as RepairStatus }))}>
                                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                                        <SelectContent>{options.statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Prioridad</Label>
                                                    <Select value={editData.priority ?? repair.priority} onValueChange={(v) => setEditData((d) => ({ ...d, priority: v as RepairPriority }))}>
                                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                                        <SelectContent>{options.priorities.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Fecha Estimada</Label>
                                                    <Input type="date" value={editData.estimated_date ?? repair.estimated_date ?? ""} onChange={(e) => setEditData((d) => ({ ...d, estimated_date: e.target.value }))} />
                                                </div>
                                            </div>

                                            <div className="space-y-4 pt-4 border-t">
                                                <div className="space-y-3 p-4 bg-rose-50/50 rounded-lg border border-rose-100">
                                                    <div className="flex items-center gap-2">
                                                        <input 
                                                            type="checkbox" 
                                                            id="is_no_repair_edit" 
                                                            checked={!!editData.is_no_repair} 
                                                            onChange={(e) => setEditData((d) => ({ ...d, is_no_repair: e.target.checked }))} 
                                                        />
                                                        <Label htmlFor="is_no_repair_edit" className="font-semibold">Sin reparación (Acta de no reparación)</Label>
                                                    </div>
                                                    {editData.is_no_repair && (
                                                        <div className="ml-6 p-3 bg-white rounded border border-rose-200">
                                                            <p className="text-sm text-rose-800">
                                                                ✓ Se generará un acta de no reparación con el <strong>Diagnóstico Técnico</strong> que completes arriba.
                                                            </p>
                                                            {!editData.diagnosis && !repair.diagnosis && (
                                                                <p className="text-xs text-amber-700 mt-2 bg-amber-50 p-2 rounded">
                                                                    💡 Completa el campo "Diagnóstico Técnico" para generar el acta
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input type="checkbox" id="is_siniestro_edit" checked={!!editData.is_siniestro} onChange={(e) => setEditData((d) => ({ ...d, is_siniestro: e.target.checked }))} />
                                                    <Label htmlFor="is_siniestro_edit">¿Es un siniestro?</Label>
                                                </div>
                                                {editData.is_siniestro && (
                                                    <div className="space-y-4 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label>Aseguradora</Label>
                                                                <Select value={editData.insurer_id ? editData.insurer_id.toString() : ""} onValueChange={(v) => setEditData((d) => ({ ...d, insurer_id: v ? parseInt(v) : undefined }))}>
                                                                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                                                    <SelectContent>{options.insurers?.map((i) => <SelectItem key={i.id} value={i.id.toString()}>{i.name}</SelectItem>)}</SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>Nº Siniestro</Label>
                                                                <Input value={editData.siniestro_number ?? repair.siniestro_number ?? ""} onChange={(e) => setEditData((d) => ({ ...d, siniestro_number: e.target.value }))} />
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label>Nº de Póliza</Label>
                                                                <Input value={editData.policy_number ?? repair.policy_number ?? ""} onChange={(e) => setEditData((d) => ({ ...d, policy_number: e.target.value }))} />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>Antigüedad del equipo (años)</Label>
                                                                <Input type="number" min="0" value={editData.device_age ?? repair.device_age ?? ""} onChange={(e) => setEditData((d) => ({ ...d, device_age: e.target.value }))} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* Customer Info Card */}
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
                                                    <div className="grid grid-cols-2 gap-4 pl-11">
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

                                            {/* Device & Issue Card */}
                                            <Card>
                                                <CardContent className="py-4 space-y-4">
                                                    <div className="grid grid-cols-2 gap-4">
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

                                            {/* Status & Dates Card */}
                                            <Card className="bg-gradient-to-r from-gray-50 to-white">
                                                <CardContent className="py-4">
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                                <Package className="h-3 w-3" /> Estado
                                                            </Label>
                                                            <Badge variant="outline" className={cn("text-xs font-medium", STATUS_COLORS[repair.status])}>
                                                                {repair.status}
                                                            </Badge>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                                <AlertTriangle className="h-3 w-3" /> Prioridad
                                                            </Label>
                                                            <Badge variant="outline" className={cn("text-xs font-medium", PRIORITY_COLORS[repair.priority])}>
                                                                {repair.priority}
                                                            </Badge>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                                <Calendar className="h-3 w-3" /> Ingreso
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

                                            {/* Insurance Info Card - Only show if is_siniestro */}
                                            {repair.is_siniestro && (
                                                <Card className="border-l-4 border-l-amber-500 bg-amber-50/30">
                                                    <CardContent className="py-4">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <Shield className="h-4 w-4 text-amber-600" />
                                                            <span className="font-semibold text-sm text-amber-800">Información del Siniestro</span>
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
                                                                <p className="text-sm font-medium">{repair.device_age ? `${repair.device_age} años` : "-"}</p>
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
                                                            <span className="font-semibold text-sm text-rose-800">Acta sin reparación</span>
                                                        </div>
                                                        <div className="space-y-2 pl-6">
                                                            <div>
                                                                <Label className="text-xs text-muted-foreground">Fecha</Label>
                                                                <p className="text-sm font-medium">{formatDateTime(repair.no_repair_at)}</p>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            {/* @ts-expect-error - Radix TabsContent className */}
                            <TabsContent value="financials" className="m-0">
                                <div className="space-y-4">
                                    {/* Financial Info */}
                                    <Card>
                                        <CardContent className="py-4">
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="text-center p-4 rounded-lg bg-muted/50">
                                                    <Label className="text-xs text-muted-foreground">Costo</Label>
                                                    {editMode ? <Input type="number" step="0.01" className="mt-2 text-center" value={"cost" in editData ? (editData.cost ?? "") : (repair.cost ?? "")} onChange={(e) => setEditData((d) => ({ ...d, cost: e.target.value ? parseFloat(e.target.value) : null }))} /> : <p className="text-2xl font-bold mt-2">{formatCurrency(repair.cost)}</p>}
                                                </div>
                                                <div className="text-center p-4 rounded-lg bg-muted/50">
                                                    <Label className="text-xs text-muted-foreground">Precio Venta</Label>
                                                    {editMode ? <Input type="number" step="0.01" className="mt-2 text-center" value={"sale_price" in editData ? (editData.sale_price ?? "") : (repair.sale_price ?? "")} onChange={(e) => setEditData((d) => ({ ...d, sale_price: e.target.value ? parseFloat(e.target.value) : null }))} /> : <p className="text-2xl font-bold mt-2 text-green-600">{formatCurrency(repair.sale_price)}</p>}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Payment Status Section */}
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-semibold flex items-center gap-2">
                                            <Banknote className="h-4 w-4" />
                                            <span>Estado de Pago</span>
                                        </h3>
                                        
                                        {/* Cancelled repair - cannot charge */}
                                        {repair.status === "Cancelado" ? (
                                            <Card className="border-gray-200 bg-gray-50/50">
                                                <CardContent className="py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gray-100">
                                                            <Banknote className="h-5 w-5 text-gray-400" />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-500">No disponible</p>
                                                            <p className="text-sm text-gray-400">Esta reparación está cancelada</p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ) : repair.is_paid ? (
                                            /* Already paid state */
                                            <Card className="border-green-200 bg-green-50/50 shadow-sm">
                                                <CardContent className="py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-100">
                                                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="font-semibold text-green-800">Cobrado</p>
                                                            <div className="text-xs space-y-0.5">
                                                                <p className="text-green-700">
                                                                    <span className="font-medium">Monto:</span> {formatCurrency(repair.amount_paid)}
                                                                </p>
                                                                <p className="text-green-700">
                                                                    <span className="font-medium">Método:</span> {repair.payment_method?.name || "—"}
                                                                </p>
                                                                {repair.paid_at && (
                                                                    <p className="text-green-600">
                                                                        <span className="font-medium">Fecha:</span> {formatDateTime(repair.paid_at)}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ) : showPaymentForm ? (
                                            /* Inline Payment Form */
                                            <Card className="border-emerald-200 shadow-sm">
                                                <CardContent className="py-4 space-y-4">
                                                    {/* Form Header */}
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

                                                    {/* Error Message */}
                                                    {paymentError && (
                                                        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                                                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                                            <span>{paymentError}</span>
                                                        </div>
                                                    )}

                                                    {/* Branch Select */}
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

                                                    {/* Payment Method Select */}
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-medium">Método de Pago *</Label>
                                                        <Select value={selectedPaymentMethodId} onValueChange={setSelectedPaymentMethodId}>
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

                                                    {/* Amount Input */}
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-medium">Monto a Cobrar *</Label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                placeholder="0.00"
                                                                value={paymentAmount}
                                                                onChange={(e) => setPaymentAmount(e.target.value)}
                                                                className="pl-7"
                                                            />
                                                        </div>
                                                        {/* Difference indicator */}
                                                        {paymentAmount && repair.sale_price && (() => {
                                                            const diff = parseFloat(paymentAmount) - (repair.sale_price || 0);
                                                            if (Math.abs(diff) > 0.01) {
                                                                return (
                                                                    <p className={`text-xs ${diff > 0 ? "text-green-600" : "text-orange-600"}`}>
                                                                        {diff > 0 ? `+${formatCurrency(diff)} (sobrepago)` : `${formatCurrency(diff)} (parcial)`}
                                                                    </p>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                    </div>

                                                    {/* Submit Button */}
                                                    <Button
                                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                                        disabled={!selectedBranchId || !selectedPaymentMethodId || !paymentAmount || isProcessingPayment}
                                                        onClick={async () => {
                                                            setIsProcessingPayment(true);
                                                            setPaymentError(null);
                                                            try {
                                                                const result = await markAsPaid(repair.id, {
                                                                    branch_id: parseInt(selectedBranchId),
                                                                    payment_method_id: parseInt(selectedPaymentMethodId),
                                                                    amount_paid: parseFloat(paymentAmount),
                                                                });
                                                                if (result) {
                                                                    sileo.success({ title: "Pago registrado exitosamente. Se actualizó la caja." });
                                                                    setShowPaymentForm(false);
                                                                    onPaymentSuccess?.();
                                                                    onOpenChange(false);
                                                                } else {
                                                                    setPaymentError("No se pudo registrar el pago. Verifique que la caja esté abierta.");
                                                                }
                                                            } catch (error: any) {
                                                                setPaymentError(error?.message || "Error al registrar el pago");
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

                                                    {/* Info Note */}
                                                    <p className="text-xs text-muted-foreground text-center">
                                                        Este cobro se registrará como movimiento en la caja de la sucursal seleccionada
                                                    </p>
                                                </CardContent>
                                            </Card>
                                        ) : (
                                            /* Show Payment Button - Opens inline form */
                                            <Button
                                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm h-12"
                                                onClick={() => {
                                                    setShowPaymentForm(true);
                                                    setPaymentAmount(String(repair.sale_price || ""));
                                                    // Pre-select branch if repair has one
                                                    if (repair.branch?.id) {
                                                        setSelectedBranchId(String(repair.branch.id));
                                                    }
                                                }}
                                            >
                                                <Banknote className="mr-2 h-5 w-5" />
                                                Registrar Cobro
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>

                            {/* @ts-expect-error - Radix TabsContent className */}
                            <TabsContent value="notes" className="m-0">
                                <div className="space-y-4">
                                    {(editMode || !!onQuickAddNote) && (
                                        <div className="flex gap-2">
                                            <Textarea placeholder="Nota..." value={newNote} onChange={(e) => setNewNote(e.target.value)} rows={2} className="flex-1" />
                                            <Button onClick={handleAddNote} disabled={!newNote.trim() || addingNote}>
                                                {addingNote ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                Agregar
                                            </Button>
                                        </div>
                                    )}
                                    <div className="space-y-3">
                                        {stagedNotes.map((note, idx) => (
                                            <Card key={`staged-${idx}`} className="border-amber-200 bg-amber-50/50">
                                                <CardContent className="py-2"><p className="text-sm font-medium">Nueva nota (pendiente)</p><p className="text-sm">{note}</p></CardContent>
                                            </Card>
                                        ))}
                                        {repair.notes?.map((note: RepairNote) => (
                                            <Card key={note.id}>
                                                <CardContent className="py-2">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="text-xs font-medium">{note.user?.name}</span>
                                                        <span className="text-[10px] text-muted-foreground">{formatDateTime(note.created_at)}</span>
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

                <DialogFooter className="mt-4">
                    {editMode ? (
                        <>
                            <Button variant="outline" onClick={onCancelEdit} disabled={saving}>Cancelar</Button>
                            <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Guardar"}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}
