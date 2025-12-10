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
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, FolderPlus } from 'lucide-react';
import { toast } from 'sonner';
import useApi from '@/hooks/useApi';

interface NewCategoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

interface CategoryFormData {
    name: string;
    description: string;
    active: boolean;
}

const initialFormData: CategoryFormData = {
    name: '',
    description: '',
    active: true,
};

export function NewCategoryDialog({ open, onOpenChange, onSuccess }: NewCategoryDialogProps) {
    const { request } = useApi();

    const [formData, setFormData] = useState<CategoryFormData>(initialFormData);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Reset form when dialog opens/closes
    useEffect(() => {
        if (!open) {
            setFormData(initialFormData);
            setErrors({});
        }
    }, [open]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'El nombre es requerido';
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
                name: formData.name.trim(),
                description: formData.description.trim() || null,
                active: formData.active,
            };

            const response = await request({
                method: 'POST',
                url: '/expense-categories',
                data: payload,
            });

            if (response?.success) {
                toast.success('Categoría creada correctamente');
                onOpenChange(false);
                onSuccess();
            }
        } catch (error: any) {
            console.error('Error creating category:', error);
            toast.error(error?.response?.data?.message || 'Error al crear la categoría');
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
            <DialogContent className="max-w-md">
                {/* @ts-ignore */}
                <DialogHeader>
                    {/* @ts-ignore */}
                    <DialogTitle className="flex items-center gap-2">
                        <FolderPlus className="h-5 w-5" />
                        Nueva Categoría de Gasto
                    </DialogTitle>
                    {/* @ts-ignore */}
                    <DialogDescription>
                        Cree una nueva categoría para organizar los gastos
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        {/* @ts-ignore */}
                        <Label htmlFor="name">Nombre <span className="text-red-500">*</span></Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Ej: Servicios, Sueldos, Proveedores"
                            className={errors.name ? 'border-red-500' : ''}
                        />
                        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                    </div>

                    <div className="space-y-2">
                        {/* @ts-ignore */}
                        <Label htmlFor="description">Descripción</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Descripción opcional de la categoría..."
                            rows={3}
                        />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                            {/* @ts-ignore */}
                            <Label htmlFor="active">Activa</Label>
                            <p className="text-sm text-muted-foreground">
                                Las categorías inactivas no aparecen al crear gastos
                            </p>
                        </div>
                        {/* @ts-ignore */}
                        <Switch
                            id="active"
                            checked={formData.active}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
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
                                    Crear Categoría
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
