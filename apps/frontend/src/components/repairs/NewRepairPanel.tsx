import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import useApi from "@/hooks/useApi";
import { RepairPriority, RepairStatus } from "@/types/repairs";
import { useCustomerSearch, type CustomerOption as SearchCustomerOption } from "@/hooks/useCustomerSearch";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import CustomerForm from "@/components/customers/customer-form";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format as formatDateFn } from "date-fns";
import { es } from "date-fns/locale";

type UserOption = { id: number; name: string };
type CategoryOption = { id: number; name: string };
type InsurerOption = { id: number; name: string };

type NewRepairForm = {
    customer_id: number | null;
    technician_id: number | null;
    category_id: number | null;
    device: string;
    serial_number: string;
    issue_description: string;
    diagnosis: string;
    priority: RepairPriority;
    status: RepairStatus;
    initial_notes: string;
    cost: string;
    sale_price: string;
    estimated_date: string;
    intake_date: string;
    // Siniestro fields
    is_siniestro: boolean;
    insurer_id: number | null;
    siniestro_number: string;
    insured_customer_id: number | null;
    policy_number: string;
    device_age: string;
};

const defaultForm: NewRepairForm = {
    customer_id: null,
    technician_id: null,
    category_id: null,
    device: "",
    serial_number: "",
    issue_description: "",
    diagnosis: "",
    priority: "Media",
    status: "Recibido",
    initial_notes: "",
    cost: "",
    sale_price: "",
    intake_date: new Date().toISOString().split("T")[0],
    estimated_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    is_siniestro: false,
    insurer_id: null,
    siniestro_number: "",
    insured_customer_id: null,
    policy_number: "",
    device_age: "",
};

function isoToDate(iso: string): Date | undefined {
    if (!iso) return undefined;
    const datePart = iso.split("T")[0];
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
    if (!m) return undefined;
    const [, y, mm, dd] = m;
    const dt = new Date(Number(y), Number(mm) - 1, Number(dd));
    if (Number.isNaN(dt.getTime())) return undefined;
    return dt;
}

type NewRepairPanelProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: {
        customer_id: number;
        branch_id: number;
        device: string;
        serial_number?: string;
        issue_description: string;
        diagnosis?: string;
        priority: RepairPriority;
        status?: RepairStatus;
        technician_id?: number;
        category_id?: number;
        initial_notes?: string;
        cost?: number;
        sale_price?: number;
        estimated_date?: string;
        intake_date?: string;
        is_siniestro?: boolean;
        insurer_id?: number | null;
        siniestro_number?: string;
        insured_customer_id?: number | null;
        policy_number?: string;
        device_age?: number;
    }) => Promise<boolean>;
    branchId: number | string | null;
    options: { statuses: RepairStatus[]; priorities: RepairPriority[] };
};

export default function NewRepairPanel({
    open,
    onOpenChange,
    onSubmit,
    branchId,
    options,
}: NewRepairPanelProps) {
    const { request } = useApi();
    const [form, setForm] = useState<NewRepairForm>(defaultForm);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<keyof NewRepairForm, string>>>({});

    const {
        customerSearch,
        customerOptions,
        showCustomerOptions,
        setCustomerSearch,
        setSelectedCustomer,
        setShowCustomerOptions,
    } = useCustomerSearch();
    const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false);

    const [technicianSearch, setTechnicianSearch] = useState("");
    const [technicianOptions, setTechnicianOptions] = useState<UserOption[]>([]);
    const [showTechnicianOptions, setShowTechnicianOptions] = useState(false);

    const [categories, setCategories] = useState<CategoryOption[]>([]);
    const [insurers, setInsurers] = useState<InsurerOption[]>([]);

    const [isCreatingInsurer, setIsCreatingInsurer] = useState(false);
    const [newInsurerName, setNewInsurerName] = useState("");

    // Reset when panel closes
    useEffect(() => {
        if (!open) {
            setForm(defaultForm);
            setErrors({});
            setCustomerSearch("");
            setSelectedCustomer(null);
            setShowCustomerOptions(false);
            setTechnicianSearch("");
            setTechnicianOptions([]);
            setIsCreatingInsurer(false);
            setNewInsurerName("");
            setShowNewCustomerDialog(false);
        }
    }, [open, setCustomerSearch, setSelectedCustomer, setShowCustomerOptions]);

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

    const fetchInsurers = useCallback(async () => {
        try {
            const resp = await request({
                method: "GET",
                url: "/insurers",
            });
            const data = Array.isArray(resp?.data) ? resp.data : [];
            setInsurers(
                data.map((i: { id: number; name: string }) => ({
                    id: i.id,
                    name: i.name,
                }))
            );
        } catch (error) {
            console.error("Error fetching insurers:", error);
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

    useEffect(() => {
        if (open) {
            fetchTechnicians();
            fetchCategories();
            fetchInsurers();
        }
    }, [open, fetchTechnicians, fetchCategories, fetchInsurers]);

    const validate = useCallback((): boolean => {
        const newErrors: Partial<Record<keyof NewRepairForm, string>> = {};

        if (!form.customer_id) newErrors.customer_id = "Selecciona un cliente";
        if (!form.device.trim()) newErrors.device = "El equipo es obligatorio";
        if (!form.issue_description.trim()) newErrors.issue_description = "La descripción del problema es obligatoria";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [form]);

    const handleSubmit = async () => {
        if (!validate()) return;
        if (!branchId) {
            setErrors((e) => ({ ...e, customer_id: "Selecciona una sucursal primero" }));
            return;
        }

        setSubmitting(true);
        try {
            const payload: Parameters<typeof onSubmit>[0] = {
                customer_id: form.customer_id!,
                branch_id: typeof branchId === "string" ? parseInt(branchId, 10) : branchId,
                device: form.device.trim(),
                issue_description: form.issue_description.trim(),
                priority: form.priority,
            };

            if (form.serial_number.trim()) payload.serial_number = form.serial_number.trim();
            if (form.diagnosis.trim()) payload.diagnosis = form.diagnosis.trim();
            if (form.status) payload.status = form.status;
            if (form.technician_id) payload.technician_id = form.technician_id;
            if (form.initial_notes.trim()) payload.initial_notes = form.initial_notes.trim();
            if (form.cost) payload.cost = parseFloat(form.cost);
            if (form.sale_price) payload.sale_price = parseFloat(form.sale_price);
            if (form.estimated_date) payload.estimated_date = form.estimated_date;
            if (form.intake_date) payload.intake_date = form.intake_date;
            if (form.category_id) payload.category_id = form.category_id;

            if (form.is_siniestro) {
                payload.is_siniestro = true;
                if (form.insurer_id) payload.insurer_id = form.insurer_id;
                if (form.siniestro_number) payload.siniestro_number = form.siniestro_number;
                if (form.insured_customer_id) payload.insured_customer_id = form.insured_customer_id;
                if (form.policy_number) payload.policy_number = form.policy_number;
                if (form.device_age) payload.device_age = parseInt(form.device_age);
            }

            const success = await onSubmit(payload);
            if (success) onOpenChange(false);
        } finally {
            setSubmitting(false);
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleCustomerCreated = (customer: any) => {
        const newCustomer: SearchCustomerOption = {
            id: customer.id,
            name: customer.person
                ? `${customer.person.first_name || ""} ${customer.person.last_name || ""}`.trim()
                : customer.name || `Cliente #${customer.id}`,
            dni: customer.person?.documento ?? null,
            cuit: customer.person?.cuit ?? null,
            fiscal_condition_id: customer.person?.fiscal_condition_id ?? null,
            fiscal_condition_name:
                customer.person?.fiscal_condition?.description ??
                customer.person?.fiscal_condition?.name ??
                null,
        };
        setForm((f) => ({ ...f, customer_id: customer.id }));
        setSelectedCustomer(newCustomer);
        setCustomerSearch(newCustomer.name);
        setShowNewCustomerDialog(false);
    };

    if (!open) return null;

    return (
        <form
            id="new-repair-form"
            onSubmit={(e) => {
                e.preventDefault();
                void handleSubmit();
            }}
        >
            <div className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>
                            Cliente <span className="text-red-500">*</span>
                        </Label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Input
                                                value={customerSearch}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    setCustomerSearch(v);
                                                    setShowCustomerOptions(true);
                                                    if (!v) setForm((f) => ({ ...f, customer_id: null }));
                                                }}
                                                onFocus={() => setShowCustomerOptions(true)}
                                                onBlur={() => setTimeout(() => setShowCustomerOptions(false), 200)}
                                                placeholder="Buscar cliente por nombre, teléfono, DNI o CUIT..."
                                                className={cn(errors.customer_id && "border-red-500")}
                                            />
                                            {showCustomerOptions && customerOptions.length > 0 && (
                                                <div className="absolute left-0 right-0 border rounded bg-white mt-1 max-h-40 overflow-auto z-50 shadow">
                                                    {customerOptions.map((customer) => (
                                                        <div
                                                            key={customer.id}
                                                            className="p-2 cursor-pointer hover:bg-gray-100"
                                                            role="button"
                                                            tabIndex={0}
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                setForm((f) => ({ ...f, customer_id: customer.id }));
                                                                setCustomerSearch(customer.name);
                                                                setSelectedCustomer(customer);
                                                                setShowCustomerOptions(false);
                                                                setErrors((err) => ({ ...err, customer_id: undefined }));
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
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="outline"
                                            onClick={() => setShowNewCustomerDialog(true)}
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    {errors.customer_id && <p className="text-xs text-red-500">{errors.customer_id}</p>}
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
                                                if (!v) setForm((f) => ({ ...f, technician_id: null }));
                                            }}
                                            onFocus={() => setShowTechnicianOptions(true)}
                                            onBlur={() => setTimeout(() => setShowTechnicianOptions(false), 200)}
                                            placeholder="Buscar técnico..."
                                        />
                                        {showTechnicianOptions &&
                                            technicianOptions.filter((t) =>
                                                t.name.toLowerCase().includes(technicianSearch.toLowerCase())
                                            ).length > 0 && (
                                                <div className="absolute left-0 right-0 border rounded bg-white mt-1 max-h-40 overflow-auto z-50 shadow">
                                                    <div
                                                        className="p-2 cursor-pointer hover:bg-gray-100 text-gray-500 italic"
                                                        role="button"
                                                        tabIndex={0}
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setForm((f) => ({ ...f, technician_id: null }));
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
                                                                role="button"
                                                                tabIndex={0}
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    setForm((f) => ({ ...f, technician_id: tech.id }));
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

                <div className="flex items-center gap-2 py-2 border-t border-b border-gray-100">
                    <input
                        type="checkbox"
                        id="is_siniestro"
                        checked={form.is_siniestro}
                        onChange={(e) =>
                            setForm((f) => ({
                                ...f,
                                is_siniestro: e.target.checked,
                                ...(e.target.checked
                                    ? {}
                                    : {
                                        insurer_id: null,
                                        siniestro_number: "",
                                        insured_customer_id: null,
                                        policy_number: "",
                                        device_age: "",
                                    }),
                            }))
                        }
                        className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label>¿Es un siniestro?</Label>
                </div>

                {form.is_siniestro && (
                    <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Aseguradora</Label>
                                            <div className="flex gap-2">
                                                {isCreatingInsurer ? (
                                                    <>
                                                        <Input
                                                            value={newInsurerName}
                                                            onChange={(e) => setNewInsurerName(e.target.value)}
                                                            placeholder="Nombre de nueva aseguradora"
                                                            className="flex-1"
                                                            autoFocus
                                                        />
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            variant="default"
                                                            className="bg-green-600 hover:bg-green-700"
                                                            onClick={async () => {
                                                                if (!newInsurerName.trim()) return;
                                                                try {
                                                                    const resp = await request({
                                                                        method: "POST",
                                                                        url: "/insurers",
                                                                        data: { name: newInsurerName.trim() },
                                                                    });
                                                                    if (resp?.data?.id) {
                                                                        setInsurers((prev) => [
                                                                            ...prev,
                                                                            { id: resp.data.id, name: resp.data.name },
                                                                        ]);
                                                                        setForm((f) => ({ ...f, insurer_id: resp.data.id }));
                                                                        setIsCreatingInsurer(false);
                                                                        setNewInsurerName("");
                                                                    }
                                                                } catch (error) {
                                                                    console.error("Error creating insurer:", error);
                                                                }
                                                            }}
                                                            title="Guardar aseguradora"
                                                        >
                                                            <Check className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => {
                                                                setIsCreatingInsurer(false);
                                                                setNewInsurerName("");
                                                            }}
                                                            title="Cancelar"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Select
                                                            value={form.insurer_id ? form.insurer_id.toString() : ""}
                                                            onValueChange={(v) =>
                                                                setForm((f) => ({ ...f, insurer_id: v ? parseInt(v) : null }))
                                                            }
                                                        >
                                                            <SelectTrigger className="flex-1">
                                                                <SelectValue placeholder="Seleccionar o crear nueva..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {insurers.map((ins) => (
                                                                    <SelectItem key={ins.id} value={ins.id.toString()}>
                                                                        {ins.name}
                                                                    </SelectItem>
                                                                ))}
                                                                {insurers.length === 0 && (
                                                                    <div className="p-2 text-sm text-gray-500">
                                                                        No hay aseguradoras. Usá el botón + para crear una.
                                                                    </div>
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setIsCreatingInsurer(true);
                                                                setNewInsurerName("");
                                                            }}
                                                            title="Agregar nueva aseguradora"
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Número de Siniestro</Label>
                                <Input
                                    placeholder="Ej: 12345-2024"
                                    value={form.siniestro_number}
                                    onChange={(e) => setForm((f) => ({ ...f, siniestro_number: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Número de Póliza</Label>
                                <Input
                                    placeholder="Ej: POL-123456"
                                    value={form.policy_number}
                                    onChange={(e) => setForm((f) => ({ ...f, policy_number: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Antigüedad del Bien</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    placeholder="Ej: 2"
                                    value={form.device_age}
                                    onChange={(e) => setForm((f) => ({ ...f, device_age: e.target.value }))}
                                />
                            </div>
                        </div>
                        <p className="text-xs text-blue-600">
                            El cliente seleccionado arriba será registrado como el asegurado del siniestro.
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="device">
                            Equipo <span className="text-red-500">*</span>
                        </Label>
                                    <Input
                                        id="device"
                                        placeholder="Tipo y modelo del equipo"
                                        value={form.device}
                                        onChange={(e) => {
                                            setForm((f) => ({ ...f, device: e.target.value }));
                                            if (errors.device) setErrors((er) => ({ ...er, device: undefined }));
                                        }}
                                        className={cn(errors.device && "border-red-500")}
                                    />
                                    {errors.device && <p className="text-xs text-red-500">{errors.device}</p>}
                                </div>
                    <div className="space-y-2">
                        <Label htmlFor="serial">Número de Serie</Label>
                                    <Input
                                        id="serial"
                                        placeholder="Número de serie"
                                        value={form.serial_number}
                                        onChange={(e) => setForm((f) => ({ ...f, serial_number: e.target.value }))}
                                    />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="category">Categoría</Label>
                                <Select
                                    value={form.category_id ? form.category_id.toString() : ""}
                                    onValueChange={(v) => setForm((f) => ({ ...f, category_id: v ? parseInt(v) : null }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Categoría" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((c) => (
                                            <SelectItem key={c.id} value={c.id.toString()}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="issue">
                        Descripción del Problema <span className="text-red-500">*</span>
                    </Label>
                                <Textarea
                                    id="issue"
                                    placeholder="Describe el problema reportado por el cliente..."
                                    value={form.issue_description}
                                    onChange={(e) => {
                                        setForm((f) => ({ ...f, issue_description: e.target.value }));
                                        if (errors.issue_description)
                                            setErrors((er) => ({ ...er, issue_description: undefined }));
                                    }}
                                    className={cn(errors.issue_description && "border-red-500")}
                                    rows={2}
                                />
                                {errors.issue_description && (
                                    <p className="text-xs text-red-500">{errors.issue_description}</p>
                                )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="diagnosis">Diagnóstico Inicial</Label>
                                <Textarea
                                    id="diagnosis"
                                    placeholder="Diagnóstico técnico inicial (opcional)"
                                    value={form.diagnosis}
                                    onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))}
                                    rows={2}
                                />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="intake">Fecha de Recibido</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !form.intake_date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {form.intake_date ? (
                                        formatDateFn(isoToDate(form.intake_date)!, "dd/MM/yy", { locale: es })
                                    ) : (
                                        <span>Seleccione fecha</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={isoToDate(form.intake_date)}
                                    onSelect={(date) => {
                                        if (!date) return;
                                        const iso = formatDateFn(date, "yyyy-MM-dd");
                                        setForm((f) => ({ ...f, intake_date: iso }));
                                    }}
                                    initialFocus
                                    locale={es}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="estimated">Fecha Estimada</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !form.estimated_date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {form.estimated_date ? (
                                        formatDateFn(isoToDate(form.estimated_date)!, "dd/MM/yy", { locale: es })
                                    ) : (
                                        <span>Seleccione fecha</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={isoToDate(form.estimated_date)}
                                    onSelect={(date) => {
                                        if (!date) return;
                                        const iso = formatDateFn(date, "yyyy-MM-dd");
                                        setForm((f) => ({ ...f, estimated_date: iso }));
                                    }}
                                    initialFocus
                                    locale={es}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Prioridad</Label>
                                    <Select
                                        value={form.priority}
                                        onValueChange={(v) => setForm((f) => ({ ...f, priority: v as RepairPriority }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar" />
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
                        <Label>Estado Inicial</Label>
                                    <Select
                                        value={form.status}
                                        onValueChange={(v) => setForm((f) => ({ ...f, status: v as RepairStatus }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar" />
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="cost">Costo de Reparación</Label>
                                    <Input
                                        id="cost"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        value={form.cost}
                                        onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
                                    />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="salePrice">Precio de Venta</Label>
                                    <Input
                                        id="salePrice"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        value={form.sale_price}
                                        onChange={(e) => setForm((f) => ({ ...f, sale_price: e.target.value }))}
                                    />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="notes">Observaciones Iniciales</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Observaciones adicionales..."
                                    value={form.initial_notes}
                                    onChange={(e) => setForm((f) => ({ ...f, initial_notes: e.target.value }))}
                                    rows={2}
                                />
                </div>

                {submitting && (
                    <div className="flex items-center justify-end text-sm text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creando...
                    </div>
                )}
            </div>

            <Dialog open={showNewCustomerDialog} onOpenChange={setShowNewCustomerDialog}>
                {/* @ts-expect-error - Radix DialogContent props mismatch */}
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        {/* @ts-expect-error - DialogTitle children type mismatch */}
                        <DialogTitle>Nuevo Cliente</DialogTitle>
                    </DialogHeader>
                    <div className="p-2 md:p-4">
                        <CustomerForm
                            disableNavigate
                            onSuccess={handleCustomerCreated}
                            onCancel={() => setShowNewCustomerDialog(false)}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </form>
    );
}
