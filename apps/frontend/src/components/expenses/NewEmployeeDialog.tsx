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
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, UserPlus, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import useApi from '@/hooks/useApi';
import { useBranch } from '@/context/BranchContext';

interface AvailableUser {
    id: number;
    email: string;
    full_name: string;
    role?: {
        id: number;
        name: string;
    };
    person?: {
        first_name: string;
        last_name: string;
        phone?: string;
        address?: string;
        cuit?: string;
    };
}

interface NewEmployeeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

interface EmployeeFormData {
    link_user: boolean;
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address: string;
    documento: string;
    cuit: string;
    branch_ids: string[];
    job_title: string;
    salary: string;
    hire_date: string;
    status: string;
}

const initialFormData: EmployeeFormData = {
    link_user: false,
    user_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    documento: '',
    cuit: '',
    branch_ids: [],
    job_title: '',
    salary: '',
    hire_date: new Date().toISOString().split('T')[0],
    status: 'active',
};

export function NewEmployeeDialog({ open, onOpenChange, onSuccess }: NewEmployeeDialogProps) {
    const { request } = useApi();
    const { selectedBranchIds, branches } = useBranch();

    const [formData, setFormData] = useState<EmployeeFormData>(initialFormData);
    const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Fetch available users when dialog opens
    useEffect(() => {
        if (open) {
            fetchAvailableUsers();

            // Set default branches if only one selected
            if (selectedBranchIds.length === 1) {
                setFormData(prev => ({ ...prev, branch_ids: [selectedBranchIds[0]] }));
            } else if (selectedBranchIds.length > 1) {
                // Pre-select all available branches
                setFormData(prev => ({ ...prev, branch_ids: [...selectedBranchIds] }));
            }
        } else {
            // Reset form when dialog closes
            setFormData(initialFormData);
            setErrors({});
        }
    }, [open, selectedBranchIds]);

    const fetchAvailableUsers = async () => {
        try {
            const response = await request({ method: 'GET', url: '/employees/available-users' });
            if (response?.success) {
                setAvailableUsers(response.data || []);
            }
        } catch (error) {
            console.error('Error fetching available users:', error);
        }
    };

    // When user is selected, populate form with their data and role as job_title
    const handleUserSelect = (userId: string) => {
        setFormData(prev => ({ ...prev, user_id: userId }));

        if (userId) {
            const user = availableUsers.find(u => u.id.toString() === userId);
            if (user) {
                setFormData(prev => ({
                    ...prev,
                    first_name: user.person?.first_name || '',
                    last_name: user.person?.last_name || '',
                    email: user.email || '',
                    phone: user.person?.phone || '',
                    address: user.person?.address || '',
                    cuit: user.person?.cuit || '',
                    job_title: user.role?.name || prev.job_title, // Default job_title from role
                }));
            }
        }
    };

    // Toggle branch selection
    const handleBranchToggle = (branchId: string, checked: boolean) => {
        setFormData(prev => ({
            ...prev,
            branch_ids: checked
                ? [...prev.branch_ids, branchId]
                : prev.branch_ids.filter(id => id !== branchId)
        }));
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.link_user) {
            if (!formData.first_name.trim()) {
                newErrors.first_name = 'El nombre es requerido';
            }
            if (!formData.last_name.trim()) {
                newErrors.last_name = 'El apellido es requerido';
            }
        } else {
            if (!formData.user_id) {
                newErrors.user_id = 'Debe seleccionar un usuario';
            }
        }

        if (!formData.salary || parseFloat(formData.salary) < 0) {
            newErrors.salary = 'El salario debe ser un número válido';
        }
        if (formData.branch_ids.length === 0) {
            newErrors.branch_ids = 'Debe seleccionar al menos una sucursal';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            setLoading(true);

            const payload: any = {
                branch_ids: formData.branch_ids.map(id => parseInt(id)),
                job_title: formData.job_title || null,
                salary: parseFloat(formData.salary) || 0,
                hire_date: formData.hire_date,
                status: formData.status,
            };

            if (formData.link_user && formData.user_id) {
                payload.user_id = parseInt(formData.user_id);
            } else {
                payload.first_name = formData.first_name;
                payload.last_name = formData.last_name;
                payload.email = formData.email || null;
                payload.phone = formData.phone || null;
                payload.address = formData.address || null;
                payload.documento = formData.documento || null;
                payload.cuit = formData.cuit || null;
            }

            const response = await request({
                method: 'POST',
                url: '/employees',
                data: payload,
            });

            if (response?.success) {
                toast.success('Empleado creado correctamente');
                onOpenChange(false);
                onSuccess();
            }
        } catch (error: any) {
            console.error('Error creating employee:', error);
            toast.error(error?.response?.data?.message || 'Error al crear el empleado');
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
            {/* @ts-ignore */}
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                {/* @ts-ignore */}
                <DialogHeader>
                    {/* @ts-ignore */}
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5" />
                        Nuevo Empleado
                    </DialogTitle>
                    {/* @ts-ignore */}
                    <DialogDescription>
                        Complete los datos para registrar un nuevo empleado
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Link to existing user toggle */}
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                            {/* @ts-ignore */}
                            <Label htmlFor="link_user" className="flex items-center gap-2">
                                <Link2 className="h-4 w-4" />
                                Vincular a Usuario Existente
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Usar datos de un usuario del sistema
                            </p>
                        </div>
                        {/* @ts-ignore */}
                        <Switch
                            id="link_user"
                            checked={formData.link_user}
                            onCheckedChange={(checked) => {
                                setFormData(prev => ({
                                    ...prev,
                                    link_user: checked,
                                    user_id: '',
                                    first_name: '',
                                    last_name: '',
                                    email: '',
                                    phone: '',
                                    address: '',
                                    cuit: '',
                                }));
                            }}
                        />
                    </div>

                    {formData.link_user ? (
                        /* User selection */
                        <div className="space-y-2">
                            {/* @ts-ignore */}
                            <Label>Usuario del Sistema <span className="text-red-500">*</span></Label>
                            <Select
                                value={formData.user_id}
                                onValueChange={handleUserSelect}
                            >
                                {/* @ts-ignore */}
                                <SelectTrigger className={errors.user_id ? 'border-red-500' : ''}>
                                    <SelectValue placeholder="Seleccionar usuario" />
                                </SelectTrigger>
                                {/* @ts-ignore */}
                                <SelectContent>
                                    {availableUsers.map((user) => (
                                        /* @ts-ignore */
                                        <SelectItem key={user.id} value={user.id.toString()}>
                                            {user.full_name} ({user.email})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.user_id && <p className="text-sm text-red-500">{errors.user_id}</p>}
                        </div>
                    ) : (
                        /* Manual entry */
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
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                        placeholder="email@ejemplo.com"
                                    />
                                </div>
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
                            </div>

                            <div className="grid grid-cols-2 gap-4">
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
                        </>
                    )}

                    {/* Employment details */}
                    <div className="space-y-3">
                        {/* @ts-ignore */}
                        <Label>Sucursales <span className="text-red-500">*</span></Label>
                        <div className={`grid gap-2 p-3 border rounded-lg ${errors.branch_ids ? 'border-red-500' : ''}`}>
                            {branches
                                .filter(b => selectedBranchIds.includes(String(b.id)))
                                .map((branch) => (
                                    <div key={branch.id} className="flex items-center space-x-2">
                                        {/* @ts-ignore */}
                                        <Checkbox
                                            id={`branch-${branch.id}`}
                                            checked={formData.branch_ids.includes(branch.id.toString())}
                                            onCheckedChange={(checked) => handleBranchToggle(branch.id.toString(), !!checked)}
                                        />
                                        {/* @ts-ignore */}
                                        <Label
                                            htmlFor={`branch-${branch.id}`}
                                            className="text-sm font-normal cursor-pointer flex items-center gap-2"
                                        >
                                            <span
                                                className="w-2 h-2 rounded-full"
                                                style={{ backgroundColor: branch.color || '#0ea5e9' }}
                                            />
                                            {branch.description}
                                        </Label>
                                    </div>
                                ))}
                        </div>
                        {errors.branch_ids && <p className="text-sm text-red-500">{errors.branch_ids}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            {/* @ts-ignore */}
                            <Label htmlFor="job_title">Puesto {formData.link_user && '(del rol)'}</Label>
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
                                <>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Crear Empleado
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
