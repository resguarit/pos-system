import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import { Switch } from '@/components/ui/switch';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import useApi from '@/hooks/useApi';
import { useBranch } from '@/context/BranchContext';

interface ExpenseCategory {
    id: number;
    name: string;
}

interface Employee {
    id: number;
    person: {
        first_name: string;
        last_name: string;
    };
}

interface NewExpenseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

interface ExpenseFormData {
    description: string;
    amount: string;
    date: string;
    due_date: string;
    category_id: string;
    employee_id: string;
    payment_method_id: string;
    branch_id: string;
    status: string;
    is_recurring: boolean;
    recurrence_interval: string;
    notes: string;
}

const initialFormData: ExpenseFormData = {
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    due_date: '',
    category_id: '',
    employee_id: '',
    payment_method_id: '',
    branch_id: '',
    status: 'pending',
    is_recurring: false,
    recurrence_interval: 'monthly',
    notes: '',
};

export function NewExpenseDialog({ open, onOpenChange, onSuccess }: NewExpenseDialogProps) {
    const { request } = useApi();
    const { selectedBranchIds, branches } = useBranch();

    const [formData, setFormData] = useState<ExpenseFormData>(initialFormData);
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Estados para búsqueda de empleado
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [showEmployeeOptions, setShowEmployeeOptions] = useState(false);

    // Fetch categories, employees and payment methods when dialog opens

    useEffect(() => {
        if (open) {
            fetchCategories();
            fetchEmployees();
            fetchPaymentMethods();

            // Set default branch if only one selected
            if (selectedBranchIds.length === 1) {
                setFormData(prev => ({ ...prev, branch_id: selectedBranchIds[0] }));
            }
        } else {
            // Reset form when dialog closes
            setFormData(initialFormData);
            setErrors({});
            setEmployeeSearch('');
            setShowEmployeeOptions(false);
        }
    }, [open, selectedBranchIds]);

    const fetchCategories = async () => {
        try {
            const response = await request({ method: 'GET', url: '/expense-categories?active=true' });
            if (response?.success) {
                setCategories(response.data || []);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchEmployees = async () => {
        try {
            const response = await request({ method: 'GET', url: '/employees?status=active' });
            if (response?.success) {
                setEmployees(response.data || []);
            }
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    };

    const fetchPaymentMethods = async () => {
        try {
            const response = await request({ method: 'GET', url: '/payment-methods?active=true' });
            // The API returns { data: [...] } without success field
            if (response?.data) {
                setPaymentMethods(response.data || []);
            }
        } catch (error) {
            console.error('Error fetching payment methods:', error);
        }
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.description.trim()) {
            newErrors.description = 'La descripción es requerida';
        }
        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            newErrors.amount = 'El monto debe ser mayor a 0';
        }
        if (!formData.date) {
            newErrors.date = 'La fecha es requerida';
        }
        if (!formData.category_id) {
            newErrors.category_id = 'La categoría es requerida';
        }
        if (!formData.branch_id) {
            newErrors.branch_id = 'La sucursal es requerida';
        }
        if (!formData.branch_id) {
            newErrors.branch_id = 'La sucursal es requerida';
        }
        if (!formData.payment_method_id) {
            newErrors.payment_method_id = 'El método de pago es requerido';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            setLoading(true);

            const payload = {
                description: formData.description,
                amount: parseFloat(formData.amount),
                date: formData.date,
                due_date: formData.due_date || null,
                category_id: parseInt(formData.category_id),
                employee_id: formData.employee_id && formData.employee_id !== 'none' ? parseInt(formData.employee_id) : null,
                payment_method_id: formData.payment_method_id ? parseInt(formData.payment_method_id) : null,
                branch_id: parseInt(formData.branch_id),
                status: formData.status,
                is_recurring: formData.is_recurring,
                recurrence_interval: formData.is_recurring ? formData.recurrence_interval : null,
                notes: formData.notes || null,
            };

            const response = await request({
                method: 'POST',
                url: '/expenses',
                data: payload,
            });

            if (response?.success) {
                toast.success('Gasto creado correctamente');
                onOpenChange(false);
                onSuccess();
            }
        } catch (error: any) {
            console.error('Error creating expense:', error);
            toast.error(error?.response?.data?.message || 'Error al crear el gasto');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData(initialFormData);
        setErrors({});
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Nuevo Gasto
                    </DialogTitle>
                    <DialogDescription>
                        Complete los datos para registrar un nuevo gasto
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Descripción */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Descripción <span className="text-red-500">*</span></Label>
                        <Input
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Descripción del gasto"
                            className={errors.description ? 'border-red-500' : ''}
                        />
                        {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
                    </div>

                    {/* Monto y Fecha */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Monto <span className="text-red-500">*</span></Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.amount}
                                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                placeholder="0.00"
                                className={errors.amount ? 'border-red-500' : ''}
                            />
                            {errors.amount && <p className="text-sm text-red-500">{errors.amount}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="date">Fecha <span className="text-red-500">*</span></Label>
                            <Input
                                id="date"
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                className={errors.date ? 'border-red-500' : ''}
                            />
                            {errors.date && <p className="text-sm text-red-500">{errors.date}</p>}
                        </div>
                    </div>

                    {/* Categoría y Sucursal */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Categoría <span className="text-red-500">*</span></Label>
                            <Select
                                value={formData.category_id}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
                            >
                                <SelectTrigger className={errors.category_id ? 'border-red-500' : ''}>
                                    <SelectValue placeholder="Seleccionar categoría" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id.toString()}>
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.category_id && <p className="text-sm text-red-500">{errors.category_id}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label>Sucursal <span className="text-red-500">*</span></Label>
                            <Select
                                value={formData.branch_id}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, branch_id: value }))}
                            >
                                <SelectTrigger className={errors.branch_id ? 'border-red-500' : ''}>
                                    <SelectValue placeholder="Seleccionar sucursal" />
                                </SelectTrigger>
                                <SelectContent>
                                    {branches
                                        .filter(b => selectedBranchIds.includes(String(b.id)))
                                        .map((branch) => (
                                            <SelectItem key={branch.id} value={branch.id.toString()}>
                                                {branch.description}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                            {errors.branch_id && <p className="text-sm text-red-500">{errors.branch_id}</p>}
                        </div>
                    </div>

                    {/* Estado y Empleado */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Estado</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">Pendiente</SelectItem>
                                    <SelectItem value="approved">Aprobado</SelectItem>
                                    <SelectItem value="paid">Pagado</SelectItem>
                                    <SelectItem value="cancelled">Cancelado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Empleado (opcional)</Label>
                            <div className="relative">
                                <Input
                                    value={employeeSearch}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        setEmployeeSearch(v);
                                        setShowEmployeeOptions(!!v && v.length >= 1);
                                        if (!v) {
                                            setFormData(prev => ({ ...prev, employee_id: '' }));
                                        }
                                    }}
                                    onFocus={() => setShowEmployeeOptions(employeeSearch.length >= 1)}
                                    onBlur={() => setTimeout(() => setShowEmployeeOptions(false), 200)}
                                    placeholder="Buscar empleado..."
                                />
                                {showEmployeeOptions && employees.filter(emp => {
                                    const searchLower = employeeSearch.toLowerCase();
                                    const fullName = `${emp.person.first_name} ${emp.person.last_name}`.toLowerCase();
                                    return fullName.includes(searchLower);
                                }).length > 0 && (
                                        <div className="absolute left-0 right-0 border rounded bg-white mt-1 max-h-40 overflow-auto z-50 shadow">
                                            <div
                                                className="p-2 cursor-pointer hover:bg-gray-100 text-gray-500 italic"
                                                role="button"
                                                tabIndex={0}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setFormData(prev => ({ ...prev, employee_id: '' }));
                                                    setEmployeeSearch('');
                                                    setShowEmployeeOptions(false);
                                                }}
                                            >
                                                Sin asignar
                                            </div>
                                            {employees.filter(emp => {
                                                const searchLower = employeeSearch.toLowerCase();
                                                const fullName = `${emp.person.first_name} ${emp.person.last_name}`.toLowerCase();
                                                return fullName.includes(searchLower);
                                            }).map((emp) => {
                                                const name = `${emp.person.first_name} ${emp.person.last_name}`;
                                                return (
                                                    <div
                                                        key={emp.id}
                                                        className="p-2 cursor-pointer hover:bg-gray-100"
                                                        role="button"
                                                        tabIndex={0}
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setFormData(prev => ({ ...prev, employee_id: emp.id.toString() }));
                                                            setEmployeeSearch(name);
                                                            setShowEmployeeOptions(false);
                                                        }}
                                                    >
                                                        {name}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                            </div>
                        </div>
                    </div>

                    {/* Método de Pago */}
                    <div className="space-y-2">
                        <Label>Método de Pago <span className="text-red-500">*</span></Label>
                        <Select
                            value={formData.payment_method_id}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method_id: value }))}
                        >
                            <SelectTrigger className={errors.payment_method_id ? 'border-red-500' : ''}>
                                <SelectValue placeholder="Seleccionar método de pago" />
                            </SelectTrigger>
                            <SelectContent>
                                {paymentMethods.map((pm) => (
                                    <SelectItem key={pm.id} value={pm.id.toString()}>
                                        {pm.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.payment_method_id && <p className="text-sm text-red-500">{errors.payment_method_id}</p>}
                    </div>

                    {/* Fecha de Vencimiento */}
                    <div className="space-y-2">
                        <Label htmlFor="due_date">Fecha de Vencimiento (opcional)</Label>
                        <Input
                            id="due_date"
                            type="date"
                            value={formData.due_date}
                            onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                        />
                    </div>

                    {/* Gasto Recurrente */}
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                            <Label htmlFor="is_recurring">Gasto Recurrente</Label>
                            <p className="text-sm text-muted-foreground">
                                Marcar si este gasto se repite periódicamente
                            </p>
                        </div>
                        <Switch
                            id="is_recurring"
                            checked={formData.is_recurring}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_recurring: checked }))}
                        />
                    </div>

                    {formData.is_recurring && (
                        <div className="space-y-2">
                            <Label>Frecuencia</Label>
                            <Select
                                value={formData.recurrence_interval}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, recurrence_interval: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="daily">Diario</SelectItem>
                                    <SelectItem value="weekly">Semanal</SelectItem>
                                    <SelectItem value="monthly">Mensual</SelectItem>
                                    <SelectItem value="yearly">Anual</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Notas */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notas (opcional)</Label>
                        <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="Notas adicionales..."
                            rows={3}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Crear Gasto
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
