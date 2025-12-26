import { useState, useEffect } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    User,
    Phone,
    Mail,
    MapPin,
    Wrench,
    Calendar,
    DollarSign,
    TrendingUp,
    FileText,
    Clock,
    Loader2,
    Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Repair, RepairNote, RepairPriority, RepairStatus } from "@/types/repairs";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import useApi from "@/hooks/useApi";
import { AlertCircle } from "lucide-react";
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
    options?: { statuses: RepairStatus[]; priorities: RepairPriority[] };
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
    const [editData, setEditData] = useState<Partial<Repair> & { customer_id?: number; technician_id?: number; category_id?: number; intake_date?: string }>({});
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

    // Fetch customers, technicians and categories when entering edit mode
    useEffect(() => {
        if (editMode) {
            fetchCustomers();
            fetchTechnicians();
            fetchCategories();
        }
    }, [editMode]);

    const fetchCustomers = async () => {
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
    };

    const fetchTechnicians = async () => {
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
    };

    const fetchCategories = async () => {
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
    };

    // Initialize edit data when entering edit mode
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
            await onSave(editData, stagedNotes);
            setStagedNotes([]);
            setNewNote("");
        } catch (error: any) {
            console.error("Error saving repair:", error);
            if (error.response && error.response.data && error.response.data.errors) {
                const validationErrors = error.response.data.errors;
                setErrors(validationErrors);

                // Get the first error message to show in the toast
                const firstField = Object.keys(validationErrors)[0];
                const firstErrorMsg = validationErrors[firstField]?.[0];

                toast.error(firstErrorMsg || "Hay errores de validación. Por favor revise el formulario.");
            } else {
                const msg = error.response?.data?.message || "Ocurrió un error al guardar los cambios.";
                setErrors({ general: [msg] });
                toast.error(msg);
            }
        } finally {
            setSaving(false);
        }
    };

    // Stage notes locally (don't call API yet)
    const handleAddNote = () => {
        if (!newNote.trim()) return;
        setStagedNotes((prev) => [...prev, newNote.trim()]);
        setNewNote("");
    };

    if (!repair && !loading) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" hideCloseButton>
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-3">
                            <span className="font-mono text-xl">{repair?.code || "..."}</span>
                            {repair && (
                                <>
                                    <Badge
                                        variant="outline"
                                        className={cn("text-xs", STATUS_COLORS[repair.status])}
                                    >
                                        {repair.status}
                                    </Badge>
                                    <Badge
                                        variant="outline"
                                        className={cn("text-xs", PRIORITY_COLORS[repair.priority])}
                                    >
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
                        {onDownloadPdf && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onDownloadPdf}
                                className="text-amber-700 border-amber-200 hover:bg-amber-50 hover:text-amber-800"
                            >
                                <FileText className="h-4 w-4 mr-2" />
                                PDF
                            </Button>
                        )}
                    </div>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : repair ? (
                    <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="details">Detalles</TabsTrigger>
                            <TabsTrigger value="financials">Costos</TabsTrigger>
                            <TabsTrigger value="notes">
                                Notas ({repair.notes?.length || 0})
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex-1 mt-4 overflow-y-auto pr-4">
                            {/* Details Tab */}
                            <TabsContent value="details" className="space-y-4 m-0">
                                {editMode ? (
                                    <div className="grid gap-4 py-2">
                                        {errors.general && (
                                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative text-sm flex items-center gap-2">
                                                <AlertCircle className="h-4 w-4" />
                                                <span>{errors.general[0]}</span>
                                            </div>
                                        )}
                                        {/* Customer and Technician */}
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
                                                            if (!v) {
                                                                setEditData((d) => ({ ...d, customer_id: undefined }));
                                                            }
                                                        }}
                                                        onFocus={() => setShowCustomerOptions(true)}
                                                        onBlur={() => setTimeout(() => setShowCustomerOptions(false), 200)}
                                                        placeholder="Buscar cliente..."
                                                    />
                                                    {showCustomerOptions && customerOptions.filter(c => {
                                                        const searchLower = customerSearch.toLowerCase();
                                                        return c.name.toLowerCase().includes(searchLower);
                                                    }).length > 0 && (
                                                            <div className="absolute left-0 right-0 border rounded bg-white mt-1 max-h-40 overflow-auto z-50 shadow">
                                                                {customerOptions.filter(c => {
                                                                    const searchLower = customerSearch.toLowerCase();
                                                                    return c.name.toLowerCase().includes(searchLower);
                                                                }).map((customer) => (
                                                                    <div
                                                                        key={customer.id}
                                                                        className="p-2 cursor-pointer hover:bg-gray-100"
                                                                        role="button"
                                                                        tabIndex={0}
                                                                        onMouseDown={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
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
                                            </div>
                                            {errors.customer_id && (
                                                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                                    <AlertCircle className="h-3 w-3" />
                                                    {errors.customer_id[0]}
                                                </p>
                                            )}

                                            <div className="space-y-2">
                                                <Label>Técnico Asignado</Label>
                                                <div className="relative">
                                                    <Input
                                                        value={technicianSearch}
                                                        onChange={(e) => {
                                                            const v = e.target.value;
                                                            setTechnicianSearch(v);
                                                            setShowTechnicianOptions(true);
                                                            if (!v) {
                                                                setEditData((d) => ({ ...d, technician_id: undefined }));
                                                            }
                                                        }}
                                                        onFocus={() => setShowTechnicianOptions(true)}
                                                        onBlur={() => setTimeout(() => setShowTechnicianOptions(false), 200)}
                                                        placeholder="Buscar técnico..."
                                                    />
                                                    {showTechnicianOptions && technicianOptions.filter(t => {
                                                        const searchLower = technicianSearch.toLowerCase();
                                                        return t.name.toLowerCase().includes(searchLower);
                                                    }).length > 0 && (
                                                            <div className="absolute left-0 right-0 border rounded bg-white mt-1 max-h-40 overflow-auto z-50 shadow">
                                                                <div
                                                                    className="p-2 cursor-pointer hover:bg-gray-100 text-gray-500 italic"
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        setEditData((d) => ({ ...d, technician_id: undefined }));
                                                                        setTechnicianSearch("");
                                                                        setShowTechnicianOptions(false);
                                                                    }}
                                                                >
                                                                    Sin asignar
                                                                </div>
                                                                {technicianOptions.filter(t => {
                                                                    const searchLower = technicianSearch.toLowerCase();
                                                                    return t.name.toLowerCase().includes(searchLower);
                                                                }).map((tech) => (
                                                                    <div
                                                                        key={tech.id}
                                                                        className="p-2 cursor-pointer hover:bg-gray-100"
                                                                        role="button"
                                                                        tabIndex={0}
                                                                        onMouseDown={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
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

                                        {/* Device and Serial */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Equipo *</Label>
                                                <Input
                                                    value={editData.device ?? repair.device}
                                                    onChange={(e) =>
                                                        setEditData((d) => ({ ...d, device: e.target.value }))
                                                    }
                                                />
                                                {errors.device && (
                                                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                                        <AlertCircle className="h-3 w-3" />
                                                        {errors.device[0]}
                                                    </p>
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
                                                {errors.serial_number && (
                                                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                                        <AlertCircle className="h-3 w-3" />
                                                        {errors.serial_number[0]}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Category */}
                                        <div className="space-y-2">
                                            <Label htmlFor="category">Categoría</Label>
                                            <Select
                                                value={editData.category_id ? editData.category_id.toString() : "empty"}
                                                onValueChange={(v) =>
                                                    setEditData((d) => ({ ...d, category_id: v === "empty" ? undefined : parseInt(v) }))
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar categoría" />
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

                                        {/* Issue Description */}
                                        <div className="space-y-2">
                                            <Label>Descripción del Problema *</Label>
                                            <Textarea
                                                value={editData.issue_description ?? repair.issue_description}
                                                onChange={(e) =>
                                                    setEditData((d) => ({
                                                        ...d,
                                                        issue_description: e.target.value,
                                                    }))
                                                }
                                                rows={3}
                                            />
                                            {errors.issue_description && (
                                                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                                    <AlertCircle className="h-3 w-3" />
                                                    {errors.issue_description[0]}
                                                </p>
                                            )}
                                        </div>

                                        {/* Diagnosis */}
                                        <div className="space-y-2">
                                            <Label>Diagnóstico Técnico</Label>
                                            <Textarea
                                                value={editData.diagnosis ?? repair.diagnosis ?? ""}
                                                onChange={(e) =>
                                                    setEditData((d) => ({ ...d, diagnosis: e.target.value }))
                                                }
                                                rows={3}
                                                placeholder="Ingrese el diagnóstico técnico..."
                                            />
                                        </div>

                                        {/* Status, Priority, Date */}
                                        <div className="grid grid-cols-3 gap-4">
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
                                                <Label>Fecha de Ingreso</Label>
                                                <Input
                                                    type="date"
                                                    value={editData.intake_date ?? repair.intake_date ?? ""}
                                                    onChange={(e) =>
                                                        setEditData((d) => ({ ...d, intake_date: e.target.value }))
                                                    }
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Fecha Estimada</Label>
                                                <Input
                                                    type="date"
                                                    value={editData.estimated_date ?? repair.estimated_date ?? ""}
                                                    onChange={(e) =>
                                                        setEditData((d) => ({ ...d, estimated_date: e.target.value }))
                                                    }
                                                />
                                                {errors.estimated_date && (
                                                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                                        <AlertCircle className="h-3 w-3" />
                                                        {errors.estimated_date[0]}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Customer Info Card */}
                                        <Card>
                                            <CardHeader className="py-3">
                                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                                    <User className="h-4 w-4" />
                                                    Cliente
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="py-2 grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {repair.customer?.name || "Sin cliente"}
                                                    </p>
                                                </div>
                                                <div className="space-y-1 text-sm text-muted-foreground">
                                                    {repair.customer?.phone && (
                                                        <p className="flex items-center gap-2">
                                                            <Phone className="h-3 w-3" />
                                                            {repair.customer.phone}
                                                        </p>
                                                    )}
                                                    {repair.customer?.email && (
                                                        <p className="flex items-center gap-2">
                                                            <Mail className="h-3 w-3" />
                                                            {repair.customer.email}
                                                        </p>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Siniestro Info Card - Only show when is_siniestro is true */}
                                        {repair.is_siniestro && (
                                            <Card className="border-blue-200 bg-blue-50/50">
                                                <CardHeader className="py-3">
                                                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-700">
                                                        <FileText className="h-4 w-4" />
                                                        Siniestro
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="py-2 grid grid-cols-2 gap-4">
                                                    <div>
                                                        <Label className="text-xs text-muted-foreground">Aseguradora</Label>
                                                        <p className="text-sm font-medium">
                                                            {repair.insurer?.name || "Sin aseguradora"}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs text-muted-foreground">Nº de Siniestro</Label>
                                                        <p className="text-sm font-medium">
                                                            {repair.siniestro_number || "-"}
                                                        </p>
                                                    </div>
                                                    {repair.insured_customer && repair.insured_customer.id !== repair.customer?.id && (
                                                        <div className="col-span-2">
                                                            <Label className="text-xs text-muted-foreground">Asegurado</Label>
                                                            <p className="text-sm">
                                                                {repair.insured_customer.name}
                                                                {repair.insured_customer.phone && ` • ${repair.insured_customer.phone}`}
                                                            </p>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        )}

                                        {/* Device & Issue */}
                                        <Card>
                                            <CardHeader className="py-3">
                                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                                    <Wrench className="h-4 w-4" />
                                                    Equipo y Problema
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="py-2 space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <Label className="text-xs text-muted-foreground">Equipo</Label>
                                                        <p className="text-sm font-medium">{repair.device}</p>
                                                        {repair.category && (
                                                            <div className="mt-1">
                                                                <Badge variant="outline" className="text-xs font-normal">
                                                                    <Tag className="h-3 w-3 mr-1" />
                                                                    {repair.category.name}
                                                                </Badge>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs text-muted-foreground">
                                                            Número de Serie
                                                        </Label>
                                                        <p className="text-sm">{repair.serial_number || "-"}</p>
                                                    </div>
                                                </div>

                                                <div>
                                                    <Label className="text-xs text-muted-foreground">
                                                        Descripción del Problema
                                                    </Label>
                                                    <p className="text-sm whitespace-pre-wrap mt-1">
                                                        {repair.issue_description}
                                                    </p>
                                                </div>

                                                <Separator />

                                                <div>
                                                    <Label className="text-xs text-muted-foreground">
                                                        Diagnóstico Técnico
                                                    </Label>
                                                    <p className="text-sm whitespace-pre-wrap mt-1">
                                                        {repair.diagnosis || (
                                                            <span className="text-muted-foreground italic">
                                                                Sin diagnóstico
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Status & Info */}
                                        <Card>
                                            <CardHeader className="py-3">
                                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                                    <Calendar className="h-4 w-4" />
                                                    Estado y Fechas
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="py-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div>
                                                    <Label className="text-xs text-muted-foreground">Estado</Label>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn("mt-1", STATUS_COLORS[repair.status])}
                                                    >
                                                        {repair.status}
                                                    </Badge>
                                                </div>
                                                <div>
                                                    <Label className="text-xs text-muted-foreground">Prioridad</Label>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn("mt-1", PRIORITY_COLORS[repair.priority])}
                                                    >
                                                        {repair.priority}
                                                    </Badge>
                                                </div>
                                                <div>
                                                    <Label className="text-xs text-muted-foreground">
                                                        Fecha de Ingreso
                                                    </Label>
                                                    <p className="text-sm mt-1">{formatDate(repair.intake_date)}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-xs text-muted-foreground">
                                                        Fecha Estimada
                                                    </Label>
                                                    <p className="text-sm mt-1">{formatDate(repair.estimated_date)}</p>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Additional Info */}
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <Label className="text-xs text-muted-foreground">Sucursal</Label>
                                                <p className="flex items-center gap-1 mt-1">
                                                    <MapPin className="h-3 w-3" />
                                                    {repair.branch?.description || "-"}
                                                </p>
                                            </div>
                                            <div>
                                                <Label className="text-xs text-muted-foreground">Técnico</Label>
                                                <p className="flex items-center gap-1 mt-1">
                                                    <Wrench className="h-3 w-3" />
                                                    {repair.technician?.name || "Sin asignar"}
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </TabsContent>

                            {/* Financials Tab */}
                            <TabsContent value="financials" className="space-y-4 m-0">
                                <Card>
                                    <CardHeader className="py-3">
                                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                                            <DollarSign className="h-4 w-4" />
                                            Información Financiera
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="py-2">
                                        <div className="grid grid-cols-3 gap-6">
                                            <div className="text-center p-4 rounded-lg bg-muted/50">
                                                <Label className="text-xs text-muted-foreground">Costo</Label>
                                                {editMode ? (
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        className="mt-2 text-center"
                                                        value={editData.cost ?? repair.cost ?? ""}
                                                        onChange={(e) =>
                                                            setEditData((d) => ({
                                                                ...d,
                                                                cost: e.target.value ? parseFloat(e.target.value) : null,
                                                            }))
                                                        }
                                                    />
                                                ) : (
                                                    <p className="text-2xl font-bold mt-2">
                                                        {formatCurrency(repair.cost)}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-center p-4 rounded-lg bg-muted/50">
                                                <Label className="text-xs text-muted-foreground">
                                                    Precio de Venta
                                                </Label>
                                                {editMode ? (
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        className="mt-2 text-center"
                                                        value={editData.sale_price ?? repair.sale_price ?? ""}
                                                        onChange={(e) =>
                                                            setEditData((d) => ({
                                                                ...d,
                                                                sale_price: e.target.value
                                                                    ? parseFloat(e.target.value)
                                                                    : null,
                                                            }))
                                                        }
                                                    />
                                                ) : (
                                                    <p className="text-2xl font-bold mt-2 text-green-600">
                                                        {formatCurrency(repair.sale_price)}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-center p-4 rounded-lg bg-muted/50">
                                                <Label className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                                                    <TrendingUp className="h-3 w-3" />
                                                    Margen
                                                </Label>
                                                <p
                                                    className={cn(
                                                        "text-2xl font-bold mt-2",
                                                        repair.profit_margin !== null && repair.profit_margin !== undefined
                                                            ? repair.profit_margin >= 0
                                                                ? "text-green-600"
                                                                : "text-red-600"
                                                            : "text-muted-foreground"
                                                    )}
                                                >
                                                    {repair.profit_margin !== null && repair.profit_margin !== undefined
                                                        ? `${repair.profit_margin.toFixed(1)}%`
                                                        : "-"}
                                                </p>
                                            </div>
                                        </div>

                                        {repair.sale_id && (
                                            <div className="mt-4 p-3 rounded-lg border bg-blue-50/50">
                                                <p className="text-sm">
                                                    <span className="text-muted-foreground">Venta vinculada:</span>{" "}
                                                    <span className="font-medium">
                                                        {repair.sale?.receipt_number || `#${repair.sale_id}`}
                                                    </span>
                                                </p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Notes Tab */}
                            <TabsContent value="notes" className="space-y-4 m-0">
                                {/* Add Note - only in edit mode */}
                                {editMode && (
                                    <Card>
                                        <CardContent className="py-3">
                                            <div className="flex gap-2">
                                                <Textarea
                                                    placeholder="Agregar una nota..."
                                                    value={newNote}
                                                    onChange={(e) => setNewNote(e.target.value)}
                                                    rows={2}
                                                    className="flex-1"
                                                />
                                                <Button
                                                    onClick={handleAddNote}
                                                    disabled={!newNote.trim()}
                                                    className="self-end"
                                                >
                                                    Agregar
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Staged Notes (pending save) */}
                                {stagedNotes.length > 0 && (
                                    <div className="space-y-3">
                                        {stagedNotes.map((note, idx) => (
                                            <Card key={`staged-${idx}`} className="border-amber-200 bg-amber-50/50">
                                                <CardContent className="py-3">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <p className="text-sm font-medium">Nueva nota</p>
                                                        <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-100">
                                                            Pendiente
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm whitespace-pre-wrap">{note}</p>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}

                                {/* Saved Notes List */}
                                <div className="space-y-3">
                                    {repair.notes && repair.notes.length > 0 ? (
                                        repair.notes.map((note: RepairNote) => (
                                            <Card key={note.id}>
                                                <CardContent className="py-3">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <p className="text-sm font-medium">
                                                            {note.user?.name || "Usuario"}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {formatDateTime(note.created_at)}
                                                        </p>
                                                    </div>
                                                    <p className="text-sm whitespace-pre-wrap">{note.note}</p>
                                                </CardContent>
                                            </Card>
                                        ))
                                    ) : stagedNotes.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            No hay notas registradas
                                        </div>
                                    ) : null}
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                ) : (
                    <div className="py-6 text-center text-muted-foreground">Sin datos</div>
                )}

                <DialogFooter className="mt-4">
                    {editMode ? (
                        <>
                            <Button variant="outline" onClick={onCancelEdit} disabled={saving}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    "Guardar Cambios"
                                )}
                            </Button>
                        </>
                    ) : (
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cerrar
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
