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
import { Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import useApi from '@/hooks/useApi';

interface ExpenseCategory {
    id: number;
    name: string;
    description: string | null;
    active: boolean;
}

interface EditCategoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    category: ExpenseCategory | null;
    onSuccess: () => void;
}

interface CategoryFormData {
    name: string;
    description: string;
    active: boolean;
}

export function EditCategoryDialog({ open, onOpenChange, category, onSuccess }: EditCategoryDialogProps) {
    const { request } = useApi();

    const [formData, setFormData] = useState<CategoryFormData>({
        name: '',
        description: '',
        active: true,
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Load category data when dialog opens
    useEffect(() => {
        if (open && category) {
            setFormData({
                name: category.name || '',
                description: category.description || '',
                active: category.active ?? true,
            });
        }
    }, [open, category]);

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

        if (!validateForm() || !category) return;

        try {
            setLoading(true);

            const payload = {
                name: formData.name.trim(),
                description: formData.description.trim() || null,
                active: formData.active,
            };

            const response = await request({
                method: 'PUT',
                url: `/expense-categories/${category.id}`,
                data: payload,
            });

            if (response?.success) {
                toast.success('Categoría actualizada correctamente');
                onOpenChange(false);
                onSuccess();
            }
        } catch (error: any) {
            console.error('Error updating category:', error);
            toast.error(error?.response?.data?.message || 'Error al actualizar la categoría');
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
            {/* @ts-ignore */}
            <DialogContent className="max-w-md">
                {/* @ts-ignore */}
                <DialogHeader>
                    {/* @ts-ignore */}
                    <DialogTitle className="flex items-center gap-2">
                        <Pencil className="h-5 w-5" />
                        Editar Categoría
                    </DialogTitle>
                    {/* @ts-ignore */}
                    <DialogDescription>
                        Modifique los datos de la categoría
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
                                'Guardar Cambios'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
