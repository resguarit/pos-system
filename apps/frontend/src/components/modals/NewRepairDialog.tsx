import { useState, useEffect, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
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
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import useApi from "@/hooks/useApi";
import { RepairPriority, RepairStatus } from "@/types/repairs";

type CustomerOption = { id: number; name: string };
type UserOption = { id: number; name: string };

type NewRepairForm = {
    customer_id: number | null;
    technician_id: number | null;
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
};

const defaultForm: NewRepairForm = {
    customer_id: null,
    technician_id: null,
    device: "",
    serial_number: "",
    issue_description: "",
    diagnosis: "",
    priority: "Media",
    status: "Recibido",
    initial_notes: "",
    cost: "",
    sale_price: "",
    estimated_date: "",
};

type NewRepairDialogProps = {
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
        initial_notes?: string;
        cost?: number;
        sale_price?: number;
        estimated_date?: string;
    }) => Promise<boolean>;
    branchId: number | string | null;
    options: { statuses: RepairStatus[]; priorities: RepairPriority[] };
};

export default function NewRepairDialog({
    open,
    onOpenChange,
    onSubmit,
    branchId,
    options,
}: NewRepairDialogProps) {
    const { request } = useApi();
    const [form, setForm] = useState<NewRepairForm>(defaultForm);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<keyof NewRepairForm, string>>>({});

    // Customer search
    const [customerSearch, setCustomerSearch] = useState("");
    const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
    const [showCustomerOptions, setShowCustomerOptions] = useState(false);

    // Technician search
    const [technicianSearch, setTechnicianSearch] = useState("");
    const [technicianOptions, setTechnicianOptions] = useState<UserOption[]>([]);
    const [showTechnicianOptions, setShowTechnicianOptions] = useState(false);

    // Reset form when dialog closes
    useEffect(() => {
        if (!open) {
            setForm(defaultForm);
            setErrors({});
            setCustomerSearch("");
            setTechnicianSearch("");
            setCustomerOptions([]);
            setTechnicianOptions([]);
        }
    }, [open]);

    // Fetch customers on mount
    useEffect(() => {
        if (open) {
            fetchCustomers();
            fetchTechnicians();
        }
    }, [open]);

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

    const validate = useCallback((): boolean => {
        const newErrors: Partial<Record<keyof NewRepairForm, string>> = {};

        if (!form.customer_id) {
            newErrors.customer_id = "Selecciona un cliente";
        }
        if (!form.device.trim()) {
            newErrors.device = "El equipo es obligatorio";
        }
        if (!form.issue_description.trim()) {
            newErrors.issue_description = "La descripción del problema es obligatoria";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [form]);

    const handleSubmit = async () => {
        if (!validate()) return;
        if (!branchId) {
            setErrors({ ...errors, customer_id: "Selecciona una sucursal primero" });
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

            const success = await onSubmit(payload);
            if (success) {
                onOpenChange(false);
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Nueva Reparación</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
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
                                            setForm((f) => ({ ...f, customer_id: null }));
                                        }
                                    }}
                                    onFocus={() => setShowCustomerOptions(true)}
                                    onBlur={() => setTimeout(() => setShowCustomerOptions(false), 200)}
                                    placeholder="Buscar cliente..."
                                    className={cn(errors.customer_id && "border-red-500")}
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
                                                        setForm((f) => ({ ...f, customer_id: customer.id }));
                                                        setCustomerSearch(customer.name);
                                                        setShowCustomerOptions(false);
                                                        setErrors((e) => ({ ...e, customer_id: undefined }));
                                                    }}
                                                >
                                                    {customer.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                            </div>
                            {errors.customer_id && (
                                <p className="text-xs text-red-500">{errors.customer_id}</p>
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
                                        if (!v) {
                                            setForm((f) => ({ ...f, technician_id: null }));
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
                                                    setForm((f) => ({ ...f, technician_id: null }));
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

                    {/* Device and Serial */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="device">Equipo *</Label>
                            <Input
                                id="device"
                                placeholder="Tipo y modelo del equipo"
                                value={form.device}
                                onChange={(e) => {
                                    setForm((f) => ({ ...f, device: e.target.value }));
                                    if (errors.device) setErrors((e) => ({ ...e, device: undefined }));
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

                    {/* Issue Description */}
                    <div className="space-y-2">
                        <Label htmlFor="issue">Descripción del Problema *</Label>
                        <Textarea
                            id="issue"
                            placeholder="Describe el problema reportado por el cliente..."
                            value={form.issue_description}
                            onChange={(e) => {
                                setForm((f) => ({ ...f, issue_description: e.target.value }));
                                if (errors.issue_description)
                                    setErrors((e) => ({ ...e, issue_description: undefined }));
                            }}
                            className={cn(errors.issue_description && "border-red-500")}
                            rows={3}
                        />
                        {errors.issue_description && (
                            <p className="text-xs text-red-500">{errors.issue_description}</p>
                        )}
                    </div>

                    {/* Diagnosis */}
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

                    {/* Priority, Status, Estimated Date */}
                    <div className="grid grid-cols-3 gap-4">
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
                        <div className="space-y-2">
                            <Label htmlFor="estimated">Fecha Estimada</Label>
                            <Input
                                id="estimated"
                                type="date"
                                value={form.estimated_date}
                                onChange={(e) => setForm((f) => ({ ...f, estimated_date: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* Cost and Sale Price */}
                    <div className="grid grid-cols-2 gap-4">
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

                    {/* Initial Notes */}
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
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting}>
                        {submitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creando...
                            </>
                        ) : (
                            "Crear Reparación"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
