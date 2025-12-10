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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2, Pencil, Link2, Unlink } from 'lucide-react';
import { toast } from 'sonner';
import useApi from '@/hooks/useApi';
import { useBranch } from '@/context/BranchContext';
import { Badge } from '@/components/ui/badge';

interface Employee {
    id: number;
    person_id: number;
    user_id: number | null;
    branch_id: number;
    job_title: string | null;
    salary: number;
    hire_date: string;
    status: string;
    person: {
        id: number;
        first_name: string;
        last_name: string;
        email?: string;
        phone?: string;
        address?: string;
        documento?: string;
        cuit?: string;
    };
    user?: {
        id: number;
        email: string;
    };
}

interface EditEmployeeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: Employee | null;
    onSuccess: () => void;
}

interface EmployeeFormData {
    first_name: string;
    last_name: string;
    phone: string;
    address: string;
    documento: string;
    cuit: string;
    branch_id: string;
    job_title: string;
    salary: string;
    hire_date: string;
    status: string;
}

export function EditEmployeeDialog({ open, onOpenChange, employee, onSuccess }: EditEmployeeDialogProps) {
    const { request } = useApi();
    const { selectedBranchIds, branches } = useBranch();

    const [formData, setFormData] = useState<EmployeeFormData>({
        first_name: '',
        last_name: '',
        phone: '',
        address: '',
        documento: '',
        cuit: '',
        branch_id: '',
        job_title: '',
        salary: '',
        hire_date: '',
        status: 'active',
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Load employee data when dialog opens
    useEffect(() => {
        if (open && employee) {
            setFormData({
                first_name: employee.person?.first_name || '',
                last_name: employee.person?.last_name || '',
                phone: employee.person?.phone || '',
                address: employee.person?.address || '',
                documento: employee.person?.documento || '',
                cuit: employee.person?.cuit || '',
                branch_id: employee.branch_id?.toString() || '',
                job_title: employee.job_title || '',
                salary: employee.salary?.toString() || '',
                hire_date: employee.hire_date?.split('T')[0] || '',
                status: employee.status || 'active',
            });
        }
    }, [open, employee]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!employee?.user_id) {
            if (!formData.first_name.trim()) {
                newErrors.first_name = 'El nombre es requerido';
            }
            if (!formData.last_name.trim()) {
                newErrors.last_name = 'El apellido es requerido';
            }
        }

        if (!formData.salary || parseFloat(formData.salary) < 0) {
            newErrors.salary = 'El salario debe ser un número válido';
        }
        if (!formData.branch_id) {
            newErrors.branch_id = 'La sucursal es requerida';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm() || !employee) return;

        try {
            setLoading(true);

            const payload: any = {
                branch_id: parseInt(formData.branch_id),
                job_title: formData.job_title || null,
                salary: parseFloat(formData.salary) || 0,
                hire_date: formData.hire_date,
                status: formData.status,
            };

            // Only update person data if not linked to a user
            if (!employee.user_id) {
                payload.first_name = formData.first_name;
                payload.last_name = formData.last_name;
                payload.phone = formData.phone || null;
                payload.address = formData.address || null;
                payload.documento = formData.documento || null;
                payload.cuit = formData.cuit || null;
            }

            const response = await request({
                method: 'PUT',
                url: `/employees/${employee.id}`,
                data: payload,
            });

            if (response?.success) {
                toast.success('Empleado actualizado correctamente');
                onOpenChange(false);
                onSuccess();
            }
        } catch (error: any) {
            console.error('Error updating employee:', error);
            toast.error(error?.response?.data?.message || 'Error al actualizar el empleado');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setErrors({});
        onOpenChange(false);
    };

    const isLinkedToUser = !!employee?.user_id;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            {/* @ts-ignore */}
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                {/* @ts-ignore */}
                <DialogHeader>
                    {/* @ts-ignore */}
                    <DialogTitle className="flex items-center gap-2">
                        <Pencil className="h-5 w-5" />
                        Editar Empleado
                    </DialogTitle>
                    {/* @ts-ignore */}
                    <DialogDescription>
                        Modifique los datos del empleado
                    </DialogDescription>
                </DialogHeader>

                {isLinkedToUser && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <Link2 className="h-4 w-4 text-blue-600" />
                        <span className="text-sm text-blue-800">
                            Vinculado a usuario: <strong>{employee?.user?.email}</strong>
                        </span>
                        <Badge variant="secondary" className="ml-auto">Usuario del sistema</Badge>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Personal data - only editable if not linked to user */}
                    {!isLinkedToUser && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    {/* @ts-ignore */}
                                    <Label htmlFor="first_name">Nombre <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="first_name"
                                        value={formData.first_name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                                        placeholder="Nombre"
                                        className={errors.first_name ? 'border-red-500' : ''}
                                    />
                                    {errors.first_name && <p className="text-sm text-red-500">{errors.first_name}</p>}
                                </div>
                                <div className="space-y-2">
                                    {/* @ts-ignore */}
                                    <Label htmlFor="last_name">Apellido <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="last_name"
                                        value={formData.last_name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                                        placeholder="Apellido"
                                        className={errors.last_name ? 'border-red-500' : ''}
                                    />
                                    {errors.last_name && <p className="text-sm text-red-500">{errors.last_name}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    {/* @ts-ignore */}
                                    <Label htmlFor="phone">Teléfono</Label>
                                    <Input
                                        id="phone"
                                        value={formData.phone}
                                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                        placeholder="Teléfono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    {/* @ts-ignore */}
                                    <Label htmlFor="documento">Documento</Label>
                                    <Input
                                        id="documento"
                                        value={formData.documento}
                                        onChange={(e) => setFormData(prev => ({ ...prev, documento: e.target.value }))}
                                        placeholder="DNI"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    {/* @ts-ignore */}
                                    <Label htmlFor="cuit">CUIT</Label>
                                    <Input
                                        id="cuit"
                                        value={formData.cuit}
                                        onChange={(e) => setFormData(prev => ({ ...prev, cuit: e.target.value }))}
                                        placeholder="XX-XXXXXXXX-X"
                                    />
                                </div>
                                <div className="space-y-2">
                                    {/* @ts-ignore */}
                                    <Label htmlFor="address">Dirección</Label>
                                    <Input
                                        id="address"
                                        value={formData.address}
                                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                        placeholder="Dirección"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {isLinkedToUser && (
                        <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                            <p className="text-sm font-medium">{employee?.person?.first_name} {employee?.person?.last_name}</p>
                            <p className="text-sm text-muted-foreground">{employee?.person?.phone || 'Sin teléfono'}</p>
                            <p className="text-sm text-muted-foreground">{employee?.person?.address || 'Sin dirección'}</p>
                        </div>
                    )}

                    {/* Employment details - always editable */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            {/* @ts-ignore */}
                            <Label>Sucursal <span className="text-red-500">*</span></Label>
                            <Select
                                value={formData.branch_id}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, branch_id: value }))}
                            >
                                {/* @ts-ignore */}
                                <SelectTrigger className={errors.branch_id ? 'border-red-500' : ''}>
                                    <SelectValue placeholder="Seleccionar sucursal" />
                                </SelectTrigger>
                                {/* @ts-ignore */}
                                <SelectContent>
                                    {branches
                                        .filter(b => selectedBranchIds.includes(String(b.id)))
                                        .map((branch) => (
                                            /* @ts-ignore */
                                            <SelectItem key={branch.id} value={branch.id.toString()}>
                                                {branch.description}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                            {errors.branch_id && <p className="text-sm text-red-500">{errors.branch_id}</p>}
                        </div>

                        <div className="space-y-2">
                            {/* @ts-ignore */}
                            <Label htmlFor="job_title">Puesto</Label>
                            <Input
                                id="job_title"
                                value={formData.job_title}
                                onChange={(e) => setFormData(prev => ({ ...prev, job_title: e.target.value }))}
                                placeholder="Ej: Vendedor"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            {/* @ts-ignore */}
                            <Label htmlFor="salary">Salario <span className="text-red-500">*</span></Label>
                            <Input
                                id="salary"
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.salary}
                                onChange={(e) => setFormData(prev => ({ ...prev, salary: e.target.value }))}
                                placeholder="0.00"
                                className={errors.salary ? 'border-red-500' : ''}
                            />
                            {errors.salary && <p className="text-sm text-red-500">{errors.salary}</p>}
                        </div>
                        <div className="space-y-2">
                            {/* @ts-ignore */}
                            <Label htmlFor="hire_date">Fecha de Contratación</Label>
                            <Input
                                id="hire_date"
                                type="date"
                                value={formData.hire_date}
                                onChange={(e) => setFormData(prev => ({ ...prev, hire_date: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        {/* @ts-ignore */}
                        <Label>Estado</Label>
                        <Select
                            value={formData.status}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                        >
                            {/* @ts-ignore */}
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            {/* @ts-ignore */}
                            <SelectContent>
                                {/* @ts-ignore */}
                                <SelectItem value="active">Activo</SelectItem>
                                {/* @ts-ignore */}
                                <SelectItem value="inactive">Inactivo</SelectItem>
                                {/* @ts-ignore */}
                                <SelectItem value="terminated">Desvinculado</SelectItem>
                            </SelectContent>
                        </Select>
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
