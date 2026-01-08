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
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Repair, RepairNote, RepairPriority, RepairStatus, Insurer } from "@/types/repairs";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import useApi from "@/hooks/useApi";
import { toast } from "sonner";

type CustomerOption = { id: number; name: string };
type UserOption = { id: number; name: string };
type CategoryOption = { id: number; name: string };

const STATUS_COLORS: Record<RepairStatus, string> = {
    Recibido: "bg-blue-100 text-blue-800 border-blue-200",
    "En diagnóstico": "bg-yellow-100 text-yellow-800 border-yellow-200",
    "Reparación Interna": "bg-orange-100 text-orange-800 border-orange-200",
    "Reparación Externa": "bg-cyan-100 text-cyan-800 border-cyan-200",
    "Esperando repuestos": "bg-purple-100 text-purple-800 border-purple-200",
    Terminado: "bg-green-100 text-green-800 border-green-200",
    Entregado: "bg-gray-100 text-gray-800 border-gray-200",
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
    options = {
        statuses: [
            "Recibido",
            "En diagnóstico",
            "Reparación Interna",
            "Reparación Externa",
            "Esperando repuestos",
            "Terminado",
            "Entregado",
        ],
        priorities: ["Alta", "Media", "Baja"],
    },
}: RepairDetailDialogV2Props) {
    const { request } = useApi();
    const [editData, setEditData] = useState<Omit<Partial<Repair>, "device_age"> & { customer_id?: number; technician_id?: number; category_id?: number; intake_date?: string | null; policy_number?: string; device_age?: string | number | null }>({});
    const [saving, setSaving] = useState(false);
    const [newNote, setNewNote] = useState("");
    const [stagedNotes, setStagedNotes] = useState<string[]>([]);
    const [errors, setErrors] = useState<Record<string, string[]>>({});

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
                url: "/categories/for-selector",
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
            await onSave(payload as Partial<Repair>, stagedNotes);
            setStagedNotes([]);
            setNewNote("");
        } catch (error: unknown) {
            console.error("Error saving repair:", error);
            // @ts-expect-error - request hook throws object with response
            if (error?.response && error?.response.data && error?.response.data.errors) {
                // @ts-expect-error - request hook throws object with response
                const validationErrors = error.response.data.errors;
                setErrors(validationErrors);
                const firstField = Object.keys(validationErrors)[0];
                const firstErrorMsg = validationErrors[firstField]?.[0];
                toast.error(firstErrorMsg || "Hay errores de validación.");
            } else {
                // @ts-expect-error - request hook throws object with response
                const msg = error?.response?.data?.message || "Ocurrió un error al guardar los cambios.";
                setErrors({ general: [msg] });
                toast.error(msg);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleAddNote = () => {
        if (!newNote.trim()) return;
        setStagedNotes((prev) => [...prev, newNote.trim()]);
        setNewNote("");
    };

    if (!repair && !loading) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* @ts-expect-error - Radix DialogContent props */}
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" hideCloseButton>
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        {/* @ts-expect-error - Radix DialogTitle children */}
                        <DialogTitle className="flex items-center gap-3">
                            <span className="font-mono text-xl">{repair?.code || "..."}</span>
                            {repair && (
                                <>
                                    <Badge variant="outline" className={cn("text-xs", STATUS_COLORS[repair.status])}>
                                        {repair.status}
                                    </Badge>
                                    <Badge variant="outline" className={cn("text-xs", PRIORITY_COLORS[repair.priority])}>
                                        {repair.priority}
                                    </Badge>
                                    {repair.category && (
                                        <Badge variant="secondary" className="text-xs">
                                            {repair.category.name}
                                        </Badge>
                                    )}
                                </>
                            )}
                        </DialogTitle>
                        <div className="flex items-center gap-1.5 ml-auto">
                            {onDownloadPdf && (
                                <Button variant="outline" size="sm" onClick={onDownloadPdf} className="text-amber-700 border-amber-200">
                                    <FileText className="h-4 w-4 mr-2" />
                                    Comprobante
                                </Button>
                            )}
                            {onDownloadReceptionCertificate && repair?.is_siniestro && (
                                <Button variant="outline" size="sm" onClick={onDownloadReceptionCertificate} className="text-blue-700 border-blue-200">
                                    <ClipboardCheck className="h-4 w-4 mr-2" />
                                    Acta Recepción
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12 border-none">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : repair ? (
                    /* @ts-expect-error - Radix Tabs children */
                    <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
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
                                        <>
                                            <Card>
                                                <CardContent className="py-2 grid grid-cols-3 gap-4 items-center">
                                                    <div className="flex items-center gap-2"><p className="text-sm font-medium">{repair.customer?.name}</p></div>
                                                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">{repair.customer?.phone}</div>
                                                    <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">{repair.customer?.address}</div>
                                                </CardContent>
                                            </Card>
                                            <Card>
                                                <CardContent className="py-2 space-y-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div><Label className="text-xs text-muted-foreground">Equipo</Label><p className="text-sm font-medium">{repair.device}</p></div>
                                                        <div><Label className="text-xs text-muted-foreground">Serie</Label><p className="text-sm">{repair.serial_number || "-"}</p></div>
                                                    </div>
                                                    <div><Label className="text-xs text-muted-foreground">Problema</Label><p className="text-sm mt-1">{repair.issue_description}</p></div>
                                                    <Separator />
                                                    <div><Label className="text-xs text-muted-foreground">Diagnóstico</Label><p className="text-sm mt-1">{repair.diagnosis || "Sin diagnóstico"}</p></div>
                                                </CardContent>
                                            </Card>
                                            <Card>
                                                <CardContent className="py-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    <div><Label className="text-xs text-muted-foreground">Estado</Label><p className="text-sm font-medium">{repair.status}</p></div>
                                                    <div><Label className="text-xs text-muted-foreground">Prioridad</Label><p className="text-sm font-medium">{repair.priority}</p></div>
                                                    <div><Label className="text-xs text-muted-foreground">Ingreso</Label><p className="text-sm">{formatDate(repair.intake_date)}</p></div>
                                                    <div><Label className="text-xs text-muted-foreground">Estimada</Label><p className="text-sm">{formatDate(repair.estimated_date)}</p></div>
                                                </CardContent>
                                            </Card>
                                        </>
                                    )}
                                </div>
                            </TabsContent>

                            {/* @ts-expect-error - Radix TabsContent className */}
                            <TabsContent value="financials" className="m-0">
                                <div className="space-y-4">
                                    <Card>
                                        <CardContent className="py-4">
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="text-center p-4 rounded-lg bg-muted/50">
                                                    <Label className="text-xs text-muted-foreground">Costo</Label>
                                                    {editMode ? <Input type="number" step="0.01" className="mt-2 text-center" value={editData.cost ?? repair.cost ?? ""} onChange={(e) => setEditData((d) => ({ ...d, cost: e.target.value ? parseFloat(e.target.value) : null }))} /> : <p className="text-2xl font-bold mt-2">{formatCurrency(repair.cost)}</p>}
                                                </div>
                                                <div className="text-center p-4 rounded-lg bg-muted/50">
                                                    <Label className="text-xs text-muted-foreground">Precio Venta</Label>
                                                    {editMode ? <Input type="number" step="0.01" className="mt-2 text-center" value={editData.sale_price ?? repair.sale_price ?? ""} onChange={(e) => setEditData((d) => ({ ...d, sale_price: e.target.value ? parseFloat(e.target.value) : null }))} /> : <p className="text-2xl font-bold mt-2 text-green-600">{formatCurrency(repair.sale_price)}</p>}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>

                            {/* @ts-expect-error - Radix TabsContent className */}
                            <TabsContent value="notes" className="m-0">
                                <div className="space-y-4">
                                    {editMode && (
                                        <div className="flex gap-2">
                                            <Textarea placeholder="Nota..." value={newNote} onChange={(e) => setNewNote(e.target.value)} rows={2} className="flex-1" />
                                            <Button onClick={handleAddNote} disabled={!newNote.trim()}>Agregar</Button>
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
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
