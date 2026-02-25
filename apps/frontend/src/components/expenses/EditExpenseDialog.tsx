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
import { Combobox } from '@/components/ui/combobox';
import { Switch } from '@/components/ui/switch';
import { Loader2, Pencil } from 'lucide-react';
import { sileo } from "sileo"
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

interface Expense {
    id: number;
    description: string;
    amount: number;
    date: string;
    due_date: string | null;
    category_id: number;
    employee_id: number | null;
    branch_id: number;
    status: string;
    is_recurring: boolean;
    recurrence_interval: string | null;
    notes: string | null;
}

interface EditExpenseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    expense: Expense | null;
    onSuccess: () => void;
}

interface ExpenseFormData {
    description: string;
    amount: string;
    date: string;
    due_date: string;
    category_id: string;
    employee_id: string;
    branch_id: string;
    status: string;
    is_recurring: boolean;
    recurrence_interval: string;
    notes: string;
}

export function EditExpenseDialog({ open, onOpenChange, expense, onSuccess }: EditExpenseDialogProps) {
    const { request } = useApi();
    const { selectedBranchIds, branches } = useBranch();

    const [formData, setFormData] = useState<ExpenseFormData>({
        description: '',
        amount: '',
        date: '',
        due_date: '',
        category_id: '',
        employee_id: '',
        branch_id: '',
        status: 'pending',
        is_recurring: false,
        recurrence_interval: 'monthly',
        notes: '',
    });
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Load expense data when dialog opens
    useEffect(() => {
        if (open && expense) {
            setFormData({
                description: expense.description || '',
                amount: expense.amount?.toString() || '',
                date: expense.date?.split('T')[0] || '',
                due_date: expense.due_date?.split('T')[0] || '',
                category_id: expense.category_id?.toString() || '',
                employee_id: expense.employee_id?.toString() || '',
                branch_id: expense.branch_id?.toString() || '',
                status: expense.status || 'pending',
                is_recurring: expense.is_recurring || false,
                recurrence_interval: expense.recurrence_interval || 'monthly',
                notes: expense.notes || '',
            });
            fetchCategories();
            fetchEmployees();
        }
    }, [open, expense]);

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

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm() || !expense) return;

        try {
            setLoading(true);

            const payload = {
                description: formData.description,
                amount: parseFloat(formData.amount),
                date: formData.date,
                due_date: formData.due_date || null,
                category_id: parseInt(formData.category_id),
                employee_id: formData.employee_id && formData.employee_id !== 'none' ? parseInt(formData.employee_id) : null,
                branch_id: parseInt(formData.branch_id),
                status: formData.status,
                is_recurring: formData.is_recurring,
                recurrence_interval: formData.is_recurring ? formData.recurrence_interval : null,
                notes: formData.notes || null,
            };

            const response = await request({
                method: 'PUT',
                url: `/expenses/${expense.id}`,
                data: payload,
            });

            if (response?.success) {
                sileo.success({ title: 'Gasto actualizado correctamente' });
                onOpenChange(false);
                onSuccess();
            }
        } catch (error: any) {
            console.error('Error updating expense:', error);
            sileo.error({ title: error?.response?.data?.message || 'Error al actualizar el gasto' });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setErrors({});
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Pencil className="h-5 w-5" />
                        Editar Gasto
                    </DialogTitle>
                    <DialogDescription>
                        Modifique los datos del gasto
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
                            <Combobox
                                options={[
                                    { value: 'none', label: 'Sin asignar' },
                                    ...employees.map((emp) => ({
                                        value: emp.id.toString(),
                                        label: `${emp.person.first_name} ${emp.person.last_name}`
                                    }))
                                ]}
                                value={formData.employee_id || 'none'}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, employee_id: value }))}
                                placeholder="Buscar empleado..."
                                searchPlaceholder="Buscar por nombre..."
                                emptyText="No se encontraron empleados"
                            />
                        </div>
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
                                'Guardar Cambios'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
